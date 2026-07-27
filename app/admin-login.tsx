import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { ThemedText } from '../components/themed-text';
import { ThemedView } from '../components/themed-view';
import { C } from '../constants/theme';
import { formatCNPJ } from '../functions/masks';
import { getCurrentUserData, signInAdmin } from '../services/auth';

/* TODO: REQUIREMENTS GAPS
 - Replace simulated admin test login with a real admin RBAC flow.
 - Use CNPJ-only input and store admin identifiers securely.
*/
const ADMIN_TEST_CNPJ = '12345678900';

export default function AdminLoginScreen() {
  const [cnpj, setCnpj] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const user = await getCurrentUserData();
        if (!user) {
          console.log('Admin login: no user authenticated');
          return;
        }

        const isAdmin = user.role === 'admin';
        if (isAdmin) {
          router.replace('/(admin)/dashboard');
        } else {
          router.replace('/map');
        }
      } catch (error) {
        console.error('Admin bootstrap error:', error);
      }
    };

    bootstrap();
  }, [router]);

  const handleLogin = async () => {
    if (!cnpj.trim() || !password.trim()) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    const cleanCnpj = cnpj.replace(/\D/g, '');
    setLoading(true);

    try {
      await signInAdmin(cleanCnpj, password);
      // Se chegou aqui, autenticou com sucesso - o listener vai redirecionar
    } catch (error: any) {
      console.log('Admin login error:', error.code, error.message);
      
      // Check demo credentials
      const isDemo = cleanCnpj === ADMIN_TEST_CNPJ && password === '123456';
      if (isDemo) {
        router.replace('/(admin)/dashboard');
        setLoading(false);
        return;
      }

      let msg = 'Falha ao autenticar. Verifique os dados e tente novamente.';

      if (typeof error?.message === 'string' && error.message.trim()) {
        msg = error.message;
      }

      console.log('Showing alert:', msg);
      Alert.alert('Acesso Negado', msg);
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.contentWrapper}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <MaterialCommunityIcons name="shield-account" size={56} color={C.primary} />
            </View>
            <ThemedText style={styles.title}>Acesso Administrativo</ThemedText>
            <ThemedText style={styles.subtitle}>Portal da Prefeitura</ThemedText>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* CNPJ Input */}
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="card-account-details" size={20} color={C.primary} />
              <TextInput
                style={styles.input}
                placeholder="CNPJ"
                placeholderTextColor={C.text3}
                value={cnpj}
                onChangeText={(text) => setCnpj(formatCNPJ(text))}
                editable={!loading}
                keyboardType="number-pad"
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="lock" size={20} color={C.primary} />
              <TextInput
                style={styles.input}
                placeholder="Senha"
                placeholderTextColor={C.text3}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <MaterialCommunityIcons 
                  name={showPassword ? 'eye-off' : 'eye'} 
                  size={20} 
                  color={C.primary} 
                />
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity 
              style={[styles.loginBtn, loading && { opacity: 0.6 }]}
              onPress={handleLogin}
              disabled={loading}
            >
              <ThemedText style={styles.loginBtnText}>
                {loading ? 'Entrando...' : 'Acessar Dashboard'}
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Demo Credentials */}
          <View style={styles.demoContainer}>
            <ThemedText style={styles.demoLabel}>Credenciais de Teste:</ThemedText>
            <ThemedText style={styles.demoText}>CNPJ: 123.456.789-00</ThemedText>
            <ThemedText style={styles.demoText}>Senha: 123456</ThemedText>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <MaterialCommunityIcons name="lock-check" size={24} color={C.primaryLight} />
            <ThemedText style={styles.footerText}>
              Acesso seguro e exclusivo para administradores da prefeitura
            </ThemedText>
          </View>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  contentWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: C.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: C.text3,
    textAlign: 'center',
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
    height: 52,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
    fontSize: 15,
    color: C.text,
    fontWeight: '600',
  },
  loginBtn: {
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  loginBtnText: {
    color: C.white,
    fontSize: 16,
    fontWeight: '700',
  },
  demoContainer: {
    backgroundColor: C.surface2,
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: C.eco,
  },
  demoLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.text,
    marginBottom: 8,
  },
  demoText: {
    fontSize: 13,
    color: C.text2,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  footerText: {
    fontSize: 12,
    color: C.text3,
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
