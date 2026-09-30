import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";
import {
  Sora_600SemiBold,
  Sora_700Bold,
  Sora_800ExtraBold,
} from "@expo-google-fonts/sora";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import DangerZoneLocationMonitor from "../components/DangerZoneLocationMonitor";
import { C } from "../constants/theme";
import { ToastProvider } from "../context/toast-context";

// Web: apply Manrope to all text and Sora to bold/heavy text globally,
// so every screen picks up the new type system without per-screen edits.
function useWebTypography() {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const id = "ecocidade-typography";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Sora:wght@600;700;800&display=swap";
    document.head.appendChild(link);
    const style = document.createElement("style");
    style.id = id;
    // Icons and explicit display fonts are passed as inline styles, so they
    // are excluded here and keep their own font family.
    style.textContent = `
      html, body, #root { background: ${C.bg}; }
      [dir="auto"]:not([style*="font-family"]), input, textarea {
        font-family: "Manrope", system-ui, sans-serif !important;
        -webkit-font-smoothing: antialiased;
      }
    `;
    document.head.appendChild(style);
  }, []);
}

export default function RootLayout() {
  useWebTypography();
  useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
  });

  return (
    <ToastProvider>
      <DangerZoneLocationMonitor />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: C.bg },
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
