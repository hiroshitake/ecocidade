import { Tabs, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { HapticTab } from '../../components/haptic-tab';
import { C, Colors } from '../../constants/theme';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { getCurrentUserData } from '../../services/auth';

export default function TabLayout() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const user = await getCurrentUserData();
        if (user) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          router.replace('/login');
        }
      } catch (error) {
        setIsAuthenticated(false);
        router.replace('/login');
      } finally {
        setCheckingAuth(false);
      }
    };

    bootstrap();
  }, [router]);

  if (checkingAuth) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: theme.tint,
        tabBarInactiveTintColor: theme.text3,
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 12, marginBottom: 6 },
        tabBarStyle: {
          position: 'absolute',
          height: 70,
          paddingTop: 8,
          paddingBottom: 12,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          backgroundColor: theme.surface,
          borderTopWidth: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.06,
          shadowRadius: 24,
          elevation: 12,
        },
      }}>
      <Tabs.Screen
        name="map"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ color }) => <Ionicons name="map" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="new-report"
        options={{
          title: 'Nova',
          tabBarIcon: ({ color }) => <Ionicons name="add-circle" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Denúncias',
          tabBarIcon: ({ color }) => <Ionicons name="list" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="security"
        options={{
          title: 'Segurança',
          tabBarIcon: ({ color }) => <Ionicons name="shield-checkmark" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <Ionicons name="person" size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.surface,
  },
});
