import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import MapComponent from '../../components/map';
import { C, S } from '../../constants/theme';
import { createSecurityReport } from '../../services/reports';

/* TODO: REQUIREMENTS GAPS
 - RF-01 Pino ajustável por toque não implementado: enable `selectLocation` on MapComponent and let user confirm.
 - RNF-01 Provide optional 'Report anonymously' toggle in UI (currently always anonymous in folder naming).
 - RNF-02 Improve geolocation accuracy/fallbacks for precise coordinates.
*/

const CLOUDINARY_CLOUD_NAME = 'dbtgw4ylr';
const CLOUDINARY_UPLOAD_PRESET = 'ecocidade_preset';

const SEC_CATS = [
  { id: 'crime',   icon: 'shield-checkmark' as const, label: 'Crime/Furto'       },
  { id: 'tumulto', icon: 'people'           as const, label: 'Tumulto'            },
  { id: 'perigo',  icon: 'warning'          as const, label: 'Situação perigosa'  },
  { id: 'outro',   icon: 'alert-circle'     as const, label: 'Outro'              },
];

export default function SecurityScreen() {
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // ── Selecionar foto da galeria ──
  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão negada', 'Precisamos de acesso à sua galeria para adicionar fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  // ── Upload anônimo no Cloudinary ──
  // Pasta separada e sem userId para manter anonimato
  const uploadPhoto = async (uri: string): Promise<string> => {
    const formData = new FormData();

    const filename = uri.split('/').pop() ?? 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('file', { uri, name: filename, type } as any);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    // Pasta anônima — sem userId para preservar identidade
    formData.append('folder', 'security_reports/anonymous');

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message ?? 'Falha no upload da imagem.');
    }

    const data = await response.json();
    return data.secure_url as string;
  };

  // ── Enviar denúncia anônima ──
  const handleSubmit = async () => {
    if (!selectedCat) {
      Alert.alert('Atenção', 'Selecione o tipo de ocorrência.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Atenção', 'Descreva a situação antes de enviar.');
      return;
    }

    setLoading(true);
    try {
      let photoURL: string | undefined = undefined;
      if (photoUri) {
        photoURL = await uploadPhoto(photoUri);
      }

      await createSecurityReport({
        category: selectedCat,
        description: description.trim(),
        location: {
          // Substitua pelos valores reais do GPS quando integrar localização
          latitude: -23.55052,
          longitude: -46.633308,
        },
        photoURL: photoURL ?? undefined,
      });

      Alert.alert(
        '✅ Enviado',
        'Denúncia anônima enviada com sucesso!\n\nApenas as autoridades competentes terão acesso. Sua identidade está protegida.',
        [{ text: 'OK', onPress: () => router.push('/map') }]
      );
    } catch (error: any) {
      Alert.alert('Erro', 'Não foi possível enviar a denúncia. Tente novamente.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const callEmergency = () => {
    Alert.alert(
      'Emergência',
      'Em caso de emergência real, ligue:\n\n🚓 190 — Polícia\n🚑 192 — SAMU\n🚒 193 — Bombeiros'
    );
  };

  return (
    <View style={styles.root}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/map')}>
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
          <Ionicons name="shield-checkmark" size={22} color={C.eco} style={{ flexShrink: 0 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.anonTitle}>100% Anônimo</Text>
            <Text style={styles.anonText}>
              Sua identidade nunca é registrada. Somente a prefeitura e autoridades
              competentes têm acesso a esta denúncia.
            </Text>
          </View>
        </View>

        {/* ── TIPO DE OCORRÊNCIA ── */}
        <Text style={styles.label}>TIPO DE OCORRÊNCIA</Text>
        <View style={styles.catGrid}>
          {SEC_CATS.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.catBtn, selectedCat === cat.id && styles.catBtnSelected]}
              onPress={() => setSelectedCat(cat.id)}
              disabled={loading}
            >
              <Ionicons name={cat.icon} size={28} color={C.primary} />
              <Text style={styles.catLabel}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── LOCALIZAÇÃO ── */}
        <Text style={[styles.label, { marginTop: 16 }]}>LOCALIZAÇÃO ATUAL</Text>
        <View style={styles.miniMapWrap}>
          <MapComponent style={styles.miniMap} />
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
          editable={!loading}
        />

        {/* ── FOTO ── */}
        <Text style={[styles.label, { marginTop: 16 }]}>FOTO (OPCIONAL)</Text>
        {!photoUri ? (
          <TouchableOpacity style={styles.photoUpload} onPress={handlePickPhoto} disabled={loading}>
            <Ionicons name="camera" size={36} color={C.primary} />
            <Text style={styles.photoTitle}>Adicionar evidência</Text>
            <Text style={styles.photoSub}>Apenas autoridades terão acesso</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.photoSelectedRow}>
            <Ionicons name="image" size={20} color={C.eco} />
            <Text style={styles.photoSelectedText}>Foto selecionada ✓</Text>
            <TouchableOpacity onPress={() => setPhotoUri(null)} style={{ marginLeft: 'auto' }} disabled={loading}>
              <Ionicons name="close" size={18} color={C.eco} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── BOTÕES ── */}
        <TouchableOpacity
          style={[styles.btnDanger, { marginTop: 24 }, loading && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <Text style={styles.btnDangerText}>Enviando...</Text>
          ) : (
            <>
              <Ionicons name="shield-checkmark" size={20} color="white" />
              <Text style={styles.btnDangerText}>Enviar denúncia anônima</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnEmergency} onPress={callEmergency} disabled={loading}>
          <Ionicons name="call" size={20} color={C.danger} />
          <Text style={styles.btnEmergencyText}>Emergência? Ligue 190</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: {
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, height: 60, ...S.shadow.sm,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.text },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },

  anonCard: {
    backgroundColor: C.ecoLight, borderWidth: 1.5, borderColor: C.eco,
    borderRadius: 14, padding: 14, marginBottom: 20,
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
  },
  anonTitle: { fontSize: 14, fontWeight: '700', color: C.eco, marginBottom: 3 },
  anonText:  { fontSize: 12, color: C.text2, lineHeight: 18 },

  label: {
    fontSize: 12, fontWeight: '600', color: C.text3,
    letterSpacing: 0.5, marginBottom: 10, textTransform: 'uppercase',
  },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catBtn: {
    width: '47%', flexGrow: 1,
    backgroundColor: C.surface2, borderWidth: 1.5, borderColor: C.border,
    borderRadius: 14, padding: 14, alignItems: 'center', gap: 6,
  },
  catBtnSelected: { backgroundColor: C.primaryLight, borderColor: C.primary },
  catLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center', color: C.text2 },

  miniMapWrap: { borderRadius: 12, overflow: 'hidden' },
  miniMap:     { height: 180 },

  textarea: {
    backgroundColor: C.surface2, color: C.text,
    borderWidth: 1.5, borderColor: C.border, borderRadius: 12,
    paddingHorizontal: 16, paddingTop: 13, paddingBottom: 13,
    fontSize: 15, minHeight: 120,
  },

  photoUpload: {
    backgroundColor: C.surface2, borderWidth: 2, borderColor: C.border2,
    borderStyle: 'dashed', borderRadius: 14, padding: 28,
    alignItems: 'center', gap: 8,
  },
  photoTitle: { fontSize: 14, fontWeight: '600', color: C.text2 },
  photoSub:   { fontSize: 12, color: C.text3 },
  photoSelectedRow: {
    backgroundColor: C.ecoLight, borderRadius: 10, padding: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  photoSelectedText: { fontSize: 13, color: C.eco, fontWeight: '600' },

  btnDanger: {
    backgroundColor: C.danger, borderRadius: 12,
    paddingVertical: 14, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8, ...S.shadow.danger,
  },
  btnDangerText: { color: 'white', fontSize: 15, fontWeight: '700' },

  btnEmergency: {
    borderWidth: 1.5, borderColor: C.danger, borderRadius: 12,
    paddingVertical: 13, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12,
  },
  btnEmergencyText: { color: C.danger, fontSize: 15, fontWeight: '600' },
});