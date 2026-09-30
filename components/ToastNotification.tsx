import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../context/theme-context";

export type ToastNotificationType = "error" | "warning" | "success";

export interface ToastNotificationProps {
  message: string;
  type: ToastNotificationType;
  onClose?: () => void;
  duration?: number;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({
  message,
  type,
  onClose,
  duration = 4000,
}) => {
  const { colors } = useAppTheme();
  const translateY = useRef(new Animated.Value(-20)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -12, duration: 200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => onClose?.());
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose, opacity, translateY]);

  const palette = {
    error: { icon: "alert-circle", background: colors.dangerLight, color: colors.danger },
    warning: { icon: "alert-triangle", background: colors.warningLight, color: colors.warning },
    success: { icon: "check-circle", background: colors.ecoLight, color: colors.eco },
  } as const;

  const theme = palette[type];

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.toast,
        {
          backgroundColor: theme.background,
          borderColor: colors.border,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: colors.surface }]}>
          <Ionicons name={theme.icon as any} size={18} color={theme.color} />
        </View>
        <Text style={[styles.message, { color: theme.color }]}>{message}</Text>
        <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
          <Ionicons name="close" size={16} color={theme.color} />
        </Pressable>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toast: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 6,
    alignSelf: "flex-end",
    width: "100%",
    maxWidth: 380,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  message: { flex: 1, fontSize: 14, fontWeight: "700", lineHeight: 19 },
  closeButton: { padding: 4 },
});
