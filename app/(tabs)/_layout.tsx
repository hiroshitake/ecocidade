import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
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
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: isMobile ? 76 : 84,
          paddingBottom: isMobile ? 12 : 9,
          paddingTop: isMobile ? 8 : 9,
          shadowColor: isDark ? "#000000" : colors.primary,
          shadowOffset: { width: 0, height: -5 },
          shadowOpacity: isDark ? 0.28 : 0.08,
          shadowRadius: 18,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "800",
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
              <IconSymbol size={25} name="map.fill" color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="new-report"
        options={{
          title: "Nova Denúncia",
          tabBarIcon: ({ color }) => (
            <View style={[styles.tabIconWrap, styles.actionIcon]}>
              <IconSymbol size={25} name="plus.circle.fill" color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "Denúncias",
          tabBarIcon: ({ color }) => (
            <View style={styles.tabIconWrap}>
              <IconSymbol size={25} name="list.bullet" color={color} />
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
              <IconSymbol size={25} name="shield.fill" color={color} />
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
              <IconSymbol size={25} name="person.fill" color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconWrap: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  actionIcon: {
    transform: [{ scale: 1.04 }],
  },
});
