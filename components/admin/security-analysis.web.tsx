import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { C } from '../../constants/theme';
import { getAllReports } from '../../services/reports';
import MapComponent from '../map.web';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';

const SECURITY_CATEGORY = 'seguranca';
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

  useEffect(() => {
    getAllReports().then(all => setReports((all || []).filter((r: any) => String(r.category || '').toLowerCase() === SECURITY_CATEGORY))).catch(console.error);
  }, []);

  const weekly = useMemo(() => {
    const start = startOfWeek(new Date());
    const counts = WEEKDAYS.map(day => ({ day, count: 0 }));
    reports.forEach(report => {
      if (!report.created_at) return;
      const date = new Date(report.created_at);
      const diff = Math.floor((new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() - start.getTime()) / 86400000);
      if (diff >= 0 && diff < 7) counts[diff].count++;
    });
    return counts;
  }, [reports]);

  const areas = useMemo(() => {
    const map: Record<string, number> = {};
    reports.forEach(report => {
      const name = report.location?.address?.split(',')[0] || 'Localização desconhecida';
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);
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
          <View style={styles.map}><MapComponent reports={reports} /></View>
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
          {areas.length === 0 ? <ThemedText style={styles.empty}>Nenhuma ocorrência registrada.</ThemedText> : areas.map((area, index) => <View key={area.name} style={styles.area}><View style={styles.rank}><ThemedText style={styles.rankText}>{index + 1}</ThemedText></View><View style={{ flex: 1 }}><ThemedText style={styles.areaName}>{area.name}</ThemedText><ThemedText style={styles.areaCount}>{area.count} denúncia(s)</ThemedText></View></View>)}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surface }, title: { fontSize: 18, fontWeight: '800', color: C.text }, content: { padding: 16, gap: 16 }, metric: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 16, backgroundColor: C.dangerLight }, metricValue: { fontSize: 30, fontWeight: '900', color: C.danger }, metricLabel: { fontSize: 12, color: C.text2 }, card: { padding: 16, borderRadius: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }, sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, sectionTitle: { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 4 }, sectionHint: { fontSize: 11, color: C.text3 }, map: { height: 380, marginTop: 12, borderRadius: 12, overflow: 'hidden' }, chart: { height: 160, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 18 }, barColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }, bar: { width: 18, borderRadius: 8, backgroundColor: C.danger, marginVertical: 5 }, barValue: { fontSize: 11, fontWeight: '800', color: C.text }, day: { fontSize: 11, color: C.text2 }, empty: { color: C.text3, marginTop: 8 }, area: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border }, rank: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.danger, alignItems: 'center', justifyContent: 'center', marginRight: 10 }, rankText: { color: C.white, fontWeight: '800' }, areaName: { fontSize: 13, fontWeight: '700', color: C.text }, areaCount: { fontSize: 11, color: C.text3, marginTop: 2 },
});
