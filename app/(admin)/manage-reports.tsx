import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { ThemedText } from '../../components/themed-text';
import { ThemedView } from '../../components/themed-view';
import { C } from '../../constants/theme';
import { deleteReport, getAdminReports, updateReportStatus } from '../../services/reports';
import { createReportImageUrl } from '../../services/supabase';

interface Report {
  id: string;
  category?: string;
  description?: string;
  status?: string;
  image_url?: string | null;
  user_id?: string | null;
  reporter?: {
    name?: string | null;
    email?: string | null;
  } | null;
  location?: { latitude?: number; longitude?: number; address?: string };
  created_at?: string;
}

// Valores canônicos usados no banco; os rótulos continuam em português na interface.
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

export default function ManageReportsScreen() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const router = useRouter();

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAdminReports();
      const reportsWithImageUrls = await Promise.all(
        (data || []).map(async (report: Report) => {
          if (!report.image_url) return report;

          try {
            return {
              ...report,
              image_url: await createReportImageUrl(report.image_url),
            };
          } catch (error) {
            console.warn('Não foi possível gerar a URL da foto da denúncia:', error);
            return { ...report, image_url: null };
          }
        }),
      );

      setReports(reportsWithImageUrls);
    } catch (error) {
      console.error('Erro ao carregar denúncias:', error);
      Alert.alert('Erro', 'Falha ao carregar denúncias');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [loadReports])
  );

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedReport) return;

    const currentStatus = normalizeStatus(selectedReport.status);
    if (currentStatus === newStatus) {
      Alert.alert('Atenção', 'Esta denúncia já está com o status selecionado.');
      return;
    }

    try {
      await updateReportStatus(selectedReport.id, newStatus);
      setReports(prev =>
        prev.map(r =>
          r.id === selectedReport.id ? { ...r, status: newStatus } : r
        )
      );

      Alert.alert('Sucesso', `Denúncia atualizada para \"${STATUS_OPTIONS.find(s => s.id === newStatus)?.label}\"`);
      setShowStatusModal(false);
      setSelectedReport(null);
    } catch (error) {
      console.error('Erro ao atualizar status da denúncia:', error);
      Alert.alert('Erro', 'Falha ao atualizar status');
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    Alert.alert('Confirmar', 'Deseja excluir esta denúncia?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteReport(reportId);
            setReports(prev => prev.filter((report) => report.id !== reportId));
            if (selectedReport?.id === reportId) {
              setSelectedReport(null);
              setShowStatusModal(false);
            }
            Alert.alert('Sucesso', 'Denúncia excluída com sucesso');
          } catch (error) {
            console.error('Erro ao excluir denúncia:', error);
            Alert.alert('Erro', 'Falha ao excluir a denúncia');
          }
        },
      },
    ]);
  };

  const getStatusColor = (status?: string) => {
    const normalized = normalizeStatus(status);
    return STATUS_OPTIONS.find(s => s.id === normalized)?.color || C.text3;
  };

  const getStatusLabel = (status?: string) => {
    const normalized = normalizeStatus(status);
    return STATUS_OPTIONS.find(s => s.id === normalized)?.label || 'Aguardando';
  };

  const formatDate = (date: any) => {
    if (!date) return 'Sem data';
    const d = typeof date.toDate === 'function' ? date.toDate() : new Date(date);
    return d.toLocaleDateString('pt-BR');
  };

  const renderReport = ({ item }: { item: Report }) => (
    <TouchableOpacity
      style={styles.reportCard}
      onPress={() => {
        setSelectedReport(item);
        setShowStatusModal(true);
      }}
    >
      <View style={styles.reportHeader}>
        <View style={styles.reportInfo}>
          <ThemedText style={styles.reportCategory}>
            {item.category ? item.category.toUpperCase() : 'SEM CATEGORIA'}
          </ThemedText>
          <ThemedText style={styles.reportAddress} numberOfLines={1}>
            {item.location?.address || 'Localização desconhecida'}
          </ThemedText>
        </View>
        <View style={styles.reportActions}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) + '20' },
            ]}
          >
            <ThemedText style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </ThemedText>
          </View>
          <TouchableOpacity onPress={() => handleDeleteReport(item.id)} style={styles.deleteButton}>
            <MaterialCommunityIcons name="trash-can-outline" size={22} color={C.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <ThemedText style={styles.reportDescription} numberOfLines={2}>
        {item.description || 'Sem descrição'}
      </ThemedText>

      <View style={styles.reportFooter}>
        <ThemedText style={styles.reportDate}>{formatDate(item.created_at)}</ThemedText>
        <MaterialCommunityIcons name="chevron-right" size={20} color={C.text3} />
      </View>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="chevron-left" size={24} color={C.primary} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Gerenciar Denúncias</ThemedText>
        <View style={styles.headerPlaceholder} />
      </View>

      <FlatList
        data={reports}
        renderItem={renderReport}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        onRefresh={loadReports}
        refreshing={loading}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="inbox-multiple" size={48} color={C.text3} />
            <ThemedText style={styles.emptyText}>Nenhuma denúncia encontrada</ThemedText>
          </View>
        }
      />

      <Modal visible={showStatusModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedReport && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleContainer}>
                    <ThemedText style={styles.modalEyebrow}>DENÚNCIA</ThemedText>
                    <ThemedText style={styles.modalTitle}>
                      #{selectedReport.id.slice(0, 8).toUpperCase()}
                    </ThemedText>
                  </View>
                  <TouchableOpacity onPress={() => setShowStatusModal(false)} style={styles.modalCloseButton}>
                    <MaterialCommunityIcons name="close" size={22} color={C.text2} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalDivider} />

                <View style={styles.modalBody}>
                  <View style={styles.photoColumn}>
                    <ThemedText style={styles.detailLabel}>Foto da ocorrência</ThemedText>
                    {selectedReport.image_url ? (
                      <Image
                        source={{ uri: selectedReport.image_url }}
                        style={styles.reportImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.noPhotoBox}>
                        <MaterialCommunityIcons name="image-off-outline" size={34} color={C.text3} />
                        <ThemedText style={styles.noPhotoText}>Sem foto</ThemedText>
                      </View>
                    )}
                  </View>

                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    style={styles.infoColumn}
                    contentContainerStyle={styles.infoColumnContent}
                  >
                    <View style={styles.detailCard}>
                      <ThemedText style={styles.detailLabel}>Denunciante</ThemedText>
                      <ThemedText style={styles.detailValue} numberOfLines={2}>
                        {selectedReport.reporter?.name || selectedReport.reporter?.email || 'Usuário não identificado'}
                      </ThemedText>
                      {selectedReport.reporter?.name && selectedReport.reporter?.email ? (
                        <ThemedText style={styles.detailSecondary} numberOfLines={1}>
                          {selectedReport.reporter.email}
                        </ThemedText>
                      ) : null}
                    </View>

                    <View style={styles.infoGrid}>
                      <View style={styles.detailCard}>
                        <ThemedText style={styles.detailLabel}>Categoria</ThemedText>
                        <ThemedText style={styles.detailValue} numberOfLines={2}>
                          {selectedReport.category || 'Sem categoria'}
                        </ThemedText>
                      </View>

                      <View style={styles.detailCard}>
                        <ThemedText style={styles.detailLabel}>Data</ThemedText>
                        <ThemedText style={styles.detailValue}>
                          {formatDate(selectedReport.created_at)}
                        </ThemedText>
                      </View>
                    </View>

                    <View style={styles.detailCard}>
                      <ThemedText style={styles.detailLabel}>Descrição</ThemedText>
                      <ThemedText style={styles.detailValue}>
                        {selectedReport.description || 'Sem descrição'}
                      </ThemedText>
                    </View>

                    <View style={styles.detailCard}>
                      <ThemedText style={styles.detailLabel}>Localização</ThemedText>
                      <ThemedText style={styles.detailValue}>
                        {selectedReport.location?.address || 'Localização desconhecida'}
                      </ThemedText>
                      {selectedReport.location?.latitude != null && selectedReport.location?.longitude != null ? (
                        <ThemedText style={styles.detailSecondary}>
                          {selectedReport.location.latitude.toFixed(6)}, {selectedReport.location.longitude.toFixed(6)}
                        </ThemedText>
                      ) : null}
                    </View>

                    <View style={styles.currentStatusCard}>
                      <View style={styles.currentStatusText}>
                        <ThemedText style={styles.detailLabel}>Status atual</ThemedText>
                        <ThemedText style={[styles.statusValue, { color: getStatusColor(selectedReport.status) }]}>
                          {getStatusLabel(selectedReport.status)}
                        </ThemedText>
                      </View>
                      <MaterialCommunityIcons
                        name={STATUS_OPTIONS.find(s => s.id === normalizeStatus(selectedReport.status))?.icon as any}
                        size={26}
                        color={getStatusColor(selectedReport.status)}
                      />
                    </View>

                    <View style={styles.statusOptions}>
                      <ThemedText style={styles.detailLabel}>Alterar status</ThemedText>
                      <View style={styles.statusOptionRow}>
                        {STATUS_OPTIONS.map(option => {
                          const active = normalizeStatus(selectedReport.status) === option.id;
                          return (
                            <TouchableOpacity
                              key={option.id}
                              style={[
                                styles.statusOption,
                                active && {
                                  borderColor: option.color,
                                  backgroundColor: option.color + '12',
                                },
                              ]}
                              onPress={() => handleStatusChange(option.id)}
                            >
                              <MaterialCommunityIcons name={option.icon as any} size={18} color={option.color} />
                              <ThemedText style={[styles.statusOptionText, active && { color: option.color }]}>
                                {option.label}
                              </ThemedText>
                              {active ? <MaterialCommunityIcons name="check" size={18} color={option.color} /> : null}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </ScrollView>
                </View>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setShowStatusModal(false)}
                  >
                    <ThemedText style={styles.closeButtonText}>Fechar</ThemedText>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
  },
  headerPlaceholder: {
    width: 24,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  reportCard: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  reportInfo: {
    flex: 1,
  },
  reportCategory: {
    fontSize: 12,
    fontWeight: '800',
    color: C.primary,
    letterSpacing: 0.5,
  },
  reportAddress: {
    fontSize: 13,
    color: C.text2,
    marginTop: 4,
  },
  reportActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  deleteButton: {
    padding: 2,
  },
  reportDescription: {
    fontSize: 14,
    color: C.text,
    marginTop: 14,
    lineHeight: 20,
  },
  reportFooter: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportDate: {
    fontSize: 12,
    color: C.text3,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyText: {
    color: C.text3,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 920,
    maxHeight: '90%',
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: C.border,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: C.text3,
    letterSpacing: 1,
    marginBottom: 3,
  },
  modalTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: C.text,
  },
  modalCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.background,
    borderWidth: 1,
    borderColor: C.border,
  },
  modalDivider: {
    height: 1,
    backgroundColor: C.border,
    marginTop: 16,
    marginBottom: 18,
  },
  modalBody: {
    flexDirection: 'row',
    gap: 24,
    minHeight: 430,
  },
  photoColumn: {
    width: 340,
  },
  reportImage: {
    width: '100%',
    height: 255,
    borderRadius: 14,
    marginTop: 8,
    backgroundColor: C.background,
  },
  noPhotoBox: {
    width: '100%',
    height: 255,
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  noPhotoText: {
    fontSize: 13,
    color: C.text3,
    fontWeight: '600',
  },
  infoColumn: {
    flex: 1,
  },
  infoColumnContent: {
    paddingBottom: 2,
    gap: 12,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  detailCard: {
    flex: 1,
    padding: 13,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.background,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: C.text3,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 5,
  },
  detailValue: {
    fontSize: 14,
    lineHeight: 20,
    color: C.text,
  },
  detailSecondary: {
    fontSize: 11,
    color: C.text3,
    marginTop: 5,
  },
  currentStatusCard: {
    padding: 13,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currentStatusText: {
    flex: 1,
  },
  statusValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  statusOptions: {
    gap: 7,
  },
  statusOptionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusOption: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  statusOptionText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.text,
  },
  modalFooter: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
    alignItems: 'flex-end',
  },
  closeButton: {
    minWidth: 120,
    minHeight: 42,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primary,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 14,
  },
});