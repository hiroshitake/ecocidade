import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { Alert, FlatList, Modal, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { C } from '../../constants/theme';
import { resolveUserLocationWithFallback } from '../../services/auth';
import { createDangerZone, deleteDangerZone, getDangerZones } from '../../services/reports';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';

let MapView: any, Circle: any, Marker: any;
if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Circle = maps.Circle;
  Marker = maps.Marker;
}

interface DangerZone {
  id: string;
  latitude: number;
  longitude: number;
  radius: number;
  name: string;
  description: string;
  severity: 'baixa' | 'media' | 'alta';
}

export default function DangerZonesScreen() {
  const [dangerZones, setDangerZones] = useState<DangerZone[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [zoneName, setZoneName] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'baixa' | 'media' | 'alta'>('media');
  const [radius, setRadius] = useState(500);
  const mapRef = useRef<any>(null);
  const router = useRouter();

  const loadDangerZones = useCallback(async () => {
    try {
      const zones = (await getDangerZones()) as DangerZone[];
      setDangerZones(zones);
    } catch (error) {
      console.error('Erro ao carregar zonas de perigo:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDangerZones();
      resolveUserLocationWithFallback()
        .then(({ location }) => {
          if (location) setUserLocation(location);
        })
        .catch(() => {});
    }, [loadDangerZones])
  );

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'baixa': return C.eco;
      case 'media': return C.warning;
      case 'alta': return C.danger;
      default: return C.text3;
    }
  };

  const handleMapPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });
    setShowModal(true);
  };

  const handleCreateZone = async () => {
    if (!selectedLocation || !zoneName.trim()) {
      Alert.alert('Erro', 'Por favor, preencha o nome da zona');
      return;
    }
    try {
      const newZone = await createDangerZone({ latitude: selectedLocation.latitude, longitude: selectedLocation.longitude, radius, name: zoneName.trim(), description, severity });
      setDangerZones((prev) => [...prev, newZone]);
      Alert.alert('Sucesso', 'Área de perigo criada com sucesso!');
      resetForm();
    } catch (error) {
      console.error('Erro ao criar zona de perigo:', error);
      Alert.alert('Erro', 'Não foi possível criar essa área de perigo.');
    }
  };

  const resetForm = () => {
    setShowModal(false);
    setSelectedLocation(null);
    setZoneName('');
    setDescription('');
    setSeverity('media');
    setRadius(500);
  };

  const handleDeleteZone = (id: string) => {
    Alert.alert('Confirmar', 'Deseja deletar esta área de perigo?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Deletar', style: 'destructive', onPress: async () => {
        try {
          await deleteDangerZone(id);
          setDangerZones((prev) => prev.filter(z => z.id !== id));
          Alert.alert('Sucesso', 'Área de perigo removida!');
        } catch (error) {
          console.error('Erro ao excluir zona de perigo:', error);
          Alert.alert('Erro', 'Não foi possível excluir essa área de perigo.');
        }
      } },
    ]);
  };

  const renderZoneItem = ({ item }: { item: DangerZone }) => (
    <View style={[styles.zoneItem, { borderLeftColor: getSeverityColor(item.severity) }]}>
      <View style={styles.zoneInfo}>
        <View style={styles.zoneHeader}>
          <ThemedText style={styles.zoneName}>{item.name}</ThemedText>
          <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(item.severity) + '20' }]}>
            <ThemedText style={[styles.severityText, { color: getSeverityColor(item.severity) }]}>{item.severity.toUpperCase()}</ThemedText>
          </View>
        </View>
        <ThemedText style={styles.zoneDescription} numberOfLines={2}>{item.description || 'Sem descrição'}</ThemedText>
        <ThemedText style={styles.zoneRadius}>Raio: {item.radius}m</ThemedText>
      </View>
      <TouchableOpacity onPress={() => handleDeleteZone(item.id)}>
        <MaterialCommunityIcons name="delete-outline" size={20} color={C.danger} />
      </TouchableOpacity>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><MaterialCommunityIcons name="chevron-left" size={24} color={C.primary} /></TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Áreas de Perigo</ThemedText>
        <View style={styles.headerPlaceholder} />
      </View>

      {Platform.OS !== 'web' && MapView ? (
        <>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{ latitude: userLocation?.latitude ?? -23.5505, longitude: userLocation?.longitude ?? -46.6333, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
            onPress={handleMapPress}
          >
            {userLocation ? <Marker key="user-location" coordinate={userLocation} title="Você está aqui" /> : null}
            {dangerZones.map(zone => (
              <React.Fragment key={zone.id}>
                <Circle center={{ latitude: zone.latitude, longitude: zone.longitude }} radius={zone.radius} strokeColor={getSeverityColor(zone.severity)} fillColor={getSeverityColor(zone.severity) + '30'} strokeWidth={2} />
                <Marker coordinate={{ latitude: zone.latitude, longitude: zone.longitude }} title={zone.name} description={zone.description}>
                  <View style={[styles.markerIcon, { backgroundColor: getSeverityColor(zone.severity) }]}>
                    <MaterialCommunityIcons name="alert-octagon" size={20} color="#fff" />
                  </View>
                </Marker>
              </React.Fragment>
            ))}
            {selectedLocation ? <Marker coordinate={selectedLocation} title="Nova Área" pinColor={C.primary} /> : null}
          </MapView>
          <View style={styles.infoBadge}>
            <MaterialCommunityIcons name="information" size={18} color={C.primary} />
            <ThemedText style={styles.infoBadgeText}>Mapa centralizado na sua localização. Clique no mapa para criar uma área</ThemedText>
          </View>
        </>
      ) : (
        <View style={styles.mapPlaceholder}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={C.text3} />
          <ThemedText style={styles.mapPlaceholderText}>Mapa disponível apenas em mobile</ThemedText>
        </View>
      )}

      <View style={styles.zonesList}>
        <ThemedText style={styles.zonesTitle}>Áreas de Perigo ({dangerZones.length})</ThemedText>
        <FlatList data={dangerZones} renderItem={renderZoneItem} keyExtractor={item => item.id} scrollEnabled={false} ListEmptyComponent={<View style={styles.emptyContainer}><MaterialCommunityIcons name="map-search" size={40} color={C.text3} /><ThemedText style={styles.emptyText}>Nenhuma área de perigo registrada</ThemedText></View>} />
      </View>

      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Nova Área de Perigo</ThemedText>
              <TouchableOpacity onPress={resetForm}><MaterialCommunityIcons name="close" size={24} color={C.text} /></TouchableOpacity>
            </View>
            <View style={styles.form}>
              <ThemedText style={styles.label}>Nome da Área</ThemedText>
              <TextInput style={styles.input} placeholder="Ex: Rua das Flores" placeholderTextColor={C.text3} value={zoneName} onChangeText={setZoneName} />
              <ThemedText style={styles.label}>Descrição</ThemedText>
              <TextInput style={[styles.input, styles.textArea]} placeholder="Descreva o perigo ou tipo de crime..." placeholderTextColor={C.text3} value={description} onChangeText={setDescription} multiline numberOfLines={4} />
              <ThemedText style={styles.label}>Nível de Severidade</ThemedText>
              <View style={styles.severityOptions}>{['baixa', 'media', 'alta'].map(level => <TouchableOpacity key={level} style={[styles.severityOption, severity === level && styles.severityOptionSelected, { borderColor: getSeverityColor(level) }]} onPress={() => setSeverity(level as any)}><ThemedText style={[styles.severityOptionText, { color: getSeverityColor(level) }]}>{level.toUpperCase()}</ThemedText></TouchableOpacity>)}</View>
              <ThemedText style={styles.label}>Raio da Área: {radius}m</ThemedText>
              <View style={styles.radiusControl}>
                <TouchableOpacity style={styles.radiusBtn} onPress={() => setRadius(Math.max(100, radius - 100))}><MaterialCommunityIcons name="minus" size={20} color={C.text} /></TouchableOpacity>
                <TextInput style={styles.radiusInput} value={radius.toString()} onChangeText={text => { const num = parseInt(text) || 0; setRadius(Math.max(100, num)); }} keyboardType="number-pad" />
                <TouchableOpacity style={styles.radiusBtn} onPress={() => setRadius(radius + 100)}><MaterialCommunityIcons name="plus" size={20} color={C.text} /></TouchableOpacity>
              </View>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}><ThemedText style={styles.cancelBtnText}>Cancelar</ThemedText></TouchableOpacity>
              <TouchableOpacity style={styles.createBtn} onPress={handleCreateZone}><MaterialCommunityIcons name="plus" size={20} color="#fff" /><ThemedText style={styles.createBtnText}>Criar Zona</ThemedText></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  markerIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  headerPlaceholder: { width: 24 },
  map: { flex: 1 },
  infoBadge: { position: 'absolute', top: 60, left: 16, right: 16, backgroundColor: C.primaryLight, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 10 },
  infoBadgeText: { fontSize: 12, fontWeight: '600', color: C.primary },
  zonesList: { maxHeight: 220, backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border, paddingHorizontal: 12, paddingVertical: 12 },
  zonesTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 10 },
  zoneItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.surface2, borderRadius: 10, padding: 12, marginBottom: 8, borderLeftWidth: 4 },
  zoneInfo: { flex: 1 },
  zoneHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  zoneName: { fontSize: 13, fontWeight: '700', color: C.text },
  severityBadge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 4 },
  severityText: { fontSize: 10, fontWeight: '700' },
  zoneDescription: { fontSize: 11, color: C.text2, marginBottom: 4 },
  zoneRadius: { fontSize: 10, color: C.text3 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
  emptyText: { marginTop: 8, fontSize: 12, color: C.text3 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(13, 27, 54, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  form: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: C.text, marginTop: 4 },
  input: { backgroundColor: C.surface2, borderRadius: 10, padding: 12, color: C.text, borderWidth: 1, borderColor: C.border },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  severityOptions: { flexDirection: 'row', gap: 8 },
  severityOption: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  severityOptionSelected: { backgroundColor: C.surface2 },
  severityOptionText: { fontSize: 11, fontWeight: '700' },
  radiusControl: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radiusBtn: { width: 42, height: 42, borderRadius: 10, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' },
  radiusInput: { flex: 1, textAlign: 'center', backgroundColor: C.surface2, borderRadius: 10, padding: 10, color: C.text },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, backgroundColor: C.surface2, alignItems: 'center' },
  cancelBtnText: { color: C.text, fontWeight: '600' },
  createBtn: { flex: 1, flexDirection: 'row', gap: 8, paddingVertical: 13, borderRadius: 10, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  createBtnText: { color: '#fff', fontWeight: '700' },
  mapPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface2 },
  mapPlaceholderText: { marginTop: 10, color: C.text3 },
});
