import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Image, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { C } from '../../constants/theme';
import { deleteReport, getAdminReports, updateReportStatus } from '../../services/reports';
import { createReportImageUrl } from '../../services/supabase';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';

interface Report {
  id: string; category?: string; description?: string; status?: string; image_url?: string | null;
  reporter?: { name?: string | null; email?: string | null } | null;
  location?: { latitude?: number; longitude?: number; address?: string }; created_at?: string;
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
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAdminReports();
      const filtered = (data || []).filter((report: Report) => {
        const category = String(report.category || '').trim().toLowerCase();
        return security ? category === 'seguranca' : category !== 'seguranca';
      });
      const withImages = await Promise.all(filtered.map(async report => {
        if (!report.image_url) return report;
        try { return { ...report, image_url: await createReportImageUrl(report.image_url) }; }
        catch { return { ...report, image_url: null }; }
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
    if (!selectedReport || normalizeStatus(selectedReport.status) === newStatus) return;
    try {
      await updateReportStatus(selectedReport.id, newStatus);
      setReports(prev => prev.map(r => r.id === selectedReport.id ? { ...r, status: newStatus } : r));
      setSelectedReport(null);
      Alert.alert('Sucesso', 'Status atualizado com sucesso.');
    } catch (error) { console.error(error); Alert.alert('Erro', 'Falha ao atualizar status.'); }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Confirmar exclusão', 'Deseja excluir esta denúncia?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        try { await deleteReport(id); setReports(prev => prev.filter(r => r.id !== id)); setSelectedReport(null); }
        catch (error) { console.error(error); Alert.alert('Erro', 'Falha ao excluir a denúncia.'); }
      } },
    ]);
  };

  const openReport = async (report: Report) => {
    setSelectedReport(report);
    if (!report.image_url) return;
    setImageLoading(true);
    try {
      const url = await createReportImageUrl(report.image_url);
      setSelectedReport(current => current?.id === report.id ? { ...current, image_url: url } : current);
    } catch { setSelectedReport(current => current?.id === report.id ? { ...current, image_url: null } : current); }
    finally { setImageLoading(false); }
  };

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

      <FlatList
        data={reports} keyExtractor={item => item.id} contentContainerStyle={styles.list} onRefresh={loadReports} refreshing={loading}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.card, security && styles.securityCard]} onPress={() => openReport(item)}>
            <View style={styles.cardTop}>
              <View style={styles.cardInfo}>
                <ThemedText style={[styles.category, security && { color: C.danger }]}>{security ? 'SEGURANÇA' : (item.category || 'SEM CATEGORIA').toUpperCase()}</ThemedText>
                <ThemedText style={styles.address} numberOfLines={1}>{item.location?.address || 'Localização desconhecida'}</ThemedText>
              </View>
              <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteButton}><MaterialCommunityIcons name="trash-can-outline" size={21} color={C.danger} /></TouchableOpacity>
            </View>
            <ThemedText style={styles.description} numberOfLines={2}>{item.description || 'Sem descrição'}</ThemedText>
            <View style={styles.cardBottom}><ThemedText style={styles.date}>{formatDate(item.created_at)}</ThemedText><View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + '20' }]}><ThemedText style={[styles.statusText, { color: statusColor(item.status) }]}>{statusLabel(item.status)}</ThemedText></View></View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<View style={styles.empty}><MaterialCommunityIcons name={security ? 'shield-check-outline' : 'check-circle-outline'} size={48} color={C.text3} /><ThemedText style={styles.emptyTitle}>Nenhuma denúncia encontrada</ThemedText><ThemedText style={styles.emptyText}>Novas ocorrências aparecerão aqui.</ThemedText></View>}
      />

      <Modal visible={!!selectedReport} transparent animationType="fade" onRequestClose={() => setSelectedReport(null)}>
        <View style={styles.overlay}><View style={styles.modal}>
          {selectedReport && <>
            <View style={styles.modalHeader}><View><ThemedText style={styles.modalEyebrow}>{security ? 'SEGURANÇA' : 'ZELADORIA'}</ThemedText><ThemedText style={styles.modalTitle}>#{selectedReport.id.slice(0, 8).toUpperCase()}</ThemedText></View><TouchableOpacity onPress={() => setSelectedReport(null)}><MaterialCommunityIcons name="close" size={24} color={C.text2} /></TouchableOpacity></View>
            <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
              {imageLoading ? <View style={styles.photo}><ThemedText style={styles.emptyText}>Carregando foto...</ThemedText></View> : selectedReport.image_url ? <Image source={{ uri: selectedReport.image_url }} style={styles.photo} resizeMode="cover" /> : <View style={styles.photo}><MaterialCommunityIcons name="image-off-outline" size={34} color={C.text3} /><ThemedText style={styles.emptyText}>Sem foto</ThemedText></View>}
              <View style={styles.detail}><ThemedText style={styles.label}>Denunciante</ThemedText><ThemedText style={styles.value}>{selectedReport.reporter?.name || selectedReport.reporter?.email || 'Usuário não identificado'}</ThemedText>{selectedReport.reporter?.name && selectedReport.reporter?.email ? <ThemedText style={styles.secondary}>{selectedReport.reporter.email}</ThemedText> : null}</View>
              <View style={styles.detail}><ThemedText style={styles.label}>Descrição</ThemedText><ThemedText style={styles.value}>{selectedReport.description || 'Sem descrição'}</ThemedText></View>
              <View style={styles.detail}><ThemedText style={styles.label}>Localização</ThemedText><ThemedText style={styles.value}>{selectedReport.location?.address || 'Localização desconhecida'}</ThemedText></View>
              <View style={styles.detail}><ThemedText style={styles.label}>Data e hora</ThemedText><ThemedText style={styles.value}>{formatDate(selectedReport.created_at)}</ThemedText></View>
              <View style={styles.detail}><ThemedText style={styles.label}>Status</ThemedText><ThemedText style={[styles.value, { color: statusColor(selectedReport.status) }]}>{statusLabel(selectedReport.status)}</ThemedText></View>
              <ThemedText style={styles.label}>Alterar status</ThemedText>
              {STATUS_OPTIONS.map(option => <TouchableOpacity key={option.id} style={[styles.statusOption, normalizeStatus(selectedReport.status) === option.id && { borderColor: option.color, backgroundColor: option.color + '12' }]} onPress={() => handleStatusChange(option.id)}><MaterialCommunityIcons name={option.icon as any} size={19} color={option.color} /><ThemedText style={[styles.statusOptionText, normalizeStatus(selectedReport.status) === option.id && { color: option.color }]}>{option.label}</ThemedText></TouchableOpacity>)}
            </ScrollView>
            <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedReport(null)}><ThemedText style={styles.closeText}>Fechar</ThemedText></TouchableOpacity>
          </>}
        </View></View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surface },
  headerIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, headerText: { flex: 1, marginLeft: 12 }, title: { fontSize: 20, fontWeight: '800', color: C.text }, subtitle: { fontSize: 11, color: C.text3, marginTop: 2 }, countBadge: { minWidth: 34, height: 34, borderRadius: 17, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' }, countText: { fontWeight: '800', color: C.text },
  list: { padding: 16, gap: 12 }, card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 16 }, securityCard: { borderColor: C.danger + '55' }, cardTop: { flexDirection: 'row', alignItems: 'flex-start' }, cardInfo: { flex: 1 }, category: { fontSize: 11, fontWeight: '900', color: C.primary, letterSpacing: 0.7 }, address: { fontSize: 13, color: C.text2, marginTop: 4 }, deleteButton: { padding: 2, marginLeft: 8 }, description: { fontSize: 14, color: C.text, marginTop: 14, lineHeight: 20 }, cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }, date: { fontSize: 11, color: C.text3 }, statusBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 }, statusText: { fontSize: 10, fontWeight: '800' }, empty: { alignItems: 'center', padding: 48 }, emptyTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginTop: 12 }, emptyText: { fontSize: 12, color: C.text3, marginTop: 4, textAlign: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 }, modal: { maxHeight: '90%', backgroundColor: C.surface, borderRadius: 20, overflow: 'hidden' }, modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: C.border }, modalEyebrow: { fontSize: 10, fontWeight: '900', color: C.text3, letterSpacing: 1 }, modalTitle: { fontSize: 19, fontWeight: '800', color: C.text, marginTop: 2 }, modalBody: { padding: 18, gap: 12 }, photo: { height: 220, borderRadius: 14, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, detail: { padding: 14, borderRadius: 12, backgroundColor: C.surface2 }, label: { fontSize: 10, fontWeight: '800', color: C.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }, value: { fontSize: 14, color: C.text, lineHeight: 20 }, secondary: { fontSize: 11, color: C.text3, marginTop: 3 }, statusOption: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderWidth: 1, borderColor: C.border, borderRadius: 11, marginTop: 8 }, statusOptionText: { fontSize: 13, fontWeight: '700', color: C.text }, closeButton: { margin: 16, marginTop: 0, padding: 13, borderRadius: 11, backgroundColor: C.primary, alignItems: 'center' }, closeText: { color: C.white, fontWeight: '800' },
});
