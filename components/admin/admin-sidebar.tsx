import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '../themed-text';
import { C } from '../../constants/theme';
import { useAppTheme } from '../../context/theme-context';
import { logout, getCurrentUserData } from '../../services/auth';

interface AdminSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  currentPath: string;
}

export default function AdminSidebar({
  collapsed,
  onToggleCollapse,
  currentPath,
}: AdminSidebarProps) {
  const { colors } = useAppTheme();
  const router = useRouter();
  const [adminUser, setAdminUser] = React.useState<{ name?: string; city?: string } | null>(null);

  React.useEffect(() => {
    getCurrentUserData().then(user => {
      if (user) setAdminUser(user);
    }).catch(console.error);
  }, []);
  const styles = makeStyles(colors, collapsed);

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
      route: '/(admin)/dashboard',
      isActive: currentPath.includes('dashboard') || currentPath === '/(admin)',
    },
    {
      id: 'zeladoria',
      label: 'Gestão de Zeladoria',
      icon: 'city-variant-outline' as const,
      route: '/(admin)/manage-zeladoria',
      isActive: currentPath.includes('manage-zeladoria'),
    },
    {
      id: 'seguranca',
      label: 'Gestão de Segurança',
      icon: 'shield-alert-outline' as const,
      route: '/(admin)/manage-seguranca',
      isActive: currentPath.includes('manage-seguranca'),
    },
    {
      id: 'analise',
      label: 'Análise de Ocorrências',
      icon: 'chart-timeline-variant' as const,
      route: '/(admin)/security-analysis',
      isActive: currentPath.includes('security-analysis'),
    },
    {
      id: 'zonas',
      label: 'Áreas de Risco',
      icon: 'alert-octagon-outline' as const,
      route: '/(admin)/danger-zones',
      isActive: currentPath.includes('danger-zones'),
    },
    {
      id: 'configuracoes',
      label: 'Configurações',
      icon: 'cog-outline' as const,
      route: '/(admin)/settings',
      isActive: currentPath.includes('settings'),
    },
  ];

  return (
    <View style={styles.sidebar}>
      {/* Cabeçalho da Sidebar */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.brandBadge}>
            <MaterialCommunityIcons name="shield-crown" size={22} color="#ffffff" />
          </View>
          {!collapsed && (
            <View style={styles.brandTextContainer}>
              <ThemedText style={styles.brandTitle}>ECOcidade</ThemedText>
              <ThemedText style={styles.brandSubtitle}>Painel Governamental</ThemedText>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.toggleBtn}
          onPress={onToggleCollapse}
          activeOpacity={0.7}
          accessibilityLabel={collapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
        >
          <MaterialCommunityIcons
            name={collapsed ? 'chevron-double-right' : 'chevron-double-left'}
            size={18}
            color={colors.text2}
          />
        </TouchableOpacity>
      </View>

      {/* Menu Principal */}
      <View style={styles.navMenu}>
        {!collapsed && (
          <ThemedText style={styles.sectionLabel}>MENU PRINCIPAL</ThemedText>
        )}
        {navItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.navItem, item.isActive && styles.navItemActive]}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.7}
            accessibilityLabel={item.label}
          >
            <MaterialCommunityIcons
              name={item.icon}
              size={20}
              color={item.isActive ? colors.primary : colors.text2}
            />
            {!collapsed && (
              <ThemedText
                style={[styles.navItemText, item.isActive && styles.navItemTextActive]}
                numberOfLines={1}
              >
                {item.label}
              </ThemedText>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Rodapé do Administrador */}
      <View style={styles.footer}>
        <View style={styles.adminRow}>
          <View style={styles.adminAvatar}>
            <MaterialCommunityIcons name="account-tie" size={18} color={colors.primary} />
          </View>
          {!collapsed && (
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.adminName} numberOfLines={1}>
                {adminUser?.name || 'Administrador'}
              </ThemedText>
              <ThemedText style={styles.adminRole} numberOfLines={1}>
                Admin da Prefeitura de {adminUser?.city || 'sua cidade'}
              </ThemedText>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.7}
          accessibilityLabel="Encerrar Sessão"
        >
          <MaterialCommunityIcons name="logout-variant" size={18} color={colors.danger} />
          {!collapsed && (
            <ThemedText style={styles.logoutText}>Encerrar Sessão</ThemedText>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (colors: typeof C, collapsed: boolean) =>
  StyleSheet.create({
    sidebar: {
      width: collapsed ? 74 : 260,
      backgroundColor: colors.surface,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      height: '100%',
    },
    header: {
      paddingHorizontal: collapsed ? 12 : 18,
      paddingVertical: 18,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: collapsed ? 'center' : 'space-between',
      gap: 8,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: collapsed ? undefined : 1,
    },
    brandBadge: {
      width: 36,
      height: 36,
      borderRadius: 9,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    brandTextContainer: {
      flex: 1,
    },
    brandTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.2,
    },
    brandSubtitle: {
      fontSize: 10,
      color: colors.text3,
      fontWeight: '600',
    },
    toggleBtn: {
      width: 30,
      height: 30,
      borderRadius: 6,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navMenu: {
      flex: 1,
      paddingHorizontal: collapsed ? 10 : 12,
      paddingTop: 18,
      gap: 4,
    },
    sectionLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.text3,
      letterSpacing: 0.8,
      marginBottom: 10,
      paddingHorizontal: 10,
    },
    navItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: collapsed ? 'center' : 'flex-start',
      gap: 12,
      paddingVertical: 11,
      paddingHorizontal: collapsed ? 8 : 12,
      borderRadius: 8,
    },
    navItemActive: {
      backgroundColor: colors.primaryLight,
    },
    navItemText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text2,
      flex: 1,
    },
    navItemTextActive: {
      color: colors.primary,
      fontWeight: '700',
    },
    footer: {
      padding: collapsed ? 10 : 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
      gap: 10,
    },
    adminRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: collapsed ? 'center' : 'flex-start',
      gap: 10,
    },
    adminAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    adminName: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
    },
    adminRole: {
      fontSize: 10,
      color: colors.text3,
    },
    logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 8,
      borderRadius: 6,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    logoutText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.danger,
    },
  });
