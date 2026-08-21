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
import { useToast } from "../../context/toast-context";
import { formatBirthDate } from "../../functions/masks";
import { getCurrentUserData, logout } from "../../services/auth";

interface UserData {
  id?: string;
  name?: string;
  email?: string;
  birthdate?: string;
  city?: string;
  photoURL?: string | null;
  createdAt?: Date | null;
}

const ProfileScreen: React.FC = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const toast = useToast();

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setHasError(false);

    try {
      const data = await getCurrentUserData();
      setUserData(data);
      if (!data) {
        setHasError(true);
      }
    } catch (error) {
      setUserData(null);
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
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  if (hasError && !userData) {
    return (
      <ErrorState message="Erro ao carregar dados" onRetry={loadProfile} />
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        {userData?.photoURL ? (
          <Image source={{ uri: userData.photoURL }} style={styles.photo} />
        ) : (
          <View style={styles.photoFallback}>
            <Ionicons name="person" size={40} color={C.white} />
          </View>
        )}

        <Text style={styles.name}>{userData?.name || "Usuário"}</Text>
        <Text style={styles.email}>
          {userData?.email || "Nenhum e-mail cadastrado"}
        </Text>

        {userData?.birthdate && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nascimento:</Text>
            <Text style={styles.infoValue}>
              {" "}
              {formatBirthDate(userData.birthdate)}
            </Text>
          </View>
        )}

        {userData?.createdAt && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Cadastrado em:</Text>
            <Text style={styles.infoValue}>
              {new Date(userData.createdAt).toLocaleDateString("pt-BR")}
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out" size={20} color={C.white} />
          <Text style={styles.btnText}>Deslogar</Text>
        </TouchableOpacity>
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: C.bg,
  },
  container: {
    padding: 24,
    paddingTop: 32,
    alignItems: "center",
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: C.surface,
    marginBottom: 20,
  },
  photoFallback: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: C.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    color: C.text,
    marginBottom: 8,
  },
  email: {
    fontSize: 15,
    color: C.text2,
    marginBottom: 20,
  },
  infoRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: C.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoLabel: {
    fontSize: 14,
    color: C.text2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: C.text,
  },
  logoutBtn: {
    flexDirection: "row",
    backgroundColor: C.danger,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnText: {
    color: C.white,
    fontSize: 15,
    fontWeight: "700",
  },
});

export default ProfileScreen;
