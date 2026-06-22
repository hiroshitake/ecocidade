import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { C } from '../constants/theme';
import { getAllReports } from '../services/reports';
import MapComponent from './map';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

interface Props {
  reports?: any[];
  userLocation?: { latitude: number; longitude: number } | null;
}

export default function MiniMap({ reports: initialReports, userLocation }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [reports, setReports] = useState<any[]>(initialReports || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!initialReports) {
      loadReports();
    } else {
      setReports(initialReports);
    }
  }, [initialReports]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await getAllReports();
      setReports(data);
    } catch (error) {
      console.error('Erro ao carregar denúncias (minimap):', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TouchableOpacity style={styles.miniWrap} onPress={() => setExpanded(true)}>
        <ThemedView style={styles.miniContainer}>
          <MapComponent
            style={styles.miniMap}
            reports={reports}
            userLocation={userLocation}
          />
          <ThemedView style={styles.miniBadge}>
            <ThemedText style={styles.miniBadgeText}>Mapa</ThemedText>
          </ThemedView>
        </ThemedView>
      </TouchableOpacity>

      <Modal visible={expanded} animationType="slide" onRequestClose={() => setExpanded(false)}>
        <ThemedView style={styles.fullscreen}>
          <View style={styles.fullscreenHeader}>
            <TouchableOpacity onPress={() => setExpanded(false)} style={styles.closeBtn}>
              <ThemedText style={{ color: '#fff', fontWeight: '700' }}>Fechar</ThemedText>
            </TouchableOpacity>
          </View>
          <MapComponent
            style={styles.fullMap}
            reports={reports}
            userLocation={userLocation}
          />
        </ThemedView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  miniWrap: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    width: 150,
    height: 110,
    zIndex: 999,
    elevation: 30,
  },
  miniContainer: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 16,
  },
  miniMap: {
    width: '100%',
    height: '100%',
  },
  miniBadge: {
    position: 'absolute',
    left: 8,
    top: 8,
    backgroundColor: C.primary,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
  },
  miniBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  fullscreen: {
    flex: 1,
    backgroundColor: C.surface,
  },
  fullscreenHeader: {
    height: 64,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 16,
    backgroundColor: C.primary,
  },
  closeBtn: {
    backgroundColor: C.danger,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  fullMap: { flex: 1 },
});
