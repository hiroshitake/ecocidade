import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import * as Haptics from "expo-haptics";
import { C } from "../../constants/theme";
import { useAppTheme } from "../../context/theme-context";
import { getMyReports } from "../../services/reports";
import ReportRetentionTimer from "../../components/report-retention-timer";

const TABS = ["Todas", "Aguardando", "Em processo", "Concluídas"];

const normalizeStatus = (status?: string) => {
  const value = String(status || "").trim().toLowerCase();

  if (["pending", "aguardando"].includes(value)) {
    return {
      label: "Aguardando",
      color: "#f59e0b",
      bg: "rgba(245, 158, 11, 0.12)",
      step: 1,
    };
  }

  if (["investigating", "in_progress", "processo", "em processo"].includes(value)) {
    return {
      label: "Em processo",
      color: "#2563eb",
      bg: "rgba(37, 99, 235, 0.12)",
      step: 2,
    };
  }

  if (["resolved", "concluida", "concluída", "completed", "done"].includes(value)) {
    return {
      label: "Concluída",
      color: "#10b981",
      bg: "rgba(16, 185, 129, 0.12)",
      step: 4,
    };
  }

  return {
    label: "Aguardando",
    color: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.12)",
    step: 1,
  };
};

const CATEGORY_MAP: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  buraco: { label: "Buraco na via", icon: "construct-outline" },
  poste: { label: "Iluminação pública", icon: "bulb-outline" },
  vazamento: { label: "Vazamento d'água", icon: "water-outline" },
  bueiro: { label: "Bueiro / Drenagem", icon: "git-network-outline" },
  mato: { label: "Mato alto / Praça", icon: "leaf-outline" },
  calcada: { label: "Calçada / Acessibilidade", icon: "walk-outline" },
  lixo: { label: "Descarte irregular", icon: "trash-outline" },
  sinalizacao: { label: "Sinalização de trânsito", icon: "alert-circle-outline" },
  seguranca: { label: "Segurança urbana", icon: "shield-checkmark-outline" },
  crime: { label: "Ocorrência / Crime", icon: "shield-outline" },
  tumulto: { label: "Aglomeração / Tumulto", icon: "people-outline" },
  perigo: { label: "Risco estrutural", icon: "warning-outline" },
};

const NATIVE_DRIVER = Platform.OS !== "web";

function AnimatedTicketCard({
  children,
  style,
  onPress,
  index,
}: {
  children: React.ReactNode;
  style: any;
  onPress: () => void;
  index: number;
}) {
  const entryAnim = React.useRef(new Animated.Value(0)).current;
  const pressAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.timing(entryAnim, {
      toValue: 1,
      duration: 320,
      delay: Math.min(index, 6) * 60,
      useNativeDriver: NATIVE_DRIVER,
    }).start();
  }, [entryAnim]);

  const handlePressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 0.97,
      useNativeDriver: NATIVE_DRIVER,
      friction: 6,
      tension: 120,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      useNativeDriver: NATIVE_DRIVER,
      friction: 5,
      tension: 100,
    }).start();
  };

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: entryAnim,
          transform: [
            {
              translateY: entryAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [18, 0],
              }),
            },
            { scale: pressAnim },
          ],
        },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.85}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ReportsScreen() {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  const [activeTab, setActiveTab] = useState("Todas");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const router = useRouter();

  const fetchReports = async () => {
    try {
      setLoadError(false);
      setLoading(true);
      const data = await getMyReports();
      setReports(data || []);
      if (isDesktop && data && data.length > 0 && !selectedReport) {
        setSelectedReport(data[0]);
      }
    } catch (error) {
      console.error("Erro ao carregar relatórios:", error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const mappedReports = useMemo(
    () =>
      reports.map((item) => {
        const catKey = String(item.category || "").toLowerCase();
        const catInfo = CATEGORY_MAP[catKey] || {
          label: item.category || "Cívica Geral",
          icon: "document-text-outline" as keyof typeof Ionicons.glyphMap,
        };
        const statusMeta = normalizeStatus(item.status);

        return {
          ...item,
          id: item.id,
          categoryLabel: catInfo.label,
          categoryIcon: catInfo.icon,
          title: item.title || catInfo.label,
          description: item.description || "Sem descrição cadastrada.",
          category: item.category || "Geral",
          date: item.created_at
            ? new Date(item.created_at).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "Data recente",
          updatedAt: item.updated_at
            ? new Date(item.updated_at).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : null,
          protocol: `#ECO-${String(item.id).slice(0, 6).toUpperCase()}`,
          ...statusMeta,
        };
      }),
    [reports],
  );

  const filteredReports = useMemo(() => {
    return mappedReports.filter((item) => {
      if (activeTab === "Todas") return true;
      if (activeTab === "Aguardando") return item.label === "Aguardando";
      if (activeTab === "Em processo") return item.label === "Em processo";
      if (activeTab === "Concluídas") return item.label === "Concluída";
      return true;
    });
  }, [mappedReports, activeTab]);

  const stats = useMemo(() => {
    return {
      total: mappedReports.length,
      pending: mappedReports.filter((item) => item.label === "Aguardando").length,
      inProgress: mappedReports.filter((item) => item.label === "Em processo").length,
      resolved: mappedReports.filter((item) => item.label === "Concluída").length,
    };
  }, [mappedReports]);

  const handleSelectReport = (item: any) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setSelectedReport(item);
    if (!isDesktop) {
      setModalOpen(true);
    }
  };

  const closeReportDetails = () => {
    if (!isDesktop) {
      setSelectedReport(null);
    }
    setModalOpen(false);
  };

  const currentSelection = selectedReport || (isDesktop && filteredReports.length > 0 ? filteredReports[0] : null);

  const renderDetailCard = (report: any, inModal = false) => {
    if (!report) {
      return (
        <View style={styles.emptyDetailContainer}>
          <Ionicons name="document-text-outline" size={48} color={colors.text3} />
          <Text style={styles.emptyDetailTitle}>Nenhuma solicitação selecionada</Text>
          <Text style={styles.emptyDetailText}>
            Clique em qualquer solicitação da lista para visualizar os detalhes completos, histórico e prazos de resolução.
          </Text>
        </View>
      );
    }

    return (
      <View style={[styles.detailCard, inModal && styles.detailCardInModal]}>
        <View style={styles.detailHeader}>
          <View style={styles.detailProtocolBadge}>
            <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
            <Text style={styles.detailProtocolText}>{report.protocol}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: report.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: report.color }]} />
            <Text style={[styles.statusText, { color: report.color }]}>
              {report.label}
            </Text>
          </View>
        </View>

        <Text style={styles.detailTitle}>{report.title}</Text>

        <View style={styles.detailMetaRow}>
          <View style={styles.detailMetaItem}>
            <Ionicons name={report.categoryIcon} size={15} color={colors.text2} />
            <Text style={styles.detailMetaText}>{report.categoryLabel}</Text>
          </View>
          <View style={styles.detailMetaDivider} />
          <View style={styles.detailMetaItem}>
            <Ionicons name="calendar-outline" size={15} color={colors.text2} />
            <Text style={styles.detailMetaText}>{report.date}</Text>
          </View>
        </View>

        {/* Civic Tracker / Step progress */}
        <View style={styles.trackerContainer}>
          <Text style={styles.trackerTitle}>Fluxo de Resolução</Text>
          <View style={styles.stepTrack}>
            <View style={[styles.stepItem, report.step >= 1 && styles.stepItemActive]}>
              <View style={[styles.stepCircle, report.step >= 1 && styles.stepCircleActive]}>
                <Ionicons name={report.step > 1 ? "checkmark" : "create-outline"} size={13} color="#fff" />
              </View>
              <Text style={styles.stepLabel}>Registrado</Text>
            </View>

            <View style={[styles.stepLine, report.step >= 2 && styles.stepLineActive]} />

            <View style={[styles.stepItem, report.step >= 2 && styles.stepItemActive]}>
              <View style={[styles.stepCircle, report.step >= 2 && styles.stepCircleActive]}>
                <Ionicons name={report.step > 2 ? "checkmark" : "search-outline"} size={13} color="#fff" />
              </View>
              <Text style={styles.stepLabel}>Análise</Text>
            </View>

            <View style={[styles.stepLine, report.step >= 4 && styles.stepLineActive]} />

            <View style={[styles.stepItem, report.step >= 4 && styles.stepItemActive]}>
              <View style={[styles.stepCircle, report.step >= 4 && styles.stepCircleActive]}>
                <Ionicons name="checkmark-done" size={13} color="#fff" />
              </View>
              <Text style={styles.stepLabel}>Concluído</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Descrição da Ocorrência</Text>
          <View style={styles.descriptionBox}>
            <Text style={styles.descriptionText}>{report.description}</Text>
          </View>
        </View>

        {report.address && (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Localização Informada</Text>
            <View style={styles.addressBox}>
              <Ionicons name="location-outline" size={18} color={colors.primary} />
              <Text style={styles.addressText}>{report.address}</Text>
            </View>
          </View>
        )}

        {report.updatedAt && (
          <View style={styles.updateCard}>
            <Ionicons name="time-outline" size={16} color={colors.text3} />
            <Text style={styles.updateCardText}>
              Última atualização registrada pelo município em {report.updatedAt}
            </Text>
          </View>
        )}

        {report.label === "Concluída" && (
          <View style={styles.retentionBox}>
            <ReportRetentionTimer resolvedAt={report.resolved_at} audience="user" />
          </View>
        )}

        {inModal && (
          <TouchableOpacity style={styles.btnSecondary} onPress={closeReportDetails}>
            <Text style={styles.btnSecondaryText}>Fechar</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.root}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/map")}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>Minhas Solicitações</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>Acompanhe suas denúncias</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.newReportBtn}
          onPress={() => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch {}
            router.push("/new-report");
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.newReportBtnText}>Nova denúncia</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        {/* Metric Cards Banner */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statIconBadge}>
              <Ionicons name="layers-outline" size={18} color={colors.text} />
            </View>
            <View>
              <Text style={styles.statNumber}>{stats.total}</Text>
              <Text style={styles.statCaption}>Total Enviadas</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconBadge, { backgroundColor: "rgba(245, 158, 11, 0.15)" }]}>
              <Ionicons name="time-outline" size={18} color="#f59e0b" />
            </View>
            <View>
              <Text style={[styles.statNumber, { color: "#f59e0b" }]}>{stats.pending}</Text>
              <Text style={styles.statCaption}>Aguardando</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconBadge, { backgroundColor: "rgba(37, 99, 235, 0.15)" }]}>
              <Ionicons name="sync-outline" size={18} color="#2563eb" />
            </View>
            <View>
              <Text style={[styles.statNumber, { color: "#2563eb" }]}>{stats.inProgress}</Text>
              <Text style={styles.statCaption}>Em Processo</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconBadge, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
              <Ionicons name="checkmark-done" size={18} color="#10b981" />
            </View>
            <View>
              <Text style={[styles.statNumber, { color: "#10b981" }]}>{stats.resolved}</Text>
              <Text style={styles.statCaption}>Concluídas</Text>
            </View>
          </View>
        </View>

        {/* Filter Segmented Bar */}
        <View style={styles.filterBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {TABS.map((tab) => {
              const active = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {tab}
                  </Text>
                  {tab === "Todas" && (
                    <View style={[styles.filterCount, active && styles.filterCountActive]}>
                      <Text style={[styles.filterCountText, active && styles.filterCountTextActive]}>
                        {stats.total}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Main Content Area (Split in desktop, single column in mobile) */}
        <View style={styles.contentRow}>
          {/* List Column */}
          <View style={[styles.listColumn, isDesktop && styles.listColumnDesktop]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollList}>
              {loading ? (
                <View style={styles.stateFeedback}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.stateFeedbackText}>Buscando suas solicitações...</Text>
                </View>
              ) : loadError ? (
                <View style={styles.stateFeedback}>
                  <Ionicons name="alert-circle-outline" size={44} color="#ef4444" />
                  <Text style={styles.errorTitle}>Não foi possível carregar as denúncias</Text>
                  <Text style={styles.errorSubtitle}>Verifique sua conexão e tente novamente.</Text>
                  <TouchableOpacity style={styles.retryBtn} onPress={fetchReports}>
                    <Text style={styles.retryBtnText}>Recarregar</Text>
                  </TouchableOpacity>
                </View>
              ) : filteredReports.length === 0 ? (
                <View style={styles.stateFeedback}>
                  <Ionicons name="file-tray-outline" size={48} color={colors.text3} />
                  <Text style={styles.emptyTitle}>Nenhuma solicitação encontrada</Text>
                  <Text style={styles.emptySubtitle}>
                    {activeTab === "Todas"
                      ? "Você ainda não registrou nenhuma denúncia no município."
                      : `Nenhuma ocorrência com o status "${activeTab}".`}
                  </Text>
                </View>
              ) : (
                filteredReports.map((item, itemIndex) => {
                  const isSelected = currentSelection?.id === item.id;
                  return (
                    <AnimatedTicketCard
                      key={item.id}
                      index={itemIndex}
                      style={[
                        styles.ticketCard,
                        isSelected && isDesktop && styles.ticketCardSelected,
                      ]}
                      onPress={() => handleSelectReport(item)}
                    >
                      <View style={styles.ticketHeader}>
                        <View style={styles.ticketCategoryPill}>
                          <Ionicons name={item.categoryIcon} size={14} color={colors.primary} />
                          <Text style={styles.ticketCategoryText}>{item.categoryLabel}</Text>
                        </View>
                        <View style={[styles.ticketStatusChip, { backgroundColor: item.bg }]}>
                          <View style={[styles.ticketStatusDot, { backgroundColor: item.color }]} />
                          <Text style={[styles.ticketStatusText, { color: item.color }]}>
                            {item.label}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.ticketTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.ticketDescription} numberOfLines={2}>
                        {item.description}
                      </Text>

                      <View style={styles.ticketFooter}>
                        <View style={styles.ticketMetaItem}>
                          <Ionicons name="finger-print-outline" size={13} color={colors.text3} />
                          <Text style={styles.ticketProtocol}>{item.protocol}</Text>
                        </View>
                        <View style={styles.ticketMetaItem}>
                          <Ionicons name="time-outline" size={13} color={colors.text3} />
                          <Text style={styles.ticketDate}>{item.date}</Text>
                        </View>
                      </View>
                    </AnimatedTicketCard>
                  );
                })
              )}
            </ScrollView>
          </View>

          {/* Desktop Right Inspector Pane */}
          {isDesktop && (
            <View style={styles.inspectorColumn}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.inspectorScroll}>
                {renderDetailCard(currentSelection)}
              </ScrollView>
            </View>
          )}
        </View>
      </View>

      {/* Mobile Details Modal */}
      {!isDesktop && (
        <Modal
          visible={modalOpen && !!selectedReport}
          transparent
          animationType="slide"
          onRequestClose={closeReportDetails}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
                {renderDetailCard(selectedReport, true)}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const makeStyles = (colors: typeof C) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    container: {
      flex: 1,
      maxWidth: 1200,
      width: "100%",
      alignSelf: "center",
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    header: {
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 10,
    },
    headerLeft: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    headerTextContainer: {
      flex: 1,
      minWidth: 0,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      letterSpacing: -0.3,
    },
    headerSubtitle: {
      fontSize: 12,
      color: colors.text3,
      marginTop: 2,
    },
    newReportBtn: {
      flexShrink: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    newReportBtnText: {
      color: "#fff",
      fontSize: 13,
      fontWeight: "600",
    },

    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      marginBottom: 16,
    },
    statCard: {
      flex: 1,
      minWidth: 140,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    statIconBadge: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.surface2,
      alignItems: "center",
      justifyContent: "center",
    },
    statNumber: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.5,
    },
    statCaption: {
      fontSize: 11,
      fontWeight: "500",
      color: colors.text3,
      marginTop: 2,
    },

    filterBar: {
      marginBottom: 16,
    },
    filterScroll: {
      gap: 8,
    },
    filterChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
    },
    filterChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterChipText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.text2,
    },
    filterChipTextActive: {
      color: "#fff",
    },
    filterCount: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 10,
      backgroundColor: colors.surface2,
    },
    filterCountActive: {
      backgroundColor: "rgba(255, 255, 255, 0.25)",
    },
    filterCountText: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.text2,
    },
    filterCountTextActive: {
      color: "#fff",
    },

    contentRow: {
      flex: 1,
      flexDirection: "row",
      gap: 20,
    },
    listColumn: {
      flex: 1,
    },
    listColumnDesktop: {
      maxWidth: 480,
    },
    inspectorColumn: {
      flex: 1.2,
    },
    scrollList: {
      paddingBottom: 40,
      gap: 12,
    },
    inspectorScroll: {
      paddingBottom: 40,
    },

    ticketCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
    },
    ticketCardSelected: {
      borderColor: colors.primary,
      backgroundColor: "rgba(37, 99, 235, 0.04)",
      borderWidth: 1.5,
    },
    ticketHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    ticketCategoryPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.surface2,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    ticketCategoryText: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.text,
    },
    ticketStatusChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
    },
    ticketStatusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    ticketStatusText: {
      fontSize: 11,
      fontWeight: "700",
    },
    ticketTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 6,
      letterSpacing: -0.2,
    },
    ticketDescription: {
      fontSize: 13,
      color: colors.text2,
      lineHeight: 18,
      marginBottom: 12,
    },
    ticketFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 10,
    },
    ticketMetaItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    ticketProtocol: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.text3,
    },
    ticketDate: {
      fontSize: 11,
      color: colors.text3,
    },

    /* Detail / Inspector */
    detailCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 22,
    },
    detailCardInModal: {
      borderWidth: 0,
      padding: 0,
    },
    detailHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
    },
    detailProtocolBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.surface2,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    detailProtocolText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.text,
    },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 14,
    },
    statusDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
    },
    statusText: {
      fontSize: 12,
      fontWeight: "700",
    },
    detailTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.4,
      marginBottom: 10,
    },
    detailMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 20,
    },
    detailMetaItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    detailMetaDivider: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
    },
    detailMetaText: {
      fontSize: 12,
      fontWeight: "500",
      color: colors.text2,
    },

    /* Step progress */
    trackerContainer: {
      backgroundColor: colors.surface2,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 20,
    },
    trackerTitle: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.text2,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 16,
    },
    stepTrack: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    stepItem: {
      alignItems: "center",
      width: 75,
    },
    stepItemActive: {},
    stepCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 6,
    },
    stepCircleActive: {
      backgroundColor: colors.primary,
    },
    stepLine: {
      flex: 1,
      height: 2,
      backgroundColor: colors.border,
      marginTop: -16,
    },
    stepLineActive: {
      backgroundColor: colors.primary,
    },
    stepLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.text3,
      textAlign: "center",
    },

    sectionBlock: {
      marginBottom: 18,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.text3,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    descriptionBox: {
      backgroundColor: colors.surface2,
      padding: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    descriptionText: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 21,
    },
    addressBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.surface2,
      padding: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    addressText: {
      fontSize: 13,
      color: colors.text,
      flex: 1,
    },
    updateCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      padding: 12,
      borderRadius: 8,
      backgroundColor: colors.surface2,
      marginBottom: 16,
    },
    updateCardText: {
      fontSize: 12,
      color: colors.text3,
      flex: 1,
    },
    retentionBox: {
      marginBottom: 16,
    },
    btnSecondary: {
      marginTop: 8,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: "center",
    },
    btnSecondaryText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
    },

    emptyDetailContainer: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 40,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 300,
    },
    emptyDetailTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      marginTop: 14,
      marginBottom: 6,
    },
    emptyDetailText: {
      fontSize: 13,
      color: colors.text3,
      textAlign: "center",
      lineHeight: 18,
      maxWidth: 320,
    },

    stateFeedback: {
      paddingVertical: 48,
      alignItems: "center",
      justifyContent: "center",
    },
    stateFeedbackText: {
      fontSize: 13,
      color: colors.text3,
      marginTop: 12,
    },
    errorTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
      marginTop: 12,
    },
    errorSubtitle: {
      fontSize: 12,
      color: colors.text3,
      marginTop: 4,
      marginBottom: 16,
    },
    retryBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    retryBtnText: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "600",
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
      marginTop: 12,
    },
    emptySubtitle: {
      fontSize: 12,
      color: colors.text3,
      marginTop: 4,
      textAlign: "center",
    },

    /* Modal */
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    modalSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: "85%",
      paddingHorizontal: 20,
      paddingBottom: 28,
    },
    modalHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: "center",
      marginVertical: 12,
    },
    modalScroll: {
      paddingVertical: 10,
    },
  });
