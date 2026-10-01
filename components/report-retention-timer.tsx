import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { C } from "../constants/theme";
import { ThemedText } from "./themed-text";

type Audience = "user" | "admin";

interface ReportRetentionTimerProps {
  resolvedAt?: string | null;
  audience: Audience;
}

const USER_RETENTION_MS = 3 * 24 * 60 * 60 * 1000;
const ADMIN_RETENTION_MS = 10 * 24 * 60 * 60 * 1000;

function formatRemaining(ms: number) {
  if (ms <= 0) return "Prazo encerrado";

  const totalMinutes = Math.max(1, Math.floor(ms / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

export default function ReportRetentionTimer({ resolvedAt, audience }: ReportRetentionTimerProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const deadline = useMemo(() => {
    if (!resolvedAt) return null;
    const resolvedTime = new Date(resolvedAt).getTime();
    if (!Number.isFinite(resolvedTime)) return null;
    return resolvedTime + (audience === "user" ? USER_RETENTION_MS : ADMIN_RETENTION_MS);
  }, [resolvedAt, audience]);

  if (!deadline) return null;

  const remaining = deadline - now;
  const expired = remaining <= 0;
  const isUser = audience === "user";

  return (
    <View style={[styles.card, expired && styles.expiredCard]}>
      <View style={[styles.icon, expired && styles.expiredIcon]}>
        <MaterialCommunityIcons
          name={isUser ? "eye-clock-outline" : "timer-alert-outline"}
          size={20}
          color={expired ? C.text3 : isUser ? C.primary : C.eco}
        />
      </View>
      <View style={styles.copy}>
        <ThemedText style={styles.title}>
          {expired
            ? isUser
              ? "Prazo de visibilidade encerrado"
              : "Prazo de exclusão atingido"
            : isUser
              ? "Tempo restante de visibilidade"
              : "Exclusão automática em"}
        </ThemedText>
        <ThemedText style={[styles.remaining, expired && styles.expiredText]}>
          {expired
            ? isUser
              ? "Esta denúncia já foi retirada da visualização pública."
              : "A denúncia será removida pelo processo automático do sistema."
            : formatRemaining(remaining)}
        </ThemedText>
        <ThemedText style={styles.helper}>
          {isUser
            ? "Após 3 dias da conclusão, ela deixa de aparecer para os usuários."
            : "A exclusão definitiva ocorre após 10 dias da conclusão."}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 13,
    borderRadius: 14,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
  },
  expiredCard: { opacity: 0.78 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(26, 95, 212, 0.10)",
  },
  expiredIcon: { backgroundColor: C.border },
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 11, fontWeight: "800", color: C.text3 },
  remaining: { marginTop: 2, fontSize: 18, fontWeight: "900", color: C.text },
  expiredText: { fontSize: 13, color: C.text2 },
  helper: { marginTop: 4, fontSize: 11, lineHeight: 16, color: C.text3 },
});
