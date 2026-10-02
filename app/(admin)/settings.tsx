import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ThemedText } from '../../components/themed-text';
import { ThemedView } from '../../components/themed-view';
import { C } from '../../constants/theme';
import { ThemeMode, useAppTheme } from '../../context/theme-context';
import { changeUserPassword, getCurrentUserData, updateUserProfile } from '../../services/auth';

export default function AdminSettingsScreen() {
  const { colors, mode, setMode } = useAppTheme();
  const styles = makeStyles(colors);

  const [userId, setUserId] = useState<string | null>(null);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameSuccess, setNameSuccess] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const user = await getCurrentUserData();
      if (user) {
        setUserId(user.id);
        setAdminName(user.name || '');
        setAdminEmail(user.email || '');
      }
    }
    loadUser();
  }, []);

  const handleSaveName = async () => {
    if (!userId) return;
    const trimmed = adminName.trim();
    if (!trimmed) {
      Alert.alert('Atenção', 'O nome do administrador não pode ficar em branco.');
      return;
    }
    try {
      setSavingName(true);
      setNameSuccess('');
      await updateUserProfile(userId, { name: trimmed });
      setNameSuccess('Nome atualizado com sucesso!');
      setTimeout(() => setNameSuccess(''), 4000);
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Falha ao atualizar o nome.');
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword) {
      setPasswordError('Informe a senha atual.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('A nova senha e a confirmação não coincidem.');
      return;
    }

    try {
      setSavingPassword(true);
      await changeUserPassword(currentPassword, newPassword);
      setPasswordSuccess('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 4000);
    } catch (error: any) {
      setPasswordError(error?.message || 'Erro ao alterar a senha. Verifique a senha atual.');
    } finally {
      setSavingPassword(false);
    }
  };

  const themeOptions: { id: ThemeMode; label: string; desc: string; icon: any }[] = [
    {
      id: 'light',
      label: 'Modo Claro',
      desc: 'Interface com fundo claro e alto contraste para ambientes iluminados',
      icon: 'weather-sunny',
    },
    {
      id: 'dark',
      label: 'Modo Escuro',
      desc: 'Interface escura para descanso visual e economia de energia',
      icon: 'weather-night',
    },
    {
      id: 'system',
      label: 'Automático (Sistema)',
      desc: 'Sincroniza automaticamente com o tema do seu sistema operacional',
      icon: 'theme-light-dark',
    },
  ];

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons name="cog" size={24} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <ThemedText style={styles.title}>Configurações do Administrador</ThemedText>
          <ThemedText style={styles.subtitle}>
            Personalize seu perfil, segurança e preferências visuais
          </ThemedText>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {/* Seção 1: Tema e Aparência */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="palette-outline" size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.cardTitle}>Aparência e Modo de Cor</ThemedText>
              <ThemedText style={styles.cardSubtitle}>
                Escolha como deseja visualizar o painel administrativo
              </ThemedText>
            </View>
          </View>

          <View style={styles.themeGrid}>
            {themeOptions.map((opt) => {
              const active = mode === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.themeOption, active && styles.themeOptionActive]}
                  onPress={() => setMode(opt.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.themeIconCircle, active && styles.themeIconCircleActive]}>
                    <MaterialCommunityIcons
                      name={opt.icon}
                      size={22}
                      color={active ? colors.primary : colors.text3}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[styles.themeLabel, active && styles.themeLabelActive]}>
                      {opt.label}
                    </ThemedText>
                    <ThemedText style={styles.themeDesc}>{opt.desc}</ThemedText>
                  </View>
                  {active && (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={20}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Seção 2: Dados do Perfil */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="account-cog-outline" size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.cardTitle}>Perfil do Administrador</ThemedText>
              <ThemedText style={styles.cardSubtitle}>
                Atualize o nome de identificação exibido no painel
              </ThemedText>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <ThemedText style={styles.fieldLabel}>E-mail de acesso (não editável)</ThemedText>
            <View style={[styles.inputContainer, styles.inputDisabled]}>
              <MaterialCommunityIcons name="email-outline" size={20} color={colors.text3} />
              <TextInput
                style={[styles.input, { color: colors.text3 }]}
                value={adminEmail}
                editable={false}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <ThemedText style={styles.fieldLabel}>Nome do Administrador</ThemedText>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="account-outline" size={20} color={colors.primary} />
              <TextInput
                style={styles.input}
                value={adminName}
                onChangeText={setAdminName}
                placeholder="Ex: Gestor Municipal"
                placeholderTextColor={colors.text3}
              />
            </View>
          </View>

          {nameSuccess ? (
            <View style={styles.successBanner}>
              <MaterialCommunityIcons name="check-circle" size={18} color={colors.eco} />
              <ThemedText style={styles.successText}>{nameSuccess}</ThemedText>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSaveName}
            disabled={savingName}
            activeOpacity={0.7}
          >
            {savingName ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons name="content-save-outline" size={18} color="#fff" />
                <ThemedText style={styles.saveBtnText}>Salvar Nome</ThemedText>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Seção 3: Segurança e Senha */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="lock-reset" size={22} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.cardTitle}>Alteração de Senha</ThemedText>
              <ThemedText style={styles.cardSubtitle}>
                Altere a sua senha de acesso com segurança
              </ThemedText>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <ThemedText style={styles.fieldLabel}>Senha Atual</ThemedText>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="lock-outline" size={20} color={colors.text3} />
              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Digite a senha atual"
                placeholderTextColor={colors.text3}
                secureTextEntry={!showCurrentPass}
              />
              <TouchableOpacity
                onPress={() => setShowCurrentPass(!showCurrentPass)}
                style={{ padding: 4 }}
              >
                <MaterialCommunityIcons
                  name={showCurrentPass ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.text3}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <ThemedText style={styles.fieldLabel}>Nova Senha</ThemedText>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="lock-plus-outline" size={20} color={colors.primary} />
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={colors.text3}
                secureTextEntry={!showNewPass}
              />
              <TouchableOpacity
                onPress={() => setShowNewPass(!showNewPass)}
                style={{ padding: 4 }}
              >
                <MaterialCommunityIcons
                  name={showNewPass ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.text3}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <ThemedText style={styles.fieldLabel}>Confirmar Nova Senha</ThemedText>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="lock-check-outline" size={20} color={colors.primary} />
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repita a nova senha"
                placeholderTextColor={colors.text3}
                secureTextEntry={!showNewPass}
              />
            </View>
          </View>

          {passwordError ? (
            <View style={styles.errorBanner}>
              <MaterialCommunityIcons name="alert-circle" size={18} color={colors.danger} />
              <ThemedText style={styles.errorText}>{passwordError}</ThemedText>
            </View>
          ) : null}

          {passwordSuccess ? (
            <View style={styles.successBanner}>
              <MaterialCommunityIcons name="check-circle" size={18} color={colors.eco} />
              <ThemedText style={styles.successText}>{passwordSuccess}</ThemedText>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.warning }]}
            onPress={handleChangePassword}
            disabled={savingPassword}
            activeOpacity={0.7}
          >
            {savingPassword ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons name="key-change" size={18} color="#fff" />
                <ThemedText style={styles.saveBtnText}>Atualizar Senha</ThemedText>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const makeStyles = (colors: typeof C) =>
  StyleSheet.create({
    container: {
      flex: 1,
      height: Platform.OS === 'web' ? ('100vh' as any) : '100%',
      backgroundColor: colors.bg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 28,
      paddingVertical: 18,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
      gap: 14,
    },
    headerIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerText: {
      flex: 1,
    },
    title: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
    },
    subtitle: {
      fontSize: 12,
      color: colors.text3,
      marginTop: 2,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 28,
      paddingTop: 24,
      paddingBottom: 60,
      maxWidth: 900,
      width: '100%',
      alignSelf: 'center',
      gap: 20,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 22,
      gap: 16,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
    },
    cardSubtitle: {
      fontSize: 12,
      color: colors.text3,
      marginTop: 2,
    },
    themeGrid: {
      gap: 10,
    },
    themeOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface2,
      gap: 12,
    },
    themeOptionActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    themeIconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    themeIconCircleActive: {
      backgroundColor: colors.surface,
    },
    themeLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    themeLabelActive: {
      color: colors.primary,
    },
    themeDesc: {
      fontSize: 11,
      color: colors.text3,
      marginTop: 2,
    },
    fieldGroup: {
      gap: 6,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text2,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface2,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      height: 46,
      gap: 10,
    },
    inputDisabled: {
      opacity: 0.65,
    },
    input: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
      outlineStyle: 'none' as any,
    },
    saveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      paddingVertical: 12,
      borderRadius: 10,
      marginTop: 4,
    },
    saveBtnText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 13,
    },
    successBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 10,
      borderRadius: 8,
      backgroundColor: colors.ecoLight,
    },
    successText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.eco,
    },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 10,
      borderRadius: 8,
      backgroundColor: colors.dangerLight,
    },
    errorText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.danger,
    },
  });
