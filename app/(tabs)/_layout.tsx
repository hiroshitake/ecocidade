import { Tabs } from "expo-router";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { HapticTab } from "../../components/haptic-tab";
import { IconSymbol } from "../../components/ui/icon-symbol";
import { C, Fonts, T } from "../../constants/theme";
import { useIsWide } from "../../hooks/use-is-wide";

const DESKTOP_BREAKPOINT = 1024;

function Brand() {
  return (
    <View style={styles.brand}>
      <View style={styles.brandMark}>
        <Text style={[styles.brandMarkText, T.display]}>e</Text>
      </View>
      <View>
        <Text style={[styles.brandName, T.display]}>Ecocidade</Text>
        <Text style={styles.brandSub}>DASHBOARD CIDADÃ</Text>
      </View>
    </View>
  );
}

export default function TabLayout() {
  const isNative = Platform.OS !== "web";
  const isDesktop = useIsWide(DESKTOP_BREAKPOINT);

  const icon =
    (name: Parameters<typeof IconSymbol>[0]["name"]) =>
    ({ color, focused }: { color: string; focused: boolean }) => (
      <View
        style={[
          styles.tabIconWrap,
          isDesktop && focused && styles.tabIconWrapActive,
        ]}
      >
        <IconSymbol size={isDesktop ? 20 : 24} name={name} color={color} />
      </View>
    );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarPosition: isDesktop ? "left" : "bottom",
        tabBarVariant: isDesktop ? "material" : "uikit",
        tabBarLabelPosition: isDesktop ? "beside-icon" : "below-icon",
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.text3,
        tabBarActiveBackgroundColor: isDesktop ? C.primaryLight : undefined,
        tabBarShowLabel: !isNative,
        sceneStyle: { backgroundColor: C.bg },
        tabBarStyle: isDesktop
          ? {
              width: 264,
              backgroundColor: C.surface,
              borderRightColor: C.border,
              borderRightWidth: 1,
              paddingHorizontal: 16,
              paddingTop: 96,
            }
          : {
              backgroundColor: C.surface,
              borderTopColor: C.border,
              borderTopWidth: 1,
              height: isNative ? 72 : 76,
              paddingBottom: isNative ? 12 : 10,
              paddingTop: 8,
              shadowColor: C.navy,
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.05,
              shadowRadius: 12,
              elevation: 8,
            },
        tabBarItemStyle: isDesktop
          ? {
              borderRadius: 14,
              marginVertical: 3,
              paddingHorizontal: 12,
              height: 48,
              justifyContent: "flex-start",
            }
          : undefined,
        tabBarLabelStyle: isDesktop
          ? {
              fontSize: 14,
              fontFamily: Fonts.bodyBold,
              fontWeight: "700",
              marginLeft: 12,
            }
          : {
              fontSize: 10,
              fontFamily: Fonts.bodyBold,
              fontWeight: "700",
              marginTop: 2,
            },
        ...(isDesktop
          ? {
              // Sidebar header: brand lockup above the nav items
              tabBarBackground: () => (
                <View style={styles.sidebarBg}>
                  <Brand />
                </View>
              ),
            }
          : {}),
      }}
    >
      <Tabs.Screen
        name="map"
        options={{ title: "Mapa", tabBarIcon: icon("map.fill") }}
      />
      <Tabs.Screen
        name="new-report"
        options={{
          title: isDesktop ? "Nova Denúncia" : "Reportar",
          tabBarIcon: icon("plus.circle.fill"),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{ title: "Denúncias", tabBarIcon: icon("list.bullet") }}
      />
      <Tabs.Screen
        name="security"
        options={{ title: "Segurança", tabBarIcon: icon("shield.fill") }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Perfil", tabBarIcon: icon("person.fill") }}
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
  tabIconWrapActive: {},
  sidebarBg: {
    flex: 1,
    backgroundColor: C.surface,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 12 },
  brandMark: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  brandMarkText: {
    color: C.eco,
    fontSize: 20,
    fontFamily: Fonts.displayHeavy,
    fontWeight: "800",
  },
  brandName: {
    color: C.text,
    fontSize: 18,
    fontFamily: Fonts.displayHeavy,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  brandSub: {
    color: C.text3,
    fontSize: 10,
    fontFamily: Fonts.bodyBold,
    fontWeight: "700",
    letterSpacing: 2,
    marginTop: 2,
  },
});
