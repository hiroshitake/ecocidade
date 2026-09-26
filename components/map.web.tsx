"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";
import { StyleSheet as RNStyleSheet } from "react-native";
import ReportMapModal, { MapReport } from "./report-map-modal";

interface Report extends MapReport {}

interface Zone {
  id: string;
  latitude: number;
  longitude: number;
  radius: number;
  name?: string;
  severity?: "baixa" | "media" | "alta";
}

interface MapComponentProps {
  style?: CSSProperties;
  reports?: Report[];
  zones?: Zone[];
  userLocation?: { latitude: number; longitude: number } | null;
  selectedLocation?: { latitude: number; longitude: number } | null;
  selectLocation?: boolean;
  onSelectLocation?: (location: { latitude: number; longitude: number }) => void;
  onSelectReport?: (report: Report) => void;
  onZoneClick?: (zone: Zone) => void;
}

export default function MapComponent({
  style,
  reports = [],
  userLocation = null,
  selectedLocation = null,
  selectLocation = false,
  onSelectLocation,
  onSelectReport,
  zones = [],
  onZoneClick,
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerLayerRef = useRef<any>(null);
  const zoneLayerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const userMarkerRef = useRef<any>(null);
  const selectedMarkerRef = useRef<any>(null);
  const hasSetInitialViewRef = useRef(false);
  const previousCenteredLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const onSelectLocationRef = useRef(onSelectLocation);

  useEffect(() => {
    onSelectLocationRef.current = onSelectLocation;
  }, [onSelectLocation]);

  useEffect(() => {
    if (!mapRef.current || typeof window === "undefined") return;

    const initMap = async () => {
      try {
        const L = await import("leaflet").then((m) => m.default);
        require("leaflet/dist/leaflet.css");

        const DefaultIcon = L.icon({
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
        });

        L.Marker.prototype.setIcon(DefaultIcon);
        (window as any).L = L;

        if (!document.getElementById("ecocidade-pulse-style")) {
          const style = document.createElement("style");
          style.id = "ecocidade-pulse-style";
          style.innerHTML = `
            .ecocidade-pulse {
              width: 28px;
              height: 28px;
              position: relative;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .ecocidade-pulse::before {
              content: '';
              position: absolute;
              top: 50%;
              left: 50%;
              width: 24px;
              height: 24px;
              transform: translate(-50%, -50%);
              border-radius: 50%;
              background: rgba(26, 95, 212, 0.3);
              animation: ecocidade-pulse 1.8s ease-out infinite;
              border: 2px solid rgba(26, 95, 212, 0.5);
            }
            .ecocidade-pulse::after {
              content: '';
              position: absolute;
              top: 50%;
              left: 50%;
              width: 14px;
              height: 14px;
              transform: translate(-50%, -50%);
              border-radius: 50%;
              background: #1a5fd4;
              border: 2.5px solid white;
              box-shadow: 0 0 12px rgba(26, 95, 212, 0.5), inset 0 0 4px rgba(255, 255, 255, 0.6);
              z-index: 10;
            }
            @keyframes ecocidade-pulse {
              0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
              100% { transform: translate(-50%, -50%) scale(2.2); opacity: 0; }
            }
            .ecocidade-selected-marker {
              width: 32px;
              height: 40px;
              background: #1fa660;
              border: 3px solid white;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              box-shadow: 0 0 16px rgba(31, 166, 96, 0.4), 0 4px 8px rgba(0, 0, 0, 0.15);
              display: flex;
              align-items: center;
              justify-content: center;
              position: relative;
            }
            .ecocidade-selected-marker::after {
              content: '';
              width: 8px;
              height: 8px;
              background: white;
              border-radius: 50%;
              transform: rotate(45deg);
            }
          `;
          document.head.appendChild(style);
        }

        if (!mapInstanceRef.current && mapRef.current) {
          const map = L.map(mapRef.current, {
            zoomControl: true,
            scrollWheelZoom: true,
            touchZoom: true,
            doubleClickZoom: true,
            dragging: true,
            inertia: true,
            closePopupOnClick: false,
          }).setView([-23.5505, -46.6333], 13);

          L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap contributors",
            maxZoom: 19,
            minZoom: 2,
          }).addTo(map);

          map.on("click", (e: any) => {
            if (selectLocation && onSelectLocationRef.current) {
              onSelectLocationRef.current({ latitude: e.latlng.lat, longitude: e.latlng.lng });
            }
          });

          markerLayerRef.current = L.layerGroup().addTo(map);
          zoneLayerRef.current = L.layerGroup().addTo(map);
          mapInstanceRef.current = map;
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Error loading map:", error);
        setIsLoading(false);
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!markerLayerRef.current || typeof window === "undefined") return;
    const L = (window as any).L;
    if (!L) return;

    markerLayerRef.current.clearLayers();
    if (zoneLayerRef.current) zoneLayerRef.current.clearLayers();

    const validReports = reports.filter(
      (report) => report.location?.latitude != null && report.location?.longitude != null,
    );

    validReports.forEach((report) => {
      const marker = L.marker(
        [report.location!.latitude!, report.location!.longitude!],
        { interactive: true },
      ).addTo(markerLayerRef.current);

      marker.on("click", () => {
        setSelectedReport(report);
        onSelectReport?.(report);
      });
    });

    if (userLocation) {
      if (userMarkerRef.current) userMarkerRef.current.remove();
      const pulseIcon = L.divIcon({ className: "ecocidade-pulse", iconSize: [18, 18], iconAnchor: [9, 9] });
      userMarkerRef.current = L.marker(
        [userLocation.latitude, userLocation.longitude],
        { icon: pulseIcon, interactive: false },
      ).bindPopup("<strong>Você está aqui</strong>").addTo(markerLayerRef.current);
    }

    if (selectedLocation) {
      if (selectedMarkerRef.current) selectedMarkerRef.current.remove();
      const selectedIcon = L.divIcon({ className: "ecocidade-selected-marker", iconSize: [32, 40], iconAnchor: [16, 40] });
      selectedMarkerRef.current = L.marker(
        [selectedLocation.latitude, selectedLocation.longitude],
        { icon: selectedIcon, interactive: false },
      ).bindPopup('<strong style="color: #0d1b36;">Local selecionado</strong>').addTo(markerLayerRef.current);
    }

    if (zones && zoneLayerRef.current) {
      zones.forEach((zone) => {
        const severity = zone.severity || "baixa";
        const color = severity === "alta" ? "#d92020" : severity === "media" ? "#d97706" : "#1fa660";
        const circle = L.circle([zone.latitude, zone.longitude], {
          radius: zone.radius,
          color,
          fillColor: `${color}40`,
          fillOpacity: 0.16,
          weight: 2,
        }).addTo(zoneLayerRef.current);
        circle.bindPopup(`<strong>${zone.name || "Zona de perigo"}</strong>`);
        circle.on("click", () => onZoneClick?.(zone));
      });
    }

    const map = mapInstanceRef.current;
    if (!map) return;

    const centerTarget = selectedLocation || userLocation;
    const locationChanged = centerTarget &&
      (!previousCenteredLocationRef.current ||
        centerTarget.latitude !== previousCenteredLocationRef.current.latitude ||
        centerTarget.longitude !== previousCenteredLocationRef.current.longitude);

    if (!hasSetInitialViewRef.current) {
      if (centerTarget) {
        map.setView([centerTarget.latitude, centerTarget.longitude], 13);
      } else if (zones && zones.length > 0) {
        const first = zones[0];
        map.setView([first.latitude, first.longitude], 13);
      } else if (validReports.length > 0) {
        const first = validReports[0];
        map.setView([first.location!.latitude!, first.location!.longitude!], 13);
      }
      hasSetInitialViewRef.current = true;
    } else if (locationChanged && centerTarget) {
      map.setView([centerTarget.latitude, centerTarget.longitude], map.getZoom ? map.getZoom() : 13);
    }

    previousCenteredLocationRef.current = centerTarget || null;
  }, [reports, userLocation, selectedLocation, zones, onSelectReport, onZoneClick]);

  return (
    <>
      <div
        ref={mapRef}
        style={{
          width: "100%",
          height: "100%",
          minHeight: "400px",
          background: isLoading ? "#e0e0e0" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          touchAction: "auto",
          ...((style as any) ? RNStyleSheet.flatten(style as any) : {}),
        }}
      >
        {isLoading && <div>Carregando mapa...</div>}
      </div>
      <ReportMapModal report={selectedReport} onClose={() => setSelectedReport(null)} />
    </>
  );
}
