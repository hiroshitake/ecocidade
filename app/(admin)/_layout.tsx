import { Stack, usePathname, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import AdminSidebar from '../../components/admin/admin-sidebar';
import { ThemedView } from '../../components/themed-view';
import { C } from '../../constants/theme';
import { useAppTheme } from '../../context/theme-context';
import { getCurrentUserData } from '../../services/auth';

export default function AdminLayout() {
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { colors } = useAppTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const styles = makeStyles(colors);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const user = await getCurrentUserData();
        if (!user || user.role !== 'admin') {
          setAuthorized(false);
          setChecking(false);
          router.replace('/admin-login');
          return;
        }

        setAuthorized(true);
      } catch (error) {
        setAuthorized(false);
      } finally {
        setChecking(false);
      }
    };

    bootstrap();
  }, [router]);

  if (checking) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <ThemedView style={styles.container}>
      <View style={isDesktop ? styles.desktopLayout : styles.mobileLayout}>
        {isDesktop && (
          <AdminSidebar
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((prev) => !prev)}
            currentPath={pathname}
          />
        )}
        <View style={styles.contentArea}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Screen name="dashboard" />
            <Stack.Screen name="manage-reports" />
            <Stack.Screen name="manage-zeladoria" />
            <Stack.Screen name="manage-seguranca" />
            <Stack.Screen name="danger-zones" />
            <Stack.Screen name="security-analysis" />
            <Stack.Screen name="settings" />
          </Stack>
        </View>
      </View>
    </ThemedView>
  );
}

const makeStyles = (colors: typeof C) =>
  StyleSheet.create({
    loading: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.surface,
    },
    container: {
      flex: 1,
      height: Platform.OS === 'web' ? ('100vh' as any) : '100%',
      backgroundColor: colors.bg,
    },
    desktopLayout: {
      flex: 1,
      flexDirection: 'row',
      height: '100%',
    },
    mobileLayout: {
      flex: 1,
      height: '100%',
    },
    contentArea: {
      flex: 1,
      height: '100%',
    },
  });
