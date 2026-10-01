import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface ImageCropperProps {
  visible: boolean;
  imageUri: string | null;
  onCancel: () => void;
  onConfirm: (croppedUri: string) => void;
}

export default function ImageCropper({
  visible,
  imageUri,
  onCancel,
  onConfirm,
}: ImageCropperProps) {
  if (!imageUri) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Confirmar foto</Text>
          <Text style={styles.description}>
            A foto será usada como selecionada.
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => onConfirm(imageUri)}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryText}>Usar foto</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    padding: 24,
  },
  container: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 16,
    padding: 24,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    lineHeight: 21,
    color: "#555",
    marginBottom: 24,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  secondaryButton: {
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  primaryButton: {
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#111",
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: "600",
  },
  primaryText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
