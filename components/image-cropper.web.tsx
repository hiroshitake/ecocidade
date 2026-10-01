import React, { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import { Modal, Text, TouchableOpacity, View, StyleSheet } from "react-native";

type CropArea = { x: number; y: number; width: number; height: number };

interface ImageCropperProps {
  visible: boolean;
  imageUri: string | null;
  onCancel: () => void;
  onConfirm: (croppedUri: string) => void;
}

async function createCroppedImage(imageUri: string, area: CropArea): Promise<string> {
  const image = new Image();
  image.src = imageUri;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Não foi possível carregar a imagem."));
  });

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(area.width));
  canvas.height = Math.max(1, Math.round(area.height));

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Seu navegador não suporta recorte de imagens.");

  context.drawImage(
    image,
    Math.round(area.x),
    Math.round(area.y),
    Math.round(area.width),
    Math.round(area.height),
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return canvas.toDataURL("image/jpeg", 0.9);
}

export default function ImageCropper({
  visible,
  imageUri,
  onCancel,
  onConfirm,
}: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<CropArea | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setArea(null);
    setSaving(false);
  };

  const cancel = () => {
    reset();
    onCancel();
  };

  const confirm = useCallback(async () => {
    if (!imageUri || !area || saving) return;
    try {
      setSaving(true);
      const cropped = await createCroppedImage(imageUri, area);
      reset();
      onConfirm(cropped);
    } catch (error) {
      console.error("Erro ao recortar foto:", error);
      setSaving(false);
      window.alert("Não foi possível recortar a foto. Tente novamente.");
    }
  }, [area, imageUri, saving, onConfirm]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={cancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Ajustar foto</Text>
              <Text style={styles.subtitle}>
                Arraste a imagem e use o zoom para escolher exatamente o que aparecerá na denúncia.
              </Text>
            </View>
            <TouchableOpacity onPress={cancel} style={styles.close}>
              <Text style={styles.closeText}>×</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cropArea}>
            {imageUri ? (
              <Cropper
                image={imageUri}
                crop={crop}
                zoom={zoom}
                aspect={4 / 3}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, pixels) => setArea(pixels)}
                showGrid
                restrictPosition
              />
            ) : null}
          </View>

          <View style={styles.zoomRow}>
            <Text style={styles.zoomLabel}>Zoom</Text>
            <input
              aria-label="Zoom da foto"
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              style={{ flex: 1 }}
            />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={cancel} disabled={saving}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmButton} onPress={confirm} disabled={saving}>
              <Text style={styles.confirmText}>{saving ? "Recortando..." : "Usar foto"}</Text>
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
    backgroundColor: "rgba(0,0,0,0.62)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  card: {
    width: "100%",
    maxWidth: 680,
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
  },
  header: {
    padding: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerCopy: { flex: 1, paddingRight: 12 },
  title: { fontSize: 19, fontWeight: "800", color: "#111827" },
  subtitle: { marginTop: 5, fontSize: 12, lineHeight: 18, color: "#6b7280" },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
  },
  closeText: { fontSize: 25, lineHeight: 28, color: "#374151" },
  cropArea: {
    height: 390,
    position: "relative",
    backgroundColor: "#111827",
  },
  zoomRow: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  zoomLabel: { width: 38, fontSize: 12, fontWeight: "700", color: "#374151" },
  actions: {
    padding: 14,
    gap: 10,
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  cancelButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
  },
  cancelText: { fontSize: 13, fontWeight: "800", color: "#374151" },
  confirmButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1a5fd4",
  },
  confirmText: { fontSize: 13, fontWeight: "800", color: "#fff" },
});
