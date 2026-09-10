import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { C } from '../../constants/theme';
import { getAllReports } from '../../services/reports';
import MapComponent from '../map.web';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';

const SECURITY_CATEGORIES = ['vazamento', 'poste', 'lixo', 'sinalizacao', 'calcada'];
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function SecurityAnalysisWeb() {
  const router = useRouter();
  const [reports, setReports] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    totalSecurityIssues: 0,
    highRiskAreas: [] as { name: string; count: number }[],
    monthlyTrend: [] as { month: string; count: number }[],
  });

  useEffect(() => {
    loadSecurityMetrics();
  }, []);

  const loadSecurityMetrics = async () => {
    try {
      const allReports = await getAllReports();
      const securityReports = allReports.filter((report: any) =>
        SECURITY_CATEGORIES.includes(report.category?.toLowerCase?.() || '')
      );

      const monthTotals = MONTHS.map((month) => ({ month, count: 0 }));
      const areaMap: Record<string, number> = {};

      securityReports.forEach((report: any) => {
        const address = report.location?.address?.split(',')[0] || 'Desconhecida';
        areaMap[address] = (areaMap[address] || 0) + 1;

        if (report.createdAt) {
          const date = typeof report.createdAt.toDate === 'function'
            ? report.createdAt.toDate()
            : new Date(report.createdAt);
          monthTotals[date.getMonth()].count++;
        }
      });

      const highRiskAreas = Object.entries(areaMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setReports(securityReports);
      setMetrics({
        totalSecurityIssues: securityReports.length,
        highRiskAreas,
        monthlyTrend: monthTotals,
      });
    } catch (error) {
      console.error('Erro ao carregar an�lises de seguran�a web:', error);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="chevron-left" size={24} color={C.primary} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Analise de Seguranca</ThemedText>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.mainMetric}>
          <MaterialCommunityIcons name="alert-circle" size={40} color={C.danger} />
          <View style={styles.metricInfo}>
            <ThemedText style={styles.metricValue}>{metrics.totalSecurityIssues}</ThemedText>
            <ThemedText style={styles.metricLabel}>Problemas de seguranca</ThemedText>
          </View>
        </View>

        <View style={styles.mapWrapper}>
          <MapComponent reports={reports} style={styles.map} />
        </View>

        <View style={styles.highRiskCard}>
          <ThemedText style={styles.sectionTitle}>Areas de alto risco</ThemedText>
          {metrics.highRiskAreas.length === 0 ? (
            <ThemedText style={styles.emptyText}>Nenhuma area gravada ainda.</ThemedText>
          ) : (
            metrics.highRiskAreas.map((area, index) => (
              <View key={area.name} style={styles.areaRow}>
                <View style={styles.areaIndex}><ThemedText style={styles.areaIndexText}>{index + 1}</ThemedText></View>
                <View style={styles.areaInfo}>
                  <ThemedText style={styles.areaName}>{area.name}</ThemedText>
                  <ThemedText style={styles.areaCount}>{area.count} denuncias</ThemedText>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.trendCard}>
          <ThemedText style={styles.sectionTitle}>Tend�ncia mensal</ThemedText>
          <View style={styles.trendChart}>
            {metrics.monthlyTrend.map((item) => (
              <View key={item.month} style={styles.trendBarWrapper}>
                <View style={[styles.trendBar, { height: Math.max(item.count * 6, 12) }]} />
                <ThemedText style={styles.trendLabel}>{item.month}</ThemedText>
              </View>
            ))}
          </View>
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
  mainMetric: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 18, backgroundColor: C.surface2, marginBottom: 18 },
  metricInfo: { marginLeft: 14 },
  metricValue: { fontSize: 28, fontWeight: '800', color: C.danger },
  metricLabel: { fontSize: 13, color: C.text2 },
  mapWrapper: { height: 420, borderRadius: 18, overflow: 'hidden', marginBottom: 18, backgroundColor: C.surface2 },
  map: { width: '100%', height: '100%' },
  highRiskCard: { padding: 18, borderRadius: 18, backgroundColor: C.surface2, marginBottom: 18 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 12 },
  emptyText: { color: C.text2, fontSize: 13 },
  areaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  areaIndex: { width: 30, height: 30, borderRadius: 12, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  areaIndexText: { color: '#fff', fontWeight: '700' },
  areaInfo: { flex: 1 },
  areaName: { fontSize: 14, fontWeight: '700', color: C.text },
  areaCount: { fontSize: 12, color: C.text2 },
  trendCard: { padding: 18, borderRadius: 18, backgroundColor: C.surface2, marginBottom: 24 },
  trendChart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 160 },
  trendBarWrapper: { alignItems: 'center', width: 22 },
  trendBar: { width: 14, borderRadius: 10, backgroundColor: C.primary, marginBottom: 8 },
  trendLabel: { fontSize: 10, color: C.text2 },
});
