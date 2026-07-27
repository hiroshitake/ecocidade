import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { ThemedText } from '../../components/themed-text';
import { ThemedView } from '../../components/themed-view';
import { C } from '../../constants/theme';
import { deleteReport, getAllReports, updateReportStatus } from '../../services/reports';

/* TODO: REQUIREMENTS GAPS
 - RF-05 Status changes currently simulated locally; implement and call `updateReportStatus(reportId, newStatus)` in `services/reports.js` to persist.
 - RNF-01 Add audit trail entry when admin changes status (write to `report_timeline`).
 - RNF-02 Add filters and search for admin list (date range, category, status).
*/

interface Report {
  id: string;
  category?: string;
  description?: string;
  status?: string;
  location?: { latitude?: number; longitude?: number; address?: string };
  createdAt?: any;
}

const STATUS_OPTIONS = [
  { id: 'aguardando', label: 'Aguardando', icon: 'clock-alert-outline', color: C.warning },
  { id: 'processo', label: 'Em Processo', icon: 'progress-clock', color: C.primary },
  { id: 'concluida', label: 'Concluída', icon: 'check-circle-outline', color: C.eco },
];

export default function ManageReportsScreen() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const router = useRouter();

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllReports();
      setReports(data || []);
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

    try {
      await updateReportStatus(selectedReport.id, newStatus);
      setReports(prev =>
        prev.map(r =>
          r.id === selectedReport.id ? { ...r, status: newStatus } : r
        )
      );

      Alert.alert('Sucesso', `Denúncia atualizada para "${STATUS_OPTIONS.find(s => s.id === newStatus)?.label}"`);
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
    return STATUS_OPTIONS.find(s => s.id === status)?.color || C.text3;
  };

  const getStatusLabel = (status?: string) => {
    return STATUS_OPTIONS.find(s => s.id === status)?.label || 'Desconhecido';
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
        <ThemedText style={styles.reportDate}>{formatDate(item.createdAt)}</ThemedText>
        <MaterialCommunityIcons name="chevron-right" size={20} color={C.text3} />
      </View>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="chevron-left" size={24} color={C.primary} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Gerenciar Denúncias</ThemedText>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Lista de Denúncias */}
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

      {/* Modal de Mudança de Status */}
      <Modal visible={showStatusModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedReport && (
              <>
                <View style={styles.modalHeader}>
                  <ThemedText style={styles.modalTitle}>Alterar Status</ThemedText>
                  <TouchableOpacity onPress={() => setShowStatusModal(false)}>
                    <MaterialCommunityIcons name="close" size={24} color={C.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
                  <View style={styles.reportPreview}>
                    <ThemedText style={styles.previewCategory}>
                      {selectedReport.category?.toUpperCase() || 'SEM CATEGORIA'}
                    </ThemedText>
                    <ThemedText style={styles.previewAddress} numberOfLines={2}>
                      {selectedReport.location?.address || 'Localização desconhecida'}
                    </ThemedText>
                  </View>

                  <ThemedText style={styles.statusLabel}>Novo Status:</ThemedText>
                  <View style={styles.statusOptions}>
                    {STATUS_OPTIONS.map(option => (
                      <TouchableOpacity
                        key={option.id}
                        style={[
                          styles.statusOption,
                          selectedReport.status === option.id && styles.statusOptionSelected,
                          { borderColor: option.color },
                        ]}
                        onPress={() => handleStatusChange(option.id)}
                      >
                        <MaterialCommunityIcons
                          name={option.icon as any}
                          size={28}
                          color={option.color}
                        />
                        <ThemedText style={styles.statusOptionLabel}>{option.label}</ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowStatusModal(false)}
                >
                  <ThemedText style={styles.cancelBtnText}>Cancelar</ThemedText>
                </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.surface,
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
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  reportCard: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  reportInfo: {
    flex: 1,
    marginRight: 10,
  },
  reportCategory: {
    fontSize: 13,
    fontWeight: '700',
    color: C.primary,
    marginBottom: 4,
  },
  reportAddress: {
    fontSize: 12,
    color: C.text2,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  reportActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deleteButton: {
    padding: 6,
  },
  reportDescription: {
    fontSize: 12,
    color: C.text2,
    marginBottom: 10,
    lineHeight: 18,
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportDate: {
    fontSize: 11,
    color: C.text3,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    marginTop: 12,
    color: C.text3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(13, 27, 54, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  reportPreview: {
    backgroundColor: C.primaryLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  previewCategory: {
    fontSize: 13,
    fontWeight: '700',
    color: C.primary,
    marginBottom: 6,
  },
  previewAddress: {
    fontSize: 12,
    color: C.text2,
    lineHeight: 18,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
    marginBottom: 12,
  },
  statusOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 10,
  },
  statusOption: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: C.surface2,
  },
  statusOptionSelected: {
    backgroundColor: C.primaryLight,
  },
  statusOptionLabel: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '600',
    color: C.text,
    textAlign: 'center',
  },
  cancelBtn: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: C.border,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontWeight: '700',
    color: C.text,
  },
});
