import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { S } from "../constants/theme";
import { useAppTheme } from "../context/theme-context";

interface ConfirmationModalProps {
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
  visible: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
  destructive?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  visible,
  onDismiss,
  onConfirm,
  destructive = false,
}) => {
  const { colors, isDark } = useAppTheme();

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onDismiss}>
        <View style={[styles.modal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.header}>
            <View style={[styles.icon, { backgroundColor: destructive ? colors.dangerLight : colors.primaryLight }]}>
              <Text style={[styles.iconText, { color: destructive ? colors.danger : colors.primary }]}>
                {destructive ? "!" : "?"}
              </Text>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          </View>

          <View style={styles.body}>
            <Text style={[styles.description, { color: colors.text2 }]}>{description}</Text>
          </View>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { backgroundColor: colors.surface2, borderColor: colors.border }]}
              onPress={onDismiss}
            >
              <Text style={[styles.cancelText, { color: colors.text2 }]}>{cancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: destructive ? colors.danger : colors.primary }]}
              onPress={() => {
                onConfirm();
                onDismiss();
              }}
            >
              <Text style={styles.confirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.58)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modal: {
    width: "100%",
    maxWidth: 380,
    borderRadius: S.radius.xl,
    borderWidth: 1,
    overflow: "hidden",
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
  },
  header: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 8,
    alignItems: "center",
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  iconText: { fontSize: 24, fontWeight: "900" },
  title: { fontSize: 20, fontWeight: "800", textAlign: "center" },
  body: { paddingHorizontal: 24, paddingVertical: 14 },
  description: { fontSize: 14, textAlign: "center", lineHeight: 21 },
  footer: {
    flexDirection: "row",
    borderTopWidth: 1,
    padding: 14,
    gap: 10,
  },
  button: {
    flex: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: S.radius.md,
  },
  cancelButton: { borderWidth: 1 },
  cancelText: { fontSize: 14, fontWeight: "700" },
  confirmText: { fontSize: 14, fontWeight: "800", color: "#fff" },
});
