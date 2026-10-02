import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider as NavigationThemeProvider } from "@react-navigation/native";
import { ThemeProvider, useAppTheme } from "../context/theme-context";
import { ToastProvider } from "../context/toast-context";
import DangerZoneLocationMonitor from "../components/DangerZoneLocationMonitor";

function AppChrome() {
  const { isDark, colors } = useAppTheme();

  const navigationTheme = {
    dark: isDark,
    colors: {
      primary: colors.primary,
      background: colors.bg,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.danger,
    },
  };

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <DangerZoneLocationMonitor />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.bg,
          },
          animation: "fade",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="admin-login" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      </Stack>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppChrome />
      </ToastProvider>
    </ThemeProvider>
  );
}
