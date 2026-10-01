import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
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
  const [submittedReport, setSubmittedReport] = useState<any | null>(null);
  const [cropPhotoUri, setCropPhotoUri] = useState<string | null>(null);

  const router = useRouter();

  // Ao voltar para a tela de segurança, a confirmação anterior não deve permanecer.
  // A confirmação só é válida para a denúncia que acabou de ser enviada.
  useFocusEffect(
    useCallback(() => {
      setSubmittedReport(null);
    }, []),
  );

  useEffect(() => {
    (async () => {
      const result = await resolveUserLocationForSubmission();
      if (result.location) {
        setUserLocation(result.location);
        setSelectedLocation((prev) => prev ?? result.location);
        setLocationError(null);
      } else {
        setLocationError(
          "Não foi possível obter sua localização GPS. Verifique o GPS e tente novamente.",
        );
      }
    })();
  }, []);

  const submit = async () => {
    if (!selectedCat) {
      Alert.alert("Atenção", "Selecione o tipo de ocorrência.");
      return;
    }
    if (!description.trim()) {
      Alert.alert(
        "Descrição obrigatória",
        "Descreva a situação para que as autoridades possam agir adequadamente.",
      );
      return;
    }
    const locationToSubmit = selectedLocation ?? userLocation;

    if (!locationToSubmit) {
      Alert.alert(
        "Localização obrigatória",
        locationError ||
          "Não foi possível obter sua localização GPS. Ative o GPS e tente novamente.",
      );
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

      setSubmittedReport(createdReport);
    } catch (error: any) {
      let msg = error?.message || "Tente novamente mais tarde.";
      if (msg.includes("fora da área permitida")) {
        msg =
          "Você está fora da área de cobertura da sua cidade. Denúncias de segurança devem ser feitas dentro dos limites da cidade cadastrada.";
      }
      Alert.alert("Erro ao enviar denúncia", msg);
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
        Alert.alert(
          "Funcionalidade não disponível",
          "Tirar foto não é suportado no web. Use a galeria.",
        );
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
      handlePickPhoto();
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

        {/* ── BOTÕES ── */}
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
