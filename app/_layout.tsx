import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, useAppTheme } from "../context/theme-context";
import { ToastProvider } from "../context/toast-context";
import DangerZoneLocationMonitor from "../components/DangerZoneLocationMonitor";

function AppChrome() {
  const { isDark } = useAppTheme();

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <DangerZoneLocationMonitor />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: isDark ? "#0b0f19" : "#f8fafc",
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
    </>
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
