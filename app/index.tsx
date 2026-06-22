import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function Index() {
  const [checking, setChecking] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Verifica se o usuário já está autenticado no Firebase
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
      setChecking(false);
    });
    return unsubscribe; // limpa o listener ao desmontar
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
