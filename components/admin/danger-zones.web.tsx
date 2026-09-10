import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { C } from '../../constants/theme';
import { createDangerZone, deleteDangerZone, getDangerZones } from '../../services/reports';
import MapComponent from '../map.web';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';

const SEVERITY_OPTIONS = [
  { label: 'Baixa', value: 'baixa' },
  { label: 'Media', value: 'media' },
  { label: 'Alta', value: 'alta' },
];

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'alta':
      return C.danger;
    case 'media':
      return C.warning;
    default:
      return C.eco;
  }
};

export default function DangerZonesWeb() {
  const router = useRouter();
  const [dangerZones, setDangerZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [zoneName, setZoneName] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'baixa' | 'media' | 'alta'>('media');
  const [radius, setRadius] = useState(300);

  useEffect(() => {
    loadDangerZones();
  }, []);

  const loadDangerZones = async () => {
    try {
      setLoading(true);
      const zones = await getDangerZones();
      setDangerZones(zones);
    } catch (error) {
      console.error('Erro ao carregar zonas de perigo:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateZone = async () => {
    if (!selectedLocation || !zoneName.trim()) return;

    try {
      const newZone = await createDangerZone({
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        radius,
        name: zoneName.trim(),
        description,
        severity,
      });
      setDangerZones((prev) => [...prev, newZone]);
      setSelectedLocation(null);
      setZoneName('');
      setDescription('');
      setSeverity('media');
      setRadius(300);
    } catch (error) {
      console.error('Erro ao salvar zona:', error);
      alert('Não foi possível salvar a zona de perigo.');
    }
  };

  const handleDeleteZone = async (id: string) => {
    try {
      await deleteDangerZone(id);
      setDangerZones((prev) => prev.filter((zone) => zone.id !== id));
    } catch (error) {
      console.error('Erro ao excluir zona de perigo:', error);
      alert('Não foi possível excluir a zona de perigo.');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="chevron-left" size={24} color={C.primary} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Areas de Perigo</ThemedText>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.mapWrapper}>
          <MapComponent
            reports={[]}
            zones={dangerZones}
            selectedLocation={selectedLocation}
            selectLocation
            onSelectLocation={setSelectedLocation}
            style={styles.map}
          />
        </View>

        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="information" size={18} color={C.primary} />
          <ThemedText style={styles.infoText}>Clique no mapa para escolher a localizacao da nova zona.</ThemedText>
        </View>

        <View style={styles.formCard}>
          <ThemedText style={styles.sectionTitle}>Nova Zona de Perigo</ThemedText>
          <TextInput
            value={zoneName}
            onChangeText={setZoneName}
            placeholder="Nome da zona"
            placeholderTextColor={C.text2}
            style={styles.input}
          />
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Descricao"
            placeholderTextColor={C.text2}
            style={[styles.input, styles.textArea]}
            multiline
          />
          <View style={styles.row}>{
            SEVERITY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => setSeverity(option.value as 'baixa' | 'media' | 'alta')}
                style={[
                  styles.severityButton,
                  severity === option.value && { backgroundColor: getSeverityColor(option.value) },
                ]}
              >
                <ThemedText style={[styles.severityButtonText, severity === option.value && { color: '#fff' }]}>
                  {option.label}
                </ThemedText>
              </TouchableOpacity>
            ))
          }</View>
          <View style={styles.radiusRow}>
            <TouchableOpacity onPress={() => setRadius((r) => Math.max(100, r - 100))} style={styles.radiusButton}>
              <MaterialCommunityIcons name="minus" size={18} color={C.text} />
            </TouchableOpacity>
            <ThemedText style={styles.radiusValue}>{radius}m</ThemedText>
            <TouchableOpacity onPress={() => setRadius((r) => Math.min(2000, r + 100))} style={styles.radiusButton}>
              <MaterialCommunityIcons name="plus" size={18} color={C.text} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={handleCreateZone} style={styles.createButton}>
            <ThemedText style={styles.createButtonText}>Salvar Zona</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.zonesList}>
          <ThemedText style={styles.sectionTitle}>Zonas cadastradas</ThemedText>
          {dangerZones.length === 0 ? (
            <ThemedText style={styles.emptyText}>Nenhuma zona cadastrada ainda.</ThemedText>
          ) : (
            dangerZones.map((zone) => (
              <View key={zone.id} style={styles.zoneCard}>
                <View>
                  <ThemedText style={styles.zoneTitle}>{zone.name}</ThemedText>
                  <ThemedText style={styles.zoneDescription}>{zone.description || 'Sem descricao'}</ThemedText>
                  <ThemedText style={styles.zoneMeta}>Raio: {zone.radius}m - Severidade: {zone.severity}</ThemedText>
                </View>
                <TouchableOpacity onPress={() => handleDeleteZone(zone.id)}>
                  <MaterialCommunityIcons name="delete-outline" size={22} color={C.danger} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: C.text },
  headerPlaceholder: { width: 24 },
  content: { flex: 1 },
  mapWrapper: { height: 420, borderRadius: 18, overflow: 'hidden', marginBottom: 18, backgroundColor: C.surface2 },
  map: { width: '100%', height: '100%' },
  infoCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, backgroundColor: C.surface, marginBottom: 18 },
  infoText: { marginLeft: 10, color: C.text2, fontSize: 13, lineHeight: 18 },
  formCard: { padding: 18, borderRadius: 18, backgroundColor: C.surface2, marginBottom: 18 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 12 },
  input: { backgroundColor: C.surface, borderRadius: 12, padding: 12, marginBottom: 12, color: C.text, borderWidth: 1, borderColor: C.border },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  severityButton: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  severityButtonText: { color: C.text, fontWeight: '700' },
  radiusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  radiusButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  radiusValue: { fontSize: 14, color: C.text, fontWeight: '700' },
  createButton: { backgroundColor: C.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  createButtonText: { color: '#fff', fontWeight: '700' },
  zonesList: { padding: 18, borderRadius: 18, backgroundColor: C.surface2, marginBottom: 18 },
  emptyText: { color: C.text2, fontSize: 13 },
  zoneCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  zoneTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  zoneDescription: { fontSize: 12, color: C.text2, marginVertical: 4 },
  zoneMeta: { fontSize: 11, color: C.text3 },
});
