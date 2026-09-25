import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { ThemedText } from "../components/themed-text";
import { C } from "../constants/theme";
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

function getNotificationColor(type: string) {
  if (type === "report_resolved") return C.eco;
  if (type === "report_in_progress") return C.primary;
  return C.primary;
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setNotifications(await getNotifications());
    } catch (error) {
      console.error("Erro ao carregar notificações:", error);
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
          <MaterialCommunityIcons name="chevron-left" size={28} color={C.primary} />
        </TouchableOpacity>
        <ThemedText style={styles.title}>Notificações</ThemedText>
        <TouchableOpacity onPress={handleMarkAll} style={styles.markAllButton}>
          <ThemedText style={styles.markAllText}>Ler todas</ThemedText>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
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
                  { backgroundColor: getNotificationColor(item.type) + "16" },
                ]}
              >
                <MaterialCommunityIcons
                  name={getNotificationIcon(item.type) as any}
                  size={22}
                  color={getNotificationColor(item.type)}
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
                color={C.text3}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    minHeight: 64,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backButton: { padding: 4 },
  title: { flex: 1, fontSize: 20, fontWeight: "800", color: C.text, marginLeft: 8 },
  markAllButton: { padding: 8 },
  markAllText: { color: C.primary, fontSize: 12, fontWeight: "800" },
  list: { padding: 16, gap: 10 },
  emptyList: { flexGrow: 1 },
  card: {
    flexDirection: "row",
    padding: 14,
    borderRadius: 14,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  unreadCard: { borderColor: C.primary + "55", backgroundColor: C.surface2 },
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
  cardTitle: { flex: 1, fontSize: 14, fontWeight: "800", color: C.text },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary },
  message: { fontSize: 13, lineHeight: 19, color: C.text2, marginTop: 4 },
  date: { fontSize: 11, color: C.text3, marginTop: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", justifyContent: "center", padding: 40 },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: C.text, marginTop: 14 },
  emptyText: {
    fontSize: 13,
    color: C.text3,
    textAlign: "center",
    lineHeight: 19,
    marginTop: 6,
  },
});
