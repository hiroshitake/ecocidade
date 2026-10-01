import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ConfirmationModal } from "../../components/ConfirmationModal";
import { ErrorState } from "../../components/ErrorState";
import { C } from "../../constants/theme";
import { useAppTheme } from "../../context/theme-context";
import { useToast } from "../../context/toast-context";
import { formatBirthDate } from "../../functions/masks";
import {
  getCurrentUserAvatarUrl,
  getCurrentUserData,
  logout,
} from "../../services/auth";

interface UserData {
  id?: string;
  name?: string;
  email?: string;
  birthdate?: string;
  city?: string;
  avatar_path?: string | null;
  createdAt?: Date | null;
}

const ProfileScreen: React.FC = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { colors } = useAppTheme();
  const toast = useToast();
  const styles = makeStyles(colors);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setHasError(false);

    try {
      const data = await getCurrentUserData();
      setUserData(data);
      setAvatarUrl(await getCurrentUserAvatarUrl(data?.avatar_path));
      if (!data) setHasError(true);
    } catch (error) {
      setUserData(null);
      setAvatarUrl(null);
      setHasError(true);
      toast.addToast("Erro ao carregar dados", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleLogout = () => setIsOpen(true);

  const handleConfirmLogout = async () => {
    try {
      await logout();
      setIsOpen(false);
      router.replace("/login");
    } catch (error) {
      toast.addToast("Falha ao sair", "error");
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (hasError && !userData) {
    return <ErrorState message="Erro ao carregar dados" onRetry={loadProfile} />;
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.avatarWrap}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.photo} />
          ) : (
            <View style={styles.photoFallback}>
              <Ionicons name="person" size={44} color={colors.white} />
            </View>
          )}
        </View>

        <Text style={styles.name}>{userData?.name || "Cidadão"}</Text>
        <Text style={styles.email}>{userData?.email || "Nenhum e-mail cadastrado"}</Text>

        <View style={styles.card}>
          <Text style={styles.sectionHeader}>DADOS DA CONTA</Text>

          {userData?.birthdate ? (
            <View style={styles.infoRow}>
              <View style={styles.labelCol}>
                <Ionicons name="calendar-outline" size={16} color={colors.text3} />
                <Text style={styles.infoLabel}>Nascimento</Text>
              </View>
              <Text style={styles.infoValue}>{formatBirthDate(userData.birthdate)}</Text>
            </View>
          ) : null}

          {userData?.createdAt ? (
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <View style={styles.labelCol}>
                <Ionicons name="time-outline" size={16} color={colors.text3} />
                <Text style={styles.infoLabel}>Membro desde</Text>
              </View>
              <Text style={styles.infoValue}>
                {new Date(userData.createdAt).toLocaleDateString("pt-BR")}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.actionsWrap}>
          <TouchableOpacity style={styles.settingsBtn} onPress={() => router.push("/settings")}>
            <Ionicons name="settings-outline" size={18} color={colors.text} />
            <Text style={styles.settingsText}>Configurações do aplicativo</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.text3} style={{ marginLeft: "auto" }} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color={colors.danger} />
            <Text style={styles.logoutText}>Sair da conta</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ConfirmationModal
        title="Sair da conta"
        description="Deseja realmente sair da sua conta?"
        confirmText="Sair"
        cancelText="Cancelar"
        visible={isOpen}
        onDismiss={() => setIsOpen(false)}
        onConfirm={handleConfirmLogout}
      />
    </View>
  );
};

const makeStyles = (colors: typeof C) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  container: { padding: 20, paddingTop: 36, alignItems: "center" },
  avatarWrap: {
    padding: 3,
    borderRadius: 64,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: 16,
  },
  photo: { width: 104, height: 104, borderRadius: 52 },
  photoFallback: { width: 104, height: 104, borderRadius: 52, backgroundColor: colors.primary, justifyContent: "center", alignItems: "center" },
  name: { fontSize: 22, fontWeight: "700", color: colors.text, marginBottom: 4, letterSpacing: -0.3 },
  email: { fontSize: 14, color: colors.text2, marginBottom: 28 },
  card: {
    width: "100%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.text3,
    letterSpacing: 0.8,
    marginBottom: 12,
    marginTop: 4,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  labelCol: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoLabel: { fontSize: 14, color: colors.text2 },
  infoValue: { fontSize: 14, fontWeight: "600", color: colors.text },
  actionsWrap: { width: "100%", gap: 10 },
  settingsBtn: {
    width: "100%",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    gap: 10,
  },
  settingsText: { color: colors.text, fontSize: 14, fontWeight: "600" },
  logoutBtn: {
    width: "100%",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.dangerLight,
    backgroundColor: colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  logoutText: { color: colors.danger, fontSize: 14, fontWeight: "600" },
});

export default ProfileScreen;
