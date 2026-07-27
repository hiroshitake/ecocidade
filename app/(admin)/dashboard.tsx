import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '../../components/themed-text';
import { ThemedView } from '../../components/themed-view';
import { C, S } from '../../constants/theme';
import { logout } from '../../services/auth';
import { getAllReports } from '../../services/reports';

/* TODO: REQUIREMENTS GAPS
 - RNF-01 RBAC: ensure only users with admin role (CNPJ-based) can access this route; integrate role checks on auth state.
 - RF-01 Export KPIs CSV/PDF and add refresh/polling for live stats.
 - RNF-02 Add caching/fast-path to keep dashboard load ≤3s.
*/

interface ReportStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  byCategory: { [key: string]: number };
  byMonth: { [key: string]: number };
}

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function AdminDashboard() {
  const [stats, setStats] = useState<ReportStats>({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    byCategory: {},
    byMonth: {},
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const reports = (await getAllReports()) as any[];

      // Processar estatísticas
      const newStats: ReportStats = {
        total: reports.length,
        pending: 0,
        inProgress: 0,
        completed: 0,
        byCategory: {},
        byMonth: {},
      };

      // Inicializar meses
      MONTHS.forEach(month => {
        newStats.byMonth[month] = 0;
      });

      reports.forEach((report) => {
        // Contar por status
        const status = report.status || 'aguardando';
        if (status === 'aguardando') newStats.pending++;
        else if (status === 'processo') newStats.inProgress++;
        else if (status === 'concluida') newStats.completed++;

        // Contar por categoria
        const cat = report.category || 'outro';
        newStats.byCategory[cat] = (newStats.byCategory[cat] || 0) + 1;

        // Contar por mês
        if (report.createdAt) {
          const date = typeof report.createdAt.toDate === 'function' 
            ? report.createdAt.toDate() 
            : new Date(report.createdAt);
          const month = MONTHS[date.getMonth()];
          newStats.byMonth[month]++;
        }
      });

      setStats(newStats);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Erro ao deslogar admin:', error);
    } finally {
      router.replace('/admin-login');
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <ThemedText style={styles.headerTitle}>Dashboard Admin</ThemedText>
          <ThemedText style={styles.headerSubtitle}>Prefeitura - Ecocidade</ThemedText>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={20} color={C.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          {/* Total */}
          <View style={[styles.statCard, styles.statCardTotal]}>
            <MaterialCommunityIcons name="chart-box" size={32} color={C.primary} />
            <ThemedText style={styles.statValue}>{stats.total}</ThemedText>
            <ThemedText style={styles.statLabel}>Total de Denúncias</ThemedText>
          </View>

          {/* Pendentes */}
          <View style={[styles.statCard, styles.statCardPending]}>
            <MaterialCommunityIcons name="clock-alert-outline" size={32} color={C.warning} />
            <ThemedText style={styles.statValue}>{stats.pending}</ThemedText>
            <ThemedText style={styles.statLabel}>Aguardando</ThemedText>
          </View>

          {/* Em Processo */}
          <View style={[styles.statCard, styles.statCardInProgress]}>
            <MaterialCommunityIcons name="progress-clock" size={32} color={C.primary} />
            <ThemedText style={styles.statValue}>{stats.inProgress}</ThemedText>
            <ThemedText style={styles.statLabel}>Em Processo</ThemedText>
          </View>

          {/* Concluídas */}
          <View style={[styles.statCard, styles.statCardCompleted]}>
            <MaterialCommunityIcons name="check-circle-outline" size={32} color={C.eco} />
            <ThemedText style={styles.statValue}>{stats.completed}</ThemedText>
            <ThemedText style={styles.statLabel}>Concluídas</ThemedText>
          </View>
        </View>

        {/* Taxa de Resolução */}
        <View style={styles.resolutionRate}>
          <ThemedText style={styles.sectionTitle}>Taxa de Resolução</ThemedText>
          <View style={styles.rateContainer}>
            <View style={styles.rateBar}>
              <View 
                style={[
                  styles.rateProgress,
                  { width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }
                ]}
              />
            </View>
            <ThemedText style={styles.rateText}>
              {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
            </ThemedText>
          </View>
        </View>

        {/* Categorias */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Denúncias por Categoria</ThemedText>
          <View style={styles.categoryList}>
            {Object.entries(stats.byCategory)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([category, count]) => (
                <View key={category} style={styles.categoryItem}>
                  <ThemedText style={styles.categoryName}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </ThemedText>
                  <ThemedText style={styles.categoryCount}>{count}</ThemedText>
                </View>
              ))}
          </View>
        </View>

        {/* Menu de Ações */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Ações Administrativas</ThemedText>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/(admin)/manage-reports')}
          >
            <MaterialCommunityIcons name="map-marker-check" size={24} color={C.primary} />
            <View style={styles.actionContent}>
              <ThemedText style={styles.actionTitle}>Gerenciar Denúncias</ThemedText>
              <ThemedText style={styles.actionDesc}>Alterar status e visualizar detalhes</ThemedText>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={C.text3} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/(admin)/danger-zones')}
          >
            <MaterialCommunityIcons name="alert-octagon" size={24} color={C.danger} />
            <View style={styles.actionContent}>
              <ThemedText style={styles.actionTitle}>Áreas de Perigo</ThemedText>
              <ThemedText style={styles.actionDesc}>Criar e gerenciar zonas perigosas</ThemedText>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={C.text3} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/(admin)/security-analysis')}
          >
            <MaterialCommunityIcons name="security" size={24} color={C.eco} />
            <View style={styles.actionContent}>
              <ThemedText style={styles.actionTitle}>Análise de Segurança</ThemedText>
              <ThemedText style={styles.actionDesc}>Visualizar mapa de calor e histórico</ThemedText>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={C.text3} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
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
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.surface,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: C.text,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: C.text3,
  },
  logoutBtn: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    width: '48%',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    ...S.shadow.sm,
  },
  statCardTotal: {
    backgroundColor: C.primaryLight,
  },
  statCardPending: {
    backgroundColor: C.warningLight,
  },
  statCardInProgress: {
    backgroundColor: C.primaryLight,
  },
  statCardCompleted: {
    backgroundColor: C.ecoLight,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    color: C.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: C.text2,
    marginTop: 6,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    marginBottom: 12,
  },
  resolutionRate: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: C.border,
  },
  rateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rateBar: {
    flex: 1,
    height: 8,
    backgroundColor: C.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  rateProgress: {
    height: '100%',
    backgroundColor: C.eco,
    borderRadius: 4,
  },
  rateText: {
    fontSize: 16,
    fontWeight: '700',
    color: C.eco,
    minWidth: 40,
  },
  categoryList: {
    backgroundColor: C.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
  },
  categoryCount: {
    fontSize: 16,
    fontWeight: '700',
    color: C.primary,
    backgroundColor: C.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  actionContent: {
    flex: 1,
    marginLeft: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
    marginBottom: 2,
  },
  actionDesc: {
    fontSize: 12,
    color: C.text3,
  },
});
