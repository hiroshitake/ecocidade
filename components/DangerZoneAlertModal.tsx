import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { S } from "../constants/theme";
import { useAppTheme } from "../context/theme-context";

export type DangerZoneAlertType = "near" | "inside";

interface DangerZoneAlertModalProps {
  visible: boolean;
  type: DangerZoneAlertType;
  zoneName?: string;
  severity?: string;
  onConfirm: () => void;
}

const severityLabels: Record<string, string> = {
  baixa: "baixa",
  media: "média",
  média: "média",
  alta: "alta",
  critico: "crítica",
  crítico: "crítica",
};

export default function DangerZoneAlertModal({
  visible,
  type,
  zoneName,
  severity,
  onConfirm,
}: DangerZoneAlertModalProps) {
  const { colors } = useAppTheme();
  const inside = type === "inside";
  const level = severityLabels[String(severity || "media").toLowerCase()] || String(severity || "média");

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => undefined}>
      <View style={styles.overlay}>
        <View
          accessibilityViewIsModal
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={[styles.iconCircle, { backgroundColor: colors.dangerLight }]}>
            <Ionicons name={inside ? "warning" : "alert-circle"} size={30} color={colors.danger} />
          </View>

          <View style={styles.content}>
            <Text style={[styles.eyebrow, { color: colors.danger }]}>
              {inside ? "ATENÇÃO DE SEGURANÇA" : "AVISO DE SEGURANÇA"}
            </Text>
            <Text style={[styles.title, { color: colors.text }]}>
              {inside ? "Você adentrou em uma zona perigosa" : "Você está perto de uma zona de risco"}
            </Text>
            <Text style={[styles.description, { color: colors.text2 }]}>
              {inside
                ? <>Você adentrou em uma zona perigosa de nível <Text style={styles.bold}>{level}</Text>. Tome cuidado.</>
                : "Você está perto de uma zona de risco. Tome cuidado e fique atento."}
            </Text>

            {zoneName ? (
              <View style={[styles.zoneBadge, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
                <Ionicons name="location-outline" size={16} color={colors.text3} />
                <Text numberOfLines={1} style={[styles.zoneName, { color: colors.text2 }]}>
                  {zoneName}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Não me avise novamente"
              onPress={onDisableAlerts}
              style={({ pressed }) => [
                styles.secondaryButton,
                { borderColor: colors.border, opacity: pressed ? 0.65 : 1 },
              ]}
            >
              <Ionicons name="notifications-off-outline" size={16} color={colors.text2} />
              <Text style={[styles.secondaryButtonText, { color: colors.text2 }]}>
                NÃO ME AVISE NOVAMENTE
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={inside ? "OK" : "Eu sei"}
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: colors.danger, opacity: pressed ? 0.82 : 1 },
              ]}
            >
              <Text style={styles.buttonText}>{inside ? "OK" : "EU SEI"}</Text>
              <Ionicons name="checkmark" size={18} color="#fff" />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.68)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    borderRadius: S.radius.xl,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 20,
  },
  iconCircle: {
    alignSelf: "center",
    width: 66,
    height: 66,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 26,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 22,
    alignItems: "center",
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.1,
    marginBottom: 8,
  },
  title: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "800",
    textAlign: "center",
  },
  description: {
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
    marginTop: 12,
  },
  bold: { fontWeight: "800" },
  zoneBadge: {
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: 1,
    borderRadius: S.radius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 16,
  },
  zoneName: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "700",
  },
  footer: {
    borderTopWidth: 1,
    padding: 14,
  },
  button: {
    minHeight: 50,
    borderRadius: S.radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryButton: {
    minHeight: 42,
    marginBottom: 10,
    borderRadius: S.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  secondaryButtonText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.25,
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
});
