import { Stack, useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { C } from '../../constants/theme';
import { isAdminUser } from '../../services/auth';
import { auth } from '../../services/firebase';

export default function AdminLayout() {
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAuthorized(false);
        setChecking(false);
        router.replace('/admin-login');
        return;
      }

      const admin = await isAdminUser(user.uid);
      if (!admin) {
        setAuthorized(false);
        setChecking(false);
        router.replace('/admin-login');
        return;
      }

      setAuthorized(true);
      setChecking(false);
    });

    return unsubscribe;
  }, [router]);

  if (checking) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="manage-reports" />
      <Stack.Screen name="danger-zones" />
      <Stack.Screen name="security-analysis" />
    </Stack>
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
