import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useRef, useState, useEffect } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import MapComponent from "../../components/map";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { C } from "../../constants/theme";
import { resolveUserLocationWithFallback } from "../../services/auth";
import { getDangerZones, getPublicReports } from "../../services/reports";

const categories = [
  "Todas",
  "buraco",
  "poste",
  "vazamento",
  "bueiro",
  "mato",
  "calçada",
  "lixo",
  "sinalizacao",
  "outro",
];

function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(distKm: number | null) {
  if (distKm === null) return "";
  if (distKm < 1) {
    return `${Math.round(distKm * 1000)}m`;
  }
  return `${distKm.toFixed(1)} km`;
}

export default function MapScreen() {
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [reports, setReports] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationSource, setLocationSource] = useState<"gps" | "city" | "none">(
    "none",
  );
  const [locationReason, setLocationReason] = useState<
    "gps" | "gps_unavailable" | "permission_denied" | "city_fallback"
  >("gps_unavailable");
  const [selectedReportIndex, setSelectedReportIndex] = useState<number>(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const fetchUserLocation = async (): Promise<{
        location: { latitude: number; longitude: number } | null;
        source: "gps" | "city" | "none";
        reason: "gps" | "gps_unavailable" | "permission_denied" | "city_fallback";
      }> => {
        return resolveUserLocationWithFallback();
      };

      const [fetchedReports, fetchedZones, resolvedLocation] =
        await Promise.all([
          getPublicReports().catch(() => []),
          getDangerZones().catch(() => []),
          fetchUserLocation().catch(() => ({
            location: null,
            source: "none" as const,
          })),
        ]);

      setUserLocation(resolvedLocation.location);
      setLocationSource(resolvedLocation.source);
      setLocationReason(resolvedLocation.reason);
      setReports(fetchedReports || []);
      setZones(fetchedZones || []);
    } catch (error) {
      console.error("Erro ao carregar dados do mapa:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  // Watcher ref: number for web, subscription object for native
  const watchRef = useRef<any>(null);

  const stopLocationWatch = useCallback(() => {
    try {
      if (!watchRef.current) return;
      if (Platform.OS === "web" && typeof navigator !== "undefined") {
        navigator.geolocation.clearWatch(watchRef.current as number);
      } else if (watchRef.current && typeof watchRef.current.remove === "function") {
        watchRef.current.remove();
      }
    } catch (e) {
      // ignore
    } finally {
      watchRef.current = null;
    }
  }, []);

  const startLocationWatch = useCallback(() => {
    stopLocationWatch();
    if (locationReason === "permission_denied") return;

    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.geolocation) {
      try {
        const id = navigator.geolocation.watchPosition(
          (position) => {
            setUserLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
            setLocationSource("gps");
            setLocationReason("gps");
            stopLocationWatch();
          },
          (err) => {
            console.debug("watchPosition error", err);
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
        );
        watchRef.current = id;

        // Stop watching after 8s if no result
        setTimeout(() => {
          if (watchRef.current) {
            stopLocationWatch();
          }
        }, 8000);
      } catch (e) {
        // ignore
      }
    } else {
      // Native (Expo) fallback
      (async () => {
        try {
          const m = await import("expo-location");
          const sub = await m.default.watchPositionAsync(
            { accuracy: m.default.Accuracy.Balanced, timeInterval: 2000, distanceInterval: 1 },
            (loc) => {
              if (!loc) return;
              setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
              setLocationSource("gps");
              setLocationReason("gps");
              stopLocationWatch();
            },
          );
          watchRef.current = sub;

          setTimeout(() => {
            if (watchRef.current) stopLocationWatch();
          }, 8000);
        } catch (e) {
          // ignore
        }
      })();
    }
  }, [locationReason, stopLocationWatch]);

  // If initial resolution says GPS unavailable (but permission not denied), try a short watch
  useEffect(() => {
    if (locationReason === "gps_unavailable") {
      startLocationWatch();
    } else {
      // stop any running watch when we have a definitive reason
      stopLocationWatch();
    }
    return () => stopLocationWatch();
  }, [locationReason, startLocationWatch, stopLocationWatch]);

  const filteredReports = reports.filter((item) => {
    const category = String(item.category || "").toLowerCase();
    if (category === "seguranca") return false;
    if (selectedCategory === "Todas") return true;
    return category === selectedCategory.toLowerCase();
  });

  // Calcular distância e ordenar por proximidade
  const sortedReports = filteredReports
    .map((r) => {
      const lat = Number(r.latitude) || 0;
      const lon = Number(r.longitude) || 0;
      const dist = userLocation
        ? calculateDistanceKm(
            userLocation.latitude,
            userLocation.longitude,
            lat,
            lon,
          )
        : null;
      return {
        ...r,
        dist,
        id: String(r.id),
        category: r.category || r.title || "Denúncia",
        description: r.description || "",
        location: { latitude: lat, longitude: lon },
      };
    })
    .sort((a, b) => {
      if (a.dist === null || b.dist === null) return 0;
      return a.dist - b.dist;
    });

  const formattedZones = zones.map((z) => ({
    id: String(z.id),
    name: z.name || "Área de risco",
    latitude: Number(z.latitude) || 0,
    longitude: Number(z.longitude) || 0,
    radius: Number(z.radius) || 300,
    severity: z.severity || "media",
  }));

  const handlePrev = () => {
    if (selectedReportIndex > 0) {
      const nextIdx = selectedReportIndex - 1;
      setSelectedReportIndex(nextIdx);
      scrollViewRef.current?.scrollTo({ x: nextIdx * 240, animated: true });
    }
  };

  const handleNext = () => {
    if (selectedReportIndex < sortedReports.length - 1) {
      const nextIdx = selectedReportIndex + 1;
      setSelectedReportIndex(nextIdx);
      scrollViewRef.current?.scrollTo({ x: nextIdx * 240, animated: true });
    }
  };

  const locationAlertConfig = {
    gps: null,
    gps_unavailable: {
      icon: "locate-outline" as keyof typeof Ionicons.glyphMap,
      title: "GPS desligado",
      text: "Ative o GPS para usar o mapa e ver denúncias próximas de você.",
      tone: "warning" as const,
    },
    permission_denied: {
      icon: "warning-outline" as keyof typeof Ionicons.glyphMap,
      title: "Permissão de localização negada",
      text: "Para localizar denúncias próximas, permita o uso da sua localização no aparelho.",
      tone: "warning" as const,
    },
    city_fallback: {
      icon: "location-outline" as keyof typeof Ionicons.glyphMap,
      title: "Usando a localização da cidade",
      text: "O mapa está em modo de fallback com o centro da cidade porque o GPS não está disponível no momento.",
      tone: "info" as const,
    },
  };

  const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
    Todas: "apps",
    buraco: "construct",
    poste: "flash",
    vazamento: "water",
    bueiro: "albums",
    mato: "leaf",
    calçada: "walk",
    lixo: "trash",
    sinalizacao: "alert-circle",
    outro: "ellipsis-horizontal",
  };

  const categoriesDisplay = [
    "Todas",
    "buraco",
    "poste",
    "vazamento",
    "bueiro",
    "mato",
    "calçada",
    "lixo",
    "sinalizacao",
    "outro",
  ];

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
          style={styles.filterScroll}
        >
          {categoriesDisplay.map((category) => {
            const isActive = selectedCategory === category;
            const iconName = categoryIcons[category] || "funnel";

            return (
              <TouchableOpacity
                key={category}
                activeOpacity={0.9}
                style={[
                  styles.filterButtonSegmented,
                  isActive && styles.selectedFilterSegmented,
                ]}
                onPress={() => {
                  setSelectedCategory(category);
                  setSelectedReportIndex(0);
                }}
              >
                <Ionicons
                  name={iconName}
                  size={14}
                  color={isActive ? "#fff" : C.primary}
                  style={styles.filterIcon}
                />
                <ThemedText
                  style={[
                    styles.filterTextSegmented,
                    isActive && styles.selectedFilterTextSegmented,
                  ]}
                >
                  {category}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </ThemedView>

      {locationReason !== "gps" && (
        <View
          style={[
            styles.locationAlertBanner,
            locationAlertConfig[locationReason].tone === "warning"
              ? styles.locationAlertBannerWarning
              : styles.locationAlertBannerInfo,
          ]}
        >
          <Ionicons
            name={locationAlertConfig[locationReason].icon}
            size={16}
            color={
              locationAlertConfig[locationReason].tone === "warning"
                ? C.warning
                : C.primary
            }
          />
          <ThemedText
            style={[
              styles.locationAlertText,
              locationAlertConfig[locationReason].tone === "warning"
                ? styles.locationAlertTextWarning
                : styles.locationAlertTextInfo,
            ]}
          >
            {locationAlertConfig[locationReason].title}
          </ThemedText>
        </View>
      )}

      {loading && reports.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
          <ThemedText style={{ marginTop: 8 }}>
            Carregando mapa e denúncias...
          </ThemedText>
        </View>
      ) : (
        <View style={styles.mapStage}>
          <MapComponent
            style={[
              styles.map,
              locationSource === "none" && styles.mapDisabled,
            ]}
            reports={sortedReports}
            zones={formattedZones}
            userLocation={userLocation}
          />

          {locationReason !== "gps" && (
            <View style={styles.gpsDisabledOverlay} pointerEvents="auto">
              <View
                style={[
                  styles.gpsDisabledCard,
                  locationAlertConfig[locationReason].tone === "warning"
                    ? styles.gpsDisabledCardWarning
                    : styles.gpsDisabledCardInfo,
                ]}
              >
                <Ionicons
                  name={locationAlertConfig[locationReason].icon}
                  size={28}
                  color={
                    locationAlertConfig[locationReason].tone === "warning"
                      ? C.warning
                      : C.primary
                  }
                />
                <ThemedText style={styles.gpsDisabledTitle}>
                  {locationAlertConfig[locationReason].title}
                </ThemedText>
                <ThemedText style={styles.gpsDisabledText}>
                  {locationAlertConfig[locationReason].text}
                </ThemedText>
              </View>
            </View>
          )}
        </View>
      )}

      {/* CARROSSEL DE DENÚNCIAS PRÓXIMAS COM SETAS */}
      <ThemedView style={styles.nearbyContainer}>
        <View style={styles.nearbyHeaderRow}>
          <ThemedText type="subtitle" style={styles.nearbyTitle}>
            Denúncias por Proximidade ({sortedReports.length})
          </ThemedText>

          {sortedReports.length > 1 && (
            <View style={styles.arrowGroup}>
              <TouchableOpacity
                style={[
                  styles.arrowBtn,
                  selectedReportIndex === 0 && styles.arrowBtnDisabled,
                ]}
                onPress={handlePrev}
                disabled={selectedReportIndex === 0}
              >
                <Ionicons
                  name="chevron-back"
                  size={18}
                  color={selectedReportIndex === 0 ? C.text3 : C.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.arrowBtn,
                  selectedReportIndex === sortedReports.length - 1 &&
                    styles.arrowBtnDisabled,
                ]}
                onPress={handleNext}
                disabled={selectedReportIndex === sortedReports.length - 1}
              >
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={
                    selectedReportIndex === sortedReports.length - 1
                      ? C.text3
                      : C.primary
                  }
                />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 20 }}
        >
          {sortedReports.length === 0 ? (
            <View style={styles.nearbyItemEmpty}>
              <ThemedText style={{ color: C.text3 }}>
                Nenhuma denúncia encontrada nesta categoria
              </ThemedText>
            </View>
          ) : (
            sortedReports.map((rep, index) => (
              <TouchableOpacity
                key={rep.id}
                style={[
                  styles.nearbyCard,
                  selectedReportIndex === index && styles.nearbyCardActive,
                ]}
                onPress={() => setSelectedReportIndex(index)}
              >
                <View style={styles.nearbyCardHeader}>
                  <ThemedText style={styles.nearbyCategory}>
                    {rep.category}
                  </ThemedText>
                  {rep.dist !== null && (
                    <View style={styles.distBadge}>
                      <Ionicons name="location" size={12} color={C.primary} />
                      <ThemedText style={styles.distText}>
                        {formatDistance(rep.dist)}
                      </ThemedText>
                    </View>
                  )}
                </View>
                <ThemedText style={styles.nearbyDesc} numberOfLines={2}>
                  {rep.description || "Sem descrição cadastrada"}
                </ThemedText>
                <View style={styles.statusRow}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          rep.status === "pending" ? C.warning : C.eco,
                      },
                    ]}
                  />
                  <ThemedText style={styles.statusText}>
                    {rep.status === "pending"
                      ? "Aguardando"
                      : rep.status === "investigating"
                        ? "Em processo"
                        : "Concluída"}
                  </ThemedText>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterContainer: {
    paddingTop: 12,
    paddingBottom: 10,
    paddingHorizontal: 12,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterScrollContent: {
    paddingRight: 8,
    alignItems: "center",
  },
  filterButtonSegmented: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: "#f3f6fb",
    borderWidth: 1,
    borderColor: "#dfe7f5",
    justifyContent: "center",
    alignItems: "center",
    minHeight: 38,
    flexDirection: "row",
  },
  selectedFilterSegmented: {
    backgroundColor: C.primary,
    borderColor: C.primary,
    shadowColor: "#1a5fd4",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  filterTextSegmented: {
    fontSize: 12,
    fontWeight: "700",
    color: C.text2,
    textTransform: "capitalize",
  },
  selectedFilterTextSegmented: {
    color: "#fff",
  },
  filterIcon: {
    marginRight: 6,
  },
  mapStage: {
    flex: 1,
    position: "relative",
  },
  map: { flex: 1 },
  mapDisabled: {
    opacity: 0.42,
    backgroundColor: "rgba(15, 23, 42, 0.08)",
  },
  gpsDisabledOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    zIndex: 10,
  },
  gpsDisabledCard: {
    width: "100%",
    maxWidth: 280,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 22,
    paddingHorizontal: 18,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  gpsDisabledCardWarning: {
    borderColor: "rgba(217, 119, 6, 0.25)",
    shadowColor: "#d97706",
  },
  gpsDisabledCardInfo: {
    borderColor: "rgba(26, 95, 212, 0.18)",
    shadowColor: "#1a5fd4",
  },
  gpsDisabledTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "800",
    color: C.text,
  },
  gpsDisabledText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: C.text2,
    textAlign: "center",
  },
  locationAlertBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  locationAlertBannerWarning: {
    backgroundColor: "rgba(217, 119, 6, 0.08)",
    borderColor: "rgba(217, 119, 6, 0.2)",
  },
  locationAlertBannerInfo: {
    backgroundColor: "rgba(26, 95, 212, 0.08)",
    borderColor: "rgba(26, 95, 212, 0.18)",
  },
  locationAlertText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
  },
  locationAlertTextWarning: {
    color: C.warning,
  },
  locationAlertTextInfo: {
    color: C.primary,
  },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  nearbyContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: C.surface,
  },
  nearbyHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  nearbyTitle: { fontSize: 15, fontWeight: "700" },
  arrowGroup: { flexDirection: "row", gap: 6 },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.surface2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  arrowBtnDisabled: { opacity: 0.4 },

  nearbyItemEmpty: {
    backgroundColor: C.surface2,
    padding: 12,
    borderRadius: 10,
    width: 260,
  },
  nearbyCard: {
    backgroundColor: C.surface2,
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    width: 220,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  nearbyCardActive: {
    borderColor: C.primary,
    backgroundColor: C.primaryLight,
  },
  nearbyCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  nearbyCategory: {
    fontWeight: "700",
    fontSize: 14,
    textTransform: "capitalize",
  },
  distBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "rgba(0,122,255,0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  distText: { fontSize: 11, fontWeight: "700", color: C.primary },
  nearbyDesc: { fontSize: 12, color: C.text2, marginBottom: 8, height: 32 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: "600", color: C.text2 },
});
