import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ConfirmationModal } from "../components/ConfirmationModal";
import { C, S } from "../constants/theme";
import { useToast } from "../context/toast-context";
import {
  changeUserPassword,
  deleteUserAccount,
  getCurrentUserData,
  getCurrentUserAvatarUrl,
  updateUserProfile,
  uploadUserAvatar,
} from "../services/auth";

export default function SettingsScreen() {
  const toast = useToast();
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
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const user = await getCurrentUserData();
      if (!user?.id) {
        router.replace("/login");
        return;
      }
      setUserId(user.id);
      setEmail(user.email || "");
      setCity(user.city || "");
      setName(user.name || "");
      setAvatarUrl(await getCurrentUserAvatarUrl());
    } catch {
      toast.addToast("Não foi possível carregar as configurações.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const pickAvatar = async () => {
    if (!userId) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.addToast("Permita o acesso às fotos para escolher um avatar.", "error");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]?.uri) return;

    try {
      setSaving(true);
      const path = await uploadUserAvatar(result.assets[0].uri, userId);
      const updated = await updateUserProfile(userId, { avatar_path: path });
      const oldUrl = avatarUrl;
      const nextUrl = await getCurrentUserAvatarUrl(path);
      setAvatarUrl(nextUrl);
      if (oldUrl) {
        // The previous object is intentionally left to the server cleanup path;
        // replacing it here would require knowing its storage path.
      }
      toast.addToast("Foto de perfil atualizada.", "success");
      void updated;
    } catch (error) {
      toast.addToast(
        error instanceof Error ? error.message : "Não foi possível atualizar a foto.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = async () => {
    if (!userId) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.addToast("Informe seu nome.", "error");
      return;
    }

    try {
      setSaving(true);
      await updateUserProfile(userId, { name: trimmedName });
      setName(trimmedName);
      toast.addToast("Perfil atualizado.", "success");
    } catch (error) {
      toast.addToast(
        error instanceof Error ? error.message : "Não foi possível salvar o perfil.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.addToast("Preencha os três campos de senha.", "error");
      return;
    }
    if (newPassword.length < 6) {
      toast.addToast("A nova senha deve ter pelo menos 6 caracteres.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.addToast("A confirmação da nova senha não confere.", "error");
      return;
    }

    try {
      setPasswordSaving(true);
      await changeUserPassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.addToast("Senha alterada com sucesso.", "success");
    } catch (error) {
      toast.addToast(
        error instanceof Error ? error.message : "Não foi possível alterar a senha.",
        "error",
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  const confirmDelete = async () => {
    try {
      setDeleting(true);
      await deleteUserAccount();
      router.replace("/login");
    } catch (error) {
      toast.addToast(
        error instanceof Error ? error.message : "Não foi possível excluir a conta.",
        "error",
      );
    } finally {
      setDeleting(false);
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
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={C.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Configurações</Text>
          <View style={styles.topSpacer} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Meu perfil</Text>
          <View style={styles.avatarWrap}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Ionicons name="person" size={42} color={C.white} />
              </View>
            )}
            <TouchableOpacity style={styles.avatarButton} onPress={pickAvatar} disabled={saving}>
              <Ionicons name="camera" size={18} color={C.white} />
              <Text style={styles.avatarButtonText}>Alterar foto</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Nome</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Seu nome"
            placeholderTextColor={C.text3}
            style={styles.input}
          />

          <Text style={styles.label}>E-mail</Text>
          <TextInput value={email} editable={false} style={[styles.input, styles.disabledInput]} />

          <Text style={styles.label}>Cidade</Text>
          <TextInput value={city} editable={false} style={[styles.input, styles.disabledInput]} />

          <TouchableOpacity style={styles.primaryButton} onPress={saveProfile} disabled={saving}>
            {saving ? <ActivityIndicator color={C.white} /> : <Text style={styles.primaryText}>Salvar alterações</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Segurança</Text>
          <Text style={styles.helper}>Altere sua senha usando a senha atual para confirmar sua identidade.</Text>

          <Text style={styles.label}>Senha atual</Text>
          <TextInput
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            placeholder="Senha atual"
            placeholderTextColor={C.text3}
            style={styles.input}
          />
          <Text style={styles.label}>Nova senha</Text>
          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            placeholder="Nova senha"
            placeholderTextColor={C.text3}
            style={styles.input}
          />
          <Text style={styles.label}>Confirmar nova senha</Text>
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholder="Repita a nova senha"
            placeholderTextColor={C.text3}
            style={styles.input}
          />

          <TouchableOpacity style={styles.primaryButton} onPress={savePassword} disabled={passwordSaving}>
            {passwordSaving ? <ActivityIndicator color={C.white} /> : <Text style={styles.primaryText}>Alterar senha</Text>}
          </TouchableOpacity>
        </View>

        <View style={[styles.card, styles.dangerCard]}>
          <Text style={styles.sectionTitle}>Conta</Text>
          <Text style={styles.helper}>
            Excluir a conta remove seus dados pessoais e o acesso ao aplicativo. Suas denúncias permanecerão no sistema para preservar o histórico da cidade.
          </Text>
          <TouchableOpacity style={styles.deleteButton} onPress={() => setDeleteOpen(true)} disabled={deleting}>
            <Ionicons name="trash-outline" size={19} color={C.danger} />
            <Text style={styles.deleteText}>Excluir minha conta</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ConfirmationModal
        title="Excluir conta?"
        description="Sua conta e seus dados pessoais serão removidos. Suas denúncias não serão apagadas: elas permanecerão no sistema para preservar o histórico e auxiliar a prefeitura. Essa ação não pode ser desfeita."
        confirmText={deleting ? "Excluindo..." : "Excluir minha conta"}
        cancelText="Cancelar"
        visible={deleteOpen}
        destructive
        onDismiss={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg },
  container: { width: "100%", maxWidth: 760, alignSelf: "center", padding: 20, paddingBottom: 48 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  backButton: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: C.surface },
  topSpacer: { width: 42 },
  title: { fontSize: 24, fontWeight: "800", color: C.text },
  card: { backgroundColor: C.surface, borderRadius: S.radius.xl, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: C.border },
  dangerCard: { borderColor: C.danger + "40" },
  sectionTitle: { fontSize: 19, fontWeight: "800", color: C.text, marginBottom: 16 },
  avatarWrap: { alignItems: "center", marginBottom: 20 },
  avatar: { width: 112, height: 112, borderRadius: 56, backgroundColor: C.surface2 },
  avatarFallback: { width: 112, height: 112, borderRadius: 56, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" },
  avatarButton: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: C.primary, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, marginTop: -12 },
  avatarButtonText: { color: C.white, fontSize: 13, fontWeight: "700" },
  label: { fontSize: 13, fontWeight: "700", color: C.text2, marginBottom: 7, marginTop: 10 },
  input: { minHeight: 48, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, color: C.text, backgroundColor: C.bg, fontSize: 15 },
  disabledInput: { opacity: 0.65 },
  helper: { color: C.text2, lineHeight: 21, fontSize: 14, marginBottom: 8 },
  primaryButton: { minHeight: 48, borderRadius: 12, backgroundColor: C.primary, alignItems: "center", justifyContent: "center", marginTop: 18 },
  primaryText: { color: C.white, fontSize: 15, fontWeight: "800" },
  deleteButton: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: C.danger + "80", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 },
  deleteText: { color: C.danger, fontSize: 15, fontWeight: "800" },
});
