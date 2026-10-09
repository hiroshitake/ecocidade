import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  useWindowDimensions,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import MapComponent from "../../components/map";
import { ThemedText } from "../../components/themed-text";
import { C } from "../../constants/theme";
import { useAppTheme } from "../../context/theme-context";
import { resolveUserLocationWithFallback } from "../../services/auth";
import { getDangerZones, getPublicReports } from "../../services/reports";
import { getUnreadNotificationCount } from "../../services/notifications";

const CATEGORIES = [
  { id: "Todas", label: "Todas", icon: "apps-outline" },
  { id: "buraco", label: "Buraco", icon: "construct-outline" },
  { id: "poste", label: "Iluminação", icon: "bulb-outline" },
  { id: "vazamento", label: "Vazamento", icon: "water-outline" },
  { id: "bueiro", label: "Bueiro", icon: "git-network-outline" },
  { id: "mato", label: "Mato", icon: "leaf-outline" },
  { id: "calçada", label: "Calçada", icon: "walk-outline" },
  { id: "lixo", label: "Lixo", icon: "trash-outline" },
  { id: "sinalizacao", label: "Sinalização", icon: "alert-circle-outline" },
  { id: "outro", label: "Outro", icon: "ellipsis-horizontal-outline" },
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

const CATEGORY_LABELS: Record<string, string> = {
  buraco: "Buraco",
  poste: "Iluminação",
  vazamento: "Vazamento",
  bueiro: "Bueiro",
  mato: "Mato",
  calcada: "Calçada",
  "calçada": "Calçada",
  lixo: "Lixo",
  sinalizacao: "Sinalização",
  "sinalização": "Sinalização",
  outro: "Outro",
};

function formatCategoryLabel(category: unknown) {
  const value = String(category || "").trim();
  return CATEGORY_LABELS[value.toLocaleLowerCase("pt-BR")] || value || "Denúncia";
}

export default function MapScreen() {
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [searchQuery, setSearchQuery] = useState("");
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
  // selectedReportId só é preenchido quando o usuário pede explicitamente para abrir os detalhes
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [recenterRequest, setRecenterRequest] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isFeedCollapsed, setIsFeedCollapsed] = useState(false);
  const [isRefreshingMap, setIsRefreshingMap] = useState(false);

  const toggleFeedCollapse = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    if (Platform.OS !== "web") {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setIsFeedCollapsed((prev) => !prev);
  };
  const scrollViewRef = useRef<ScrollView>(null);

  const loadData = useCallback(async () => {
    setSelectedReportId(null);
    try {
      setLoading(true);

      const [fetchedReports, fetchedZones, resolvedLocation] =
        await Promise.all([
          getPublicReports().catch(() => []),
          getDangerZones().catch(() => []),
          resolveUserLocationWithFallback().catch(() => ({
            location: null,
            source: "none" as const,
            reason: "gps_unavailable" as const,
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

  const watchRef = useRef<any>(null);

  const stopLocationWatch = useCallback(() => {
    try {
      if (!watchRef.current) return;

      if (
        typeof navigator !== "undefined" &&
        navigator.geolocation &&
        typeof watchRef.current === "number"
      ) {
        navigator.geolocation.clearWatch(watchRef.current as number);
      } else if (
        watchRef.current &&
        typeof watchRef.current.remove === "function"
      ) {
        watchRef.current.remove();
      }
    } catch (error) {
      console.debug("Erro ao encerrar monitoramento de localização:", error);
    } finally {
      watchRef.current = null;
    }
  }, []);

  const startLocationWatch = useCallback(() => {
    stopLocationWatch();

    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.geolocation) {
      try {
        const watchId = navigator.geolocation.watchPosition(
          (position) => {
            setUserLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
            setLocationSource("gps");
            setLocationReason("gps");
          },
          (error) => {
            console.debug("watchPosition error:", error);
            if (error.code === 1) {
              setLocationSource("none");
              setLocationReason("permission_denied");
            }
          },
          {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 15000,
          },
        );

        watchRef.current = watchId;
      } catch (error) {
        console.debug("Não foi possível iniciar watchPosition:", error);
      }
      return;
    }

    (async () => {
      try {
        const location = await import("expo-location");
        const { status } =
          await location.default.getForegroundPermissionsAsync();

        if (status !== "granted") {
          setLocationSource("none");
          setLocationReason("permission_denied");
          return;
        }

        const subscription = await location.default.watchPositionAsync(
          {
            accuracy: location.default.Accuracy.High,
            timeInterval: 2000,
            distanceInterval: 5,
          },
          (position) => {
            if (!position) return;
            setUserLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
            setLocationSource("gps");
            setLocationReason("gps");
          },
        );

        watchRef.current = subscription;
      } catch (error) {
        console.debug("Não foi possível iniciar monitoramento Expo:", error);
      }
    })();
  }, [stopLocationWatch]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      startLocationWatch();

      getUnreadNotificationCount()
        .then(setUnreadNotifications)
        .catch((error) =>
          console.warn("Erro ao carregar contador de notificações:", error),
        );

      return () => {
        stopLocationWatch();
      };
    }, [loadData, startLocationWatch, stopLocationWatch]),
  );

  const handleRefreshMap = useCallback(async () => {
    if (isRefreshingMap) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setIsRefreshingMap(true);
      await loadData();
    } finally {
      setIsRefreshingMap(false);
    }
  }, [isRefreshingMap, loadData]);

  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      const category = String(item.category || "").toLowerCase();
      if (category === "seguranca") return false;

      if (
        selectedCategory !== "Todas" &&
        category !== selectedCategory.toLowerCase()
      ) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const title = String(item.title || "").toLowerCase();
        const desc = String(item.description || "").toLowerCase();
        const cat = String(item.category || "").toLowerCase();
        const proto = String(item.id || "").toLowerCase();
        const addr = String(item.address || item.location?.address || "").toLowerCase();

        if (
          !title.includes(query) &&
          !desc.includes(query) &&
          !cat.includes(query) &&
          !proto.includes(query) &&
          !addr.includes(query)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [reports, selectedCategory, searchQuery]);

  const sortedReports = useMemo(() => {
    return filteredReports
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
          distanceKm: dist,
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
  }, [filteredReports, userLocation]);

  const formattedZones = useMemo(() => {
    return zones.map((z) => ({
      id: String(z.id),
      name: z.name || "Área de risco",
      latitude: Number(z.latitude) || 0,
      longitude: Number(z.longitude) || 0,
      radius: Number(z.radius) || 300,
      severity: z.severity || "media",
    }));
  }, [zones]);

  // Apenas seleciona visualmente no carrossel e posiciona sem abrir modal intrusivo
  const handleSelectReport = (index: number) => {
    setSelectedReportIndex(index);
    scrollViewRef.current?.scrollTo({ x: index * 260, animated: true });
  };

  const handleOpenDetails = (repId: string) => {
    setSelectedReportId(repId);
  };

  const handlePrev = () => {
    if (selectedReportIndex > 0) {
      const nextIdx = selectedReportIndex - 1;
      handleSelectReport(nextIdx);
    }
  };

  const handleNext = () => {
    if (selectedReportIndex < sortedReports.length - 1) {
      const nextIdx = selectedReportIndex + 1;
      handleSelectReport(nextIdx);
    }
  };

  const locationAlertConfig = {
    gps: null,
    gps_unavailable: {
      icon: "locate-outline" as keyof typeof Ionicons.glyphMap,
      title: "GPS em espera",
      text: "Ative a localização para ordenação exata por proximidade.",
    },
    permission_denied: {
      icon: "warning-outline" as keyof typeof Ionicons.glyphMap,
      title: "Permissão de GPS",
      text: "Permita o acesso à localização para ver o raio ao seu redor.",
    },
    city_fallback: {
      icon: "business-outline" as keyof typeof Ionicons.glyphMap,
      title: "Centro da Cidade",
      text: "Exibindo panorama municipal com centro urbano padrão.",
    },
  };

  return (
    <View style={styles.container}>
      {/* Top Floating Civic Command Bar */}
      <View style={styles.topControlPanel}>
        {/* Row 1: Brand & Actions (Separado em linha própria no mobile) */}
        <View style={styles.topHeaderRow}>
          <View style={styles.brandBadge}>
            <View style={styles.brandIconWrapper}>
              <Ionicons name="leaf" size={14} color="#fff" />
            </View>
            <View>
              <ThemedText style={styles.brandTitle}>ECOcidade</ThemedText>
              <ThemedText style={styles.brandSubtitle}>
                {sortedReports.length} {sortedReports.length === 1 ? "ocorrência" : "ocorrências"}
              </ThemedText>
            </View>
          </View>

          {isDesktop && (
            <View style={styles.searchBarContainerDesktop}>
              <Ionicons name="search" size={16} color={colors.text3} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar rua, categoria ou chamado..."
                placeholderTextColor={colors.text3}
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  setSelectedReportIndex(0);
                }}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={16} color={colors.text3} />
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.actionButtonsGroup}>
            <TouchableOpacity
              style={styles.actionIconButton}
              onPress={() => router.push("/notifications")}
              activeOpacity={0.8}
            >
              <Ionicons name="notifications-outline" size={18} color={colors.text} />
              {unreadNotifications > 0 && (
                <View style={styles.notifBadge}>
                  <ThemedText style={styles.notifBadgeText}>
                    {unreadNotifications > 99 ? "99+" : unreadNotifications}
                  </ThemedText>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionIconButton}
              onPress={handleRefreshMap}
              disabled={isRefreshingMap}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isRefreshingMap ? "sync" : "refresh-outline"}
                size={18}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Row 2: Search Bar Full Width no Mobile */}
        {!isDesktop && (
          <View style={styles.searchBarContainerMobile}>
            <Ionicons name="search" size={16} color={colors.text3} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar rua, bairro, categoria..."
              placeholderTextColor={colors.text3}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                setSelectedReportIndex(0);
                setSelectedReportId(null);
              }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={16} color={colors.text3} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Row 3: Category Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
          style={styles.categoryScroll}
        >
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryPill,
                  isActive && styles.categoryPillActive,
                ]}
                onPress={() => {
                  setSelectedCategory(cat.id);
                  setSelectedReportIndex(0);
                  setSelectedReportId(null);
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={cat.icon as any}
                  size={14}
                  color={isActive ? "#fff" : colors.text2}
                />
                <ThemedText
                  style={[
                    styles.categoryPillText,
                    isActive && styles.categoryPillTextActive,
                  ]}
                >
                  {cat.label}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* GPS Status Indicator (Discreet Pill) */}
      {locationReason !== "gps" && locationAlertConfig[locationReason] && (
        <View style={styles.locationPill}>
          <Ionicons
            name={locationAlertConfig[locationReason].icon}
            size={14}
            color="#f59e0b"
          />
          <ThemedText style={styles.locationPillText}>
            {locationAlertConfig[locationReason].title}
          </ThemedText>
        </View>
      )}

      {/* Map Surface */}
      <View style={styles.mapContainer}>
        {loading && reports.length === 0 ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <ThemedText style={styles.loadingText}>
              Carregando camadas do mapa...
            </ThemedText>
          </View>
        ) : (
          <MapComponent
            style={[
              styles.map,
              locationSource === "none" && styles.mapDisabled,
            ]}
            reports={sortedReports}
            zones={formattedZones}
            userLocation={userLocation}
            followUserLocation={false}
            selectedReportId={selectedReportId}
            onCloseSelectedReport={() => setSelectedReportId(null)}
            recenterRequest={recenterRequest}
          />
        )}
      </View>

      {/* Floating Side Action Controls */}
      <View
        style={[
          styles.floatingControls,
          !isDesktop &&
            (isFeedCollapsed
              ? styles.floatingControlsCollapsed
              : styles.floatingControlsExpanded),
        ]}
      >
        <TouchableOpacity
          style={styles.controlFab}
          onPress={() => {
            if (userLocation) {
              setRecenterRequest((value) => value + 1);
              return;
            }

            resolveUserLocationWithFallback()
              .then((resolvedLocation) => {
                if (!resolvedLocation?.location) return;
                setUserLocation(resolvedLocation.location);
                setLocationSource(resolvedLocation.source);
                setLocationReason(resolvedLocation.reason);
                setRecenterRequest((value) => value + 1);
              })
              .catch(() => {});
          }}
          activeOpacity={0.8}
        >
          <Ionicons
            name="navigate"
            size={18}
            color={locationReason === "gps" ? colors.primary : colors.text3}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.controlFab}
          onPress={() => router.push("/new-report")}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Modern Floating Bottom Panel (Compact, Non-Intrusive) */}
      <View
        style={[
          styles.bottomFeedPanel,
          isFeedCollapsed && styles.bottomFeedPanelCollapsed,
          isDesktop && styles.bottomFeedPanelDesktop,
        ]}
      >
        <View style={styles.feedHeader}>
          <TouchableOpacity
            style={styles.feedHeaderLeft}
            onPress={toggleFeedCollapse}
            activeOpacity={0.7}
          >
            <ThemedText style={styles.feedTitle}>
              Proximidade
            </ThemedText>
            <View style={styles.feedCountBadge}>
              <ThemedText style={styles.feedCountBadgeText}>
                {sortedReports.length}
              </ThemedText>
            </View>
          </TouchableOpacity>

          <View style={styles.feedHeaderRight}>
            {sortedReports.length > 1 && !isFeedCollapsed && (
              <View style={styles.navArrowsRow}>
                <TouchableOpacity
                  style={[
                    styles.miniArrowBtn,
                    selectedReportIndex === 0 && styles.miniArrowBtnDisabled,
                  ]}
                  onPress={handlePrev}
                  disabled={selectedReportIndex === 0}
                >
                  <Ionicons
                    name="chevron-back"
                    size={16}
                    color={
                      selectedReportIndex === 0 ? colors.text3 : colors.text
                    }
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.miniArrowBtn,
                    selectedReportIndex === sortedReports.length - 1 &&
                      styles.miniArrowBtnDisabled,
                  ]}
                  onPress={handleNext}
                  disabled={selectedReportIndex === sortedReports.length - 1}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={
                      selectedReportIndex === sortedReports.length - 1
                        ? colors.text3
                        : colors.text
                    }
                  />
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={styles.toggleCollapseBtn}
              onPress={toggleFeedCollapse}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={isFeedCollapsed ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.text2}
              />
            </TouchableOpacity>
          </View>
        </View>

        {!isFeedCollapsed && (
          <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardCarouselContent}
            style={styles.cardCarousel}
          >
            {sortedReports.length === 0 ? (
              <View style={styles.emptyCarouselCard}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color={colors.text3}
                />
                <ThemedText style={styles.emptyCarouselText}>
                  Nenhuma ocorrência encontrada nesta categoria ou busca.
                </ThemedText>
              </View>
            ) : (
              sortedReports.map((rep, index) => {
                const isSelected = selectedReportIndex === index;
                const statusStr = String(rep.status || "").toLowerCase();
                const isPending =
                  statusStr === "pending" || statusStr === "aguardando";
                const isResolved =
                  statusStr === "resolved" ||
                  statusStr === "concluida" ||
                  statusStr === "concluída";

                return (
                  <TouchableOpacity
                    key={rep.id}
                    style={[
                      styles.compactCard,
                      isSelected && styles.compactCardActive,
                    ]}
                    onPress={() => handleSelectReport(index)}
                    activeOpacity={0.9}
                  >
                    <View style={styles.cardTopRow}>
                      <View style={styles.cardCategoryChip}>
                        <ThemedText style={styles.cardCategoryText}>
                          {formatCategoryLabel(rep.category)}
                        </ThemedText>
                      </View>
                      {rep.dist !== null && (
                        <View style={styles.cardDistanceBadge}>
                          <Ionicons
                            name="navigate-outline"
                            size={11}
                            color={colors.primary}
                          />
                          <ThemedText style={styles.cardDistanceText}>
                            {formatDistance(rep.dist)}
                          </ThemedText>
                        </View>
                      )}
                    </View>

                    <ThemedText style={styles.cardDesc} numberOfLines={2}>
                      {rep.description || "Ocorrência registrada no município."}
                    </ThemedText>

                    <View style={styles.cardFooter}>
                      <View style={styles.cardStatusRow}>
                        <View
                          style={[
                            styles.statusIndicatorDot,
                            {
                              backgroundColor: isPending
                                ? "#f59e0b"
                                : isResolved
                                  ? "#10b981"
                                  : "#2563eb",
                            },
                          ]}
                        />
                        <ThemedText style={styles.cardStatusText}>
                          {isPending
                            ? "Aguardando"
                            : isResolved
                              ? "Concluída"
                              : "Em processo"}
                        </ThemedText>
                      </View>

                      <TouchableOpacity
                        style={styles.detailsActionBtn}
                        onPress={() => handleOpenDetails(rep.id)}
                        activeOpacity={0.7}
                      >
                        <ThemedText style={styles.detailsActionBtnText}>
                          Ver detalhes
                        </ThemedText>
                        <Ionicons name="chevron-forward" size={11} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const makeStyles = (colors: typeof C, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },

    /* Top Floating Command Bar */
    topControlPanel: {
      position: "absolute",
      top: 12,
      left: 12,
      right: 12,
      zIndex: 20,
      backgroundColor: isDark ? "rgba(17, 24, 39, 0.94)" : "rgba(255, 255, 255, 0.95)",
      borderRadius: 14,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#0f172a",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 6,
    },
    topHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    brandBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    brandIconWrapper: {
      width: 28,
      height: 28,
      borderRadius: 7,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    brandTitle: {
      fontSize: 13,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.2,
      lineHeight: 15,
    },
    brandSubtitle: {
      fontSize: 10,
      color: colors.text3,
      fontWeight: "500",
      lineHeight: 12,
    },

    searchBarContainerDesktop: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface2,
      borderRadius: 8,
      paddingHorizontal: 10,
      height: 34,
      gap: 6,
      borderWidth: 1,
      borderColor: colors.border,
      marginHorizontal: 12,
    },
    searchBarContainerMobile: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface2,
      borderRadius: 8,
      paddingHorizontal: 10,
      height: 36,
      gap: 6,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 12,
      color: colors.text,
      padding: 0,
    },

    actionButtonsGroup: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    actionIconButton: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    notifBadge: {
      position: "absolute",
      top: 2,
      right: 2,
      backgroundColor: "#ef4444",
      borderRadius: 6,
      minWidth: 13,
      height: 13,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 2,
    },
    notifBadgeText: {
      color: "#fff",
      fontSize: 8,
      fontWeight: "800",
    },

    categoryScroll: {
      flexGrow: 0,
    },
    categoryScrollContent: {
      gap: 6,
      paddingRight: 8,
    },
    categoryPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 16,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    categoryPillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    categoryPillText: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.text2,
    },
    categoryPillTextActive: {
      color: "#fff",
    },

    /* GPS Status Pill */
    locationPill: {
      position: "absolute",
      top: 140,
      alignSelf: "center",
      zIndex: 15,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: isDark ? "rgba(17, 24, 39, 0.94)" : "rgba(255, 255, 255, 0.95)",
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: isDark ? "rgba(245, 158, 11, 0.3)" : "rgba(245, 158, 11, 0.4)",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3,
    },
    locationPillText: {
      fontSize: 11,
      fontWeight: "600",
      color: isDark ? "#fbbf24" : "#92400e",
    },

    /* Map Surface */
    mapContainer: {
      flex: 1,
      position: "relative",
    },
    map: {
      flex: 1,
    },
    mapDisabled: {
      opacity: 0.85,
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.bg,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10,
    },
    loadingText: {
      marginTop: 10,
      fontSize: 13,
      color: colors.text3,
      fontWeight: "500",
    },

    /* Floating Right Action Controls */
    floatingControls: {
      position: "absolute",
      right: 14,
      bottom: 150,
      zIndex: 25,
      gap: 8,
    },
    floatingControlsExpanded: {
      bottom: 220,
    },
    floatingControlsCollapsed: {
      bottom: 64,
    },
    controlFab: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: isDark ? "rgba(17, 24, 39, 0.94)" : "rgba(255, 255, 255, 0.95)",
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#0f172a",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 4,
    },

    /* Compact Bottom Feed Panel */
    bottomFeedPanel: {
      position: "absolute",
      bottom: 12,
      left: 12,
      right: 12,
      zIndex: 20,
      backgroundColor: isDark ? "rgba(17, 24, 39, 0.95)" : "rgba(255, 255, 255, 0.96)",
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#0f172a",
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 6,
    },
    bottomFeedPanelDesktop: {
      maxWidth: 600,
      left: 20,
      right: "auto",
    },
    bottomFeedPanelCollapsed: {
      paddingBottom: 10,
    },
    feedHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 6,
    },
    feedHeaderLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    feedTitle: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.text,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    feedCountBadge: {
      backgroundColor: colors.surface2,
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    feedCountBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.text2,
    },
    feedHeaderRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    navArrowsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
    },
    miniArrowBtn: {
      width: 24,
      height: 24,
      borderRadius: 6,
      backgroundColor: colors.surface2,
      alignItems: "center",
      justifyContent: "center",
    },
    miniArrowBtnDisabled: {
      opacity: 0.4,
    },
    toggleCollapseBtn: {
      padding: 4,
    },

    cardCarousel: {
      marginTop: 4,
    },
    cardCarouselContent: {
      gap: 10,
      paddingRight: 6,
    },
    emptyCarouselCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 14,
      paddingHorizontal: 10,
    },
    emptyCarouselText: {
      fontSize: 12,
      color: colors.text3,
    },

    compactCard: {
      width: 260,
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
    },
    compactCardActive: {
      borderColor: colors.primary,
      borderWidth: 1.5,
      backgroundColor: "rgba(37, 99, 235, 0.02)",
    },
    cardTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 6,
    },
    cardCategoryChip: {
      backgroundColor: colors.surface2,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    cardCategoryText: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.text,
      textTransform: "capitalize",
    },
    cardDistanceBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
    },
    cardDistanceText: {
      fontSize: 10,
      fontWeight: "600",
      color: colors.primary,
    },
    cardDesc: {
      fontSize: 11,
      color: colors.text2,
      lineHeight: 15,
      marginBottom: 8,
    },
    cardFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 6,
    },
    cardStatusRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    statusIndicatorDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    cardStatusText: {
      fontSize: 10,
      fontWeight: "600",
      color: colors.text2,
    },
    detailsActionBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      paddingVertical: 2,
      paddingHorizontal: 6,
      borderRadius: 4,
      backgroundColor: "rgba(37, 99, 235, 0.08)",
    },
    detailsActionBtnText: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.primary,
    },
  });
