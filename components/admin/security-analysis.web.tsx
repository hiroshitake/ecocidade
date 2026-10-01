import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { C } from '../../constants/theme';
import { resolveUserLocationWithFallback } from '../../services/auth';
import { getAdminReports } from '../../services/reports';
import MapComponent from '../map.web';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';

const SECURITY_CATEGORY = 'seguranca';
const AREA_RADIUS_METERS = 500;

const haversineDistance = (
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number,
) => {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRadians(latitude2 - latitude1);
  const dLon = toRadians(longitude2 - longitude1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(latitude1)) *
      Math.cos(toRadians(latitude2)) *
      Math.sin(dLon / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getReportCoordinates = (report: any) => {
  const latitude = Number(report.location?.latitude ?? report.latitude);
  const longitude = Number(report.location?.longitude ?? report.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
};
const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const startOfWeek = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
};

export default function SecurityAnalysisWeb() {
  const router = useRouter();
  const [reports, setReports] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    getAdminReports()
      .then(all => setReports((all || []).filter((r: any) => String(r.category || '').toLowerCase() === SECURITY_CATEGORY)))
      .catch(console.error);

    resolveUserLocationWithFallback()
      .then(resolved => setUserLocation(resolved.location))
      .catch(console.error);
  }, []);

  const mapReports = useMemo(() => reports.map((report: any) => ({
    ...report,
    location: {
      ...(report.location || {}),
      latitude: Number(report.location?.latitude ?? report.latitude),
      longitude: Number(report.location?.longitude ?? report.longitude),
      address: report.location?.address || report.city || undefined,
    },
  })).filter((report: any) => Number.isFinite(report.location.latitude) && Number.isFinite(report.location.longitude)), [reports]);

  const weekly = useMemo(() => {
    const start = startOfWeek(new Date());
    const counts = WEEKDAYS.map(day => ({ day, count: 0 }));
    reports.forEach(report => {
      if (!report.created_at) return;
      const date = new Date(report.created_at);
      const current = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      const diff = Math.floor((current - start.getTime()) / 86400000);
      if (diff >= 0 && diff < 7) counts[diff].count++;
    });
    return counts;
  }, [reports]);

  const { areas, geolocatedReportsCount } = useMemo(() => {
    const clusters: Array<{
      latitude: number;
      longitude: number;
      reports: any[];
    }> = [];

    reports.forEach(report => {
      const coordinates = getReportCoordinates(report);
      if (!coordinates) return;

      let nearestIndex = -1;
      let nearestDistance = Number.POSITIVE_INFINITY;

      clusters.forEach((cluster, index) => {
        const distance = haversineDistance(
          coordinates.latitude,
          coordinates.longitude,
          cluster.latitude,
          cluster.longitude,
        );
        if (distance <= AREA_RADIUS_METERS && distance < nearestDistance) {
          nearestIndex = index;
          nearestDistance = distance;
        }
      });

      if (nearestIndex === -1) {
        clusters.push({
          ...coordinates,
          reports: [report],
        });
        return;
      }

      const cluster = clusters[nearestIndex];
      cluster.reports.push(report);

      cluster.latitude =
        cluster.reports.reduce(
          (sum, item) => sum + (getReportCoordinates(item)?.latitude ?? 0),
          0,
        ) / cluster.reports.length;
      cluster.longitude =
        cluster.reports.reduce(
          (sum, item) => sum + (getReportCoordinates(item)?.longitude ?? 0),
          0,
        ) / cluster.reports.length;
    });

    const ranked = clusters
      .map((cluster, index) => {
        const streetCounts: Record<string, number> = {};
        cluster.reports.forEach(report => {
          const street = String(report.location?.address || '')
            .split(',')[0]
            .trim();
          if (street) streetCounts[street] = (streetCounts[street] || 0) + 1;
        });

        const label =
          Object.entries(streetCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
          'Área de concentração';

        return {
          id: index,
          name: label,
          count: cluster.reports.length,
          latitude: cluster.latitude,
          longitude: cluster.longitude,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      areas: ranked,
      geolocatedReportsCount: reports.filter(report => getReportCoordinates(report)).length,
    };
  }, [reports]);

  const max = Math.max(...weekly.map(item => item.count), 1);
  const weekTotal = weekly.reduce((sum, item) => sum + item.count, 0);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><MaterialCommunityIcons name="chevron-left" size={24} color={C.primary} /></TouchableOpacity>
        <ThemedText style={styles.title}>Análise de Segurança</ThemedText>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.metric}><MaterialCommunityIcons name="shield-alert" size={34} color={C.danger} /><View><ThemedText style={styles.metricValue}>{reports.length}</ThemedText><ThemedText style={styles.metricLabel}>denúncias de segurança</ThemedText></View></View>

        <View style={styles.card}>
          <View style={styles.sectionHead}><ThemedText style={styles.sectionTitle}>Mapa de ocorrências</ThemedText><ThemedText style={styles.sectionHint}>Somente segurança</ThemedText></View>
          <View style={styles.map}><MapComponent reports={mapReports} userLocation={userLocation} /></View>
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.sectionTitle}>Denúncias nesta semana</ThemedText>
          <ThemedText style={styles.sectionHint}>{weekTotal} ocorrência(s) de segunda a domingo</ThemedText>
          <View style={styles.chart}>
            {weekly.map(item => <View key={item.day} style={styles.barColumn}><ThemedText style={styles.barValue}>{item.count}</ThemedText><View style={[styles.bar, { height: Math.max(8, (item.count / max) * 110) }]} /><ThemedText style={styles.day}>{item.day}</ThemedText></View>)}
          </View>
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.sectionTitle}>Áreas com mais denúncias</ThemedText>
          <ThemedText style={styles.sectionHint}>Concentrações de ocorrências em um raio aproximado de 500 m</ThemedText>
          {geolocatedReportsCount < reports.length ? <ThemedText style={styles.locationNote}>{reports.length - geolocatedReportsCount} ocorrência(s) sem coordenadas não entram neste cálculo.</ThemedText> : null}
          {areas.length === 0 ? <ThemedText style={styles.empty}>Nenhuma ocorrência com localização válida.</ThemedText> : areas.map((area, index) => <View key={area.id} style={styles.area}><View style={styles.rank}><ThemedText style={styles.rankText}>{index + 1}</ThemedText></View><View style={{ flex: 1 }}><ThemedText style={styles.areaName}>{area.name}</ThemedText><ThemedText style={styles.areaCount}>{area.count} denúncia(s) · centro aproximado {area.latitude.toFixed(4)}, {area.longitude.toFixed(4)}</ThemedText></View></View>)}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surface }, title: { fontSize: 18, fontWeight: '800', color: C.text }, content: { padding: 16, gap: 16 }, metric: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 16, backgroundColor: C.dangerLight }, metricValue: { fontSize: 30, fontWeight: '900', color: C.danger }, metricLabel: { fontSize: 12, color: C.text2 }, card: { padding: 16, borderRadius: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }, sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, sectionTitle: { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 4 }, sectionHint: { fontSize: 11, color: C.text3 }, map: { height: 380, marginTop: 12, borderRadius: 12, overflow: 'hidden' }, chart: { height: 160, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 18 }, barColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }, bar: { width: 18, borderRadius: 8, backgroundColor: C.danger, marginVertical: 5 }, barValue: { fontSize: 11, fontWeight: '800', color: C.text }, day: { fontSize: 11, color: C.text2 }, empty: { color: C.text3, marginTop: 8 }, locationNote: { fontSize: 10, color: C.text3, marginTop: 6 }, area: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border }, rank: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.danger, alignItems: 'center', justifyContent: 'center', marginRight: 10 }, rankText: { color: C.white, fontWeight: '800' }, areaName: { fontSize: 13, fontWeight: '700', color: C.text }, areaCount: { fontSize: 11, color: C.text3, marginTop: 2 },
});
