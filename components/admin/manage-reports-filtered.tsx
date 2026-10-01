import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Image, Modal, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { C } from '../../constants/theme';
import { useAppTheme } from '../../context/theme-context';
import { deleteReport, getAdminReports, setReportPublicVisibility, updateReportStatus } from '../../services/reports';
import { createReportImageUrl, createSupabaseAvatarUrl } from '../../services/supabase';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import ReportRetentionTimer from '../report-retention-timer';

interface Report {
  id: string; category?: string; description?: string; status?: string; image_url?: string | null;
  hidden_from_public?: boolean;
  reporter?: { name?: string | null; email?: string | null; avatar_path?: string | null; avatar_url?: string | null } | null;
  location?: { latitude?: number; longitude?: number; address?: string }; created_at?: string; resolved_at?: string | null;
}

const STATUS_OPTIONS = [
  { id: 'pending', label: 'Aguardando', icon: 'clock-alert-outline', color: C.warning },
  { id: 'in_progress', label: 'Em Processo', icon: 'progress-clock', color: C.primary },
  { id: 'resolved', label: 'Concluída', icon: 'check-circle-outline', color: C.eco },
];

const normalizeStatus = (status?: string) => {
  const value = String(status || '').trim().toLowerCase();
  if (['pending', 'aguardando'].includes(value)) return 'pending';
  if (['in_progress', 'processo', 'em processo'].includes(value)) return 'in_progress';
  if (['resolved', 'concluida', 'concluída', 'completed', 'done'].includes(value)) return 'resolved';
  return 'pending';
};

export default function ManageReportsFiltered({ security = false }: { security?: boolean }) {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState(16 / 9);
  const [fullscreenImage, setFullscreenImage] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'resolved'>('pending');

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAdminReports();
      const filtered = (data || []).filter((report: Report) => {
        const category = String(report.category || '').trim().toLowerCase();
        return security ? category === 'seguranca' : category !== 'seguranca';
      });
      const withImages = await Promise.all(filtered.map(async report => {
        let imageUrl = report.image_url;
        let avatarUrl = report.reporter?.avatar_url || null;
        if (report.image_url) {
          try { imageUrl = await createReportImageUrl(report.image_url); }
          catch { imageUrl = null; }
        }
        if (report.reporter?.avatar_path) {
          try { avatarUrl = await createSupabaseAvatarUrl(report.reporter.avatar_path); }
          catch { avatarUrl = null; }
        }
        return {
          ...report,
          image_url: imageUrl,
          reporter: report.reporter ? { ...report.reporter, avatar_url: avatarUrl } : null,
        };
      }));
      setReports(withImages);
    } catch (error) {
      console.error('Erro ao carregar denúncias:', error);
      Alert.alert('Erro', 'Falha ao carregar denúncias');
    } finally { setLoading(false); }
  }, [security]);

  useFocusEffect(useCallback(() => { loadReports(); }, [loadReports]));

  const statusColor = (status?: string) => STATUS_OPTIONS.find(s => s.id === normalizeStatus(status))?.color || C.text3;
  const statusLabel = (status?: string) => STATUS_OPTIONS.find(s => s.id === normalizeStatus(status))?.label || 'Aguardando';
  const formatDate = (value?: string) => value ? new Date(value).toLocaleString('pt-BR') : 'Sem data';

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedReport) return;

    const currentStatus = normalizeStatus(selectedReport.status);
    if (currentStatus === 'resolved') {
      Alert.alert('Denúncia concluída', 'Esta denúncia já foi concluída e não pode mais ser alterada manualmente.');
      return;
    }
    if (currentStatus === newStatus) return;

    const confirmMessage =
      'Após marcar esta denúncia como concluída, ela não poderá mais ter seu status alterado, ser ocultada ou excluída manualmente. Ela seguirá o prazo automático de retenção do sistema.';

    if (newStatus === 'resolved') {
      if (Platform.OS === 'web') {
        if (!window.confirm(`Concluir denúncia?\n\n${confirmMessage}`)) return;
      } else {
        const confirmed = await new Promise<boolean>(resolve => {
          Alert.alert('Concluir denúncia?', confirmMessage, [
            { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Concluir', onPress: () => resolve(true) },
          ]);
        });
        if (!confirmed) return;
      }
    }

    try {
      const updated = await updateReportStatus(selectedReport.id, newStatus);
      const resolvedAt = newStatus === 'resolved'
        ? (updated as any)?.resolved_at || new Date().toISOString()
        : null;

      setReports(prev => prev.map(r =>
        r.id === selectedReport.id
          ? { ...r, status: newStatus, resolved_at: resolvedAt }
          : r
      ));
      setSelectedReport(prev =>
        prev?.id === selectedReport.id
          ? { ...prev, status: newStatus, resolved_at: resolvedAt }
          : prev
      );
      Alert.alert('Sucesso', newStatus === 'resolved'
        ? 'Denúncia concluída. Ela não poderá mais ser alterada manualmente.'
        : 'Status atualizado com sucesso.');
    } catch (error) {
      console.error(error);
      const message = newStatus === 'resolved'
        ? 'Não foi possível concluir a denúncia.'
        : 'Falha ao atualizar status.';
      Alert.alert('Erro', message);
    }
  };

  const runVisibilityChange = async (report: Report) => {
    if (normalizeStatus(report.status) === 'resolved') {
      Alert.alert('Denúncia concluída', 'Esta denúncia não pode mais ser ocultada ou mostrada manualmente.');
      return;
    }
    const hidden = Boolean(report.hidden_from_public);
    try {
      await setReportPublicVisibility(report.id, !hidden);
      setReports(prev => prev.map(r => r.id === report.id ? { ...r, hidden_from_public: !hidden } : r));
      setSelectedReport(prev => prev?.id === report.id ? { ...prev, hidden_from_public: !hidden } : prev);
    } catch (error) {
      console.error(error);
      const message = hidden ? 'Falha ao mostrar a denúncia.' : 'Falha ao ocultar a denúncia.';
      if (Platform.OS === 'web') window.alert(message);
      else Alert.alert('Erro', message);
    }
  };

  const handleVisibilityChange = (report: Report) => {
    if (normalizeStatus(report.status) === 'resolved') {
      Alert.alert('Denúncia concluída', 'Esta denúncia não pode mais ser ocultada ou mostrada manualmente.');
      return;
    }
    const hidden = Boolean(report.hidden_from_public);
    const title = hidden ? 'Mostrar denúncia' : 'Ocultar denúncia';
    const message = hidden
      ? 'A denúncia voltará a ficar disponível para os usuários somente se ainda estiver dentro das regras de visibilidade.'
      : 'A denúncia será ocultada do mapa e das consultas dos usuários, mas continuará disponível para a administração.';
    const action = () => { void runVisibilityChange(report); };

    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${message}`)) action();
      return;
    }

    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: hidden ? 'Mostrar' : 'Ocultar', onPress: action },
    ]);
  };

  const runDelete = async (id: string) => {
    const report = reports.find(r => r.id === id);
    if (report && normalizeStatus(report.status) === 'resolved') {
      Alert.alert('Denúncia concluída', 'Esta denúncia não pode mais ser excluída manualmente.');
      return;
    }
    try {
      await deleteReport(id);
      setReports(prev => prev.filter(r => r.id !== id));
      setSelectedReport(null);
    } catch (error) {
      console.error(error);
      const message = 'Falha ao excluir a denúncia. Verifique se ela pertence à sua cidade.';
      if (Platform.OS === 'web') window.alert(message);
      else Alert.alert('Erro', message);
    }
  };

  const handleDelete = (id: string) => {
    const report = reports.find(r => r.id === id) || selectedReport;
    if (report && normalizeStatus(report.status) === 'resolved') {
      Alert.alert('Denúncia concluída', 'Esta denúncia não pode mais ser excluída manualmente.');
      return;
    }
    const message = 'Esta ação remove a denúncia do banco de dados e não pode ser desfeita.';
    if (Platform.OS === 'web') {
      if (window.confirm(`Confirmar exclusão permanente\n\n${message}`)) void runDelete(id);
      return;
    }

    Alert.alert('Confirmar exclusão permanente', message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir permanentemente', style: 'destructive', onPress: () => { void runDelete(id); } },
    ]);
  };

  const openReport = async (report: Report) => {
    setSelectedReport(report);
    setImageAspectRatio(16 / 9);
    if (!report.image_url) return;
    setImageLoading(true);
    try {
      // loadReports already converts storage paths into signed URLs.
      // Do not sign an already signed URL again.
      const imageUrl = /^https?:\/\//i.test(report.image_url)
        ? report.image_url
        : await createReportImageUrl(report.image_url);

      setSelectedReport(current =>
        current?.id === report.id ? { ...current, image_url: imageUrl } : current,
      );
      Image.getSize(
        imageUrl,
        (width, height) => {
          if (width > 0 && height > 0) setImageAspectRatio(width / height);
        },
        () => {},
      );
    } catch {
      setSelectedReport(current =>
        current?.id === report.id ? { ...current, image_url: null } : current,
      );
    }
    finally { setImageLoading(false); }
  };

  const filteredReports = useMemo(() => {
    if (statusFilter === 'all') return reports;
    return reports.filter(report => normalizeStatus(report.status) === statusFilter);
  }, [reports, statusFilter]);

  const statusCounts = useMemo(() => ({
    all: reports.length,
    pending: reports.filter(report => normalizeStatus(report.status) === 'pending').length,
    in_progress: reports.filter(report => normalizeStatus(report.status) === 'in_progress').length,
    resolved: reports.filter(report => normalizeStatus(report.status) === 'resolved').length,
  }), [reports]);

  const title = security ? 'Gerenciar Segurança' : 'Gerenciar Zeladoria';
  const subtitle = security ? 'Ocorrências de segurança registradas pelos usuários' : 'Ocorrências de zeladoria e manutenção da cidade';

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: security ? C.danger : C.primary }]}>
          <MaterialCommunityIcons name={security ? 'shield-alert' : 'city-variant-outline'} size={22} color={C.white} />
        </View>
        <View style={styles.headerText}><ThemedText style={styles.title}>{title}</ThemedText><ThemedText style={styles.subtitle}>{subtitle}</ThemedText></View>
        <View style={styles.countBadge}><ThemedText style={styles.countText}>{reports.length}</ThemedText></View>
      </View>

      <View style={styles.filterBar}>
        {[
          { id: 'pending', label: 'Aguardando', count: statusCounts.pending },
          { id: 'in_progress', label: 'Em processo', count: statusCounts.in_progress },
          { id: 'resolved', label: 'Concluídas', count: statusCounts.resolved },
          { id: 'all', label: 'Todas', count: statusCounts.all },
        ].map(filter => {
          const active = statusFilter === filter.id;
          const option = STATUS_OPTIONS.find(item => item.id === filter.id);
          return (
            <TouchableOpacity
              key={filter.id}
              style={[styles.filterButton, active && styles.filterButtonActive]}
              onPress={() => setStatusFilter(filter.id as typeof statusFilter)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              {option ? <MaterialCommunityIcons name={option.icon as any} size={16} color={active ? option.color : C.text3} /> : null}
              <ThemedText style={[styles.filterText, active && { color: option?.color || C.primary }]}>{filter.label}</ThemedText>
              <View style={[styles.filterCount, active && { backgroundColor: (option?.color || C.primary) + '18' }]}>
                <ThemedText style={[styles.filterCountText, active && { color: option?.color || C.primary }]}>{filter.count}</ThemedText>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filteredReports} keyExtractor={item => item.id} contentContainerStyle={styles.list} onRefresh={loadReports} refreshing={loading}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.card, security && styles.securityCard, item.hidden_from_public && styles.hiddenCard]} onPress={() => openReport(item)}>
            <View style={styles.cardTop}>
              <View style={styles.cardInfo}>
                <View style={styles.categoryRow}>
                  <ThemedText style={[styles.category, security && { color: C.danger }]}>{security ? 'SEGURANÇA' : (item.category || 'SEM CATEGORIA').toUpperCase()}</ThemedText>
                  {item.hidden_from_public ? <View style={styles.hiddenBadge}><ThemedText style={styles.hiddenBadgeText}>OCULTA</ThemedText></View> : null}
                </View>
                <ThemedText style={styles.address} numberOfLines={1}>{item.location?.address || 'Localização desconhecida'}</ThemedText>
              </View>
              {normalizeStatus(item.status) !== 'resolved' ? (
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
                  <MaterialCommunityIcons name="trash-can-outline" size={21} color={C.danger} />
                </TouchableOpacity>
              ) : (
                <View style={styles.deleteButton}>
                  <MaterialCommunityIcons name="lock-outline" size={19} color={C.text3} />
                </View>
              )}
            </View>
            <ThemedText style={styles.description} numberOfLines={2}>{item.description || 'Sem descrição'}</ThemedText>
            <View style={styles.cardBottom}><ThemedText style={styles.date}>{formatDate(item.created_at)}</ThemedText><View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + '20' }]}><ThemedText style={[styles.statusText, { color: statusColor(item.status) }]}>{statusLabel(item.status)}</ThemedText></View></View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<View style={styles.empty}><MaterialCommunityIcons name={security ? 'shield-check-outline' : 'check-circle-outline'} size={48} color={C.text3} /><ThemedText style={styles.emptyTitle}>{statusFilter === 'all' ? 'Nenhuma denúncia encontrada' : `Nenhuma denúncia ${STATUS_OPTIONS.find(option => option.id === statusFilter)?.label.toLowerCase() || 'neste status'}`}</ThemedText><ThemedText style={styles.emptyText}>{statusFilter === 'all' ? 'Novas ocorrências aparecerão aqui.' : 'Altere o filtro para visualizar outras denúncias.'}</ThemedText></View>}
      />

      <Modal visible={!!selectedReport} transparent animationType="fade" onRequestClose={() => setSelectedReport(null)}>
        <View style={styles.overlay}><View style={styles.modal}>
          {selectedReport && <>
            <View style={styles.modalHeader}><View><ThemedText style={styles.modalEyebrow}>{security ? 'SEGURANÇA' : 'ZELADORIA'}</ThemedText><ThemedText style={styles.modalTitle}>#{selectedReport.id.slice(0, 8).toUpperCase()}</ThemedText></View><TouchableOpacity onPress={() => setSelectedReport(null)}><MaterialCommunityIcons name="close" size={24} color={C.text2} /></TouchableOpacity></View>
            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={true}>
              <View style={styles.reporterRow}>
                <View style={styles.avatar}>
                  {selectedReport.reporter?.avatar_url ? <Image source={{ uri: selectedReport.reporter.avatar_url }} style={styles.avatarImage} resizeMode="cover" /> : <MaterialCommunityIcons name="account-circle-outline" size={29} color={C.text3} />}
                </View>
                <View style={styles.reporterCopy}>
                  <ThemedText style={styles.label}>Denunciante</ThemedText>
                  <ThemedText style={styles.value} numberOfLines={1}>{selectedReport.reporter?.name || selectedReport.reporter?.email || 'Usuário não identificado'}</ThemedText>
                  {selectedReport.reporter?.name && selectedReport.reporter?.email ? <ThemedText style={styles.secondary}>{selectedReport.reporter.email}</ThemedText> : null}
                </View>
              </View>
              {imageLoading ? <View style={styles.photo}><ThemedText style={styles.emptyText}>Carregando foto...</ThemedText></View> : selectedReport.image_url ? (
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={[styles.photo, { aspectRatio: imageAspectRatio }]}
                  onPress={() => setFullscreenImage(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Abrir foto da denúncia em tela cheia"
                >
                  <Image source={{ uri: selectedReport.image_url }} style={styles.photoImage} resizeMode="contain" />
                  <View style={styles.expandHint}>
                    <MaterialCommunityIcons name="fullscreen" size={17} color={C.white} />
                    <ThemedText style={styles.expandHintText}>Ver em tela cheia</ThemedText>
                  </View>
                </TouchableOpacity>
              ) : <View style={styles.photo}><MaterialCommunityIcons name="image-off-outline" size={34} color={C.text3} /><ThemedText style={styles.emptyText}>Sem foto</ThemedText></View>}
              <View style={styles.detail}><ThemedText style={styles.label}>Descrição</ThemedText><ThemedText style={styles.value}>{selectedReport.description || 'Sem descrição'}</ThemedText></View>
              <View style={styles.detail}><ThemedText style={styles.label}>Localização</ThemedText><ThemedText style={styles.value}>{selectedReport.location?.address || 'Localização desconhecida'}</ThemedText></View>
              <View style={styles.detail}><ThemedText style={styles.label}>Data e hora</ThemedText><ThemedText style={styles.value}>{formatDate(selectedReport.created_at)}</ThemedText></View>
              <View style={styles.detail}><ThemedText style={styles.label}>Status</ThemedText><ThemedText style={[styles.value, { color: statusColor(selectedReport.status) }]}>{statusLabel(selectedReport.status)}</ThemedText></View>
              <View style={styles.detail}><ThemedText style={styles.label}>Visibilidade</ThemedText><ThemedText style={[styles.value, { color: selectedReport.hidden_from_public ? C.danger : C.eco }]}>{selectedReport.hidden_from_public ? 'Oculta para usuários' : 'Visível conforme as regras públicas'}</ThemedText></View>
              {normalizeStatus(selectedReport.status) === 'resolved' ? (
                <>
                  <ReportRetentionTimer resolvedAt={selectedReport.resolved_at} audience="admin" />
                  <View style={styles.lockedNotice}>
                  <MaterialCommunityIcons name="lock-outline" size={20} color={C.eco} />
                  <View style={styles.lockedNoticeCopy}>
                    <ThemedText style={styles.lockedNoticeTitle}>Denúncia concluída</ThemedText>
                    <ThemedText style={styles.lockedNoticeText}>Esta denúncia não pode mais ser alterada, ocultada ou excluída manualmente. Ela seguirá o prazo automático de retenção do sistema.</ThemedText>
                  </View>
                </View>
                </>
              ) : (
                <>
                  <ThemedText style={styles.label}>Alterar status</ThemedText>
                  {STATUS_OPTIONS.map(option => <TouchableOpacity key={option.id} style={[styles.statusOption, normalizeStatus(selectedReport.status) === option.id && { borderColor: option.color, backgroundColor: option.color + '12' }]} onPress={() => handleStatusChange(option.id)}><MaterialCommunityIcons name={option.icon as any} size={19} color={option.color} /><ThemedText style={[styles.statusOptionText, normalizeStatus(selectedReport.status) === option.id && { color: option.color }]}>{option.label}</ThemedText></TouchableOpacity>)}
                  <TouchableOpacity style={[styles.visibilityButton, selectedReport.hidden_from_public && styles.showButton]} onPress={() => handleVisibilityChange(selectedReport)}>
                    <MaterialCommunityIcons name={selectedReport.hidden_from_public ? 'eye-outline' : 'eye-off-outline'} size={19} color={selectedReport.hidden_from_public ? C.eco : C.danger} />
                    <ThemedText style={[styles.visibilityButtonText, { color: selectedReport.hidden_from_public ? C.eco : C.danger }]}>{selectedReport.hidden_from_public ? 'Mostrar para usuários' : 'Ocultar para usuários'}</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.permanentDeleteButton} onPress={() => handleDelete(selectedReport.id)}>
                    <MaterialCommunityIcons name="trash-can-outline" size={19} color={C.danger} />
                    <ThemedText style={styles.permanentDeleteText}>Excluir permanentemente</ThemedText>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedReport(null)}><ThemedText style={styles.closeText}>Fechar</ThemedText></TouchableOpacity>
          </>}
        </View></View>
      </Modal>

      <Modal visible={fullscreenImage} transparent animationType="fade" onRequestClose={() => setFullscreenImage(false)}>
        <View style={styles.fullscreenOverlay}>
          <TouchableOpacity style={styles.fullscreenClose} onPress={() => setFullscreenImage(false)} accessibilityRole="button" accessibilityLabel="Fechar foto em tela cheia">
            <MaterialCommunityIcons name="close" size={27} color={C.white} />
          </TouchableOpacity>
          {selectedReport?.image_url ? <Image source={{ uri: selectedReport.image_url }} style={styles.fullscreenImage} resizeMode="contain" /> : null}
        </View>
      </Modal>
    </ThemedView>
  );
}

const makeStyles = (colors: typeof C) =>
  StyleSheet.create({
  container: { flex: 1 }, header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  headerIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, headerText: { flex: 1, marginLeft: 12 }, title: { fontSize: 20, fontWeight: '800', color: colors.text }, subtitle: { fontSize: 11, color: colors.text3, marginTop: 2 }, countBadge: { minWidth: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }, countText: { fontWeight: '800', color: colors.text },
  filterBar: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 7, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface, flexWrap: 'wrap' }, filterButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2 }, filterButtonActive: { borderColor: colors.primary + '55', backgroundColor: colors.primary + '0A' }, filterText: { fontSize: 11, fontWeight: '800', color: colors.text2 }, filterCount: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }, filterCountText: { fontSize: 10, fontWeight: '900', color: colors.text3 },
  list: { padding: 16, gap: 12 }, card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16 }, securityCard: { borderColor: colors.danger + '55' }, hiddenCard: { opacity: 0.72 }, cardTop: { flexDirection: 'row', alignItems: 'flex-start' }, cardInfo: { flex: 1 }, categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, category: { fontSize: 11, fontWeight: '900', color: colors.primary, letterSpacing: 0.7 }, hiddenBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.danger + '18' }, hiddenBadgeText: { fontSize: 8, fontWeight: '900', color: colors.danger }, address: { fontSize: 13, color: colors.text2, marginTop: 4 }, deleteButton: { padding: 2, marginLeft: 8 }, description: { fontSize: 14, color: colors.text, marginTop: 14, lineHeight: 20 }, cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }, date: { fontSize: 11, color: colors.text3 }, statusBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 }, statusText: { fontSize: 10, fontWeight: '800' }, empty: { alignItems: 'center', padding: 48 }, emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 12 }, emptyText: { fontSize: 12, color: colors.text3, marginTop: 4, textAlign: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
  fullscreenOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', alignItems: 'center', justifyContent: 'center', padding: 18 },
  fullscreenImage: { width: '100%', height: '100%' },
  fullscreenClose: { position: 'absolute', top: 20, right: 20, zIndex: 2, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.58)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' }, modal: { width: '100%', maxWidth: 620, maxHeight: '90%', backgroundColor: colors.surface, borderRadius: 20, overflow: 'hidden' }, modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: colors.border }, modalScroll: { flexShrink: 1 }, modalBody: { padding: 18, gap: 12, paddingBottom: 24 }, reporterRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, avatarImage: { width: '100%', height: '100%' }, reporterCopy: { flex: 1 }, photo: { width: '100%', minHeight: 180, maxHeight: 420, borderRadius: 14, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, photoImage: { width: '100%', height: '100%' }, expandHint: { position: 'absolute', right: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 9, backgroundColor: 'rgba(0,0,0,0.62)' }, expandHintText: { color: colors.white, fontSize: 10, fontWeight: '700' }, detail: { padding: 14, borderRadius: 12, backgroundColor: colors.surface2 }, label: { fontSize: 10, fontWeight: '800', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }, value: { fontSize: 14, color: colors.text, lineHeight: 20 }, secondary: { fontSize: 11, color: colors.text3, marginTop: 3 }, statusOption: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 11, marginTop: 8 }, statusOptionText: { fontSize: 13, fontWeight: '700', color: colors.text }, visibilityButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderWidth: 1, borderColor: colors.danger + '55', borderRadius: 11, backgroundColor: colors.danger + '10', marginTop: 4 }, showButton: { borderColor: colors.eco + '55', backgroundColor: colors.eco + '10' }, visibilityButtonText: { fontSize: 13, fontWeight: '800' }, permanentDeleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderWidth: 1, borderColor: colors.danger + '55', borderRadius: 11, backgroundColor: colors.danger + '08', marginTop: 4 }, permanentDeleteText: { fontSize: 13, fontWeight: '800', color: colors.danger }, closeButton: { margin: 16, marginTop: 0, padding: 13, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center' }, closeText: { color: colors.white, fontWeight: '800' },
});
