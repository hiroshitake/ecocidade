import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { getCurrentUserData } from '../services/auth';

export default function Index() {
  const [checking, setChecking] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const user = await getCurrentUserData();
        setIsLoggedIn(!!user);
      } catch (error) {
        setIsLoggedIn(false);
      } finally {
        setChecking(false);
      }
    };

    bootstrap();
  }, []);

  // Enquanto verifica, mostra um loading
  if (checking) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1a5fd4" />
      </View>
    );
  }

  // Redireciona baseado no estado de autenticação
  return <Redirect href={isLoggedIn ? '/map' : '/login'} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
