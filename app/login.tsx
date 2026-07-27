/* TODO: REQUIREMENTS GAPS
 - RF-06 'Esqueci minha senha' flow not implemented — integrate sendPasswordResetEmail in services/auth and wire this button.
 - RF-07 Terms of Use / Privacy links missing — add links to documents or webviews.
 - RNF: consider inline validation and measurable response times for login.
*/
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text, TextInput, TouchableOpacity,
    View,
} from 'react-native';
import { C, S } from '../constants/theme';
import { formatBirthDate, formatEmail } from '../functions/masks';
import { getCurrentUserData, login, register, sendPasswordReset } from '../services/auth';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [city, setCity] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const router = useRouter();
  const cities = [
    { id: 'orlândia', name: 'Orlândia' },
    { id: 'morro-agudo', name: 'Morro Agudo' },
    { id: 'sales-oliveira', name: 'Sales Oliveira' },
  ];
  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setBirthdate('');
    setCity('');
    setShowPass(false);
    setFormError('');
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const user = await getCurrentUserData();
        if (user) {
          router.replace('/map');
        }
      } catch (error) {
        console.error('Auth bootstrap error:', error);
      }
    };

    bootstrap();
  }, [router]);

  // ── LOGIN ──
  const handleLogin = async () => {
    const normalizedEmail = formatEmail(email);
    setFormError('');

    if (!normalizedEmail) {
      const msg = 'Informe um e-mail válido para entrar.';
      setFormError(msg);
      Alert.alert('Atenção', msg);
      return;
    }
    if (!password || password.length < 6) {
      const msg = 'A senha deve ter no mínimo 6 caracteres.';
      setFormError(msg);
      Alert.alert('Atenção', msg);
      return;
    }

    setLoading(true);
    try {
      await login(normalizedEmail, password);
      resetForm();
      router.replace('/map');
    } catch (error: any) {
      const msg = typeof error?.message === 'string' && error.message.trim()
        ? error.message
        : 'E-mail ou senha inválidos. Verifique os dados e tente novamente.';
      setFormError(msg);
      Alert.alert('Erro', msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (emailToUse?: string) => {
    const target = (emailToUse || resetEmail || email || '').trim();
    if (!target || !target.includes('@')) {
      Alert.alert('Informe o e-mail', 'Digite um e‑mail válido para receber o link de recuperação.');
      return;
    }
    setResetLoading(true);
    try {
      await sendPasswordReset(target);
      Alert.alert('Enviado', 'Enviamos um e-mail com instruções para redefinir sua senha. Verifique sua caixa de entrada.');
      setResetModalVisible(false);
      setResetEmail('');
    } catch (error: any) {
      const msg =
        error.code === 'auth/user-not-found'    ? 'Usuário não encontrado.' :
        error.code === 'auth/invalid-email'     ? 'E-mail inválido.' :
        error.code === 'auth/too-many-requests' ? 'Muitas tentativas. Tente mais tarde.' :
        'Falha ao enviar e-mail. Tente novamente.';
      Alert.alert('Erro', msg);
      console.error('Password reset error:', error);
    } finally {
      setResetLoading(false);
    }
  };

  // ── CADASTRO ──
  const handleRegister = async () => {
    const trimmedName = name.trim();
    const normalizedEmail = formatEmail(email);
    setFormError('');

    if (!trimmedName || trimmedName.length < 2) {
      const msg = 'Informe um nome válido.';
      setFormError(msg);
      Alert.alert('Atenção', msg);
      return;
    }
    if (!normalizedEmail) {
      const msg = 'Informe um e-mail válido.';
      setFormError(msg);
      Alert.alert('Atenção', msg);
      return;
    }
    if (!password || password.length < 6) {
      const msg = 'A senha deve ter no mínimo 6 caracteres.';
      setFormError(msg);
      Alert.alert('Atenção', msg);
      return;
    }
    if (!city) {
      const msg = 'Selecione uma cidade para continuar.';
      setFormError(msg);
      Alert.alert('Atenção', msg);
      return;
    }

    const selectedCity = cities.find((item) => item.id === city)?.name;
    if (!selectedCity) {
      const msg = 'Selecione uma cidade válida.';
      setFormError(msg);
      Alert.alert('Atenção', msg);
      return;
    }

    setLoading(true);
    try {
      await register(normalizedEmail, password, trimmedName, birthdate, selectedCity);
      resetForm();
      router.replace('/map');
    } catch (error: any) {
      const msg = typeof error?.message === 'string' && error.message.trim()
        ? error.message
        : 'Erro ao criar conta. Tente novamente.';
      setFormError(msg);
      Alert.alert('Erro', msg);
    } finally {
      setLoading(false);
    }
  };

  // ── GOOGLE ──
  const handleGoogleSuccess = async () => {
    try {
      const data = (await getCurrentUserData()) as any;
      if (!data?.city) {
        router.replace('/select-city');
      } else {
        router.replace('/map');
      }
    } catch (error) {
      console.error('Falha ao verificar cidade do usuário:', error);
      router.replace('/map');
    }
  };


  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── GRADIENT HEADER ── */}
        <LinearGradient
          colors={['#1a5fd4', '#0d3d96']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.4, y: 1 }}
          style={styles.header}
        >
          <View style={styles.logoRow}>
            <View style={styles.logoIcon}>
              <Ionicons name="leaf" size={26} color="white" />
            </View>
            <View>
              <Text style={styles.logoText}>
                ECO<Text style={styles.logoGreen}>cidade</Text>
              </Text>
              <Text style={styles.logoSub}>Zeladoria &amp; Segurança Urbana</Text>
            </View>
          </View>
          <Text style={styles.headline}>Sua cidade mais inteligente.</Text>
          <Text style={styles.subheadline}>
            Reporte problemas, acompanhe resoluções e fique seguro.
          </Text>
        </LinearGradient>

        {/* ── FORM AREA ── */}
        <View style={styles.formArea}>

          {/* TAB BAR */}
          <View style={styles.tabBar}>
            {(['login', 'register'] as const).map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
                onPress={() => setTab(t)}
              >
                <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive]}>
                  {t === 'login' ? 'Entrar' : 'Cadastrar'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── LOGIN ── */}
          {tab === 'login' && (
            <View>
              <Text style={styles.label}>E-MAIL</Text>
              <TextInput
                style={styles.input}
                placeholder="seu@email.com"
                placeholderTextColor={C.text3}
                value={email}
                onChangeText={(text) => setEmail(formatEmail(text))}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />

              <Text style={styles.label}>SENHA</Text>
              <View>
                <TextInput
                  style={styles.input}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor={C.text3}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                  editable={!loading}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(p => !p)}>
                  <Ionicons name={showPass ? 'eye-off' : 'eye'} size={20} color={C.text3} />
                </TouchableOpacity>
              </View>

              {formError ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color="#b91c1c" />
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.forgotBtn}
                onPress={() => { setResetEmail(email); setResetModalVisible(true); }}
                disabled={loading}
              >
                <Text style={styles.forgotText}>Esqueceu a senha?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnPrimary, loading && { opacity: 0.6 }]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading
                  ? <Text style={styles.btnText}>Entrando...</Text>
                  : <>
                      <Ionicons name="log-in" size={20} color="white" />
                      <Text style={styles.btnText}>Entrar</Text>
                    </>
                }
              </TouchableOpacity>
            </View>
          )}

          {/* ── CADASTRO ── */}
          {tab === 'register' && (
            <View>
              <Text style={styles.label}>NOME COMPLETO</Text>
              <TextInput
                style={styles.input}
                placeholder="Seu nome completo"
                placeholderTextColor={C.text3}
                value={name}
                onChangeText={setName}
                editable={!loading}
              />

              <Text style={styles.label}>DATA DE NASCIMENTO</Text>
              <TextInput
                style={styles.input}
                placeholder="DD/MM/AAAA"
                placeholderTextColor={C.text3}
                value={birthdate}
                onChangeText={(text) => setBirthdate(formatBirthDate(text))}
                keyboardType="number-pad"
                maxLength={10}
                editable={!loading}
              />

              <Text style={styles.label}>CIDADE</Text>
              <View style={styles.cityList}>
                {cities.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.cityOption,
                      city === item.id && styles.cityOptionActive,
                    ]}
                    onPress={() => setCity(item.id)}
                    disabled={loading}
                  >
                    <Text
                      style={[
                        styles.cityOptionText,
                        city === item.id && styles.cityOptionTextActive,
                      ]}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>E-MAIL</Text>
              <TextInput
                style={styles.input}
                placeholder="seu@email.com"
                placeholderTextColor={C.text3}
                value={email}
                onChangeText={(text) => setEmail(formatEmail(text))}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />

              <Text style={styles.label}>SENHA</Text>
              <TextInput
                style={styles.input}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={C.text3}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!loading}
              />

              {formError ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color="#b91c1c" />
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.btnPrimary, { backgroundColor: C.eco }, loading && { opacity: 0.6 }]}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading
                  ? <Text style={styles.btnText}>Criando conta...</Text>
                  : <>
                      <Ionicons name="person-add" size={20} color="white" />
                      <Text style={styles.btnText}>Criar conta</Text>
                    </>
                }
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Legal Links */}
        <View style={styles.linksRow}>
          <TouchableOpacity onPress={() => router.push('/terms')}>
            <Text style={styles.linkText}>Termos de Uso</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/privacy')}>
            <Text style={styles.linkText}>Política de Privacidade</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.adminSection}>
          <TouchableOpacity
            style={styles.adminBtn}
            onPress={() => router.push('/admin-login')}
          >
            <Ionicons name="shield-checkmark" size={18} color={C.primary} />
            <Text style={styles.adminBtnText}>Acesso Administrativo</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      {/* Reset Password Modal */}
      <Modal
        visible={resetModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setResetModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.label, { marginBottom: 8 }]}>Digite seu e‑mail</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="seu@email.com"
              placeholderTextColor={C.text3}
              value={resetEmail}
              onChangeText={setResetEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!resetLoading}
            />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <TouchableOpacity style={[styles.btnOutline, { flex: 1 }]} onPress={() => setResetModalVisible(false)} disabled={resetLoading}>
                <Text style={styles.btnOutlineText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnPrimary, { flex: 1 }]} onPress={() => handlePasswordReset(resetEmail)} disabled={resetLoading}>
                {resetLoading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Enviar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },

  // Header
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 48, paddingBottom: 40, paddingHorizontal: 24 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 32 },
  logoIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
  },
  logoText: { fontSize: 26, fontWeight: '800', color: 'white', letterSpacing: -0.5 },
  logoGreen: { color: '#4ade80' },
  logoSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  headline: { fontSize: 28, fontWeight: '800', color: 'white', lineHeight: 34, marginBottom: 8 },
  subheadline: { color: 'rgba(255,255,255,0.75)', fontSize: 14 },

  // Form area
  formArea: { backgroundColor: C.surface, padding: 24, paddingBottom: 48 },

  // Tab bar
  tabBar: { flexDirection: 'row', backgroundColor: C.surface2, borderRadius: 12, padding: 4, marginBottom: 24 },
  tabBtn: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  tabBtnActive: { backgroundColor: C.surface, ...S.shadow.sm },
  tabBtnText: { fontSize: 14, fontWeight: '600', color: C.text2 },
  tabBtnTextActive: { color: C.primary },

  // Inputs
  label: {
    fontSize: 12, fontWeight: '600', color: C.text3,
    letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase',
  },
  input: {
    backgroundColor: C.surface2, color: C.text,
    borderWidth: 1.5, borderColor: C.border, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 15, marginBottom: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
    flex: 1,
  },
  eyeBtn: { position: 'absolute', right: 14, top: 13 },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 24, marginTop: -8 },
  forgotText: { fontSize: 13, color: C.primary, fontWeight: '600' },

  // Buttons
  btnPrimary: {
    backgroundColor: C.primary, borderRadius: 12,
    paddingVertical: 14, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
    ...S.shadow.sm,
  },
  btnText: { color: 'white', fontSize: 15, fontWeight: '700' },
  btnOutline: {
    borderWidth: 1.5, borderColor: C.primary, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center', justifyContent: 'center',
  },
  btnOutlineText: { color: C.primary, fontSize: 15, fontWeight: '600' },
  cityList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  cityOption: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 12,
    paddingVertical: 10,
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
  googleHint: {
    marginTop: 10,
    color: C.text3,
    fontSize: 13,
    textAlign: 'center',
  },

  // Divider
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerText: { fontSize: 12, color: C.text3, fontWeight: '500' },

  // Admin
  adminSection: { paddingHorizontal: 24, paddingBottom: 24 },
  adminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: C.primary,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  adminBtnText: {
    color: C.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 18,
  },
  modalInput: {
    backgroundColor: '#f6f7fb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e6e9f0',
  },
  linksRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingHorizontal: 24,
    marginTop: 20,
    marginBottom: 12,
  },
  linkText: {
    color: C.text3,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});