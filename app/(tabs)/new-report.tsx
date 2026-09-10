import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
} from "react-native";
import MapComponent from "../../components/map";
import { C, S } from "../../constants/theme";
import {
    getCurrentUserData,
  resolveUserLocationForSubmission,
} from "../../services/auth";
import { createReport } from "../../services/reports";
import {
    createSupabaseReport,
    isSupabaseConfigured,
} from "../../services/supabase";

const CATEGORIES = [
  { id: "buraco", icon: "construct" as const, label: "Buraco na rua" },
  { id: "poste", icon: "bulb" as const, label: "Poste/Iluminação" },
  { id: "vazamento", icon: "water" as const, label: "Vazamento" },
  { id: "bueiro", icon: "git-network" as const, label: "Bueiro" },
  { id: "mato", icon: "leaf" as const, label: "Mato alto" },
  { id: "calcada", icon: "walk" as const, label: "Calçada" },
  { id: "lixo", icon: "trash" as const, label: "Lixo irregular" },
  { id: "sinalizacao", icon: "car" as const, label: "Sinalização" },
  { id: "outro", icon: "ellipsis-horizontal" as const, label: "Outro" },
];

export default function NewReportScreen() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [photoOptionsVisible, setPhotoOptionsVisible] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    (async () => {
      const result = await resolveUserLocationForSubmission();
      if (result.location) {
        setUserLocation(result.location);
        setSelectedLocation((prev) => prev ?? result.location);
        setLocationError(null);
      } else {
        setLocationError(
          "Não foi possível obter sua localização. Verifique o GPS e tente novamente.",
        );
      }
    })();
  }, []);

  const reset = () => {
    setStep(1);
    setSelectedCat(null);
    setPhotoUri(null);
    setDescription("");
    setSubmitting(false);
    setPhotoOptionsVisible(false);
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
              setPhotoUri(reader.result);
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
              setPhotoUri(reader.result);
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

  const handleSubmit = async () => {
    if (!selectedCat) return;

    const locationToSubmit = selectedLocation ?? userLocation;

    if (!locationToSubmit) {
      Alert.alert(
        "Localização obrigatória",
        locationError ||
          "Não foi possível obter sua localização. Ative o GPS e tente novamente.",
      );
      return;
    }

    try {
      setSubmitting(true);
      const currentUser = await getCurrentUserData();
      const city = currentUser?.city || undefined;

      if (isSupabaseConfigured()) {
        if (!currentUser?.id) {
          Alert.alert("Autenticação necessária", "Faça login para enviar uma denúncia.");
          setSubmitting(false);
          return;
        }
        if (!((currentUser as any).city_id || currentUser?.city)) {
          Alert.alert(
            "Cidade não cadastrada",
            "Sua conta não possui uma cidade cadastrada. Volte ao início e selecione sua cidade.",
          );
          setSubmitting(false);
          return;
        }
      }
      const catObj = CATEGORIES.find((c) => c.id === selectedCat);
      const title = catObj ? catObj.label : selectedCat;

      if (isSupabaseConfigured()) {
        await createSupabaseReport({
          title,
          description: description || "Denúncia registrada pelo app.",
          latitude: locationToSubmit.latitude,
          longitude: locationToSubmit.longitude,
          category: selectedCat,
          severity: "medium",
          status: "pending",
          city,
          city_id: (currentUser as any)?.city_id ?? undefined,
          imageUri: photoUri,
        });
      } else {
        await createReport(undefined, {
          category: selectedCat,
          description,
          location: locationToSubmit,
          city,
        });
      }
      setStep(3);
    } catch (error: any) {
      let msg = error?.message || "Tente novamente mais tarde.";
      if (msg.includes("fora da área permitida")) {
        msg =
          "Você está fora da área de cobertura da sua cidade. Só é possível registrar denúncias dentro dos limites da cidade cadastrada.";
      } else if (
        msg.includes("sem cidade cadastrada") ||
        msg.includes("Usuário sem cidade")
      ) {
        msg =
          "Sua conta não possui uma cidade cadastrada. Volte ao início e selecione sua cidade.";
      }
      Alert.alert("Erro ao enviar denúncia", msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 3) {
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <View style={{ width: 36 }} />
          <Text style={styles.headerTitle}>Nova Denúncia</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.successScreen}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color={C.eco} />
          </View>
          <Text style={styles.successTitle}>Denúncia enviada!</Text>
          <Text style={styles.successSub}>
            Protocolo #ECO-2024-0847{"\n"}A prefeitura foi notificada.
          </Text>
          <TouchableOpacity
            style={[styles.btnPrimary, { marginTop: 32, width: "100%" }]}
            onPress={() => {
              reset();
              router.push("/map");
            }}
          >
            <Text style={styles.btnPrimaryText}>Voltar ao mapa</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (step === 2 ? setStep(1) : router.push("/map"))}
        >
          <Ionicons name="arrow-back" size={24} color={C.text2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nova Denúncia</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepRow}>
          {([1, 2, 3] as const).map((s, i) => (
            <React.Fragment key={s}>
              <View
                style={[
                  styles.stepCircle,
                  step > s
                    ? styles.stepDone
                    : step === s
                      ? styles.stepCurrent
                      : styles.stepPending,
                ]}
              >
                {step > s ? (
                  <Ionicons name="checkmark" size={14} color="white" />
                ) : (
                  <Text
                    style={[styles.stepNum, step >= s && { color: "white" }]}
                  >
                    {s}
                  </Text>
                )}
              </View>
              {i < 2 && (
                <View
                  style={[styles.stepLine, step > s && styles.stepLineDone]}
                />
              )}
            </React.Fragment>
          ))}
        </View>
        <View style={styles.stepLabels}>
          {["Categoria", "Detalhes", "Enviar"].map((l) => (
            <Text key={l} style={styles.stepLabel}>
              {l}
            </Text>
          ))}
        </View>

        {step === 1 && (
          <View>
            <Text style={styles.sectionTitle}>Tipo do problema</Text>
            <View style={styles.catGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.catBtn,
                    selectedCat === cat.id && styles.catBtnSelected,
                  ]}
                  onPress={() => setSelectedCat(cat.id)}
                >
                  <Ionicons
                    name={cat.icon}
                    size={28}
                    color={selectedCat === cat.id ? C.primary : C.primary}
                  />
                  <Text style={styles.catLabel}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[
                styles.btnPrimary,
                { marginTop: 24, opacity: selectedCat ? 1 : 0.45 },
              ]}
              onPress={() => {
                if (!selectedCat) {
                  Alert.alert(
                    "Atenção",
                    "Selecione o tipo de problema para continuar.",
                  );
                  return;
                }
                setStep(2);
              }}
            >
              <Text style={styles.btnPrimaryText}>Continuar</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={styles.label}>LOCALIZAÇÃO</Text>
            <View style={styles.miniMapWrap}>
              <MapComponent
                style={styles.miniMap}
                userLocation={userLocation}
                selectedLocation={selectedLocation}
                selectLocation={true}
                onSelectLocation={setSelectedLocation}
              />
            </View>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={18} color={C.primary} />
              <Text style={styles.locationText}>
                {selectedLocation
                  ? "Localização selecionada no mapa"
                  : "Sua localização atual · GPS ativo"}
              </Text>
              <Ionicons
                name="locate"
                size={18}
                color={C.eco}
                style={{ marginLeft: "auto" }}
              />
            </View>

            <Text style={[styles.label, { marginTop: 16 }]}>FOTO (OPCIONAL)</Text>
            {!photoUri ? (
              <TouchableOpacity
                style={styles.photoUpload}
                onPress={showPhotoOptions}
              >
                <Ionicons name="camera" size={36} color={C.primary} />
                <Text style={styles.photoTitle}>Adicionar foto</Text>
                <Text style={styles.photoSub}>Tirar foto ou escolher da galeria</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.photoSelectedRow}>
                <Image
                  source={{ uri: photoUri }}
                  style={{ width: 40, height: 40, borderRadius: 6, marginRight: 10 }}
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

            <Text style={[styles.label, { marginTop: 16 }]}>DESCRIÇÃO (OPCIONAL)</Text>
            <TextInput
              style={styles.textarea}
              placeholder="Descreva o problema com mais detalhes..."
              placeholderTextColor={C.text3}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.btnPrimary, { marginTop: 8, opacity: submitting ? 0.7 : 1 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Ionicons name="send" size={20} color="white" />
              <Text style={styles.btnPrimaryText}>
                {submitting ? "Enviando..." : "Enviar denúncia"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={photoOptionsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoOptionsVisible(false)}
      >
        <View style={styles.photoOptionsOverlay}>
          <View style={styles.photoOptionsCard}>
            <View style={styles.photoOptionsHeader}>
              <View>
                <Text style={styles.photoOptionsTitle}>Adicionar foto</Text>
                <Text style={styles.photoOptionsSub}>Como você quer adicionar a foto?</Text>
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
                <Text style={styles.photoOptionSub}>Abrir a câmera do celular</Text>
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
                <Text style={styles.photoOptionSub}>Selecionar uma foto existente</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    height: 60,
    ...S.shadow.sm,
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: C.text },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  stepRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  stepLabels: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  stepLabel: { fontSize: 11, fontWeight: "600", color: C.text3, flex: 1, textAlign: "center" },
  stepCircle: { width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  stepDone: { backgroundColor: C.primary },
  stepCurrent: { backgroundColor: C.primary, shadowColor: C.primaryLight, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 6, elevation: 4 },
  stepPending: { backgroundColor: C.border },
  stepNum: { fontSize: 12, fontWeight: "700", color: C.text3 },
  stepLine: { flex: 1, height: 2, backgroundColor: C.border, marginHorizontal: 6 },
  stepLineDone: { backgroundColor: C.primary },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: C.text, marginBottom: 14 },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  catBtn: { width: "30%", flexGrow: 1, backgroundColor: C.surface2, borderWidth: 1.5, borderColor: C.border, borderRadius: 14, padding: 14, alignItems: "center", gap: 6 },
  catBtnSelected: { backgroundColor: C.primaryLight, borderColor: C.primary },
  catLabel: { fontSize: 11, fontWeight: "600", textAlign: "center", color: C.text2 },
  label: { fontSize: 12, fontWeight: "600", color: C.text3, letterSpacing: 0.5, marginBottom: 6, textTransform: "uppercase" },
  miniMapWrap: { borderRadius: 12, overflow: "hidden", marginBottom: 8 },
  miniMap: { height: 180 },
  locationRow: { backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10, flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 0 },
  locationText: { fontSize: 13, color: C.text2, flex: 1 },
  photoUpload: { backgroundColor: C.surface2, borderWidth: 2, borderColor: C.border2, borderStyle: "dashed", borderRadius: 14, padding: 32, alignItems: "center", gap: 8 },
  photoTitle: { fontSize: 14, fontWeight: "600", color: C.text2 },
  photoSub: { fontSize: 12, color: C.text3 },
  photoSelectedRow: { backgroundColor: C.ecoLight, borderRadius: 10, padding: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  photoSelectedText: { fontSize: 13, color: C.eco, fontWeight: "600" },
  textarea: { backgroundColor: C.surface2, color: C.text, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingHorizontal: 16, paddingTop: 13, paddingBottom: 13, fontSize: 15, minHeight: 100 },
  btnPrimary: { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, ...S.shadow.sm },
  btnPrimaryText: { color: "white", fontSize: 15, fontWeight: "700" },
  photoOptionsOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", padding: 20 },
  photoOptionsCard: { width: "100%", maxWidth: 420, backgroundColor: C.surface, borderRadius: 18, padding: 20, ...S.shadow.lg },
  photoOptionsHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 },
  photoOptionsTitle: { fontSize: 19, fontWeight: "800", color: C.text },
  photoOptionsSub: { fontSize: 13, color: C.text3, marginTop: 4 },
  photoOptionsClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface2, justifyContent: "center", alignItems: "center" },
  photoOptionButton: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: C.border, backgroundColor: C.surface2, borderRadius: 14, padding: 13, marginBottom: 10 },
  photoOptionIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.primaryLight, justifyContent: "center", alignItems: "center", marginRight: 12 },
  photoOptionTextWrap: { flex: 1 },
  photoOptionTitle: { fontSize: 14, fontWeight: "700", color: C.text },
  photoOptionSub: { fontSize: 12, color: C.text3, marginTop: 3 },
  photoOptionsCancel: { alignItems: "center", paddingVertical: 12, marginTop: 2 },
  photoOptionsCancelText: { fontSize: 14, fontWeight: "700", color: C.text2 },
  successScreen: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  successIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.ecoLight, justifyContent: "center", alignItems: "center", marginBottom: 20 },
  successTitle: { fontSize: 22, fontWeight: "800", color: C.text, marginBottom: 8 },
  successSub: { fontSize: 14, color: C.text2, textAlign: "center", lineHeight: 22 },
});
