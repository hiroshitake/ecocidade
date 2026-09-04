import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { ThemedText } from "./themed-text";
import { C } from "../constants/theme";
import { createReportImageUrl } from "../services/supabase";

export interface MapReport {
  id: string;
  category?: string;
  description?: string;
  status?: string;
  image_url?: string | null;
  created_at?: string | null;
  location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
  };
}

interface ReportMapModalProps {
  report: MapReport | null;
  onClose: () => void;
}

function getStatusInfo(status?: string) {
  switch (String(status || "").toLowerCase()) {
    case "resolved":
    case "concluida":
    case "concluída":
      return {
        label: "Concluída",
        icon: "check-circle-outline" as const,
        color: C.eco,
        background: "rgba(31, 166, 96, 0.10)",
      };
    case "in_progress":
    case "investigating":
    case "em processo":
    case "em_processamento":
      return {
        label: "Em Processo",
        icon: "progress-clock" as const,
        color: C.primary,
        background: "rgba(26, 95, 212, 0.10)",
      };
    default:
      return {
        label: "Aguardando",
        icon: "clock-alert-outline" as const,
        color: C.warning,
        background: "rgba(217, 119, 6, 0.10)",
      };
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return "Horário não informado";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Horário não informado";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export default function ReportMapModal({ report, onClose }: ReportMapModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadImage = async () => {
      setImageUrl(null);
      if (!report?.image_url) {
        setImageLoading(false);
        return;
      }

      setImageLoading(true);
      try {
        const signedUrl = await createReportImageUrl(report.image_url);
        if (!cancelled) setImageUrl(signedUrl);
      } catch (error) {
        console.warn("Não foi possível carregar a foto da denúncia:", error);
      } finally {
        if (!cancelled) setImageLoading(false);
      }
    };

    loadImage();

    return () => {
      cancelled = true;
    };
  }, [report?.image_url]);

  const status = getStatusInfo(report?.status);

  return (
    <Modal
      visible={Boolean(report)}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <ThemedText style={styles.title} numberOfLines={1}>
                {report?.category || "Denúncia"}
              </ThemedText>
              <ThemedText style={styles.subtitle}>Detalhes da ocorrência</ThemedText>
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Fechar detalhes da denúncia"
              style={styles.closeButton}
              onPress={onClose}
            >
              <Ionicons name="close" size={22} color={C.text2} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.photoCard}>
              {imageLoading ? (
                <View style={styles.photoPlaceholder}>
                  <ActivityIndicator size="small" color={C.primary} />
                  <ThemedText style={styles.placeholderText}>Carregando foto...</ThemedText>
                </View>
              ) : imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.photo} resizeMode="cover" />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="image-outline" size={34} color={C.text3} />
                  <ThemedText style={styles.placeholderText}>Sem foto disponível</ThemedText>
                </View>
              )}
            </View>

            <View style={styles.statusCard}>
              <View style={[styles.statusIcon, { backgroundColor: status.background }]}>
                <Ionicons name={status.icon} size={21} color={status.color} />
              </View>
              <View style={styles.statusCopy}>
                <ThemedText style={styles.label}>Status</ThemedText>
                <ThemedText style={[styles.statusLabel, { color: status.color }]}>
                  {status.label}
                </ThemedText>
              </View>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <Ionicons name="document-text-outline" size={19} color={C.primary} />
                <ThemedText style={styles.sectionTitle}>Descrição</ThemedText>
              </View>
              <ThemedText style={styles.description}>
                {report?.description?.trim() || "Sem descrição cadastrada."}
              </ThemedText>
            </View>

            <View style={styles.infoGrid}>
              <View style={styles.infoCardSmall}>
                <Ionicons name="time-outline" size={19} color={C.primary} />
                <ThemedText style={styles.label}>Horário</ThemedText>
                <ThemedText style={styles.infoValue}>
                  {formatDateTime(report?.created_at)}
                </ThemedText>
              </View>

              <View style={styles.infoCardSmall}>
                <Ionicons name="location-outline" size={19} color={C.primary} />
                <ThemedText style={styles.label}>Local</ThemedText>
                <ThemedText style={styles.infoValue} numberOfLines={3}>
                  {report?.location?.address || "Localização no mapa"}
                </ThemedText>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.closeFooterButton}
              activeOpacity={0.85}
              onPress={onClose}
            >
              <ThemedText style={styles.closeFooterText}>Fechar</ThemedText>
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
    backgroundColor: "rgba(7, 18, 38, 0.58)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  modalCard: {
    width: "100%",
    maxWidth: 560,
    maxHeight: "88%",
    backgroundColor: C.surface,
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#071226",
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  header: {
    minHeight: 72,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerText: { flex: 1, minWidth: 0, paddingRight: 12 },
  title: {
    fontSize: 19,
    fontWeight: "800",
    color: C.text,
    textTransform: "capitalize",
  },
  subtitle: { marginTop: 2, fontSize: 12, color: C.text3 },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
  },
  scroll: { flexGrow: 0 },
  content: { padding: 18, gap: 12 },
  photoCard: {
    width: "100%",
    height: 230,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
  },
  photo: { width: "100%", height: "100%" },
  photoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  placeholderText: { color: C.text3, fontSize: 12, fontWeight: "600" },
  statusCard: {
    minHeight: 70,
    borderRadius: 14,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  statusIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  statusCopy: { flex: 1 },
  label: { fontSize: 11, color: C.text3, fontWeight: "600" },
  statusLabel: { marginTop: 2, fontSize: 15, fontWeight: "800" },
  infoCard: {
    borderRadius: 14,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
  },
  infoHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: C.text },
  description: { marginTop: 9, fontSize: 13, lineHeight: 19, color: C.text2 },
  infoGrid: { flexDirection: "row", gap: 10 },
  infoCardSmall: {
    flex: 1,
    minHeight: 104,
    borderRadius: 14,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
    padding: 13,
  },
  infoValue: { marginTop: 6, fontSize: 12, lineHeight: 17, color: C.text2, fontWeight: "600" },
  footer: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.surface,
  },
  closeFooterButton: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  closeFooterText: { color: "#fff", fontSize: 13, fontWeight: "800" },
});
