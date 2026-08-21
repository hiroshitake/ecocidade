import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";

import { HapticTab } from "../../components/haptic-tab";
import { IconSymbol } from "../../components/ui/icon-symbol";
import { C } from "../../constants/theme";
import { useColorScheme } from "../../hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isMobile = Platform.OS !== "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: "#8aa0c2",
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: !isMobile,
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#e4ecfa",
          borderTopWidth: 1,
          height: isMobile ? 74 : 88,
          paddingBottom: isMobile ? 12 : 10,
          paddingTop: isMobile ? 8 : 10,
          shadowColor: "#1a5fd4",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginTop: isMobile ? 0 : 0,
        },
      }}
    >
      <Tabs.Screen
        name="map"
        options={{
          title: "Mapa",
          tabBarIcon: ({ color }) => (
            <View style={styles.tabIconWrap}>
              <IconSymbol size={26} name="map.fill" color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="new-report"
        options={{
          title: "Nova Denúncia",
          tabBarIcon: ({ color }) => (
            <View style={styles.tabIconWrap}>
              <IconSymbol size={26} name="plus.circle.fill" color={color} />
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
              <IconSymbol size={26} name="list.bullet" color={color} />
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
              <IconSymbol size={26} name="shield.fill" color={color} />
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
              <IconSymbol size={26} name="person.fill" color={color} />
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
    borderRadius: 10,
  },
});
