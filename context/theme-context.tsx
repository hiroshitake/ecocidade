import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, Platform, useColorScheme as useNativeColorScheme } from "react-native";
import { Colors } from "../constants/theme";

export type ThemeMode = "system" | "light" | "dark";
type ThemeContextValue = {
  mode: ThemeMode; isDark: boolean; isReady: boolean;
  setMode: (mode: ThemeMode) => void; toggleDarkMode: () => void;
  colors: typeof Colors.light;
};
const STORAGE_KEY = "@ecocidade/theme-mode";

const getStoredModeSync = (): ThemeMode | null => {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" || stored === "system" ? stored : null;
  } catch { return null; }
};
const getSystemSchemeSync = (): "light" | "dark" => {
  if (typeof window !== "undefined" && window.matchMedia) {
    try { return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"; } catch {}
  }
  return Appearance.getColorScheme() ?? "light";
};
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const nativeScheme = useNativeColorScheme();
  const initialStored = getStoredModeSync();
  const [mode, setModeState] = useState<ThemeMode>(initialStored ?? "system");
  const [systemScheme, setSystemScheme] = useState<"light" | "dark">(nativeScheme ?? getSystemSchemeSync());

  useEffect(() => {
    const appearanceListener = Appearance.addChangeListener(({ colorScheme }) => {
      if (colorScheme) setSystemScheme(colorScheme);
    });
    let mediaQuery: MediaQueryList | null = null;
    let mediaHandler: ((e: MediaQueryListEvent) => void) | null = null;
    if (typeof window !== "undefined" && window.matchMedia) {
      try {
        mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        mediaHandler = (e: MediaQueryListEvent) => setSystemScheme(e.matches ? "dark" : "light");
        mediaQuery.addEventListener("change", mediaHandler);
      } catch {}
    }
    if (Platform.OS !== "web") {
      AsyncStorage.getItem(STORAGE_KEY).then((value) => {
        if (value === "light" || value === "dark" || value === "system") setModeState(value);
      }).catch(() => {});
    }
    return () => {
      appearanceListener.remove();
      if (mediaQuery && mediaHandler) {
        try { mediaQuery.removeEventListener("change", mediaHandler); } catch {}
      }
    };
  }, []);

  const setMode = (nextMode: ThemeMode) => {
    setModeState(nextMode);
    if (typeof window !== "undefined" && window.localStorage) {
      try { window.localStorage.setItem(STORAGE_KEY, nextMode); } catch {}
    }
    if (Platform.OS !== "web") AsyncStorage.setItem(STORAGE_KEY, nextMode).catch(() => undefined);
  };

  const isDark = mode === "dark" || (mode === "system" && systemScheme === "dark");
  const colors = isDark ? Colors.dark : Colors.light;

  useEffect(() => {
    if (typeof document === "undefined") return;
    const backgroundColor = isDark ? Colors.dark.bg : Colors.light.bg;
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    document.documentElement.style.backgroundColor = backgroundColor;
    if (document.body) document.body.style.backgroundColor = backgroundColor;
    const themeMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (themeMeta) themeMeta.content = backgroundColor;
  }, [isDark]);

  const value = useMemo(() => ({
    mode, isDark, isReady: true, setMode,
    toggleDarkMode: () => setMode(isDark ? "light" : "dark"), colors,
  }), [mode, isDark, colors]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useAppTheme deve ser usado dentro de ThemeProvider.");
  return context;
}
export function getThemeScheme(mode: ThemeMode, systemScheme: "light" | "dark" | null | undefined) {
  return mode === "system" ? (systemScheme ?? getSystemSchemeSync()) : mode;
}
