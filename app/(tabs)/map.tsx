import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Modal, PanResponder, ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import MapComponent from '../../components/map';
import MiniMap from '../../components/minimap';
import { ThemedText } from '../../components/themed-text';
import { ThemedView } from '../../components/themed-view';
import { getAllReports, getDangerZones } from '../../services/reports';

/* TODO: REQUIREMENTS GAPS
 - RF-03 Zona Perigosa alert on enter: implement geofence detection against danger zones and banner UI.
 - RF-05 POIs and 'View Schedule' not implemented: add POI layer and station schedule integration.
 - RF-06 Add FAB for quick reporting on map (mobile thumb-zone friendly).
 - RNF-01 Real-time updates: implement polling or WebSocket to refresh markers ≤30s.
*/

const categories = [
  { id: 'buraco', label: 'Buraco na rua' },
  { id: 'poste', label: 'Poste/Iluminação' },
  { id: 'vazamento', label: 'Vazamento' },
  { id: 'bueiro', label: 'Bueiro' },
  { id: 'mato', label: 'Mato alto' },
  { id: 'calcada', label: 'Calçada' },
  { id: 'lixo', label: 'Lixo irregular' },
  { id: 'sinalizacao', label: 'Sinalização' },
  { id: 'outro', label: 'Outro' },
];

const getCategoryLabel = (categoryId: string) => {
  const found = categories.find((item) => item.id === categoryId);
  return found ? found.label : categoryId || 'Sem categoria';
};

const getDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371e3; // meters
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
};

const formatDistanceLabel = (meters: number) => {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1).replace(/\.0$/, '')} km`;
};

export default function MapScreen() {
  const [activeFilters, setActiveFilters] = useState<string[]>(() => categories.map((category) => category.id));
  const [reports, setReports] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [nearbyIndex, setNearbyIndex] = useState(0);
  const locationWatcherRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    let active = true;
    const startLocationWatcher = async () => {
      setLocating(true);
      setLocationError('');

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (!active) return;
          setLocationError('Permissão de localização negada. Ative o GPS para localizar.');
          return;
        }

        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
        if (active) {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        }

        const watcher = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Highest,
            timeInterval: 5000,
            distanceInterval: 10,
          },
          (updatedPosition) => {
            if (!active) return;
            setUserLocation({
              latitude: updatedPosition.coords.latitude,
              longitude: updatedPosition.coords.longitude,
            });
          }
        );

        locationWatcherRef.current = watcher;
      } catch (error) {
        console.error('Erro ao obter localização:', error);
        if (active) {
          setLocationError('Não foi possível obter sua localização.');
        }
      } finally {
        if (active) {
          setLocating(false);
        }
      }
    };

    startLocationWatcher();

    return () => {
      active = false;
      locationWatcherRef.current?.remove();
    };
  }, []);

  const loadReports = async () => {
    try {
      const data = await getAllReports();
      setReports(data);
    } catch (error) {
      console.error('Erro ao carregar denúncias:', error);
    }
  };

  const loadZones = async () => {
    try {
      const data = await getDangerZones();
      setZones(data);
    } catch (error) {
      console.error('Erro ao carregar zonas de perigo:', error);
    }
  };

  useEffect(() => {
    locateUser();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReports();
      loadZones();
    }, [loadReports, loadZones])
  );

  const locateUser = async () => {
    setLocating(true);
    setLocationError('');

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Permissão de localização negada. Ative o GPS para localizar.');
        setLocating(false);
        return;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      setUserLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch (error) {
      console.error('Erro ao obter localização:', error);
      setLocationError('Não foi possível obter sua localização.');
    } finally {
      setLocating(false);
    }
  };

  const filteredReports = reports.filter((report) => activeFilters.includes(report.category));

  const sortedNearbyReports = useMemo(() => {
    if (!userLocation) return [];
    return filteredReports
      .filter((report) => report.location?.latitude != null && report.location?.longitude != null)
      .map((report) => ({
        report,
        distance: getDistanceInMeters(
          userLocation.latitude,
          userLocation.longitude,
          report.location.latitude,
          report.location.longitude
        ),
      }))
      .sort((a, b) => a.distance - b.distance);
  }, [filteredReports, userLocation]);

  const currentNearby = sortedNearbyReports[nearbyIndex] ?? null;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10,
        onPanResponderRelease: (_, gestureState) => {
          if (Math.abs(gestureState.dx) < 18) return;
          const nextIndex = gestureState.dx < 0 ? nearbyIndex + 1 : nearbyIndex - 1;
          if (sortedNearbyReports.length === 0) return;
          const wrappedIndex = (nextIndex + sortedNearbyReports.length) % sortedNearbyReports.length;
          setNearbyIndex(wrappedIndex);
          setSelectedReport(sortedNearbyReports[wrappedIndex].report);
        },
      }),
    [nearbyIndex, sortedNearbyReports]
  );

  useEffect(() => {
    if (nearbyIndex >= sortedNearbyReports.length) {
      setNearbyIndex(0);
    }
  }, [sortedNearbyReports.length, nearbyIndex]);

  const toggleFilter = (categoryId: string) => {
    setActiveFilters((current) =>
      current.includes(categoryId)
        ? current.filter((item) => item !== categoryId)
        : [...current, categoryId]
    );
  };

  const handleSelectReport = (report: any) => {
    setSelectedReport(report);
  };

  const formatReportDate = (report: any) => {
    const value = report?.createdAt;
    if (!value) return 'Sem data';
    const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
    return date.toLocaleString();
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.mapToolbar}>
        <TouchableOpacity
          style={[styles.locateBtn, locating && { opacity: 0.7 }]}
          onPress={locateUser}
          disabled={locating}
        >
          <ThemedText style={styles.locateText}>{locating ? 'Localizando...' : 'Minha localização'}</ThemedText>
        </TouchableOpacity>

        {currentNearby ? (
          <View {...panResponder.panHandlers} style={styles.nearbyGestureWrapper}>
            <TouchableOpacity
              style={styles.nearbyChip}
              activeOpacity={0.85}
              onPress={() => handleSelectReport(currentNearby.report)}
            >
              <Ionicons name="location-outline" size={16} color="#ffffff" style={styles.nearbyIcon} />
              <View style={styles.nearbyTextGroup}>
                <ThemedText style={styles.nearbyLabel}>Denúncias próximas</ThemedText>
                <View style={styles.nearbyMetaRow}>
                  <ThemedText style={styles.nearbyDistance}>
                    {formatDistanceLabel(currentNearby.distance)}
                  </ThemedText>
                  <ThemedText style={styles.nearbyCount}>
                    {`${nearbyIndex + 1}/${sortedNearbyReports.length}`}
                  </ThemedText>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        ) : null}

        {locationError ? <ThemedText style={styles.locationError}>{locationError}</ThemedText> : null}
      </View>

      <MapComponent
        style={styles.map}
        reports={filteredReports}
        zones={zones}
        userLocation={userLocation}
        onSelectReport={handleSelectReport}
      />

      <MiniMap reports={filteredReports} userLocation={userLocation} />

      {/* Botão de Filtros Flutuante */}
      <TouchableOpacity 
        style={styles.filterButton}
        onPress={() => setShowFiltersModal(true)}
      >
        <Ionicons name="funnel" size={20} color="#ffffff" />
        <ThemedText style={styles.filterButtonText}>Filtros</ThemedText>
      </TouchableOpacity>

      {/* Modal de Filtros */}
      <Modal
        visible={showFiltersModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFiltersModal(false)}
      >
        <View style={styles.filterModalOverlay}>
          <View style={styles.filterModalContent}>
            <View style={styles.filterModalHeader}>
              <ThemedText style={styles.filterModalTitle}>Filtros</ThemedText>
              <TouchableOpacity onPress={() => setShowFiltersModal(false)}>
                <Ionicons name="close" size={24} color="#0d1b36" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterModalList} showsVerticalScrollIndicator={false}>
              {categories.map((category) => {
                const enabled = activeFilters.includes(category.id);
                return (
                  <View key={category.id} style={styles.filterModalItem}>
                    <ThemedText style={styles.filterModalItemLabel}>{category.label}</ThemedText>
                    <Switch
                      value={enabled}
                      onValueChange={() => toggleFilter(category.id)}
                      trackColor={{ false: '#d1d5db', true: '#1fa660' }}
                      thumbColor={enabled ? '#ffffff' : '#f3f4f6'}
                    />
                  </View>
                );
              })}
            </ScrollView>

            <TouchableOpacity 
              style={styles.filterModalClose}
              onPress={() => setShowFiltersModal(false)}
            >
              <ThemedText style={styles.filterModalCloseText}>Aplicar Filtros</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {selectedReport ? (
        <View style={styles.reportPanel}>
          <View style={styles.reportPanelHeader}>
            <View style={styles.reportPanelTitleWrap}>
              <ThemedText type="title" style={styles.reportTitle}>{getCategoryLabel(selectedReport.category)}</ThemedText>
              <ThemedText style={styles.reportSubtitle}>{selectedReport.location?.address || 'Localização não disponível'}</ThemedText>
            </View>
            <TouchableOpacity onPress={() => setSelectedReport(null)}>
              <ThemedText style={styles.reportClose}>Fechar</ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.reportImageWrapper}>
            {selectedReport.photoURL ? (
              <Image source={{ uri: selectedReport.photoURL }} style={styles.reportImage} resizeMode="cover" />
            ) : (
              <View style={styles.reportImagePlaceholder}>
                <ThemedText style={styles.reportImagePlaceholderText}>Nenhuma imagem</ThemedText>
              </View>
            )}
          </View>

          <ScrollView style={styles.reportBody} showsVerticalScrollIndicator={false}>
            <View style={styles.reportInfoRow}>
              <View style={styles.reportTag}>
                <ThemedText style={styles.reportTagText}>{getCategoryLabel(selectedReport.category)}</ThemedText>
              </View>
              <ThemedText style={styles.reportTime}>{formatReportDate(selectedReport)}</ThemedText>
            </View>

            <ThemedText style={styles.reportLabel}>Descrição</ThemedText>
            <ThemedText style={styles.reportText}>{selectedReport.description || 'Sem descrição'}</ThemedText>
          </ScrollView>
        </View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterButton: {
    position: 'absolute',
    bottom: 24,
    right: 180,
    backgroundColor: '#1a5fd4',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
    shadowColor: '#1a5fd4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 20,
  },
  filterButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 8,
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(13, 27, 54, 0.4)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  filterModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    maxHeight: '65%',
    maxWidth: 320,
    marginRight: 16,
    marginBottom: 100,
    shadowColor: '#1a5fd4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dce8ff',
  },
  filterModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0d1b36',
  },
  filterModalList: {
    maxHeight: 280,
    marginBottom: 12,
  },
  filterModalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#f5f8ff',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5eeff',
  },
  filterModalItemLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0d1b36',
    flex: 1,
  },
  filterModalClose: {
    backgroundColor: '#1a5fd4',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  filterModalCloseText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  mapToolbar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffffee',
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  locateBtn: {
    backgroundColor: '#1a5fd4',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  locateText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  nearbyChip: {
    backgroundColor: '#1a5fd4',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 170,
    maxWidth: '65%',
  },
  nearbyIcon: {
    marginRight: 8,
  },
  nearbyGestureWrapper: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  nearbyTextGroup: {
    flexShrink: 1,
  },
  nearbyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 8,
  },
  nearbyLabel: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  nearbyDistance: {
    color: '#dbe9ff',
    fontSize: 11,
  },
  nearbyCount: {
    color: '#cfe4ff',
    fontSize: 11,
    fontWeight: '700',
  },
  locationError: {
    marginTop: 10,
    color: '#d32f2f',
    fontSize: 13,
    width: '100%',
  },
  map: {
    flex: 1,
  },
  reportPanel: {
    position: 'absolute',
    top: 90,
    left: 14,
    right: 14,
    width: 'auto',
    maxWidth: 380,
    maxHeight: '75%',
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 16,
    zIndex: 999,
  },
  reportPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  reportPanelTitleWrap: {
    flex: 1,
    marginRight: 12,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  reportSubtitle: {
    fontSize: 12,
    color: '#707070',
    lineHeight: 18,
  },
  noResultsItem: {
    backgroundColor: '#eef3fb',
    borderRadius: 14,
    padding: 16,
    minWidth: 260,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noResultsText: {
    color: '#4b5563',
    fontSize: 13,
    textAlign: 'center',
  },
  reportClose: {
    color: '#1a5fd4',
    fontWeight: '700',
    fontSize: 14,
  },
  reportImageWrapper: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#f4f7fb',
    marginBottom: 14,
    minHeight: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportImage: {
    width: '100%',
    height: 180,
  },
  reportImagePlaceholder: {
    width: '100%',
    minHeight: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eef3fb',
  },
  reportImagePlaceholderText: {
    color: '#7a7a7a',
    fontSize: 14,
    fontWeight: '700',
  },
  reportBody: {
    maxHeight: 280,
  },
  reportInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reportTag: {
    backgroundColor: '#e8f0ff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  reportTagText: {
    color: '#1a5fd4',
    fontSize: 12,
    fontWeight: '700',
  },
  reportTime: {
    color: '#8c8c8c',
    fontSize: 12,
  },
  reportLabel: {
    fontSize: 12,
    color: '#777',
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reportText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    marginBottom: 16,
  },
});
