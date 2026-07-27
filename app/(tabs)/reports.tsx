import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { C, S } from '../../constants/theme';
import { getCurrentUserData } from '../../services/auth';
import { getReportTimeline, getUserReports } from '../../services/reports';

/* TODO: REQUIREMENTS GAPS
 - RF-03 Filter by category missing in UI: add category filter controls in the reports list header.
 - RNF-02 Implement polling/realtime updates (every 60s) to refresh statuses automatically.
 - RNF-05 Accessibility improvements: add accessible labels to status badges for screen readers.
*/

const TABS = ['Todas', 'Aguardando', 'Em processo', 'Resolvido'];

const CATEGORY_ICONS: Record<string, { icon: any; color: string; bg: string }> = {
  buraco:      { icon: 'construct',           color: C.primary, bg: C.primaryLight },
  poste:       { icon: 'bulb',                color: C.warning, bg: C.warningLight },
  vazamento:   { icon: 'water',               color: C.eco,     bg: C.ecoLight     },
  bueiro:      { icon: 'git-network',         color: C.primary, bg: C.primaryLight },
  mato:        { icon: 'leaf',                color: C.eco,     bg: C.ecoLight     },
  calcada:     { icon: 'walk',                color: C.primary, bg: C.primaryLight },
  lixo:        { icon: 'trash',               color: C.warning, bg: C.warningLight },
  sinalizacao: { icon: 'car',                 color: C.primary, bg: C.primaryLight },
  outro:       { icon: 'ellipsis-horizontal', color: C.text2,   bg: C.surface2     },
};

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  'Aguardando':   { color: C.warning, bg: C.warningLight },
  'Em processo':  { color: C.primary, bg: C.primaryLight },
  'Resolvido':    { color: C.eco,     bg: C.ecoLight     },
};

function formatDate(timestamp: any) {
  if (!timestamp) return '—';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('pt-BR');
}

export default function ReportsScreen() {
  const [activeTab, setActiveTab] = useState('Todas');
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const router = useRouter();

  // ── Carregar denúncias do usuário ──
  const loadReports = useCallback(async () => {
    try {
      const user = await getCurrentUserData();
      if (!user?.id) return;
      const data = await getUserReports(user.id);
      setReports(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadReports(); }, [loadReports]);

  const onRefresh = () => {
    setRefreshing(true);
    loadReports();
  };

  // ── Abrir modal com detalhe e histórico ──
  const openModal = async (report: any) => {
    setSelectedReport(report);
    setModalOpen(true);
    setTimelineLoading(true);
    try {
      const tl = await getReportTimeline(report.id);
      setTimeline(tl);
    } catch (e) {
      console.error(e);
    } finally {
      setTimelineLoading(false);
    }
  };

  // ── Filtrar por aba ──
  const filtered = activeTab === 'Todas'
    ? reports
    : reports.filter(r => r.status === activeTab);

  // ── Stats ──
  const total = reports.length;
  const resolved = reports.filter(r => r.status === 'Resolvido').length;
  const active = reports.filter(r => r.status !== 'Resolvido').length;

  return (
    <View style={styles.root}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/map')}>
          <Ionicons name="arrow-back" size={24} color={C.text2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Minhas Solicitações</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{active} ativas</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* STATS */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{total}</Text>
            <Text style={styles.statLabel}>Total enviadas</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: C.ecoLight, borderColor: C.eco }]}>
            <Text style={[styles.statNum, { color: C.eco }]}>{resolved}</Text>
            <Text style={styles.statLabel}>Resolvidas</Text>
          </View>
        </View>

        {/* FILTER TABS */}
        <View style={styles.tabBarWrap}>
          <View style={styles.tabBar}>
            {TABS.map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.tabBtn, activeTab === t && styles.tabBtnActive]}
                onPress={() => setActiveTab(t)}
              >
                <Text style={[styles.tabBtnText, activeTab === t && styles.tabBtnTextActive]} numberOfLines={1}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* LOADING */}
        {loading && (
          <View style={styles.emptyBox}>
            <ActivityIndicator size="large" color={C.primary} />
          </View>
        )}

        {/* LISTA VAZIA */}
        {!loading && filtered.length === 0 && (
          <View style={styles.emptyBox}>
            <Ionicons name="document-outline" size={48} color={C.border} />
            <Text style={styles.emptyTitle}>Nenhuma denúncia</Text>
            <Text style={styles.emptySub}>
              {activeTab === 'Todas'
                ? 'Você ainda não enviou nenhuma denúncia.'
                : `Nenhuma denúncia com status "${activeTab}".`}
            </Text>
          </View>
        )}

        {/* REPORTS LIST */}
        {!loading && filtered.length > 0 && (
          <View style={styles.card}>
            {filtered.map((item, i) => {
              const cat = CATEGORY_ICONS[item.category] ?? CATEGORY_ICONS.outro;
              const st  = STATUS_COLORS[item.status]   ?? STATUS_COLORS['Aguardando'];
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.reportItem, i < filtered.length - 1 && styles.reportBorder]}
                  onPress={() => openModal(item)}
                >
                  <View style={[styles.reportIcon, { backgroundColor: cat.bg }]}>
                    <Ionicons name={cat.icon} size={22} color={cat.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reportTitle} numberOfLines={1}>
                      {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                    </Text>
                    <Text style={styles.reportSub}>
                      Enviada {formatDate(item.createdAt)} · {item.protocol}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                      <Text style={[styles.statusText, { color: st.color }]}>{item.status}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={C.text3} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* NEW REPORT BUTTON */}
        <View style={{ padding: 16 }}>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => router.push('/new-report')}>
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.btnPrimaryText}>Nova denúncia</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── MODAL DE DETALHE ── */}
      <Modal
        visible={modalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalOpen(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            {selectedReport && (
              <ScrollView style={styles.modalContent}>

                {/* Título */}
                <View style={styles.modalTitleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>
                      {selectedReport.category.charAt(0).toUpperCase() + selectedReport.category.slice(1)}
                    </Text>
                    <Text style={styles.modalProto}>Protocolo {selectedReport.protocol}</Text>
                  </View>
                  {(() => {
                    const st = STATUS_COLORS[selectedReport.status] ?? STATUS_COLORS['Aguardando'];
                    return (
                      <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                        <Text style={[styles.statusText, { color: st.color }]}>{selectedReport.status}</Text>
                      </View>
                    );
                  })()}
                </View>

                {/* Descrição */}
                {selectedReport.description ? (
                  <View style={styles.descBox}>
                    <Text style={styles.descLabel}>Descrição</Text>
                    <Text style={styles.descText}>{selectedReport.description}</Text>
                  </View>
                ) : null}

                {/* Datas */}
                <View style={styles.datesRow}>
                  <View style={styles.dateCard}>
                    <Text style={styles.dateLabel}>Enviada em</Text>
                    <Text style={styles.dateValue}>{formatDate(selectedReport.createdAt)}</Text>
                  </View>
                  <View style={styles.dateCard}>
                    <Text style={styles.dateLabel}>Atualizado</Text>
                    <Text style={styles.dateValue}>{formatDate(selectedReport.updatedAt)}</Text>
                  </View>
                </View>

                {/* Timeline */}
                <Text style={styles.timelineTitle}>Histórico</Text>
                {timelineLoading && <ActivityIndicator color={C.primary} style={{ marginBottom: 12 }} />}
                {!timelineLoading && timeline.map(tl => (
                  <View key={tl.id} style={styles.timelineItem}>
                    <View style={[styles.timelineDot, { backgroundColor: C.eco }]}>
                      <Ionicons name="receipt" size={12} color="white" />
                    </View>
                    <View>
                      <Text style={styles.timelineEvent}>{tl.event}</Text>
                      <Text style={styles.timelineSub}>
                        {formatDate(tl.createdAt)}
                        {tl.department ? ` · ${tl.department}` : ''}
                      </Text>
                    </View>
                  </View>
                ))}

                <TouchableOpacity style={[styles.btnOutline, { marginTop: 8, marginBottom: 32 }]} onPress={() => setModalOpen(false)}>
                  <Text style={styles.btnOutlineText}>Fechar</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: {
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, height: 60, ...S.shadow.sm,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  badge: { backgroundColor: C.primaryLight, borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10 },
  badgeText: { fontSize: 11, fontWeight: '700', color: C.primary },

  scroll: { flex: 1 },

  statsRow: { flexDirection: 'row', gap: 10, padding: 16 },
  statCard: {
    flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, padding: 14,
  },
  statNum:   { fontSize: 28, fontWeight: '800', color: C.primary },
  statLabel: { fontSize: 12, color: C.text3, fontWeight: '500', marginTop: 2 },

  tabBarWrap: { paddingHorizontal: 16, marginBottom: 12 },
  tabBar: { flexDirection: 'row', backgroundColor: C.surface2, borderRadius: 12, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  tabBtnActive: { backgroundColor: C.surface, ...S.shadow.sm },
  tabBtnText: { fontSize: 11, fontWeight: '600', color: C.text2 },
  tabBtnTextActive: { color: C.primary },

  emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.text2 },
  emptySub:   { fontSize: 13, color: C.text3, textAlign: 'center', paddingHorizontal: 40 },

  card: {
    marginHorizontal: 16, backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border, borderRadius: 16, overflow: 'hidden', ...S.shadow.sm,
  },
  reportItem:   { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  reportBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  reportIcon:   { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  reportTitle:  { fontSize: 14, fontWeight: '600', color: C.text },
  reportSub:    { fontSize: 12, color: C.text3, marginTop: 2 },
  statusBadge:  { borderRadius: 20, paddingVertical: 3, paddingHorizontal: 10 },
  statusText:   { fontSize: 11, fontWeight: '700' },

  btnPrimary: {
    backgroundColor: C.primary, borderRadius: 12,
    paddingVertical: 14, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  btnPrimaryText: { color: 'white', fontSize: 15, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(13,27,54,0.5)', justifyContent: 'flex-end' },
  modalSheet:   { backgroundColor: C.surface, borderRadius: 24, maxHeight: '90%' },
  modalHandle:  { width: 36, height: 4, backgroundColor: C.border2, borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  modalContent: { padding: 20 },
  modalTitleRow:{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  modalTitle:   { fontSize: 18, fontWeight: '800', color: C.text },
  modalProto:   { fontSize: 12, color: C.text3, marginTop: 3 },
  descBox:      { backgroundColor: C.surface2, borderRadius: 12, padding: 12, marginBottom: 14 },
  descLabel:    { fontSize: 12, color: C.text3, marginBottom: 4 },
  descText:     { fontSize: 14, color: C.text },
  datesRow:     { flexDirection: 'row', gap: 10, marginBottom: 16 },
  dateCard:     { flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12 },
  dateLabel:    { fontSize: 11, color: C.text3 },
  dateValue:    { fontSize: 13, fontWeight: '600', color: C.text, marginTop: 2 },
  timelineTitle:{ fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 10 },
  timelineItem: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 12 },
  timelineDot:  { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  timelineEvent:{ fontSize: 13, fontWeight: '600', color: C.text },
  timelineSub:  { fontSize: 11, color: C.text3 },
  btnOutline:   { borderWidth: 1.5, borderColor: C.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  btnOutlineText:{ color: C.primary, fontSize: 15, fontWeight: '600' },
});
