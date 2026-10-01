import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { ThemedText } from '../../components/themed-text';
import { ThemedView } from '../../components/themed-view';
import { C, S } from '../../constants/theme';
import { useAppTheme } from '../../context/theme-context';
import { logout } from '../../services/auth';
import { getAdminReports } from '../../services/reports';

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
  recent30: number;
  recent30Resolved: number;
  securityTotal: number;
  securityOpen: number;
  avgResolutionDays: number | null;
  oldestPendingDays: number | null;
}

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const normalizeStatus = (status?: string) => {
  const value = String(status || '').trim().toLowerCase();

  if (['pending', 'aguardando'].includes(value)) return 'pending';
  if (['in_progress', 'processo', 'em processo'].includes(value)) return 'in_progress';
  if (['resolved', 'concluida', 'concluída', 'completed', 'done'].includes(value)) return 'resolved';

  return 'pending';
};

export default function AdminDashboard() {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const [stats, setStats] = useState<ReportStats>({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    recent30: 0,
    recent30Resolved: 0,
    securityTotal: 0,
    securityOpen: 0,
    avgResolutionDays: null,
    oldestPendingDays: null,
    byCategory: {},
    byMonth: {},
  });
  const [loading, setLoading] = useState(true);
  // Additional operational metrics are calculated from the same city-scoped dataset. 
  const router = useRouter();

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const reports = (await getAdminReports()) as any[];

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
      const currentYear = now.getFullYear();
      let resolutionTotalDays = 0;
      let resolutionCount = 0;

      const newStats: ReportStats = {
        total: reports.length,
        pending: 0,
        inProgress: 0,
        completed: 0,
        recent30: 0,
        recent30Resolved: 0,
        securityTotal: 0,
        securityOpen: 0,
        avgResolutionDays: null,
        oldestPendingDays: null,
        byCategory: {},
        byMonth: {},
      };

      MONTHS.forEach(month => {
        newStats.byMonth[month] = 0;
      });

      reports.forEach((report) => {
        // O banco usa os valores canônicos pending/in_progress/resolved.
        const status = normalizeStatus(report.status);
        if (status === 'pending') newStats.pending++;
        else if (status === 'in_progress') newStats.inProgress++;
        else if (status === 'resolved') newStats.completed++;

        const cat = String(report.category || 'outro').trim().toLowerCase();
        const createdAt = report.created_at ? new Date(report.created_at) : null;
        const resolvedAt = report.resolved_at ? new Date(report.resolved_at) : null;
        if (createdAt && !Number.isNaN(createdAt.getTime())) {
          if (createdAt >= thirtyDaysAgo) {
            newStats.recent30++;
            if (status === 'resolved') newStats.recent30Resolved++;
          }
          if (createdAt.getFullYear() === currentYear) {
            const month = MONTHS[createdAt.getMonth()];
            if (month) newStats.byMonth[month]++;
          }
          if (status === 'pending') {
            const pendingDays = Math.max(0, (now.getTime() - createdAt.getTime()) / 86400000);
            newStats.oldestPendingDays = newStats.oldestPendingDays === null ? pendingDays : Math.max(newStats.oldestPendingDays, pendingDays);
          }
        }
        if (cat === 'seguranca') {
          newStats.securityTotal++;
          if (status !== 'resolved') newStats.securityOpen++;
        }
        if (status === 'resolved' && createdAt && resolvedAt && !Number.isNaN(createdAt.getTime()) && !Number.isNaN(resolvedAt.getTime()) && resolvedAt >= createdAt) {
          resolutionTotalDays += (resolvedAt.getTime() - createdAt.getTime()) / 86400000;
          resolutionCount++;
        }
        newStats.byCategory[cat] = (newStats.byCategory[cat] || 0) + 1;

        // Supabase retorna created_at (snake_case), não createdAt.
        if (report.created_at) {
          const date = typeof report.created_at.toDate === 'function'
            ? report.created_at.toDate()
            : new Date(report.created_at);
          const month = MONTHS[date.getMonth()];
          if (month) newStats.byMonth[month]++;
        }
      });

      newStats.avgResolutionDays = resolutionCount > 0 ? resolutionTotalDays / resolutionCount : null;
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
    <ThemedView style={styles.container}><View style={styles.innerContainer}>
      <View style={styles.header}>
        <View>
          <ThemedText style={styles.headerTitle}>Dashboard Admin</ThemedText>
          <ThemedText style={styles.headerSubtitle}>Prefeitura - Ecocidade</ThemedText>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={20} color={colors.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.statCardTotal]}>
            <MaterialCommunityIcons name="chart-box" size={32} color={colors.primary} />
            <ThemedText style={styles.statValue}>{stats.total}</ThemedText>
            <ThemedText style={styles.statLabel}>Total de Denúncias</ThemedText>
          </View>

          <View style={[styles.statCard, styles.statCardPending]}>
            <MaterialCommunityIcons name="clock-alert-outline" size={32} color={colors.warning} />
            <ThemedText style={styles.statValue}>{stats.pending}</ThemedText>
            <ThemedText style={styles.statLabel}>Aguardando</ThemedText>
          </View>

          <View style={[styles.statCard, styles.statCardInProgress]}>
            <MaterialCommunityIcons name="progress-clock" size={32} color={colors.primary} />
            <ThemedText style={styles.statValue}>{stats.inProgress}</ThemedText>
            <ThemedText style={styles.statLabel}>Em Processo</ThemedText>
          </View>

          <View style={[styles.statCard, styles.statCardCompleted]}>
            <MaterialCommunityIcons name="check-circle-outline" size={32} color={colors.eco} />
            <ThemedText style={styles.statValue}>{stats.completed}</ThemedText>
            <ThemedText style={styles.statLabel}>Concluídas</ThemedText>
          </View>
        </View>

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

        <View style={styles.insightGrid}>
          <View style={styles.insightCard}>
            <MaterialCommunityIcons name="calendar-month-outline" size={22} color={colors.primary} />
            <ThemedText style={styles.insightValue}>{stats.recent30}</ThemedText>
            <ThemedText style={styles.insightLabel}>recebidas nos últimos 30 dias</ThemedText>
          </View>
          <View style={styles.insightCard}>
            <MaterialCommunityIcons name="timer-outline" size={22} color={colors.warning} />
            <ThemedText style={styles.insightValue}>{stats.avgResolutionDays === null ? '—' : stats.avgResolutionDays < 1 ? Math.round(stats.avgResolutionDays * 24) + 'h' : stats.avgResolutionDays.toFixed(1) + 'd'}</ThemedText>
            <ThemedText style={styles.insightLabel}>tempo médio até conclusão</ThemedText>
          </View>
        </View>

        <View style={styles.resolutionRate}>
          <View style={styles.sectionHeaderRow}>
            <View><ThemedText style={styles.sectionTitle}>Taxa de resolução</ThemedText><ThemedText style={styles.sectionHint}>Todo o histórico disponível</ThemedText></View>
            <ThemedText style={styles.rateText}>{stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%</ThemedText>
          </View>
          <View style={styles.rateBar}><View style={[styles.rateProgress, { width: (stats.total > 0 ? (stats.completed / stats.total) * 100 : 0) + '%' }]} /></View>
          <ThemedText style={styles.rateFooterText}>{stats.completed} concluídas de {stats.total} · {stats.recent30 > 0 ? Math.round((stats.recent30Resolved / stats.recent30) * 100) + '% resolvidas nos últimos 30 dias' : 'sem dados recentes'}</ThemedText>
        </View>

        <View style={styles.attentionCard}>
          <MaterialCommunityIcons name="alert-circle-outline" size={24} color={colors.warning} />
          <View style={styles.attentionContent}>
            <ThemedText style={styles.attentionTitle}>Itens que exigem atenção</ThemedText>
            <ThemedText style={styles.attentionText}>{stats.pending + stats.inProgress + stats.securityOpen === 0 ? 'Não há denúncias abertas no momento.' : (stats.pending + stats.inProgress) + ' denúncia(s) em aberto e ' + stats.securityOpen + ' ocorrência(s) de segurança não concluída(s).'}</ThemedText>
            {stats.oldestPendingDays !== null ? <ThemedText style={styles.attentionMeta}>Aguardando há mais tempo: {stats.oldestPendingDays < 1 ? 'menos de 1 dia' : Math.floor(stats.oldestPendingDays) + ' dia(s)'}</ThemedText> : null}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}><View><ThemedText style={styles.sectionTitle}>Evolução das denúncias</ThemedText><ThemedText style={styles.sectionHint}>Entradas por mês em {new Date().getFullYear()}</ThemedText></View></View>
          <View style={styles.monthChart}>
            {MONTHS.map(month => { const count = stats.byMonth[month] || 0; const maxMonth = Math.max(...Object.values(stats.byMonth), 1); return <View key={month} style={styles.monthColumn}><ThemedText style={styles.monthValue}>{count}</ThemedText><View style={styles.monthTrack}><View style={[styles.monthBar, { height: count === 0 ? 4 : Math.max(8, count / maxMonth * 108) }]} /></View><ThemedText style={styles.monthLabel}>{month}</ThemedText></View>; })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}><View><ThemedText style={styles.sectionTitle}>Resumo de segurança</ThemedText><ThemedText style={styles.sectionHint}>Dentro da cidade do administrador</ThemedText></View><MaterialCommunityIcons name="shield-alert-outline" size={22} color={colors.danger} /></View>
          <View style={styles.securitySummary}>
            <View style={styles.securityMetric}><ThemedText style={styles.securityValue}>{stats.securityTotal}</ThemedText><ThemedText style={styles.securityLabel}>total</ThemedText></View>
            <View style={styles.securityDivider} />
            <View style={styles.securityMetric}><ThemedText style={[styles.securityValue, { color: colors.warning }]}>{stats.securityOpen}</ThemedText><ThemedText style={styles.securityLabel}>em aberto</ThemedText></View>
            <View style={styles.securityDivider} />
            <View style={styles.securityMetric}><ThemedText style={[styles.securityValue, { color: colors.eco }]}>{stats.securityTotal - stats.securityOpen}</ThemedText><ThemedText style={styles.securityLabel}>concluídas</ThemedText></View>
          </View>
          <TouchableOpacity style={styles.secondaryAction} onPress={() => router.push('/(admin)/security-analysis')}><ThemedText style={styles.secondaryActionText}>Abrir análise detalhada</ThemedText><MaterialCommunityIcons name="arrow-right" size={18} color={colors.primary} /></TouchableOpacity>
        </View>

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

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Ações Administrativas</ThemedText>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(admin)/manage-zeladoria')}
          >
            <MaterialCommunityIcons name="city-variant-outline" size={24} color={colors.primary} />
            <View style={styles.actionContent}>
              <ThemedText style={styles.actionTitle}>Gerenciar Zeladoria</ThemedText>
              <ThemedText style={styles.actionDesc}>Alterar status e visualizar denúncias de zeladoria</ThemedText>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.text3} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(admin)/manage-seguranca')}
          >
            <MaterialCommunityIcons name="shield-alert" size={24} color={colors.danger} />
            <View style={styles.actionContent}>
              <ThemedText style={styles.actionTitle}>Gerenciar Segurança</ThemedText>
              <ThemedText style={styles.actionDesc}>Alterar status e visualizar denúncias de segurança</ThemedText>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.text3} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(admin)/security-analysis')}
          >
            <MaterialCommunityIcons name="security" size={24} color={colors.eco} />
            <View style={styles.actionContent}>
              <ThemedText style={styles.actionTitle}>Análise de Segurança</ThemedText>
              <ThemedText style={styles.actionDesc}>Visualizar mapa das ocorrências e histórico semanal</ThemedText>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.text3} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(admin)/danger-zones')}
          >
            <MaterialCommunityIcons name="alert-octagon" size={24} color={colors.danger} />
            <View style={styles.actionContent}>
              <ThemedText style={styles.actionTitle}>Áreas de Perigo</ThemedText>
              <ThemedText style={styles.actionDesc}>Criar e gerenciar zonas perigosas</ThemedText>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.text3} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View></ThemedView>
  );
}

const makeStyles = (colors: typeof C) => StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  headerTitle: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 2 },
  headerSubtitle: { fontSize: 12, color: colors.text3 },
  logoutBtn: { padding: 8 },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24, gap: 12 },
  statCard: { width: '48%', borderRadius: 16, padding: 16, alignItems: 'center', ...S.shadow.sm },
  statCardTotal: { backgroundColor: colors.primaryLight },
  statCardPending: { backgroundColor: colors.warningLight },
  statCardInProgress: { backgroundColor: colors.primaryLight },
  statCardCompleted: { backgroundColor: colors.ecoLight },
  statValue: { fontSize: 32, fontWeight: '800', color: colors.text, marginTop: 8 },
  statLabel: { fontSize: 12, color: colors.text2, marginTop: 6, textAlign: 'center' },
  section: { marginBottom: 24 },
  insightGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 }, insightCard: { flex: 1, minHeight: 105, padding: 14, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, insightValue: { fontSize: 23, fontWeight: '800', color: colors.text, marginTop: 8 }, insightLabel: { fontSize: 11, color: colors.text3, marginTop: 3, lineHeight: 16 }, sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }, sectionHint: { fontSize: 11, color: colors.text3, marginTop: 3 }, rateFooterText: { fontSize: 10, color: colors.text3, marginTop: 8 }, attentionCard: { flexDirection: 'row', padding: 15, borderRadius: 14, backgroundColor: colors.warningLight, borderWidth: 1, borderColor: colors.warning + '35', marginBottom: 24 }, attentionContent: { flex: 1, marginLeft: 12 }, attentionTitle: { fontSize: 14, fontWeight: '800', color: colors.text }, attentionText: { fontSize: 12, color: colors.text2, lineHeight: 18, marginTop: 4 }, attentionMeta: { fontSize: 10, color: colors.text3, marginTop: 5 }, monthChart: { height: 175, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 10 }, monthColumn: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' }, monthValue: { fontSize: 9, color: colors.text3, marginBottom: 4 }, monthTrack: { height: 112, width: 14, justifyContent: 'flex-end', backgroundColor: colors.surface2, borderRadius: 7, overflow: 'hidden' }, monthBar: { width: '100%', backgroundColor: colors.primary, borderRadius: 7 }, monthLabel: { fontSize: 9, color: colors.text2, marginTop: 5 }, securitySummary: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingVertical: 17 }, securityMetric: { flex: 1, alignItems: 'center' }, securityValue: { fontSize: 23, fontWeight: '800', color: colors.text }, securityLabel: { fontSize: 10, color: colors.text3, marginTop: 3 }, securityDivider: { width: 1, height: 35, backgroundColor: colors.border }, secondaryAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, padding: 11, marginTop: 8 }, secondaryActionText: { fontSize: 12, fontWeight: '800', color: colors.primary },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 0 },
  resolutionRate: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: colors.border },
  rateContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rateBar: { flex: 1, height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
  rateProgress: { height: '100%', backgroundColor: colors.eco, borderRadius: 4 },
  rateText: { fontSize: 16, fontWeight: '700', color: colors.eco, minWidth: 40 },
  categoryList: { backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  categoryItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  categoryName: { fontSize: 13, fontWeight: '600', color: colors.text },
  categoryCount: { fontSize: 16, fontWeight: '700', color: colors.primary, backgroundColor: colors.primaryLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  actionButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  actionContent: { flex: 1, marginLeft: 12 },
  actionTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 },
  actionDesc: { fontSize: 12, color: colors.text3 },
});
