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
import { getMyReports } from "../../services/reports";

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
  const [activeTab, setActiveTab] = useState("Todas");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadReports = async () => {
      try {
        const data = await getMyReports();
        setReports(data || []);
      } catch (error) {
        console.error("Erro ao carregar relatórios:", error);
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: {
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    height: 60,
    ...S.shadow.sm,
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: C.text },
  badge: {
    backgroundColor: C.primaryLight,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  badgeText: { fontSize: 11, fontWeight: "700", color: C.primary },

  scroll: { flex: 1 },

  statsRow: { flexDirection: "row", gap: 10, padding: 16 },
  statCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 14,
  },
  statNum: { fontSize: 28, fontWeight: "800", color: C.primary },
  statLabel: { fontSize: 12, color: C.text3, fontWeight: "500", marginTop: 2 },

  tabBarWrap: { paddingHorizontal: 16, marginBottom: 12 },
  tabBar: {
    flexDirection: "row",
    backgroundColor: C.surface2,
    borderRadius: 12,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: "center",
  },
  tabBtnActive: { backgroundColor: C.surface, ...S.shadow.sm },
  tabBtnText: { fontSize: 11, fontWeight: "600", color: C.text2 },
  tabBtnTextActive: { color: C.primary },

  card: {
    marginHorizontal: 16,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    overflow: "hidden",
    ...S.shadow.sm,
  },
  reportItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  reportBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  reportIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  reportTitle: { fontSize: 14, fontWeight: "600", color: C.text },
  reportSub: { fontSize: 12, color: C.text3, marginTop: 2 },
  statusBadge: { borderRadius: 20, paddingVertical: 3, paddingHorizontal: 10 },
  statusText: { fontSize: 11, fontWeight: "700" },

  btnPrimary: {
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnPrimaryText: { color: "white", fontSize: 15, fontWeight: "700" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(13,27,54,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: C.surface,
    borderRadius: 24,
    maxHeight: "90%",
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: C.border2,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
  },
  modalContent: { padding: 20, paddingBottom: 40 },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: C.text },
  modalProto: { fontSize: 12, color: C.text3, marginTop: 3 },
  descBox: {
    backgroundColor: C.surface2,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  descLabel: { fontSize: 12, color: C.text3, marginBottom: 4 },
  descText: { fontSize: 14, color: C.text },
  datesRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  dateCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 12,
  },
  dateLabel: { fontSize: 11, color: C.text3 },
  dateValue: { fontSize: 13, fontWeight: "600", color: C.text, marginTop: 2 },
  dateCardWide: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  timelineTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: C.text,
    marginBottom: 10,
  },
  timelineItem: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    marginBottom: 12,
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  timelineEvent: { fontSize: 13, fontWeight: "600", color: C.text },
  timelineSub: { fontSize: 11, color: C.text3 },
  btnOutline: {
    borderWidth: 1.5,
    borderColor: C.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 4,
  },
  btnOutlineText: { color: C.primary, fontSize: 15, fontWeight: "600" },
});
