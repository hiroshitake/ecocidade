import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { ThemedText } from "../components/themed-text";
import { Colors } from "../constants/theme";
import { useAppTheme } from "../context/theme-context";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type Notification,
} from "../services/notifications";

function formatDate(value: string) {
  const date = new Date(value);
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getNotificationIcon(type: string) {
  if (type === "report_resolved") return "check-circle-outline";
  if (type === "report_in_progress") return "magnify";
  return "file-check-outline";
}

function getNotificationColor(colors: typeof Colors.light, type: string) {
  if (type === "report_resolved") return colors.eco;
  if (type === "report_in_progress") return colors.primary;
  return colors.primary;
}

export default function NotificationsScreen() {
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
      setNotifications(await getNotifications());
    } catch (error) {
      console.error("Erro ao carregar notificações:", error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications]),
  );

  const openNotification = async (notification: Notification) => {
    if (!notification.read) {
      try {
        await markNotificationAsRead(notification.id);
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id ? { ...item, read: true } : item,
          ),
        );
      } catch (error) {
        console.error("Erro ao marcar notificação como lida:", error);
      }
    }

    if (notification.report_id) {
      router.push("/(tabs)/reports");
    }
  };

  const handleMarkAll = async () => {
    if (!notifications.some((item) => !item.read)) return;

    try {
      await markAllNotificationsAsRead();
      setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    } catch (error) {
      console.error("Erro ao marcar notificações:", error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={colors.primary} />
        </TouchableOpacity>
        <ThemedText style={styles.title}>Notificações</ThemedText>
        <TouchableOpacity onPress={handleMarkAll} style={styles.markAllButton}>
          <ThemedText style={styles.markAllText}>Ler todas</ThemedText>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : loadError ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="cloud-off-outline" size={48} color={colors.text3} />
          <ThemedText style={styles.errorTitle}>Não foi possível carregar as notificações</ThemedText>
          <ThemedText style={styles.errorText}>Verifique sua conexão e tente novamente.</ThemedText>
          <TouchableOpacity style={styles.retryButton} onPress={loadNotifications}>
            <ThemedText style={styles.retryText}>Tentar novamente</ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            notifications.length === 0 && styles.emptyList,
          ]}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, !item.read && styles.unreadCard]}
              onPress={() => openNotification(item)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.icon,
                  { backgroundColor: getNotificationColor(colors, item.type) + "22" },
                ]}
              >
                <MaterialCommunityIcons
                  name={getNotificationIcon(item.type) as any}
                  size={22}
                  color={getNotificationColor(colors, item.type)}
                />
              </View>
              <View style={styles.copy}>
                <View style={styles.titleRow}>
                  <ThemedText style={styles.cardTitle}>{item.title}</ThemedText>
                  {!item.read && <View style={styles.dot} />}
                </View>
                <ThemedText style={styles.message}>{item.message}</ThemedText>
                <ThemedText style={styles.date}>{formatDate(item.created_at)}</ThemedText>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons
                name="bell-outline"
                size={54}
                color={colors.text3}
              />
              <ThemedText style={styles.emptyTitle}>
                Nenhuma notificação
              </ThemedText>
              <ThemedText style={styles.emptyText}>
                Quando houver uma atualização importante, ela aparecerá aqui.
              </ThemedText>
            </View>
          }
        />
      )}
    </View>
  );
}

const makeStyles = (colors: typeof Colors.light) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: {
      minHeight: 64,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: { padding: 4 },
    title: { flex: 1, fontSize: 20, fontWeight: "800", color: colors.text, marginLeft: 8 },
    markAllButton: { padding: 8 },
    markAllText: { color: colors.primary, fontSize: 12, fontWeight: "800" },
    list: { padding: 16, gap: 10 },
    emptyList: { flexGrow: 1 },
    card: {
      flexDirection: "row",
      padding: 14,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    unreadCard: { borderColor: colors.primary + "55", backgroundColor: colors.surface2 },
    icon: {
      width: 44,
      height: 44,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    copy: { flex: 1 },
    titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    cardTitle: { flex: 1, fontSize: 14, fontWeight: "800", color: colors.text },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
    message: { fontSize: 13, lineHeight: 19, color: colors.text2, marginTop: 4 },
    date: { fontSize: 11, color: colors.text3, marginTop: 8 },
    center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    errorTitle: { fontSize: 16, fontWeight: "800", color: colors.text, marginTop: 12, textAlign: "center" },
    errorText: { fontSize: 13, color: colors.text3, marginTop: 6, textAlign: "center" },
    retryButton: { marginTop: 16, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 10, backgroundColor: colors.primary },
    retryText: { color: colors.white, fontWeight: "800" },
    empty: { alignItems: "center", justifyContent: "center", padding: 40 },
    emptyTitle: { fontSize: 17, fontWeight: "800", color: colors.text, marginTop: 14 },
    emptyText: {
      fontSize: 13,
      color: colors.text3,
      textAlign: "center",
      lineHeight: 19,
      marginTop: 6,
    },
  });
