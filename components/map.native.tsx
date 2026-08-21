import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View, ViewStyle } from "react-native";
import MapView, { Callout, Circle, Marker, UrlTile } from "react-native-maps";

interface Report {
  id: string;
  category?: string;
  description?: string;
  location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
  };
}

interface Zone {
  id: string;
  latitude: number;
  longitude: number;
  radius: number;
  name?: string;
  description?: string;
  severity?: "baixa" | "media" | "alta";
}

interface MapComponentProps {
  style?: ViewStyle;
  reports?: Report[];
  zones?: Zone[];
  userLocation?: { latitude: number; longitude: number } | null;
  selectedLocation?: { latitude: number; longitude: number } | null;
  selectLocation?: boolean;
  onSelectLocation?: (location: {
    latitude: number;
    longitude: number;
  }) => void;
  onSelectReport?: (report: Report) => void;
  onZoneClick?: (zone: Zone) => void;
}

export default function MapComponent({
  style,
  reports = [],
  zones = [],
  userLocation = null,
  selectedLocation = null,
  selectLocation = false,
  onSelectLocation,
  onSelectReport,
  onZoneClick,
}: MapComponentProps) {
  const mapRef = useRef<MapView | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const validReports = reports.filter(
    (report) =>
      report.location?.latitude != null && report.location?.longitude != null,
  );
  const markerRefs = useRef<Record<string, any>>({});
  const hasCenteredRef = useRef(false);
  const previousCenteredLocationRef = useRef<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const selectedLocationCoords = selectedLocation || userLocation;

  const initialRegion = selectedLocationCoords
    ? {
        latitude: selectedLocationCoords.latitude,
        longitude: selectedLocationCoords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : validReports.length > 0
      ? {
          latitude: validReports[0].location!.latitude!,
          longitude: validReports[0].location!.longitude!,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }
      : {
          latitude: -23.5505,
          longitude: -46.6333,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        };

  useEffect(() => {
    if (!selectedLocationCoords || !mapRef.current || !mapReady) return;

    const locationChanged =
      !previousCenteredLocationRef.current ||
      selectedLocationCoords.latitude !==
        previousCenteredLocationRef.current.latitude ||
      selectedLocationCoords.longitude !==
        previousCenteredLocationRef.current.longitude;

    if (!hasCenteredRef.current || locationChanged) {
      mapRef.current.animateToRegion(
        {
          latitude: selectedLocationCoords.latitude,
          longitude: selectedLocationCoords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        700,
      );

      hasCenteredRef.current = true;
    }

    previousCenteredLocationRef.current = selectedLocationCoords;
  }, [selectedLocationCoords, mapReady]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulseAnim]);

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.4],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 0],
  });

  return (
    <MapView
      ref={mapRef}
      style={[styles.map, style]}
      initialRegion={initialRegion}
      onPress={(event) => {
        if (!selectLocation || !onSelectLocation) return;
        onSelectLocation({
          latitude: event.nativeEvent.coordinate.latitude,
          longitude: event.nativeEvent.coordinate.longitude,
        });
      }}
      onMapReady={() => setMapReady(true)}
      zoomEnabled={true}
      scrollEnabled={true}
      pitchEnabled={false}
      rotateEnabled={false}
    >
      <UrlTile
        urlTemplate="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
        maximumZ={19}
      />
      {userLocation ? (
        <Marker
          key="user-location"
          coordinate={{
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
          }}
        >
          <View style={styles.pulseMarkerContainer}>
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  transform: [{ scale: pulseScale }],
                  opacity: pulseOpacity,
                },
              ]}
            />
            <View style={styles.pulseCore} />
          </View>
        </Marker>
      ) : null}

      {selectedLocation ? (
        <Marker
          key="selected-location"
          coordinate={{
            latitude: selectedLocation.latitude,
            longitude: selectedLocation.longitude,
          }}
        >
          <View style={styles.selectedMarker} />
        </Marker>
      ) : null}

      {zones?.map((zone) => {
        const severity = zone.severity || "baixa";
        const color =
          severity === "alta"
            ? "#d92020"
            : severity === "media"
              ? "#d97706"
              : "#1fa660";
        return (
          <React.Fragment key={zone.id}>
            <Circle
              center={{ latitude: zone.latitude, longitude: zone.longitude }}
              radius={zone.radius}
              strokeColor={color}
              fillColor={`${color}30`}
              strokeWidth={2}
            />
            <Marker
              coordinate={{
                latitude: zone.latitude,
                longitude: zone.longitude,
              }}
              pinColor={color}
              title={zone.name || "Zona de perigo"}
              description={zone.description || "Área de risco"}
              onPress={() => onZoneClick?.(zone)}
            />
          </React.Fragment>
        );
      })}

      {validReports.map((report) => (
        <Marker
          ref={(ref) => {
            if (ref) {
              markerRefs.current[report.id] = ref;
            }
          }}
          key={report.id}
          coordinate={{
            latitude: report.location!.latitude!,
            longitude: report.location!.longitude!,
          }}
          title={report.category || "Denúncia"}
          description={report.description || "Sem detalhes"}
          onPress={() => {
            markerRefs.current[report.id]?.showCallout?.();
            onSelectReport?.(report);
          }}
        >
          <Callout>
            <View style={styles.callout}>
              <Text style={styles.calloutTitle}>
                {report.category || "Denúncia"}
              </Text>
              <Text style={styles.calloutText}>
                {report.description || "Sem descrição"}
              </Text>
              {report.location?.address ? (
                <Text style={styles.calloutSub}>{report.location.address}</Text>
              ) : null}
            </View>
          </Callout>
        </Marker>
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
    backgroundColor: "#f0f4ff",
  },
  callout: {
    maxWidth: 240,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    shadowColor: "#1a5fd4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  calloutTitle: {
    fontWeight: "700",
    marginBottom: 4,
    color: "#0d1b36",
    fontSize: 14,
  },
  calloutText: {
    marginBottom: 4,
    color: "#4a5568",
    fontSize: 12,
  },
  calloutSub: {
    color: "#8897b0",
    fontSize: 11,
  },
  selectedMarker: {
    width: 28,
    height: 36,
    borderRadius: 14,
    backgroundColor: "#1fa660",
    borderWidth: 3,
    borderColor: "#ffffff",
    shadowColor: "#1fa660",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  pulseMarkerContainer: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#1a5fd4",
  },
  pulseCore: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#1a5fd4",
    borderWidth: 2.5,
    borderColor: "#ffffff",
    shadowColor: "#1a5fd4",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
});
