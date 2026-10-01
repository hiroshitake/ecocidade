import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { C, S } from "../../constants/theme";
import { useAppTheme } from "../../context/theme-context";
import { getMyReports } from "../../services/reports";
import ReportRetentionTimer from "../../components/report-retention-timer";

const TABS = ["Todas", "Aguardando", "Em processo", "Concluídas"];

const normalizeStatus = (status?: string) => {
  const value = String(status || "")
    .trim()
    .toLowerCase();

  if (["pending", "aguardando"].includes(value)) {
    return {
      label: "Aguardando",
      color: C.warning,
      bg: C.warningLight,
    };
  }

  if (
    ["investigating", "in_progress", "processo", "em processo"].includes(value)
  ) {
    return {
      label: "Em processo",
      color: C.primary,
      bg: C.primaryLight,
    };
  }

  if (
    ["resolved", "concluida", "concluída", "completed", "done"].includes(value)
  ) {
    return {
      label: "Concluída",
      color: C.eco,
      bg: C.ecoLight,
    };
  }

  return {
    label: "Aguardando",
    color: C.warning,
    bg: C.warningLight,
  };
};

export default function ReportsScreen() {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const [activeTab, setActiveTab] = useState("Todas");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadReports = async () => {
      try {
        setLoadError(false);
        const data = await getMyReports();
        setReports(data || []);
      } catch (error) {
        console.error("Erro ao carregar relatórios:", error);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, []);

  const mappedReports = useMemo(
    () =>
      reports.map((item) => ({
        ...item,
        id: item.id,
        icon: "construct" as const,
        iconBg: C.primaryLight,
        iconColor: C.primary,
        title: item.title || item.category || "Denúncia enviada",
        description: item.description || "Sem descrição cadastrada.",
        category: item.category || "Outros",
        date: item.created_at
          ? new Date(item.created_at).toLocaleDateString("pt-BR")
          : "Agora",
        updatedAt: item.updated_at
          ? new Date(item.updated_at).toLocaleDateString("pt-BR")
          : null,
        protocol: `#${String(item.id).slice(0, 8).toUpperCase()}`,
        ...normalizeStatus(item.status),
      })),
    [reports],
  );

  const filteredReports = mappedReports.filter((item) => {
    if (activeTab === "Todas") return true;
    if (activeTab === "Aguardando") return item.label === "Aguardando";
    if (activeTab === "Em processo") return item.label === "Em processo";
    if (activeTab === "Concluídas") return item.label === "Concluída";
    return true;
  });

  const stats = {
    total: mappedReports.length,
    pending: mappedReports.filter((item) => item.label === "Aguardando").length,
    investigating: mappedReports.filter((item) => item.label === "Em processo")
      .length,
    resolved: mappedReports.filter((item) => item.label === "Concluída").length,
  };

  const openReportDetails = (item: any) => {
    setSelectedReport(item);
    setModalOpen(true);
  };

  const closeReportDetails = () => {
    setSelectedReport(null);
    setModalOpen(false);
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push("/map")}>
          <Ionicons name="arrow-back" size={24} color={C.text2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Minhas Solicitações</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {Math.max(stats.total - stats.resolved, 0)} ativas
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total enviadas</Text>
          </View>
          <View
            style={[
              styles.statCard,
              { backgroundColor: C.ecoLight, borderColor: C.eco },
            ]}
          >
            <Text style={[styles.statNum, { color: C.eco }]}>
              {stats.resolved}
            </Text>
            <Text style={styles.statLabel}>Concluídas</Text>
          </View>
        </View>

        <View style={styles.tabBarWrap}>
          <View style={styles.tabBar}>
            {TABS.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.tabBtn, activeTab === t && styles.tabBtnActive]}
                onPress={() => setActiveTab(t)}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    activeTab === t && styles.tabBtnTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          {loading ? (
            <View style={{ padding: 24, alignItems: "center" }}>
              <ActivityIndicator color={C.primary} />
            </View>
          ) : loadError ? (
            <View style={{ padding: 24, alignItems: "center" }}>
              <Ionicons name="cloud-offline-outline" size={38} color={C.text3} />
              <Text style={{ color: C.text, fontWeight: "700", marginTop: 10, textAlign: "center" }}>
                Não foi possível carregar suas denúncias
              </Text>
              <Text style={{ color: C.text3, textAlign: "center", marginTop: 6 }}>
                Verifique sua conexão e tente novamente.
              </Text>
              <TouchableOpacity
                style={styles.btnOutline}
                onPress={() => {
                  setLoading(true);
                  setLoadError(false);
                  getMyReports()
                    .then((data) => setReports(data || []))
                    .catch((error) => {
                      console.error("Erro ao carregar relatórios:", error);
                      setLoadError(true);
                    })
                    .finally(() => setLoading(false));
                }}
              >
                <Text style={styles.btnOutlineText}>Tentar novamente</Text>
              </TouchableOpacity>
            </View>
          ) : filteredReports.length === 0 ? (
            <View style={{ padding: 24, alignItems: "center" }}>
              <Text style={{ color: C.text3 }}>
                Nenhuma denúncia encontrada neste filtro.
              </Text>
            </View>
          ) : (
            filteredReports.map((item, i) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.reportItem,
                  i < filteredReports.length - 1 && styles.reportBorder,
                ]}
                onPress={() => openReportDetails(item)}
              >
                <View
                  style={[styles.reportIcon, { backgroundColor: item.iconBg }]}
                >
                  <Ionicons name={item.icon} size={22} color={item.iconColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reportTitle}>{item.title}</Text>
                  <Text style={styles.reportSub}>
                    Enviada {item.date} · {item.protocol}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  <View
                    style={[styles.statusBadge, { backgroundColor: item.bg }]}
                  >
                    <Text style={[styles.statusText, { color: item.color }]}>
                      {item.label}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={C.text3} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={{ padding: 16 }}>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => router.push("/new-report")}
          >
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.btnPrimaryText}>Nova denúncia</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={modalOpen && !!selectedReport}
        transparent
        animationType="slide"
        onRequestClose={closeReportDetails}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeReportDetails}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalContent}>
              <View style={styles.modalTitleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>
                    {selectedReport?.title || "Denúncia"}
                  </Text>
                  <Text style={styles.modalProto}>
                    {selectedReport?.protocol || "Protocolo"}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: selectedReport?.bg || C.primaryLight },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: selectedReport?.color || C.primary },
                    ]}
                  >
                    {selectedReport?.label || "Aguardando"}
                  </Text>
                </View>
              </View>

              <View style={styles.descBox}>
                <Text style={styles.descLabel}>Descrição</Text>
                <Text style={styles.descText}>
                  {selectedReport?.description ||
                    "Sem descrição cadastrada para esta denúncia."}
                </Text>
              </View>

              <View style={styles.datesRow}>
                <View style={styles.dateCard}>
                  <Text style={styles.dateLabel}>Enviada em</Text>
                  <Text style={styles.dateValue}>
                    {selectedReport?.date || "Data indisponível"}
                  </Text>
                </View>
                <View style={styles.dateCard}>
                  <Text style={styles.dateLabel}>Categoria</Text>
                  <Text style={styles.dateValue}>
                    {selectedReport?.category || "Outros"}
                  </Text>
                </View>
              </View>

              {selectedReport?.updatedAt ? (
                <View style={styles.dateCardWide}>
                  <Text style={styles.dateLabel}>Última atualização</Text>
                  <Text style={styles.dateValue}>
                    {selectedReport.updatedAt}
                  </Text>
                </View>
              ) : null}

              {selectedReport?.label === "Concluída" ? (
                <ReportRetentionTimer
                  resolvedAt={selectedReport?.resolved_at}
                  audience="user"
                />
              ) : null}

              <TouchableOpacity
                style={styles.btnOutline}
                onPress={closeReportDetails}
              >
                <Text style={styles.btnOutlineText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const makeStyles = (colors: typeof C) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  header: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    height: 56,
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: colors.text, letterSpacing: -0.2 },
  badge: {
    backgroundColor: colors.surface2,
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: { fontSize: 11, fontWeight: "600", color: colors.text2 },

  scroll: { flex: 1 },

  statsRow: { flexDirection: "row", gap: 8, padding: 16 },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
  },
  statNum: { fontSize: 24, fontWeight: "700", color: colors.text, letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: colors.text3, fontWeight: "500", marginTop: 2 },

  tabBarWrap: { paddingHorizontal: 16, marginBottom: 12 },
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.surface2,
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: "center",
  },
  tabBtnActive: { backgroundColor: colors.surface },
  tabBtnText: { fontSize: 11, fontWeight: "500", color: colors.text3 },
  tabBtnTextActive: { color: colors.primary, fontWeight: "600" },

  card: {
    marginHorizontal: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    overflow: "hidden",
  },
  reportItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  reportBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  reportIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  reportTitle: { fontSize: 14, fontWeight: "600", color: colors.text },
  reportSub: { fontSize: 12, color: colors.text3, marginTop: 2 },
  statusBadge: { borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8 },
  statusText: { fontSize: 11, fontWeight: "600" },

  btnPrimary: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnPrimaryText: { color: "white", fontSize: 14, fontWeight: "600" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "90%",
  },
  modalHandle: {
    width: 32,
    height: 4,
    backgroundColor: colors.border2,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
  },
  modalContent: { padding: 18, paddingBottom: 36 },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  modalProto: { fontSize: 11, color: colors.text3, marginTop: 2 },
  descBox: {
    backgroundColor: colors.surface2,
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  descLabel: { fontSize: 11, color: colors.text3, marginBottom: 4 },
  descText: { fontSize: 13, color: colors.text, lineHeight: 18 },
  datesRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  dateCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
  },
  dateLabel: { fontSize: 11, color: colors.text3 },
  dateValue: { fontSize: 12, fontWeight: "600", color: colors.text, marginTop: 2 },
  dateCardWide: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  timelineTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  timelineItem: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    marginBottom: 10,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  timelineEvent: { fontSize: 12, fontWeight: "600", color: colors.text },
  timelineSub: { fontSize: 11, color: colors.text3 },
  btnOutline: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  btnOutlineText: { color: colors.text, fontSize: 14, fontWeight: "600" },
});
