import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { C } from "../constants/theme";

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
  const translateY = useRef(new Animated.Value(-20)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showAnimation = Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]);

    showAnimation.start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -12,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onClose?.();
      });
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose, opacity, translateY]);

  const palette = {
    error: {
      icon: "alert-circle",
      background: C.dangerLight,
      color: C.danger,
    },
    warning: {
      icon: "alert-triangle",
      background: C.warningLight,
      color: C.warning,
    },
    success: {
      icon: "check-circle",
      background: C.ecoLight,
      color: C.eco,
    },
  } as const;

  const theme = palette[type];

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.toast,
        {
          backgroundColor: theme.background,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.content}>
        <Ionicons name={theme.icon as any} size={18} color={theme.color} />
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
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
    alignSelf: "flex-end",
    width: "100%",
    maxWidth: 360,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
  closeButton: {
    padding: 2,
  },
});
