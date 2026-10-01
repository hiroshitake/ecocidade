import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as Location from "expo-location";
import { C } from "../constants/theme";
import { useAppTheme } from "../context/theme-context";
import { useToast } from "../context/toast-context";

type PermissionState = "granted" | "denied" | "undetermined";

export default function LocationSettingsScreen() {
  const { colors } = useAppTheme();
  const toast = useToast();
  const [permission, setPermission] = useState<PermissionState>("undetermined");
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  const refreshPermission = useCallback(async () => {
    try {
      setLoading(true);
      const result = await Location.getForegroundPermissionsAsync();
      setPermission(result.status as PermissionState);
    } catch {
      setPermission("undetermined");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshPermission();
    }, [refreshPermission]),
  );

  const requestPermission = async () => {
    try {
      setRequesting(true);
      const result = await Location.requestForegroundPermissionsAsync();
      setPermission(result.status as PermissionState);
      if (result.status === "granted") {
        toast.addToast("Localização ativada.", "success");
      } else {
        toast.addToast("Permissão de localização não concedida.", "error");
      }
    } catch {
      toast.addToast("Não foi possível solicitar a localização.", "error");
    } finally {
      setRequesting(false);
    }
  };

  const granted = permission === "granted";

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>Localização</Text>
          <Text style={[styles.subtitle, { color: colors.text2 }]}>Controle o uso da sua localização no mapa</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.iconBox, { backgroundColor: granted ? colors.primaryLight : colors.surface2 }]}>
            <Ionicons
              name={granted ? "location" : "location-outline"}
              size={26}
              color={granted ? colors.primary : colors.text2}
            />
          </View>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {loading ? "Verificando permissão..." : granted ? "Localização ativada" : "Localização desativada"}
          </Text>
          <Text style={[styles.cardText, { color: colors.text2 }]}>
            {granted
              ? "O ECOcidade pode usar sua localização atual para posicionar você no mapa e mostrar denúncias próximas."
              : "Permita o acesso à localização para usar sua posição atual no mapa e encontrar denúncias próximas."}
          </Text>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 18 }} />
          ) : (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={requestPermission}
              disabled={requesting || granted}
            >
              {requesting ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <Text style={styles.primaryText}>{granted ? "Permissão concedida" : "Permitir localização"}</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.surface2 }]}>
          <Ionicons name="information-circle-outline" size={20} color={colors.text2} />
          <Text style={[styles.infoText, { color: colors.text2 }]}>
            A localização é usada para o funcionamento do mapa e para calcular quais denúncias estão próximas de você. O mapa já utiliza o centro da sua cidade como fallback quando o GPS não está disponível.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { minHeight: 82, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", borderBottomWidth: 1 },
  backButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1, marginLeft: 8 },
  title: { fontSize: 22, fontWeight: "800" },
  subtitle: { fontSize: 12.5, marginTop: 3 },
  content: { width: "100%", maxWidth: 720, alignSelf: "center", padding: 20 },
  card: { borderRadius: 18, borderWidth: 1, padding: 22, alignItems: "center" },
  iconBox: { width: 58, height: 58, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  cardTitle: { fontSize: 18, fontWeight: "800", textAlign: "center" },
  cardText: { fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 8, maxWidth: 520 },
  primaryButton: { minHeight: 48, minWidth: 220, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 20, paddingHorizontal: 20 },
  primaryText: { color: C.white, fontSize: 14, fontWeight: "800" },
  infoCard: { flexDirection: "row", gap: 10, borderRadius: 14, padding: 15, marginTop: 12 },
  infoText: { flex: 1, fontSize: 12.5, lineHeight: 19 },
});
