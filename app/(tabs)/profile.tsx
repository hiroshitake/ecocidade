import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { C, S } from '../../constants/theme';
import { getCurrentUserData, logout } from '../../services/auth';

export default function ProfileScreen() {
  interface UserData {
    id?: string;
    name?: string;
    email?: string;
    birthdate?: string;
    city?: string;
    photoURL?: string | null;
    createdAt?: Date | null;
  }

  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      try {
        const data = (await getCurrentUserData()) as any | null;
        if (!data) {
          setUserData(null);
          router.replace('/login');
          return;
        }

        let createdAt: Date | null = null;
        if (data?.createdAt) {
          const maybeTimestamp = data.createdAt;
          createdAt = typeof maybeTimestamp?.toDate === 'function'
            ? maybeTimestamp.toDate()
            : maybeTimestamp instanceof Date
              ? maybeTimestamp
              : new Date(maybeTimestamp);
        }

        setUserData({
          id: data?.id,
          name: data?.name || 'Usuário',
          email: data?.email || '',
          birthdate: data?.birthdate || 'Não informado',
          city: data?.city || 'Não informado',
          photoURL: data?.photoURL || null,
          createdAt,
        });
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [router]);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
      router.replace('/login');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível sair. Tente novamente.');
      console.error(error);
      setLoading(false);
    }
  };

  const handleGoToLogin = () => {
    router.push('/login');
  };

  if (loading) {
    return (
      <View style={styles.loading}> 
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.root} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <View style={styles.photoWrapper}>
          {userData?.photoURL ? (
            <Image source={{ uri: userData.photoURL }} style={styles.photo} />
          ) : (
            <View style={styles.photoFallback}>
              <Ionicons name="person" size={40} color={C.white} />
            </View>
          )}
        </View>

        <Text style={styles.name}>{userData?.name || 'Usuário'}</Text>
        <Text style={styles.email}>{userData?.email || 'Nenhum e-mail cadastrado'}</Text>

        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nome</Text>
            <Text style={styles.infoValue}>{userData?.name || 'Não informado'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>E-mail</Text>
            <Text style={styles.infoValue}>{userData?.email || 'Não informado'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nascimento</Text>
            <Text style={styles.infoValue}>{userData?.birthdate || 'Não informado'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Cidade</Text>
            <Text style={styles.infoValue}>{userData?.city || 'Não informado'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Cadastrado em</Text>
            <Text style={styles.infoValue}>
                  {userData?.createdAt
                    ? userData.createdAt.toLocaleDateString('pt-BR')
                    : 'Não disponível'}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleLogout}>
          <Ionicons name="log-out" size={20} color={C.white} style={styles.btnIcon} />
          <Text style={[styles.btnText, { color: C.white }]}>Deslogar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={handleGoToLogin}>
          <Text style={[styles.btnText, { color: C.primary }]}>Voltar para Login</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 40,
    backgroundColor: C.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.bg,
  },
  card: {
    width: '100%',
    maxWidth: 680,
    backgroundColor: C.surface,
    borderRadius: S.radius.xl,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 6,
  },
  photoWrapper: {
    alignSelf: 'center',
    marginBottom: 14,
  },
  photo: {
    width: 112,
    height: 112,
    borderRadius: 56,
  },
  photoFallback: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: C.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  email: {
    fontSize: 14,
    color: C.text3,
    textAlign: 'center',
    marginBottom: 16,
  },
  infoBox: {
    backgroundColor: C.surface2,
    borderRadius: S.radius.lg,
    padding: 16,
    marginBottom: 18,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: C.text3,
  },
  infoValue: {
    fontSize: 15,
    color: C.text,
    fontWeight: '600',
    textAlign: 'right',
    maxWidth: '65%',
    flexShrink: 1,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: S.radius.md,
    paddingVertical: 14,
    marginBottom: 12,
    width: '100%',
    paddingHorizontal: 12,
  },
  btnPrimary: {
    backgroundColor: C.primary,
  },
  btnOutline: {
    borderWidth: 1,
    borderColor: C.primary,
    backgroundColor: C.white,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  btnIcon: {
    marginRight: 10,
  },

});