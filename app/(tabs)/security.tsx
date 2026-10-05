import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import MapComponent from "../../components/map";
import ImageCropper from "../../components/image-cropper";
import { C, S } from "../../constants/theme";
import { useAppTheme } from "../../context/theme-context";
import { resolveUserLocationForSubmission } from "../../services/auth";
import { createReport } from "../../services/reports";
import {
  createSupabaseReport,
  isSupabaseConfigured,
} from "../../services/supabase";

const SEC_CATS = [
  { id: "crime", icon: "shield-checkmark" as const, label: "Crime/Furto" },
  { id: "tumulto", icon: "people" as const, label: "Tumulto" },
  { id: "perigo", icon: "warning" as const, label: "Situação perigosa" },
  { id: "outro", icon: "alert-circle" as const, label: "Outro" },
];

export default function SecurityScreen() {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationReady, setLocationReady] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState<{ type: "error" | "info"; title: string; message: string } | null>(null);
  const [submittedReport, setSubmittedReport] = useState<any | null>(null);
  const [cropPhotoUri, setCropPhotoUri] = useState<string | null>(null);
  const [photoOptionsVisible, setPhotoOptionsVisible] = useState(false);

  const router = useRouter();
  const resetFormOnNextFocusRef = useRef(false);

  // Ao voltar para a tela de segurança, a confirmação anterior não deve permanecer.
  // Após uma denúncia enviada, o formulário também é limpo no próximo foco.
  useFocusEffect(
    useCallback(() => {
      setSubmittedReport(null);

      if (resetFormOnNextFocusRef.current) {
        resetFormOnNextFocusRef.current = false;
        setSelectedCat(null);
        setDescription("");
        setSelectedLocation(null);
        setPhotoUri(null);
        setSubmitFeedback(null);
        setCropPhotoUri(null);
        setPhotoOptionsVisible(false);
      }
    }, []),
  );

  useEffect(() => {
    (async () => {
      const result = await resolveUserLocationForSubmission();
      if (result.location) {
        setUserLocation(result.location);
        setSelectedLocation((prev) => prev ?? result.location);
        setLocationError(null);
        setLocationReady(true);
      } else {
        setLocationError(
          "Não foi possível obter sua localização GPS. Verifique o GPS e tente novamente.",
        );
        setLocationReady(false);
      }
    })();
  }, []);

  const submit = async () => {
    setSubmitFeedback(null);

    if (!selectedCat) {
      setSubmitFeedback({
        type: "error",
        title: "Tipo de ocorrência não selecionado",
        message: "Selecione uma das opções acima antes de enviar a denúncia.",
      });
      return;
    }
    if (!description.trim()) {
      setSubmitFeedback({
        type: "error",
        title: "Descrição obrigatória",
        message: "Descreva a situação para que os responsáveis possam analisar a ocorrência.",
      });
      return;
    }
    const locationToSubmit = selectedLocation ?? userLocation;

    if (!locationToSubmit) {
      setSubmitFeedback({
        type: "error",
        title: "Localização obrigatória",
        message:
          "Nenhum ponto foi selecionado. Toque no mapa para definir o local da ocorrência e tente enviar novamente.",
      });
      return;
    }

    try {
      setSubmitting(true);
      const catObj = SEC_CATS.find((c) => c.id === selectedCat);
      const label = catObj ? catObj.label : selectedCat;

      let createdReport: any;

      if (isSupabaseConfigured()) {
        createdReport = await createSupabaseReport({
          title: `Segurança: ${label}`,
          description: description || "Ocorrência de segurança registrada.",
          latitude: locationToSubmit.latitude,
          longitude: locationToSubmit.longitude,
          category: "seguranca",
          severity: "high",
          status: "pending",
          imageUri: photoUri,
        });
      } else {
        createdReport = await createReport(undefined, {
          category: "seguranca",
          description,
          location: locationToSubmit,
        });
      }

      setSubmitFeedback(null);
      resetFormOnNextFocusRef.current = true;
      setSubmittedReport(createdReport);
    } catch (error: any) {
      let msg = error?.message || "Tente novamente mais tarde.";
      if (msg.includes("fora da área permitida")) {
        msg =
          "Você está fora da área de cobertura da sua cidade. Denúncias de segurança devem ser feitas dentro dos limites da cidade cadastrada.";
      }
      setSubmitFeedback({
        type: "error",
        title: "Não foi possível enviar a denúncia",
        message: msg,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePickPhoto = async () => {
    try {
      if (Platform.OS === "web") {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.style.display = "none";

        input.onchange = async (event: Event) => {
          const file = (event.target as HTMLInputElement).files?.[0];
          if (!file) return;

          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === "string") {
              setCropPhotoUri(reader.result);
            }
          };
          reader.readAsDataURL(file);
        };

        input.click();
        return;
      }

      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permissão necessária",
          "Precisamos de permissão para acessar suas fotos.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Erro ao abrir fotos:", error);
      Alert.alert("Erro", "Não foi possível acessar a galeria de fotos.");
    }
  };

  const handleTakePhoto = async () => {
    try {
      if (Platform.OS === "web") {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.setAttribute("capture", "environment");
        input.style.display = "none";

        input.onchange = async (event: Event) => {
          const file = (event.target as HTMLInputElement).files?.[0];
          if (!file) return;

          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === "string") {
              setCropPhotoUri(reader.result);
            }
          };
          reader.readAsDataURL(file);
        };

        input.click();
        return;
      }

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permissão necessária",
          "Precisamos de permissão para acessar a câmera.",
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Erro ao abrir câmera:", error);
      Alert.alert("Erro", "Não foi possível abrir a câmera.");
    }
  };

  const showPhotoOptions = () => {
    if (Platform.OS === "web") {
      setPhotoOptionsVisible(true);
      return;
    }

    Alert.alert("Adicionar foto", "Escolha uma opção", [
      { text: "Tirar foto", onPress: handleTakePhoto },
      { text: "Escolher da galeria", onPress: handlePickPhoto },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  if (submittedReport) {
    const protocol = submittedReport.id
      ? `#${String(submittedReport.id).slice(0, 8).toUpperCase()}`
      : "Registrada";

    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <View style={{ width: 36 }} />
          <Text style={styles.headerTitle}>Denúncia de Segurança</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.confirmationContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.confirmationIcon}>
            <Ionicons name="checkmark-shield" size={58} color={C.eco} />
          </View>
          <Text style={styles.confirmationTitle}>Denúncia enviada!</Text>
          <Text style={styles.confirmationText}>
            Sua denúncia de segurança foi registrada e encaminhada para análise.
          </Text>
          <View style={styles.protocolCard}>
            <Text style={styles.protocolLabel}>PROTOCOLO</Text>
            <Text style={styles.protocolValue}>{protocol}</Text>
            <Text style={styles.protocolHint}>
              Guarde este número para acompanhar sua denúncia.
            </Text>
          </View>
          <View style={styles.confirmationNotice}>
            <Ionicons name="shield-checkmark" size={20} color={C.eco} />
            <Text style={styles.confirmationNoticeText}>
              Sua identidade não é exibida publicamente. O acesso à denúncia é
              restrito aos responsáveis pelo atendimento.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.confirmationPrimary}
            onPress={() => router.replace("/map")}
          >
            <Text style={styles.confirmationPrimaryText}>Voltar ao mapa</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.confirmationSecondary}
            onPress={() => router.replace("/(tabs)/reports")}
          >
            <Text style={styles.confirmationSecondaryText}>
              Ver minhas denúncias
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push("/map")}>
          <Ionicons name="arrow-back" size={24} color={C.text2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Denúncia de Segurança</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── AVISO ANÔNIMO ── */}
        <View style={styles.anonCard}>
          <Ionicons
            name="shield-checkmark"
            size={22}
            color={C.eco}
            style={{ flexShrink: 0 }}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.anonTitle}>Identidade protegida</Text>
            <Text style={styles.anonText}>
              Sua identidade não é exibida publicamente. O acesso à denúncia é
              restrito aos responsáveis pelo atendimento.
            </Text>
          </View>
        </View>

        {/* ── TIPO DE OCORRÊNCIA ── */}
        <Text style={styles.label}>TIPO DE OCORRÊNCIA</Text>
        <View style={styles.catGrid}>
          {SEC_CATS.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.catBtn,
                selectedCat === cat.id && styles.catBtnSelected,
              ]}
              onPress={() => setSelectedCat(cat.id)}
            >
              <Ionicons name={cat.icon} size={28} color={C.primary} />
              <Text style={styles.catLabel}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── LOCALIZAÇÃO ── */}
        <Text style={[styles.label, { marginTop: 16 }]}>LOCALIZAÇÃO ATUAL</Text>
        <View style={styles.miniMapWrap}>
          <MapComponent
            style={styles.miniMap}
            userLocation={userLocation}
            selectedLocation={selectedLocation}
            selectLocation={true}
            onSelectLocation={setSelectedLocation}
          />
        </View>
        <View style={styles.locationStatusCard}>
          <Ionicons name={selectedLocation ? "location" : "location-outline"} size={18} color={selectedLocation ? C.eco : C.warning} />
          <Text style={styles.locationStatusText}>
            {selectedLocation ? "Localização definida. Você pode mover o ponto no mapa se necessário." : "Localização não definida. Escolha um ponto no mapa para continuar."}
          </Text>
        </View>

        {/* ── DESCRIÇÃO ── */}
        <Text style={[styles.label, { marginTop: 16 }]}>DESCRIÇÃO</Text>
        <TextInput
          style={styles.textarea}
          placeholder="Descreva a situação com o máximo de detalhes. O que está acontecendo? Quantas pessoas? Há risco imediato?"
          placeholderTextColor={C.text3}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />

        {/* FOTO (OPCIONAL) */}
        <Text style={[styles.label, { marginTop: 16 }]}>FOTO (OPCIONAL)</Text>
        {!photoUri ? (
          <TouchableOpacity
            style={styles.photoUpload}
            onPress={showPhotoOptions}
          >
            <Ionicons name="camera" size={36} color={C.primary} />
            <Text style={styles.photoTitle}>Adicionar foto</Text>
            <Text style={styles.photoSub}>
              Tirar foto ou escolher da galeria
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.photoSelectedRow}>
            <Image
              source={{ uri: photoUri }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 6,
                marginRight: 10,
              }}
            />
            <Text style={styles.photoSelectedText}>Foto selecionada ✓</Text>
            <TouchableOpacity
              onPress={() => setPhotoUri(null)}
              style={{ marginLeft: "auto" }}
            >
              <Ionicons name="close" size={18} color={C.eco} />
            </TouchableOpacity>
          </View>
        )}

        <ImageCropper
          visible={Boolean(cropPhotoUri)}
          imageUri={cropPhotoUri}
          onCancel={() => setCropPhotoUri(null)}
          onConfirm={(croppedUri) => {
            setPhotoUri(croppedUri);
            setCropPhotoUri(null);
          }}
        />

        <Modal
          visible={photoOptionsVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setPhotoOptionsVisible(false)}
        >
          <View style={styles.photoOptionsOverlay}>
            <View style={styles.photoOptionsCard}>
              <View style={styles.photoOptionsHeader}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.photoOptionsTitle}>Adicionar foto</Text>
                  <Text style={styles.photoOptionsSub}>
                    Como você quer adicionar a foto?
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setPhotoOptionsVisible(false)}
                  style={styles.photoOptionsClose}
                >
                  <Ionicons name="close" size={22} color={C.text2} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.photoOptionButton}
                onPress={() => {
                  setPhotoOptionsVisible(false);
                  handleTakePhoto();
                }}
              >
                <View style={styles.photoOptionIcon}>
                  <Ionicons name="camera" size={24} color={C.primary} />
                </View>
                <View style={styles.photoOptionTextWrap}>
                  <Text style={styles.photoOptionTitle}>Tirar foto</Text>
                  <Text style={styles.photoOptionSub}>
                    Abrir a câmera e ajustar o recorte antes de anexar
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={C.text3} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.photoOptionButton}
                onPress={() => {
                  setPhotoOptionsVisible(false);
                  handlePickPhoto();
                }}
              >
                <View style={styles.photoOptionIcon}>
                  <Ionicons name="images" size={24} color={C.primary} />
                </View>
                <View style={styles.photoOptionTextWrap}>
                  <Text style={styles.photoOptionTitle}>Escolher da galeria</Text>
                  <Text style={styles.photoOptionSub}>
                    Selecionar e recortar uma foto existente
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={C.text3} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.photoOptionsCancel}
                onPress={() => setPhotoOptionsVisible(false)}
              >
                <Text style={styles.photoOptionsCancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ── BOTÕES ── */}
        {submitFeedback ? (
          <View style={styles.submitFeedbackCard} accessibilityRole="alert">
            <Ionicons
              name={submitFeedback.type === "error" ? "alert-circle" : "information-circle"}
              size={22}
              color={C.danger}
            />
            <View style={styles.submitFeedbackCopy}>
              <Text style={styles.submitFeedbackTitle}>{submitFeedback.title}</Text>
              <Text style={styles.submitFeedbackMessage}>{submitFeedback.message}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setSubmitFeedback(null)}
              accessibilityLabel="Fechar aviso"
            >
              <Ionicons name="close" size={20} color={C.text2} />
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity
          style={[
            styles.btnDanger,
            { marginTop: 24, opacity: submitting ? 0.7 : 1 },
          ]}
          onPress={submit}
          disabled={submitting}
        >
          <Ionicons name="shield-checkmark" size={20} color="white" />
          <Text style={styles.btnDangerText}>
            {submitting ? "Enviando..." : "Enviar denúncia anônima"}
          </Text>
        </TouchableOpacity>

        <View style={styles.emergencyNotice}>
          <Ionicons name="warning-outline" size={17} color={C.danger} />
          <Text style={styles.emergencyNoticeText}>
            Em caso de emergência imediata, procure diretamente os serviços de
            emergência da sua região.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: typeof C) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  header: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    height: 60,
    ...S.shadow.sm,
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: colors.text },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  confirmationContent: {
    flexGrow: 1,
    alignItems: "center",
    padding: 24,
    paddingBottom: 50,
  },

  anonCard: {
    backgroundColor: colors.ecoLight,
    borderWidth: 1.5,
    borderColor: colors.eco,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  anonTitle: { fontSize: 14, fontWeight: "700", color: colors.eco, marginBottom: 3 },
  anonText: { fontSize: 12, color: colors.text2, lineHeight: 18 },

  label: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text3,
    letterSpacing: 0.5,
    marginBottom: 10,
    textTransform: "uppercase",
  },

  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  catBtn: {
    width: "47%",
    flexGrow: 1,
    backgroundColor: colors.surface2,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  catBtnSelected: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  catLabel: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    color: colors.text2,
  },

  locationStatusCard: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, marginTop: 8, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  locationStatusText: { flex: 1, fontSize: 12, lineHeight: 17, color: colors.text2 },

  miniMapWrap: { borderRadius: 12, overflow: "hidden" },
  miniMap: { height: 180 },

  textarea: {
    backgroundColor: colors.surface2,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 13,
    paddingBottom: 13,
    fontSize: 15,
    minHeight: 120,
  },

  photoUpload: {
    backgroundColor: colors.surface2,
    borderWidth: 2,
    borderColor: colors.border2,
    borderStyle: "dashed",
    borderRadius: 14,
    padding: 28,
    alignItems: "center",
    gap: 8,
  },
  photoTitle: { fontSize: 14, fontWeight: "600", color: colors.text2 },
  photoSub: { fontSize: 12, color: colors.text3 },
  photoSelectedRow: {
    backgroundColor: colors.ecoLight,
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  photoSelectedText: { fontSize: 13, color: colors.eco, fontWeight: "600" },

  photoOptionsOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  photoOptionsCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 20,
    ...S.shadow.lg,
  },
  photoOptionsHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  photoOptionsTitle: { fontSize: 19, fontWeight: "800", color: colors.text },
  photoOptionsSub: { fontSize: 13, color: colors.text3, marginTop: 4 },
  photoOptionsClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface2,
    justifyContent: "center",
    alignItems: "center",
  },
  photoOptionButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    borderRadius: 14,
    padding: 13,
    marginBottom: 10,
  },
  photoOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  photoOptionTextWrap: { flex: 1 },
  photoOptionTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  photoOptionSub: { fontSize: 12, color: colors.text3, marginTop: 3 },
  photoOptionsCancel: { alignItems: "center", paddingVertical: 12, marginTop: 2 },
  photoOptionsCancelText: { fontSize: 14, fontWeight: "700", color: colors.text2 },

  btnDanger: {
    backgroundColor: colors.danger,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...S.shadow.danger,
  },
  btnDangerText: { color: "white", fontSize: 15, fontWeight: "700" },

  submitFeedbackCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(217, 32, 32, 0.28)",
    backgroundColor: "rgba(217, 32, 32, 0.08)",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  submitFeedbackCopy: { flex: 1 },
  submitFeedbackTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: C.danger,
    marginBottom: 3,
  },
  submitFeedbackMessage: {
    fontSize: 12,
    lineHeight: 18,
    color: C.text2,
  },

  emergencyNotice: {
    marginTop: 14,
    paddingHorizontal: 4,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },
  emergencyNoticeText: {
    flex: 1,
    color: colors.danger,
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    fontWeight: "600",
  },

  confirmationIcon: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: colors.ecoLight,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 50,
    marginBottom: 22,
  },
  confirmationTitle: {
    fontSize: 25,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
  },
  confirmationText: {
    fontSize: 14,
    color: colors.text2,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 10,
    maxWidth: 360,
  },
  protocolCard: {
    width: "100%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    marginTop: 24,
  },
  protocolLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    color: colors.text3,
  },
  protocolValue: {
    fontSize: 24,
    fontWeight: "900",
    color: colors.primary,
    letterSpacing: 1,
    marginTop: 5,
  },
  protocolHint: {
    fontSize: 11,
    color: colors.text3,
    textAlign: "center",
    marginTop: 6,
  },
  confirmationNotice: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    backgroundColor: colors.ecoLight,
    borderRadius: 12,
    padding: 13,
    marginTop: 12,
  },
  confirmationNoticeText: {
    flex: 1,
    color: colors.text2,
    fontSize: 11,
    lineHeight: 17,
  },
  confirmationPrimary: {
    width: "100%",
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
  },
  confirmationPrimaryText: {
    color: "white",
    fontSize: 14,
    fontWeight: "800",
  },
  confirmationSecondary: {
    width: "100%",
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 4,
  },
  confirmationSecondaryText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700",
  },
});
