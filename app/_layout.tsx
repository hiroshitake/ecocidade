import { Stack } from "expo-router";
import { ToastProvider } from "../context/toast-context";
import DangerZoneLocationMonitor from "../components/DangerZoneLocationMonitor";

export default function RootLayout() {
  return (
    <ToastProvider>
      <DangerZoneLocationMonitor />
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      </Stack>
    </ToastProvider>
  );
}
