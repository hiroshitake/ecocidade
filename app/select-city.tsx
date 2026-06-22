import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { C, S } from '../constants/theme';
import { updateUserProfile } from '../services/auth';
import { auth } from '../services/firebase';

const cityOptions = [
  { id: 'sao-paulo', name: 'São Paulo' },
  { id: 'rio-de-janeiro', name: 'Rio de Janeiro' },
  { id: 'belo-horizonte', name: 'Belo Horizonte' },
];

export default function SelectCityScreen() {
  const [selectedCity, setSelectedCity] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!auth.currentUser) {
      router.replace('/login');
      return;
    }

    setLoading(false);
  }, [router]);

  const handleSaveCity = async () => {
    if (!selectedCity) {
      Alert.alert('Atenção', 'Selecione uma cidade para continuar.');
      return;
    }

    const city = cityOptions.find((item) => item.id === selectedCity)?.name;
    if (!city) {
      Alert.alert('Atenção', 'Cidade inválida. Tente novamente.');
      return;
    }

    setSubmitting(true);
    try {
      if (!auth.currentUser) {
        throw new Error('Usuário não autenticado.');
      }

      await updateUserProfile(auth.currentUser.uid, { city });
      router.replace('/map');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível salvar a cidade. Tente novamente.');
      console.error('Erro ao salvar cidade:', error);
    } finally {
      setSubmitting(false);
    }
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
        <Text style={styles.title}>Escolha sua cidade</Text>
        <Text style={styles.subtitle}>
          Para continuar, selecione a cidade disponível no catálogo.
        </Text>

        <View style={styles.cityList}>
          {cityOptions.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.cityOption,
                selectedCity === item.id && styles.cityOptionActive,
              ]}
              onPress={() => setSelectedCity(item.id)}
              disabled={submitting}
            >
              <Text
                style={[
                  styles.cityOptionText,
                  selectedCity === item.id && styles.cityOptionTextActive,
                ]}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary, submitting && { opacity: 0.6 }]}
          onPress={handleSaveCity}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={[styles.btnText, { color: 'white' }]}>Salvar cidade</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnOutline]}
          onPress={() => router.replace('/login')}
          disabled={submitting}
        >
          <Text style={[styles.btnText, { color: C.primary }]}>Voltar ao login</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: C.bg,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.bg,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: S.radius.xl,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: C.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: C.text3,
    marginBottom: 24,
    lineHeight: 20,
  },
  cityList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  cityOption: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: C.surface2,
  },
  cityOptionActive: {
    borderColor: C.primary,
    backgroundColor: 'rgba(49, 130, 206, 0.12)',
  },
  cityOptionText: {
    color: C.text,
    fontSize: 14,
    fontWeight: '600',
  },
  cityOptionTextActive: {
    color: C.primary,
  },
  btn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  btnPrimary: {
    backgroundColor: C.primary,
  },
  btnOutline: {
    borderWidth: 1,
    borderColor: C.primary,
    backgroundColor: C.surface,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
