import React, { useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";
import { getCurrentUserData } from "../services/auth";
import {
  getDangerZones,
  notifyDangerZoneLocationEvent,
} from "../services/reports";
import { isSupabaseConfigured } from "../services/supabase";

const WARNING_DISTANCE_METERS = 200;

type ZoneState = "outside" | "near" | "inside";

interface Zone {
  id: string;
  latitude: number;
  longitude: number;
  radius: number;
  active?: boolean;
}

function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const earthRadius = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return (
    2 *
    earthRadius *
    Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)))
  );
}

function classifyZone(distance: number, radius: number): ZoneState {
  if (distance <= radius) return "inside";
  if (distance <= radius + WARNING_DISTANCE_METERS) return "near";
  return "outside";
}

export default function DangerZoneLocationMonitor() {
  const zonesRef = useRef<Zone[]>([]);
  const stateRef = useRef<Record<string, ZoneState>>({});
  const watchRef = useRef<any>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopWatch = useCallback(() => {
    try {
      if (!watchRef.current) return;

      if (
        Platform.OS === "web" &&
        typeof navigator !== "undefined" &&
        navigator.geolocation &&
        typeof watchRef.current === "number"
      ) {
        navigator.geolocation.clearWatch(watchRef.current);
      } else if (typeof watchRef.current.remove === "function") {
        watchRef.current.remove();
      }
    } catch (error) {
      console.debug("Erro ao encerrar monitoramento de áreas de perigo:", error);
    } finally {
      watchRef.current = null;
    }
  }, []);

  const evaluateLocation = useCallback(
    async (latitude: number, longitude: number) => {
      const zones = zonesRef.current;

      for (const zone of zones) {
        const radius = Math.max(100, Number(zone.radius) || 300);
        const distance = distanceMeters(
          latitude,
          longitude,
          Number(zone.latitude),
          Number(zone.longitude),
        );

        const nextState = classifyZone(distance, radius);
        const previousState = stateRef.current[zone.id];

        if (previousState === nextState) continue;

        // A distant initial state does not need a database write.
        if (nextState === "outside" && previousState === undefined) {
          stateRef.current[zone.id] = "outside";
          continue;
        }

        stateRef.current[zone.id] = nextState;

        try {
          await notifyDangerZoneLocationEvent(zone.id, nextState);
        } catch (error) {
          console.debug(
            "Não foi possível registrar evento da área de perigo:",
            error,
          );
        }
      }
    },
    [],
  );

  const loadZones = useCallback(async () => {
    try {
      const zones = (await getDangerZones()) as Zone[];
      const activeZones = (zones || [])
        .filter((zone) => zone.active !== false)
        .map((zone) => ({
          id: String(zone.id),
          latitude: Number(zone.latitude),
          longitude: Number(zone.longitude),
          radius: Number(zone.radius) || 300,
          active: zone.active,
        }))
        .filter(
          (zone) =>
            Number.isFinite(zone.latitude) &&
            Number.isFinite(zone.longitude),
        );

      zonesRef.current = activeZones;

      const activeIds = new Set(activeZones.map((zone) => zone.id));
      Object.keys(stateRef.current).forEach((id) => {
        if (!activeIds.has(id)) delete stateRef.current[id];
      });
    } catch (error) {
      console.debug("Não foi possível carregar áreas de perigo:", error);
    }
  }, []);

  const startWatch = useCallback(async () => {
    stopWatch();

    if (Platform.OS === "web") {
      if (typeof navigator === "undefined" || !navigator.geolocation) return;

      try {
        const watchId = navigator.geolocation.watchPosition(
          (position) => {
            void evaluateLocation(
              position.coords.latitude,
              position.coords.longitude,
            );
          },
          (error) => {
            console.debug("Monitor de áreas de perigo sem GPS:", error);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 5000,
            timeout: 15000,
          },
        );

        watchRef.current = watchId;
      } catch (error) {
        console.debug("Não foi possível iniciar monitoramento web:", error);
      }
      return;
    }

    try {
      const Location = await import("expo-location");
      const permission = await Location.getForegroundPermissionsAsync();

      if (permission.status !== "granted") return;

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 20,
        },
        (position) => {
          void evaluateLocation(
            position.coords.latitude,
            position.coords.longitude,
          );
        },
      );

      watchRef.current = subscription;
    } catch (error) {
      console.debug("Não foi possível iniciar monitoramento Expo:", error);
    }
  }, [evaluateLocation, stopWatch]);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      if (!isSupabaseConfigured()) return;

      try {
        const user = await getCurrentUserData();

        // O monitor também fica ativo para administradores para permitir
        // testes e para que contas administrativas possam receber alertas.
        if (!mounted || !user) return;

        await loadZones();
        if (!mounted) return;

        await startWatch();

        refreshTimerRef.current = setInterval(() => {
          void loadZones();
        }, 120000);
      } catch (error) {
        console.debug("Erro ao inicializar monitor de áreas de perigo:", error);
      }
    };

    void initialize();

    return () => {
      mounted = false;
      stopWatch();

      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [loadZones, startWatch, stopWatch]);

  return null;
}
