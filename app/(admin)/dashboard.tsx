import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { ThemedText } from '../../components/themed-text';
import { ThemedView } from '../../components/themed-view';
import { C, S } from '../../constants/theme';
import { useAppTheme } from '../../context/theme-context';
import { logout } from '../../services/auth';
import { getAdminReports } from '../../services/reports';

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

      MONTHS.forEach((month) => {
        newStats.byMonth[month] = 0;
      });

      reports.forEach((report) => {
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
            newStats.oldestPendingDays =
              newStats.oldestPendingDays === null
                ? pendingDays
                : Math.max(newStats.oldestPendingDays, pendingDays);
          }
        }

        if (cat === 'seguranca') {
          newStats.securityTotal++;
          if (status !== 'resolved') newStats.securityOpen++;
        }

        if (
          status === 'resolved' &&
          createdAt &&
          resolvedAt &&
          !Number.isNaN(createdAt.getTime()) &&
          !Number.isNaN(resolvedAt.getTime()) &&
          resolvedAt >= createdAt
        ) {
          resolutionTotalDays += (resolvedAt.getTime() - createdAt.getTime()) / 86400000;
          resolutionCount++;
        }

        newStats.byCategory[cat] = (newStats.byCategory[cat] || 0) + 1;
      });

      newStats.avgResolutionDays =
        resolutionCount > 0 ? resolutionTotalDays / resolutionCount : null;
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

  const navItems = [
    {
      id: 'dashboard',
      label: 'Visão Geral',
      icon: 'view-dashboard-outline' as const,
      active: true,
      onPress: () => {},
    },
    {
      id: 'zeladoria',
      label: 'Gestão de Zeladoria',
      icon: 'city-variant-outline' as const,
      active: false,
      onPress: () => router.push('/(admin)/manage-zeladoria'),
    },
    {
      id: 'seguranca',
      label: 'Gestão de Segurança',
      icon: 'shield-alert-outline' as const,
      active: false,
      onPress: () => router.push('/(admin)/manage-seguranca'),
    },
    {
      id: 'analise',
      label: 'Análise de Ocorrências',
      icon: 'chart-timeline-variant' as const,
      active: false,
      onPress: () => router.push('/(admin)/security-analysis'),
    },
    {
      id: 'zonas',
      label: 'Áreas de Risco',
      icon: 'alert-octagon-outline' as const,
      active: false,
      onPress: () => router.push('/(admin)/danger-zones'),
    },
  ];

  return (
    <ThemedView style={styles.container}>
      {isDesktop ? (
        // Layout Desktop com Sidebar Lateral
        <View style={styles.desktopLayout}>
          {/* Barra de Navegação Lateral (Sidebar) */}
          <View style={styles.sidebar}>
            <View style={styles.sidebarHeader}>
              <View style={styles.sidebarBrand}>
                <View style={styles.brandBadge}>
                  <MaterialCommunityIcons name="shield-crown" size={24} color="#ffffff" />
                </View>
                <View>
                  <ThemedText style={styles.sidebarTitle}>ECOcidade</ThemedText>
                  <ThemedText style={styles.sidebarSubtitle}>Painel Governamental</ThemedText>
                </View>
              </View>
            </View>

            <View style={styles.navMenu}>
              <ThemedText style={styles.navSectionLabel}>MENU PRINCIPAL</ThemedText>
              {navItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.navItem, item.active && styles.navItemActive]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={20}
                    color={item.active ? colors.primary : colors.text2}
                  />
                  <ThemedText style={[styles.navItemText, item.active && styles.navItemTextActive]}>
                    {item.label}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.sidebarFooter}>
              <View style={styles.adminInfo}>
                <View style={styles.adminAvatar}>
                  <MaterialCommunityIcons name="account-tie" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.adminName}>Administrador</ThemedText>
                  <ThemedText style={styles.adminRole}>Prefeitura Municipal</ThemedText>
                </View>
              </View>
              <TouchableOpacity style={styles.sidebarLogoutBtn} onPress={handleLogout}>
                <MaterialCommunityIcons name="logout-variant" size={18} color={colors.danger} />
                <ThemedText style={styles.sidebarLogoutText}>Encerrar Sessão</ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Área Principal com Rolagem Independente */}
          <View style={styles.mainArea}>
            <View style={styles.topBar}>
              <View>
                <ThemedText style={styles.topBarTitle}>Dashboard Geral</ThemedText>
                <ThemedText style={styles.topBarSubtitle}>
                  Monitoramento em tempo real de chamados, zeladoria e segurança
                </ThemedText>
              </View>
              <View style={styles.topBarActions}>
                <TouchableOpacity
                  style={styles.refreshBtn}
                  onPress={loadStats}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="refresh" size={18} color={colors.primary} />
                      <ThemedText style={styles.refreshBtnText}>Atualizar</ThemedText>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              style={styles.desktopScrollView}
              contentContainerStyle={styles.desktopScrollContent}
              showsVerticalScrollIndicator={true}
            >
              {renderDashboardContent(stats, colors, styles, router, loading)}
            </ScrollView>
          </View>
        </View>
      ) : (
        // Layout Mobile com Rolagem Fluida
        <View style={styles.mobileLayout}>
          <View style={styles.mobileHeader}>
            <View>
              <ThemedText style={styles.headerTitle}>Dashboard Admin</ThemedText>
              <ThemedText style={styles.headerSubtitle}>Prefeitura - Ecocidade</ThemedText>
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <MaterialCommunityIcons name="logout" size={20} color={colors.danger} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.mobileScrollView}
            contentContainerStyle={styles.mobileScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {renderDashboardContent(stats, colors, styles, router, loading)}
          </ScrollView>
        </View>
      )}
    </ThemedView>
  );
}

function renderDashboardContent(
  stats: ReportStats,
  colors: typeof C,
  styles: any,
  router: any,
  loading: boolean
) {
  return (
    <>
      {/* Grid de Estatísticas Principais */}
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

      {/* Taxa de Resolução */}
      <View style={styles.resolutionRate}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <ThemedText style={styles.sectionTitle}>Taxa de Resolução</ThemedText>
            <ThemedText style={styles.sectionHint}>Todo o histórico disponível</ThemedText>
          </View>
          <ThemedText style={styles.rateText}>
            {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
          </ThemedText>
        </View>
        <View style={styles.rateBar}>
          <View
            style={[
              styles.rateProgress,
              { width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` },
            ]}
          />
        </View>
        <ThemedText style={styles.rateFooterText}>
          {stats.completed} concluídas de {stats.total} ·{' '}
          {stats.recent30 > 0
            ? `${Math.round((stats.recent30Resolved / stats.recent30) * 100)}% resolvidas nos últimos 30 dias`
            : 'sem dados recentes'}
        </ThemedText>
      </View>

      {/* Métricas Recentes */}
      <View style={styles.insightGrid}>
        <View style={styles.insightCard}>
          <MaterialCommunityIcons name="calendar-month-outline" size={22} color={colors.primary} />
          <ThemedText style={styles.insightValue}>{stats.recent30}</ThemedText>
          <ThemedText style={styles.insightLabel}>recebidas nos últimos 30 dias</ThemedText>
        </View>
        <View style={styles.insightCard}>
          <MaterialCommunityIcons name="timer-outline" size={22} color={colors.warning} />
          <ThemedText style={styles.insightValue}>
            {stats.avgResolutionDays === null
              ? '—'
              : stats.avgResolutionDays < 1
              ? `${Math.round(stats.avgResolutionDays * 24)}h`
              : `${stats.avgResolutionDays.toFixed(1)}d`}
          </ThemedText>
          <ThemedText style={styles.insightLabel}>tempo médio até conclusão</ThemedText>
        </View>
      </View>

      {/* Atenção */}
      <View style={styles.attentionCard}>
        <MaterialCommunityIcons name="alert-circle-outline" size={24} color={colors.warning} />
        <View style={styles.attentionContent}>
          <ThemedText style={styles.attentionTitle}>Itens que exigem atenção</ThemedText>
          <ThemedText style={styles.attentionText}>
            {stats.pending + stats.inProgress + stats.securityOpen === 0
              ? 'Não há denúncias abertas no momento.'
              : `${stats.pending + stats.inProgress} denúncia(s) em aberto e ${stats.securityOpen} ocorrência(s) de segurança não concluída(s).`}
          </ThemedText>
          {stats.oldestPendingDays !== null ? (
            <ThemedText style={styles.attentionMeta}>
              Aguardando há mais tempo:{' '}
              {stats.oldestPendingDays < 1
                ? 'menos de 1 dia'
                : `${Math.floor(stats.oldestPendingDays)} dia(s)`}
            </ThemedText>
          ) : null}
        </View>
      </View>

      {/* Evolução Mensal */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <ThemedText style={styles.sectionTitle}>Evolução das denúncias</ThemedText>
            <ThemedText style={styles.sectionHint}>
              Entradas por mês em {new Date().getFullYear()}
            </ThemedText>
          </View>
        </View>
        <View style={styles.monthChart}>
          {MONTHS.map((month) => {
            const count = stats.byMonth[month] || 0;
            const maxMonth = Math.max(...Object.values(stats.byMonth), 1);
            return (
              <View key={month} style={styles.monthColumn}>
                <ThemedText style={styles.monthValue}>{count}</ThemedText>
                <View style={styles.monthTrack}>
                  <View
                    style={[
                      styles.monthBar,
                      { height: count === 0 ? 4 : Math.max(8, (count / maxMonth) * 108) },
                    ]}
                  />
                </View>
                <ThemedText style={styles.monthLabel}>{month}</ThemedText>
              </View>
            );
          })}
        </View>
      </View>

      {/* Resumo de Segurança */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <ThemedText style={styles.sectionTitle}>Resumo de segurança</ThemedText>
            <ThemedText style={styles.sectionHint}>Dentro da cidade do administrador</ThemedText>
          </View>
          <MaterialCommunityIcons name="shield-alert-outline" size={22} color={colors.danger} />
        </View>
        <View style={styles.securitySummary}>
          <View style={styles.securityMetric}>
            <ThemedText style={styles.securityValue}>{stats.securityTotal}</ThemedText>
            <ThemedText style={styles.securityLabel}>total</ThemedText>
          </View>
          <View style={styles.securityDivider} />
          <View style={styles.securityMetric}>
            <ThemedText style={[styles.securityValue, { color: colors.warning }]}>
              {stats.securityOpen}
            </ThemedText>
            <ThemedText style={styles.securityLabel}>em aberto</ThemedText>
          </View>
          <View style={styles.securityDivider} />
          <View style={styles.securityMetric}>
            <ThemedText style={[styles.securityValue, { color: colors.eco }]}>
              {stats.securityTotal - stats.securityOpen}
            </ThemedText>
            <ThemedText style={styles.securityLabel}>concluídas</ThemedText>
          </View>
        </View>
        <TouchableOpacity
          style={styles.secondaryAction}
          onPress={() => router.push('/(admin)/security-analysis')}
        >
          <ThemedText style={styles.secondaryActionText}>Abrir análise detalhada</ThemedText>
          <MaterialCommunityIcons name="arrow-right" size={18} color={colors.primary} />
        </TouchableOpacity>
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

      {/* Ações Administrativas */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Ações Administrativas</ThemedText>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(admin)/manage-zeladoria')}
        >
          <MaterialCommunityIcons name="city-variant-outline" size={24} color={colors.primary} />
          <View style={styles.actionContent}>
            <ThemedText style={styles.actionTitle}>Gerenciar Zeladoria</ThemedText>
            <ThemedText style={styles.actionDesc}>
              Alterar status e visualizar denúncias de zeladoria
            </ThemedText>
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
            <ThemedText style={styles.actionDesc}>
              Alterar status e visualizar denúncias de segurança
            </ThemedText>
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
            <ThemedText style={styles.actionDesc}>
              Visualizar mapa das ocorrências e histórico semanal
            </ThemedText>
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
    </>
  );
}

const makeStyles = (colors: typeof C) =>
  StyleSheet.create({
    container: {
      flex: 1,
      height: Platform.OS === 'web' ? ('100vh' as any) : '100%',
      backgroundColor: colors.bg,
    },
    // Desktop layout
    desktopLayout: {
      flex: 1,
      flexDirection: 'row',
      height: '100%',
    },
    sidebar: {
      width: 270,
      backgroundColor: colors.surface,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
    },
    sidebarHeader: {
      padding: 24,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sidebarBrand: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    brandBadge: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sidebarTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.3,
    },
    sidebarSubtitle: {
      fontSize: 11,
      color: colors.text3,
      fontWeight: '600',
    },
    navMenu: {
      flex: 1,
      paddingHorizontal: 14,
      paddingTop: 20,
    },
    navSectionLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.text3,
      letterSpacing: 0.8,
      marginBottom: 10,
      paddingHorizontal: 12,
    },
    navItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 10,
      marginBottom: 4,
    },
    navItemActive: {
      backgroundColor: colors.primaryLight,
    },
    navItemText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text2,
    },
    navItemTextActive: {
      color: colors.primary,
      fontWeight: '700',
    },
    sidebarFooter: {
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    adminInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 14,
    },
    adminAvatar: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    adminName: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    adminRole: {
      fontSize: 11,
      color: colors.text3,
    },
    sidebarLogoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sidebarLogoutText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.danger,
    },
    // Main Area Desktop
    mainArea: {
      flex: 1,
      height: '100%',
      backgroundColor: colors.bg,
      display: 'flex',
      flexDirection: 'column',
    },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 28,
      paddingVertical: 18,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    topBarTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
    },
    topBarSubtitle: {
      fontSize: 13,
      color: colors.text3,
      marginTop: 2,
    },
    topBarActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    refreshBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.primaryLight,
      borderWidth: 1,
      borderColor: colors.primary + '30',
    },
    refreshBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
    },
    desktopScrollView: {
      flex: 1,
    },
    desktopScrollContent: {
      paddingHorizontal: 28,
      paddingTop: 24,
      paddingBottom: 60,
      maxWidth: 1180,
      width: '100%',
      alignSelf: 'center',
    },
    // Mobile layout
    mobileLayout: {
      flex: 1,
      height: '100%',
    },
    mobileHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 2,
    },
    headerSubtitle: {
      fontSize: 12,
      color: colors.text3,
    },
    logoutBtn: {
      padding: 8,
    },
    mobileScrollView: {
      flex: 1,
    },
    mobileScrollContent: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 60,
    },
    // Stats & Content Shared
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
    statCardTotal: { backgroundColor: colors.primaryLight },
    statCardPending: { backgroundColor: colors.warningLight },
    statCardInProgress: { backgroundColor: colors.primaryLight },
    statCardCompleted: { backgroundColor: colors.ecoLight },
    statValue: { fontSize: 32, fontWeight: '800', color: colors.text, marginTop: 8 },
    statLabel: { fontSize: 12, color: colors.text2, marginTop: 6, textAlign: 'center' },
    section: { marginBottom: 24 },
    insightGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    insightCard: {
      flex: 1,
      minHeight: 105,
      padding: 14,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    insightValue: { fontSize: 23, fontWeight: '800', color: colors.text, marginTop: 8 },
    insightLabel: { fontSize: 11, color: colors.text3, marginTop: 3, lineHeight: 16 },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      marginBottom: 12,
    },
    sectionHint: { fontSize: 11, color: colors.text3, marginTop: 3 },
    rateFooterText: { fontSize: 10, color: colors.text3, marginTop: 8 },
    attentionCard: {
      flexDirection: 'row',
      padding: 15,
      borderRadius: 14,
      backgroundColor: colors.warningLight,
      borderWidth: 1,
      borderColor: colors.warning + '35',
      marginBottom: 24,
    },
    attentionContent: { flex: 1, marginLeft: 12 },
    attentionTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
    attentionText: { fontSize: 12, color: colors.text2, lineHeight: 18, marginTop: 4 },
    attentionMeta: { fontSize: 10, color: colors.text3, marginTop: 5 },
    monthChart: {
      height: 175,
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      paddingTop: 10,
    },
    monthColumn: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
    monthValue: { fontSize: 9, color: colors.text3, marginBottom: 4 },
    monthTrack: {
      height: 112,
      width: 14,
      justifyContent: 'flex-end',
      backgroundColor: colors.surface2,
      borderRadius: 7,
      overflow: 'hidden',
    },
    monthBar: { width: '100%', backgroundColor: colors.primary, borderRadius: 7 },
    monthLabel: { fontSize: 9, color: colors.text2, marginTop: 5 },
    securitySummary: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingVertical: 17,
    },
    securityMetric: { flex: 1, alignItems: 'center' },
    securityValue: { fontSize: 23, fontWeight: '800', color: colors.text },
    securityLabel: { fontSize: 10, color: colors.text3, marginTop: 3 },
    securityDivider: { width: 1, height: 35, backgroundColor: colors.border },
    secondaryAction: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      padding: 11,
      marginTop: 8,
    },
    secondaryActionText: { fontSize: 12, fontWeight: '800', color: colors.primary },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 0 },
    resolutionRate: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    rateContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    rateBar: { flex: 1, height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
    rateProgress: { height: '100%', backgroundColor: colors.eco, borderRadius: 4 },
    rateText: { fontSize: 16, fontWeight: '700', color: colors.eco, minWidth: 40 },
    categoryList: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    categoryItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    categoryName: { fontSize: 13, fontWeight: '600', color: colors.text },
    categoryCount: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.primary,
      backgroundColor: colors.primaryLight,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionContent: { flex: 1, marginLeft: 12 },
    actionTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 },
    actionDesc: { fontSize: 12, color: colors.text3 },
  });
