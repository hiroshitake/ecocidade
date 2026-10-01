import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { HapticTab } from "../../components/haptic-tab";
import { IconSymbol } from "../../components/ui/icon-symbol";
import { useAppTheme } from "../../context/theme-context";

export default function TabLayout() {
  const { isDark, colors } = useAppTheme();
  const isMobile = Platform.OS !== "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text3,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: !isMobile,
        tabBarBackground: () => (
          <View
            style={{
              flex: 1,
              backgroundColor: isDark ? "#111827" : colors.surface,
            }}
          />
        ),
        tabBarStyle: {
          backgroundColor: isDark ? "#111827" : colors.surface,
          borderTopColor: isDark ? "#1f2937" : colors.border,
          borderTopWidth: 1,
          height: isMobile ? 70 : 76,
          paddingBottom: isMobile ? 10 : 8,
          paddingTop: 8,
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDark ? 0.25 : 0.05,
          shadowRadius: 8,
          elevation: 4,
          overflow: "visible",
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginTop: 0,
        },
      }}
    >
      <Tabs.Screen
        name="map"
        options={{
          title: "Mapa",
          tabBarIcon: ({ color }) => (
            <View style={styles.tabIconWrap}>
              <IconSymbol size={22} name="map.fill" color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "Minhas Denúncias",
          tabBarIcon: ({ color }) => (
            <View style={styles.tabIconWrap}>
              <IconSymbol size={22} name="list.bullet" color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="new-report"
        options={{
          title: "Nova Denúncia",
          tabBarLabel: () => null,
          tabBarIcon: () => (
            <View
              style={[
                styles.raisedButton,
                {
                  backgroundColor: "#0f52ba",
                  borderColor: isDark ? "#111827" : colors.surface,
                },
              ]}
            >
              <Ionicons name="add" size={30} color="#ffffff" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="security"
        options={{
          title: "Segurança",
          tabBarIcon: ({ color }) => (
            <View style={styles.tabIconWrap}>
              <IconSymbol size={22} name="shield.fill" color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color }) => (
            <View style={styles.tabIconWrap}>
              <IconSymbol size={22} name="person.fill" color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconWrap: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  raisedButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    top: -14,
    borderWidth: 3,
    shadowColor: "#0f52ba",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
  },
});
