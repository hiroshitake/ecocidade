import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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
import { getCurrentUserData } from '../../services/auth';
import { createReport } from '../../services/reports';

/* TODO: REQUIREMENTS GAPS
 - RF-02 Vídeo e drag-drop não suportados; considerar `expo-av` e validação de tipos.
 - RF-03 Mostrar limite de caracteres visível e contador no campo de descrição.
 - RNF-02 Validacao inline (erros por campo) em vez de apenas Alerts.
 - RNF-01 Performance: implementar compressão/resize antes do upload para cumprir 5s.
*/

const CATEGORIES = [
  { id: 'buraco',      icon: 'construct'           as const, label: 'Buraco na rua'    },
  { id: 'poste',       icon: 'bulb'                as const, label: 'Poste/Iluminação'  },
  { id: 'vazamento',   icon: 'water'               as const, label: 'Vazamento'         },
  { id: 'bueiro',      icon: 'git-network'         as const, label: 'Bueiro'            },
  { id: 'mato',        icon: 'leaf'                as const, label: 'Mato alto'         },
  { id: 'calcada',     icon: 'walk'                as const, label: 'Calçada'           },
  { id: 'lixo',        icon: 'trash'               as const, label: 'Lixo irregular'    },
  { id: 'sinalizacao', icon: 'car'                 as const, label: 'Sinalização'       },
  { id: 'outro',       icon: 'ellipsis-horizontal' as const, label: 'Outro'             },
];

export default function NewReportScreen() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [protocol, setProtocol] = useState('');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [addressQuery, setAddressQuery] = useState('');
  const [selectedAddress, setSelectedAddress] = useState('');
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const router = useRouter();

  const reset = () => {
    setStep(1);
    setSelectedCat(null);
    setPhotoUri(null);
    setDescription('');
    setLoading(false);
    setProtocol('');
    setAddressQuery('');
    setSelectedAddress('');
    setSelectedLocation(null);
    setSuggestions([]);
    setShowSuggestions(false);
    setAddressError('');
  };

  // ── Selecionar ou capturar foto ──
  const handlePickPhoto = async (source: 'library' | 'camera' = 'library') => {
    if (source === 'library') {
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
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão negada', 'Precisamos de acesso à câmera para tirar fotos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handlePhotoOptions = () => {
    Alert.alert('Adicionar foto', 'Escolha uma opção', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Galeria', onPress: () => handlePickPhoto('library') },
      { text: 'Câmera', onPress: () => handlePickPhoto('camera') },
    ]);
  };

  const loadUserLocation = async () => {
    setLocationLoading(true);
    setLocationError('');

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Permissão de localização negada. Ative o GPS no aparelho.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setUserLocation(coords);
      if (!selectedLocation) {
        setSelectedLocation(coords);
      }
    } catch (error) {
      console.error('Erro ao obter localização:', error);
      setLocationError('Não foi possível obter sua localização.');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleAddressSearch = async () => {
    if (!addressQuery.trim()) {
      setAddressError('Digite um endereço para buscar.');
      setShowSuggestions(false);
      return;
    }

    setAddressLoading(true);
    setAddressError('');

    try {
      const results = await Location.geocodeAsync(addressQuery.trim());
      if (!results.length) {
        setAddressError('Endereço não encontrado. Tente outro.');
        return;
      }

      const { latitude, longitude } = results[0];
      if (latitude == null || longitude == null) {
        setAddressError('Não foi possível encontrar as coordenadas deste endereço.');
        return;
      }

      setSelectedLocation({ latitude, longitude });
      setSelectedAddress(addressQuery.trim());
    } catch (error) {
      console.error('Erro ao buscar endereço:', error);
      setAddressError('Erro ao buscar o endereço. Verifique a escrita e tente novamente.');
    } finally {
      setAddressLoading(false);
    }
  };

  const PLACES_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
  const [placesSessionToken, setPlacesSessionToken] = useState<string | null>(null);

  const generateSessionToken = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;

  const fetchPlaceSuggestions = async (input: string) => {
    if (!input.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setSuggestionsLoading(true);
    try {
      // Ensure a session token exists for billing/session grouping
      if (!placesSessionToken) setPlacesSessionToken(generateSessionToken());
      const token = placesSessionToken || generateSessionToken();

      if (PLACES_KEY) {
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${PLACES_KEY}&components=country:br&types=geocode&sessiontoken=${token}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.status === 'OK') {
          setSuggestions(data.predictions || []);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } else {
        // No proxy and no Google key: use free Nominatim (OpenStreetMap) for autocomplete
        try {
          const q = encodeURIComponent(input.trim());
          const nomUrl = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&addressdetails=1&limit=6`;
          const res = await fetch(nomUrl, { headers: { 'User-Agent': 'ECOcidadeApp/1.0 (contact@example.com)' } });
          const data = await res.json();
          // Normalize Nominatim results to the same shape used in suggestions
          const preds = (data || []).map((item: any) => ({
            place_id: item.osm_id ? String(item.osm_id) : undefined,
            description: item.display_name,
            lat: item.lat,
            lon: item.lon,
            raw: item,
          }));
          setSuggestions(preds);
          setShowSuggestions(preds.length > 0);
        } catch (err) {
          console.error('Nominatim autocomplete error:', err);
          setSuggestions([]);
          setShowSuggestions(false);
        }
      }
    } catch (error) {
      console.error('Places autocomplete error:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const fetchPlaceDetails = async (placeId: string, description: string) => {
    try {
      const token = placesSessionToken || '';
      if (!PLACES_KEY) return null;
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${PLACES_KEY}&fields=geometry,formatted_address&sessiontoken=${token}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'OK' && data.result && data.result.geometry) {
        const loc = data.result.geometry.location;
        return { latitude: loc.lat, longitude: loc.lng, address: data.result.formatted_address || description };
      }
      return null;
    } catch (error) {
      console.error('Place details error:', error);
      return null;
    }
  };

  // Debounce suggestions when user types
  useEffect(() => {
    if (!addressQuery.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    // @ts-ignore
    debounceRef.current = setTimeout(() => fetchPlaceSuggestions(addressQuery), 300) as unknown as number;
    return () => { if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; } };
  }, [addressQuery]);

  useEffect(() => {
    loadUserLocation();
  }, []);

  // ── Enviar denúncia ao backend ──
  const handleSubmit = async () => {
    const user = await getCurrentUserData();
    if (!user?.id) {
      Alert.alert('Erro', 'Você precisa estar logado para enviar uma denúncia.');
      return;
    }

    if (!selectedLocation) {
      Alert.alert('Erro', 'Não foi possível obter sua localização. Selecione um ponto no mapa.');
      return;
    }

    setLoading(true);
    try {
      const reportId = await createReport(user.id, {
        category: selectedCat!,
        description,
        location: {
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
          address: selectedAddress || 'Localização selecionada',
        },
        photoPath: photoUri ?? undefined,
      });

      // Guarda o protocolo gerado para mostrar na tela de sucesso
      setProtocol(reportId);
      setStep(3);
    } catch (error: any) {
      Alert.alert('Erro', 'Não foi possível enviar a denúncia. Tente novamente.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ── STEP 3: Sucesso ──
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
            Protocolo #{protocol.slice(0, 8).toUpperCase()}{'\n'}A prefeitura foi notificada.
          </Text>
          <TouchableOpacity
            style={[styles.btnPrimary, { marginTop: 32, width: '100%' }]}
            onPress={() => { reset(); router.push('/map'); }}
          >
            <Text style={styles.btnPrimaryText}>Voltar ao mapa</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnOutline, { marginTop: 12, width: '100%' }]}
            onPress={() => { reset(); }}
          >
            <Text style={styles.btnOutlineText}>Nova denúncia</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step === 2 ? setStep(1) : router.push('/map')}>
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
        {/* ── STEP INDICATOR ── */}
        <View style={styles.stepRow}>
          {([1, 2, 3] as const).map((s, i) => (
            <React.Fragment key={s}>
              <View style={[
                styles.stepCircle,
                step > s ? styles.stepDone : step === s ? styles.stepCurrent : styles.stepPending,
              ]}>
                {step > s
                  ? <Ionicons name="checkmark" size={14} color="white" />
                  : <Text style={[styles.stepNum, step >= s && { color: 'white' }]}>{s}</Text>
                }
              </View>
              {i < 2 && (
                <View style={[styles.stepLine, step > s && styles.stepLineDone]} />
              )}
            </React.Fragment>
          ))}
        </View>
        <View style={styles.stepLabels}>
          {['Categoria', 'Detalhes', 'Enviar'].map(l => (
            <Text key={l} style={styles.stepLabel}>{l}</Text>
          ))}
        </View>

        {/* ── STEP 1: Categoria ── */}
        {step === 1 && (
          <View>
            <Text style={styles.sectionTitle}>Tipo do problema</Text>
            <View style={styles.catGrid}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catBtn, selectedCat === cat.id && styles.catBtnSelected]}
                  onPress={() => setSelectedCat(cat.id)}
                >
                  <Ionicons name={cat.icon} size={28} color={C.primary} />
                  <Text style={styles.catLabel}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.btnPrimary, { marginTop: 24, opacity: selectedCat ? 1 : 0.45 }]}
              onPress={() => { if (selectedCat) setStep(2); }}
              disabled={!selectedCat}
            >
              <Text style={styles.btnPrimaryText}>Continuar</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP 2: Detalhes ── */}
        {step === 2 && (
          <View>
            <Text style={styles.label}>BUSCAR ENDEREÇO</Text>
            <View style={styles.addressSearchRow}>
              <TextInput
                value={addressQuery}
                onChangeText={setAddressQuery}
                placeholder="Rua, bairro ou ponto de referência"
                placeholderTextColor={C.text3}
                style={styles.addressInput}
              />
                {/* Suggestions list (Google Places) */}
                {showSuggestions && suggestions.length > 0 && (
                  <View style={styles.suggestionList}>
                    {suggestions.map(s => (
                      <TouchableOpacity
                        key={s.place_id || s.raw?.osm_id || `${s.lat}-${s.lon}`}
                        style={styles.suggestionItem}
                        onPress={async () => {
                          setAddressQuery(s.description);
                          setShowSuggestions(false);
                          setAddressError('');
                          // If suggestion comes from Google (has place_id) use details, otherwise use lat/lon from Nominatim
                          if (s.place_id && PLACES_KEY) {
                            const details = await fetchPlaceDetails(s.place_id, s.description);
                            if (details) {
                              setSelectedLocation({ latitude: details.latitude, longitude: details.longitude });
                              setSelectedAddress(details.address || s.description);
                            } else {
                              setAddressQuery(s.description);
                            }
                          } else if (s.lat && s.lon) {
                            setSelectedLocation({ latitude: Number(s.lat), longitude: Number(s.lon) });
                            setSelectedAddress(s.description || s.raw?.display_name || 'Local selecionado');
                          } else {
                            setAddressQuery(s.description);
                          }
                          setPlacesSessionToken(null);
                        }}
                      >
                        <Text style={styles.suggestionText}>{s.description}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              <TouchableOpacity
                style={[styles.addressBtn, addressLoading && { opacity: 0.6 }]}
                onPress={handleAddressSearch}
                disabled={addressLoading}
              >
                <Text style={styles.addressBtnText}>{addressLoading ? 'Buscando' : 'Buscar'}</Text>
              </TouchableOpacity>
            </View>
            {addressError ? <Text style={styles.locationError}>{addressError}</Text> : null}
            <Text style={styles.label}>LOCALIZAÇÃO</Text>
            <View style={styles.miniMapWrap}>
              <MapComponent
                style={styles.miniMap}
                userLocation={userLocation}
                selectedLocation={selectedLocation}
                selectLocation
                onSelectLocation={setSelectedLocation}
              />
            </View>
            <Text style={styles.mapHint}>Toque no mapa ou busque um endereço para posicionar a denúncia.</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={18} color={C.primary} />
              <Text style={styles.locationText}>
                {locationLoading
                  ? 'Buscando localização...'
                  : userLocation
                    ? 'Sua localização atual · GPS ativo'
                    : 'GPS indisponível. Ative o localizador.'}
              </Text>
              <TouchableOpacity onPress={loadUserLocation} disabled={locationLoading}>
                <Ionicons name="locate" size={18} color={C.eco} />
              </TouchableOpacity>
            </View>
            {locationError ? (
              <Text style={styles.locationError}>{locationError}</Text>
            ) : null}

            {/* Foto */}
            <Text style={[styles.label, { marginTop: 16 }]}>FOTO (OPCIONAL)</Text>
            {!photoUri ? (
              <TouchableOpacity style={styles.photoUpload} onPress={handlePhotoOptions}>
                <Ionicons name="camera" size={36} color={C.primary} />
                <Text style={styles.photoTitle}>Adicionar foto</Text>
                <Text style={styles.photoSub}>Câmera ou galeria</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.photoSelectedRow}>
                <Ionicons name="image" size={20} color={C.eco} />
                <Text style={styles.photoSelectedText}>Foto selecionada ✓</Text>
                <TouchableOpacity onPress={() => setPhotoUri(null)} style={{ marginLeft: 'auto' }}>
                  <Ionicons name="close" size={18} color={C.eco} />
                </TouchableOpacity>
              </View>
            )}

            {/* Descrição */}
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
              editable={!loading}
            />

            <TouchableOpacity
              style={[styles.btnPrimary, { marginTop: 8 }, loading && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <Text style={styles.btnPrimaryText}>Enviando...</Text>
              ) : (
                <>
                  <Ionicons name="send" size={20} color="white" />
                  <Text style={styles.btnPrimaryText}>Enviar denúncia</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
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

  // Step indicator
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  stepLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  stepLabel: { fontSize: 11, fontWeight: '600', color: C.text3, flex: 1, textAlign: 'center' },
  stepCircle: {
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  stepDone:    { backgroundColor: C.primary },
  stepCurrent: { backgroundColor: C.primary, shadowColor: C.primaryLight, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 6, elevation: 4 },
  stepPending: { backgroundColor: C.border },
  stepNum:     { fontSize: 12, fontWeight: '700', color: C.text3 },
  stepLine:    { flex: 1, height: 2, backgroundColor: C.border, marginHorizontal: 6 },
  stepLineDone:{ backgroundColor: C.primary },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 14 },

  // Category grid
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catBtn: {
    width: '30%', flexGrow: 1,
    backgroundColor: C.surface2, borderWidth: 1.5, borderColor: C.border,
    borderRadius: 14, padding: 14, alignItems: 'center', gap: 6,
  },
  catBtnSelected: { backgroundColor: C.primaryLight, borderColor: C.primary },
  catLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center', color: C.text2 },

  label: { fontSize: 12, fontWeight: '600', color: C.text3, letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' },

  // Mini map
  miniMapWrap: { borderRadius: 12, overflow: 'hidden', marginBottom: 8 },
  miniMap: { height: 180 },
  addressSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  addressInput: {
    flex: 1,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: C.text,
    fontSize: 14,
  },
  addressBtn: {
    backgroundColor: C.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  addressBtnText: { color: 'white', fontWeight: '700', fontSize: 13 },
  suggestionList: {
    position: 'absolute',
    top: 54,
    left: 0,
    right: 100,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    zIndex: 30,
    maxHeight: 220,
  },
  suggestionItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)'
  },
  suggestionText: { color: C.text, fontSize: 14 },
  mapHint: { fontSize: 12, color: C.text3, marginBottom: 12 },

  locationRow: {
    backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 0,
  },
  locationText: { fontSize: 13, color: C.text2, flex: 1 },
  locationError: { color: C.danger || '#d32f2f', fontSize: 12, marginTop: 8 },

  // Photo
  photoUpload: {
    backgroundColor: C.surface2, borderWidth: 2, borderColor: C.border2,
    borderStyle: 'dashed', borderRadius: 14, padding: 32,
    alignItems: 'center', gap: 8,
  },
  photoTitle: { fontSize: 14, fontWeight: '600', color: C.text2 },
  photoSub:   { fontSize: 12, color: C.text3 },
  photoSelectedRow: {
    backgroundColor: C.ecoLight, borderRadius: 10, padding: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  photoSelectedText: { fontSize: 13, color: C.eco, fontWeight: '600' },

  // Textarea
  textarea: {
    backgroundColor: C.surface2, color: C.text,
    borderWidth: 1.5, borderColor: C.border, borderRadius: 12,
    paddingHorizontal: 16, paddingTop: 13, paddingBottom: 13,
    fontSize: 15, minHeight: 100,
  },

  btnPrimary: {
    backgroundColor: C.primary, borderRadius: 12,
    paddingVertical: 14, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8, ...S.shadow.sm,
  },
  btnPrimaryText: { color: 'white', fontSize: 15, fontWeight: '700' },

  btnOutline: {
    borderWidth: 1.5, borderColor: C.primary, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center', justifyContent: 'center',
  },
  btnOutlineText: { color: C.primary, fontSize: 15, fontWeight: '600' },

  // Success
  successScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  successIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: C.ecoLight, justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  successTitle: { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 8 },
  successSub:   { fontSize: 14, color: C.text2, textAlign: 'center', lineHeight: 22 },
});
