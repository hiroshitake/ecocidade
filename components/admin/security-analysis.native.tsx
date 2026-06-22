import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { C } from '../../constants/theme';
import { getAllReports } from '../../services/reports';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';

// Importar MapView apenas se não for web
let MapView, Heatmap, Marker;
if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Heatmap = maps.Heatmap;
  Marker = maps.Marker;
}

interface SecurityMetrics {
  totalSecurityIssues: number;
  highRiskAreas: { name: string; count: number }[];
  monthlyTrend: { month: string; count: number }[];
  heatmapData: Array<{ latitude: number; longitude: number; weight: number }>;
}

const SECURITY_CATEGORIES = ['vazamento', 'poste', 'lixo', 'sinalizacao', 'calcada'];
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function SecurityAnalysisScreen() {
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    totalSecurityIssues: 0,
    highRiskAreas: [],
    monthlyTrend: [],
    heatmapData: [],
  });
  const [loading, setLoading] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadSecurityMetrics();
  }, []);

  const loadSecurityMetrics = async () => {
    try {
      setLoading(true);
      const reports = await getAllReports();

      // Filtrar apenas denúncias de segurança
      const securityReports = reports.filter(r =>
        SECURITY_CATEGORIES.includes(r.category?.toLowerCase() || '')
      );

      const newMetrics: SecurityMetrics = {
        totalSecurityIssues: securityReports.length,
        highRiskAreas: [],
        monthlyTrend: [],
        heatmapData: [],
      };

      // Inicializar meses
      MONTHS.forEach(month => {
        newMetrics.monthlyTrend.push({ month, count: 0 });
      });

      // Processar dados
      const areaMap: { [key: string]: number } = {};
      const heatmapPoints: Array<{ latitude: number; longitude: number; weight: number }> = [];

      securityReports.forEach(report => {
        // Áreas de alto risco
        const address = report.location?.address?.split(',')[0] || 'Desconhecida';
        areaMap[address] = (areaMap[address] || 0) + 1;

        // Mapa de calor
        if (report.location?.latitude && report.location?.longitude) {
          heatmapPoints.push({
            latitude: report.location.latitude,
            longitude: report.location.longitude,
            weight: 1,
          });
        }

        // Tendência mensal
        if (report.createdAt) {
          const date = typeof report.createdAt.toDate === 'function'
            ? report.createdAt.toDate()
            : new Date(report.createdAt);
          const monthIndex = date.getMonth();
          newMetrics.monthlyTrend[monthIndex].count++;
        }
      });

      // Ordenar áreas de risco
      newMetrics.highRiskAreas = Object.entries(areaMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      newMetrics.heatmapData = heatmapPoints;

      setMetrics(newMetrics);
    } catch (error) {
      console.error('Erro ao carregar métricas de segurança:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="chevron-left" size={24} color={C.primary} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Análise de Segurança</ThemedText>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {/* Métrica Principal */}
        <View style={styles.mainMetric}>
          <MaterialCommunityIcons name="alert-circle" size={40} color={C.danger} />
          <View style={styles.metricInfo}>
            <ThemedText style={styles.metricValue}>{metrics.totalSecurityIssues}</ThemedText>
            <ThemedText style={styles.metricLabel}>Problemas de Segurança</ThemedText>
          </View>
        </View>

        {/* Toggle Heatmap */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleBtn, showHeatmap && styles.toggleBtnActive]}
            onPress={() => setShowHeatmap(true)}
          >
            <MaterialCommunityIcons
              name="fire"
              size={18}
              color={showHeatmap ? C.white : C.text3}
            />
            <ThemedText style={[styles.toggleBtnText, showHeatmap && styles.toggleBtnTextActive]}>
              Mapa de Calor
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleBtn, !showHeatmap && styles.toggleBtnActive]}
            onPress={() => setShowHeatmap(false)}
          >
            <MaterialCommunityIcons
              name="chart-line"
              size={18}
              color={!showHeatmap ? C.white : C.text3}
            />
            <ThemedText style={[styles.toggleBtnText, !showHeatmap && styles.toggleBtnTextActive]}>
              Tendências
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Mapa de Calor */}
        {showHeatmap && (
          <View style={styles.mapContainer}>
            {Platform.OS !== 'web' && MapView ? (
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: -23.5505,
                  longitude: -46.6333,
                  latitudeDelta: 0.1,
                  longitudeDelta: 0.1,
                }}
              >
                {metrics.heatmapData.length > 0 && (
                  <Heatmap
                    points={metrics.heatmapData}
                    opacity={0.7}
                    radius={40}
                    maxIntensity={100}
                  />
                )}

                {metrics.highRiskAreas.map((area, index) => (
                  <Marker
                    key={index}
                    coordinate={{
                      latitude: -23.5505 + (index * 0.02),
                      longitude: -46.6333 + (index * 0.02),
                    }}
                    title={area.name}
                    description={`${area.count} denúncias`}
                    pinColor={C.danger}
                  />
                ))}
              </MapView>
            ) : (
              <View style={styles.mapPlaceholder}>
                <MaterialCommunityIcons name="map-alert" size={48} color={C.text3} />
                <ThemedText style={styles.mapPlaceholderText}>Mapa disponível apenas em mobile</ThemedText>
              </View>
            )}
          </View>
        )}

        {/* Gráfico de Tendências */}
        {!showHeatmap && (
          <View style={styles.trendContainer}>
            <ThemedText style={styles.trendTitle}>Histórico Temporal</ThemedText>
            <View style={styles.chartContainer}>
              {metrics.monthlyTrend.map((item, index) => (
                <View key={index} style={styles.chartBar}>
                  <View style={styles.barLabel}>
                    <ThemedText style={styles.barLabelText}>{item.month}</ThemedText>
                    <ThemedText style={styles.barValue}>{item.count}</ThemedText>
                  </View>
                  <View
                    style={[
                      styles.bar,
                      { height: item.count > 0 ? (item.count / 10) * 100 : 8 },
                    ]}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Áreas de Alto Risco */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Áreas de Alto Risco</ThemedText>
          <View style={styles.riskAreasList}>
            {metrics.highRiskAreas.map((area, index) => (
              <View key={index} style={styles.riskAreaItem}>
                <View
                  style={[
                    styles.riskRank,
                    {
                      backgroundColor:
                        index === 0
                          ? C.danger
                          : index === 1
                            ? C.warning
                            : C.primary,
                    },
                  ]}
                >
                  <ThemedText style={styles.riskRankText}>#{index + 1}</ThemedText>
                </View>
                <View style={styles.riskInfo}>
                  <ThemedText style={styles.riskAreaName}>{area.name}</ThemedText>
                  <ThemedText style={styles.riskAreaCount}>
                    {area.count} {area.count === 1 ? 'denúncia' : 'denúncias'}
                  </ThemedText>
                </View>
                <View style={styles.riskBar}>
                  <View
                    style={[
                      styles.riskBarFill,
                      {
                        width: `${(area.count / Math.max(...metrics.highRiskAreas.map(a => a.count), 1)) * 100}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Recomendações */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Recomendações</ThemedText>
          <View style={styles.recommendationCard}>
            <MaterialCommunityIcons name="lightbulb-on" size={24} color={C.warning} />
            <View style={styles.recommendationContent}>
              <ThemedText style={styles.recommendationTitle}>
                Reforçar patrulhas
              </ThemedText>
              <ThemedText style={styles.recommendationText}>
                Aumentar presença em áreas com alta densidade de denúncias
              </ThemedText>
            </View>
          </View>

          <View style={styles.recommendationCard}>
            <MaterialCommunityIcons name="shield-alert" size={24} color={C.danger} />
            <View style={styles.recommendationContent}>
              <ThemedText style={styles.recommendationTitle}>
                Análise de padrões
              </ThemedText>
              <ThemedText style={styles.recommendationText}>
                Investigar padrões temporais de crimes nas regiões de risco
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
  },
  headerPlaceholder: {
    width: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  mainMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.dangerLight,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  metricInfo: {
    marginLeft: 16,
  },
  metricValue: {
    fontSize: 32,
    fontWeight: '800',
    color: C.danger,
  },
  metricLabel: {
    fontSize: 13,
    color: C.text2,
    marginTop: 4,
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
    gap: 6,
  },
  toggleBtnActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.text,
  },
  toggleBtnTextActive: {
    color: C.white,
  },
  mapContainer: {
    height: 250,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
  },
  map: {
    flex: 1,
  },
  trendContainer: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  trendTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
    marginBottom: 16,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 180,
    gap: 8,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
  },
  barLabel: {
    alignItems: 'center',
    marginBottom: 8,
  },
  barLabelText: {
    fontSize: 10,
    fontWeight: '600',
    color: C.text,
  },
  barValue: {
    fontSize: 12,
    fontWeight: '700',
    color: C.primary,
    marginTop: 2,
  },
  bar: {
    width: '100%',
    backgroundColor: C.primary,
    borderRadius: 4,
    minHeight: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    marginBottom: 12,
  },
  riskAreasList: {
    gap: 10,
  },
  riskAreaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  riskRank: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  riskRankText: {
    color: C.white,
    fontWeight: '700',
    fontSize: 14,
  },
  riskInfo: {
    flex: 1,
    marginLeft: 12,
  },
  riskAreaName: {
    fontSize: 13,
    fontWeight: '700',
    color: C.text,
  },
  riskAreaCount: {
    fontSize: 11,
    color: C.text2,
    marginTop: 2,
  },
  riskBar: {
    width: 60,
    height: 6,
    backgroundColor: C.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  riskBarFill: {
    height: '100%',
    backgroundColor: C.danger,
  },
  recommendationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  recommendationContent: {
    flex: 1,
    marginLeft: 12,
  },
  recommendationTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.text,
    marginBottom: 2,
  },
  recommendationText: {
    fontSize: 12,
    color: C.text2,
    lineHeight: 18,
  },
  mapPlaceholder: {
    height: 300,
    backgroundColor: C.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mapPlaceholderText: {
    fontSize: 13,
    color: C.text2,
  },
});
