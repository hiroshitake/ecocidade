import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { ConfirmationModal } from "../components/ConfirmationModal";
import { C, S } from "../constants/theme";
import { useAppTheme, type ThemeMode } from "../context/theme-context";
import { useToast } from "../context/toast-context";
import { changeUserPassword, deleteUserAccount, deleteUserAvatar, getCurrentUserData, getCurrentUserAvatarUrl, logout, updateUserProfile, uploadUserAvatar } from "../services/auth";

export default function SettingsScreen() {
  const toast = useToast();
  const { mode, setMode, colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const user = await getCurrentUserData();
      if (!user?.id) { router.replace("/login"); return; }
      setUserId(user.id);
      setEmail(user.email || "");
      setCity(user.city || "");
      setName(user.name || "");
      setAvatarPath(user.avatar_path || null);
      setAvatarUrl(await getCurrentUserAvatarUrl(user.avatar_path));
    } catch {
      toast.addToast("Não foi possível carregar as configurações.", "error");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(tabs)/profile");
  };

  const pickAvatar = async () => {
    if (!userId) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { toast.addToast("Permita o acesso às fotos para escolher um avatar.", "error"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (result.canceled || !result.assets[0]?.uri) return;
    try {
      setSaving(true);
      const oldPath = avatarPath;
      const path = await uploadUserAvatar(result.assets[0].uri, userId);
      await updateUserProfile(userId, { avatar_path: path });
      const nextUrl = await getCurrentUserAvatarUrl(path);
      setAvatarPath(path);
      setAvatarUrl(nextUrl);
      if (oldPath) { try { await deleteUserAvatar(oldPath); } catch { /* keep new avatar even if old cleanup fails */ } }
      toast.addToast("Foto de perfil atualizada.", "success");
    } catch (error) {
      toast.addToast(error instanceof Error ? error.message : "Não foi possível atualizar a foto.", "error");
    } finally { setSaving(false); }
  };

  const saveProfile = async () => {
    if (!userId) return;
    const trimmedName = name.trim();
    if (!trimmedName) { toast.addToast("Informe seu nome.", "error"); return; }
    try { setSaving(true); await updateUserProfile(userId, { name: trimmedName }); setName(trimmedName); toast.addToast("Perfil atualizado.", "success"); }
    catch (error) { toast.addToast(error instanceof Error ? error.message : "Não foi possível salvar o perfil.", "error"); }
    finally { setSaving(false); }
  };

  const savePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) { toast.addToast("Preencha os três campos de senha.", "error"); return; }
    if (newPassword.length < 6) { toast.addToast("A nova senha deve ter pelo menos 6 caracteres.", "error"); return; }
    if (newPassword !== confirmPassword) { toast.addToast("A confirmação da nova senha não confere.", "error"); return; }
    try { setPasswordSaving(true); await changeUserPassword(currentPassword, newPassword); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); toast.addToast("Senha alterada com sucesso.", "success"); }
    catch (error) { toast.addToast(error instanceof Error ? error.message : "Não foi possível alterar a senha.", "error"); }
    finally { setPasswordSaving(false); }
  };

  const confirmDelete = async () => {
    try { setDeleting(true); await deleteUserAccount(); router.replace("/login"); }
    catch (error) { toast.addToast(error instanceof Error ? error.message : "Não foi possível excluir a conta.", "error"); setDeleteOpen(false); }
    finally { setDeleting(false); }
  };

  const confirmLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
      setLogoutOpen(false);
      router.replace("/login");
    } catch {
      toast.addToast("Não foi possível sair da conta.", "error");
    } finally {
      setLoggingOut(false);
    }
  };

  if (loading) return <View style={[styles.loading, { backgroundColor: colors.bg }]}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleBack} style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]} accessibilityRole="button" accessibilityLabel="Voltar para o perfil">
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]}>Configurações</Text>
            <Text style={[styles.subtitle, { color: colors.text2 }]}>Gerencie sua conta e suas preferências</Text>
          </View>
          <View style={styles.topSpacer} />
        </View>

        <View style={styles.group}>
          <Text style={[styles.groupTitle, { color: colors.text }]}>Conta</Text>
          <Text style={[styles.groupDescription, { color: colors.text2 }]}>Seus dados pessoais e acesso à conta</Text>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.profilePreview}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.smallAvatar} />
              ) : (
                <View style={[styles.smallAvatar, styles.avatarFallback, { backgroundColor: colors.surface2 }]}>
                  <Ionicons name="person" size={24} color={C.white} />
                </View>
              )}
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: colors.text }]} numberOfLines={1}>{name || "Meu perfil"}</Text>
                <Text style={[styles.profileEmail, { color: colors.text2 }]} numberOfLines={1}>{email}</Text>
              </View>
              <TouchableOpacity style={styles.rowAction} onPress={() => setProfileOpen((v) => !v)}>
                <Ionicons name={profileOpen ? "chevron-up" : "chevron-forward"} size={20} color={colors.text3} />
              </TouchableOpacity>
            </View>

            {profileOpen && (
              <View style={styles.expandedContent}>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.avatarWrap}>
                  {avatarUrl ? <Image source={{ uri: avatarUrl }} style={styles.avatar} /> : <View style={[styles.avatar, styles.avatarFallback]}><Ionicons name="person" size={42} color={C.white} /></View>}
                  <TouchableOpacity style={styles.avatarButton} onPress={pickAvatar} disabled={saving}>
                    <Ionicons name="camera" size={18} color={C.white} />
                    <Text style={styles.avatarButtonText}>Alterar foto</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.label, { color: colors.text2 }]}>Nome</Text>
                <TextInput value={name} onChangeText={setName} placeholder="Seu nome" placeholderTextColor={colors.text3} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]} />
                <Text style={[styles.label, { color: colors.text2 }]}>E-mail</Text>
                <TextInput value={email} editable={false} style={[styles.input, styles.disabledInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]} />
                <Text style={[styles.label, { color: colors.text2 }]}>Cidade</Text>
                <TextInput value={city} editable={false} style={[styles.input, styles.disabledInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]} />
                <TouchableOpacity style={styles.primaryButton} onPress={saveProfile} disabled={saving}>
                  {saving ? <ActivityIndicator color={C.white} /> : <Text style={styles.primaryText}>Salvar alterações</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>

          <TouchableOpacity style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setLogoutOpen(true)} activeOpacity={0.8}>
            <View style={styles.rowHeader}>
              <View style={[styles.iconBox, { backgroundColor: C.danger + "12" }]}>
                <Ionicons name="log-out-outline" size={21} color={C.danger} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>Sair da conta</Text>
                <Text style={[styles.rowDescription, { color: colors.text2 }]}>Encerrar sua sessão neste dispositivo</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text3} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.group}>
          <Text style={[styles.groupTitle, { color: colors.text }]}>Preferências</Text>
          <Text style={[styles.groupDescription, { color: colors.text2 }]}>Personalize a experiência do ECOcidade</Text>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.rowHeader}>
              <View style={[styles.iconBox, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="color-palette-outline" size={21} color={colors.primary} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>Aparência</Text>
                <Text style={[styles.rowDescription, { color: colors.text2 }]}>Escolha claro, escuro ou seguir o sistema</Text>
              </View>
            </View>
            <View style={styles.themeOptions}>
              {([
                ["system", "Sistema", "phone-portrait-outline"],
                ["light", "Claro", "sunny-outline"],
                ["dark", "Escuro", "moon-outline"],
              ] as const).map(([value, label, icon]) => {
                const active = mode === value;
                return (
                  <TouchableOpacity key={value} onPress={() => setMode(value as ThemeMode)} activeOpacity={0.85}
                    style={[styles.themeOption, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primaryLight : colors.surface2 }]}>
                    <Ionicons name={icon as any} size={20} color={active ? colors.primary : colors.text3} />
                    <Text style={{ color: active ? colors.primary : colors.text2, fontSize: 12, fontWeight: "800" }}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push("/location-settings")} activeOpacity={0.8}>
            <View style={styles.rowHeader}>
              <View style={[styles.iconBox, { backgroundColor: colors.surface2 }]}>
                <Ionicons name="location-outline" size={21} color={colors.text2} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>Localização</Text>
                <Text style={[styles.rowDescription, { color: colors.text2 }]}>Permissões e uso da sua localização</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text3} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.group}>
          <Text style={[styles.groupTitle, { color: colors.text }]}>Segurança e privacidade</Text>
          <Text style={[styles.groupDescription, { color: colors.text2 }]}>Proteja sua conta e controle seus dados</Text>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity style={styles.rowHeader} onPress={() => setSecurityOpen((v) => !v)} activeOpacity={0.8}>
              <View style={[styles.iconBox, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="shield-checkmark-outline" size={21} color={colors.primary} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>Segurança</Text>
                <Text style={[styles.rowDescription, { color: colors.text2 }]}>Altere sua senha e gerencie o acesso</Text>
              </View>
              <Ionicons name={securityOpen ? "chevron-up" : "chevron-forward"} size={20} color={colors.text3} />
            </TouchableOpacity>

            {securityOpen && (
              <View style={styles.expandedContent}>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <Text style={[styles.label, { color: colors.text2 }]}>Senha atual</Text>
                <TextInput value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry placeholder="Senha atual" placeholderTextColor={colors.text3} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]} />
                <Text style={[styles.label, { color: colors.text2 }]}>Nova senha</Text>
                <TextInput value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="Nova senha" placeholderTextColor={colors.text3} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]} />
                <Text style={[styles.label, { color: colors.text2 }]}>Confirmar nova senha</Text>
                <TextInput value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholder="Repita a nova senha" placeholderTextColor={colors.text3} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]} />
                <TouchableOpacity style={styles.primaryButton} onPress={savePassword} disabled={passwordSaving}>
                  {passwordSaving ? <ActivityIndicator color={C.white} /> : <Text style={styles.primaryText}>Alterar senha</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.rowHeader}>
              <View style={[styles.iconBox, { backgroundColor: colors.surface2 }]}>
                <Ionicons name="eye-outline" size={21} color={colors.text2} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>Privacidade</Text>
                <Text style={[styles.rowDescription, { color: colors.text2 }]}>Visibilidade das suas denúncias e dados</Text>
              </View>
              <View style={[styles.comingSoon, { backgroundColor: colors.surface2 }]}><Text style={[styles.comingSoonText, { color: colors.text3 }]}>Em breve</Text></View>
            </View>
          </View>

          <View style={[styles.card, styles.dangerCard, { backgroundColor: colors.surface, borderColor: C.danger + "40" }]}>
            <View style={styles.rowHeader}>
              <View style={[styles.iconBox, { backgroundColor: C.danger + "12" }]}>
                <Ionicons name="trash-outline" size={21} color={C.danger} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>Excluir conta</Text>
                <Text style={[styles.rowDescription, { color: colors.text2 }]}>Remover seus dados pessoais e acesso ao ECOcidade</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.deleteButton} onPress={() => setDeleteOpen(true)} disabled={deleting}>
              <Text style={styles.deleteText}>Excluir minha conta</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.group}>
          <Text style={[styles.groupTitle, { color: colors.text }]}>Sobre</Text>
          <Text style={[styles.groupDescription, { color: colors.text2 }]}>Informações e suporte</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.infoRow}><Ionicons name="help-circle-outline" size={21} color={colors.text2} /><Text style={[styles.infoText, { color: colors.text }]}>Ajuda e suporte</Text><Text style={[styles.comingSoonText, { color: colors.text3 }]}>Em breve</Text></View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.infoRow}><Ionicons name="document-text-outline" size={21} color={colors.text2} /><Text style={[styles.infoText, { color: colors.text }]}>Termos de uso</Text><Text style={[styles.comingSoonText, { color: colors.text3 }]}>Em breve</Text></View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.infoRow}><Ionicons name="shield-outline" size={21} color={colors.text2} /><Text style={[styles.infoText, { color: colors.text }]}>Política de privacidade</Text><Text style={[styles.comingSoonText, { color: colors.text3 }]}>Em breve</Text></View>
          </View>
          <Text style={[styles.version, { color: colors.text3 }]}>ECOcidade • versão 1.0.0</Text>
        </View>
      </ScrollView>

      <ConfirmationModal title="Excluir conta?" description="Sua conta e seus dados pessoais serão removidos. Suas denúncias não serão apagadas: elas permanecerão no sistema para preservar o histórico e auxiliar a prefeitura. Essa ação não pode ser desfeita." confirmText={deleting ? "Excluindo..." : "Excluir minha conta"} cancelText="Cancelar" visible={deleteOpen} destructive onDismiss={() => setDeleteOpen(false)} onConfirm={confirmDelete} />
      <ConfirmationModal title="Sair da conta?" description="Sua sessão será encerrada neste dispositivo. Seus dados permanecerão salvos." confirmText={loggingOut ? "Saindo..." : "Sair"} cancelText="Cancelar" visible={logoutOpen} onDismiss={() => setLogoutOpen(false)} onConfirm={confirmLogout} />
    </View>
  );
}

const makeStyles = (colors: typeof C) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  container: { width: "100%", maxWidth: 760, alignSelf: "center", padding: 20, paddingBottom: 56 },
  topBar: { flexDirection: "row", alignItems: "center", marginBottom: 28 },
  backButton: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  topSpacer: { width: 42 },
  headerText: { flex: 1, alignItems: "center", paddingHorizontal: 12 },
  title: { fontSize: 25, fontWeight: "800" },
  subtitle: { fontSize: 13, marginTop: 4, textAlign: "center" },
  group: { marginBottom: 24 },
  groupTitle: { fontSize: 18, fontWeight: "800", marginBottom: 3 },
  groupDescription: { fontSize: 13, marginBottom: 10 },
  card: { borderRadius: S.radius.xl, padding: 17, marginBottom: 10, borderWidth: 1 },
  profilePreview: { flexDirection: "row", alignItems: "center" },
  smallAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.surface2 },
  profileInfo: { flex: 1, marginLeft: 12 },
  profileName: { fontSize: 15, fontWeight: "800" },
  profileEmail: { fontSize: 13, marginTop: 3 },
  rowAction: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  rowHeader: { flexDirection: "row", alignItems: "center", minHeight: 48 },
  iconBox: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1, marginLeft: 12, marginRight: 8 },
  rowTitle: { fontSize: 15, fontWeight: "800" },
  rowDescription: { fontSize: 12.5, lineHeight: 18, marginTop: 3 },
  expandedContent: { paddingTop: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 15 },
  avatarWrap: { alignItems: "center", marginBottom: 12 },
  avatar: { width: 104, height: 104, borderRadius: 52, backgroundColor: colors.surface2 },
  avatarFallback: { backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  avatarButton: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, marginTop: -12 },
  avatarButtonText: { color: colors.white, fontSize: 13, fontWeight: "700" },
  label: { fontSize: 13, fontWeight: "700", marginBottom: 7, marginTop: 10 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 15 },
  disabledInput: { opacity: 0.65 },
  primaryButton: { minHeight: 48, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginTop: 18 },
  primaryText: { color: colors.white, fontSize: 15, fontWeight: "800" },
  themeOptions: { flexDirection: "row", gap: 8, marginTop: 14 },
  themeOption: { flex: 1, minHeight: 72, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 5 },
  comingSoon: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: colors.surface2 },
  comingSoonText: { fontSize: 11, fontWeight: "700", color: colors.text3 },
  deleteButton: { minHeight: 44, borderRadius: 11, borderWidth: 1, borderColor: colors.danger + "80", alignItems: "center", justifyContent: "center", marginTop: 12 },
  deleteText: { color: colors.danger, fontSize: 14, fontWeight: "800" },
  dangerCard: { borderColor: colors.danger + "40" },
  infoRow: { minHeight: 46, flexDirection: "row", alignItems: "center", gap: 12 },
  infoText: { flex: 1, fontSize: 14, fontWeight: "700" },
  version: { textAlign: "center", fontSize: 12, marginTop: 2 },
});
