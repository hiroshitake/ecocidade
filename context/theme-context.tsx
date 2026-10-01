import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, useColorScheme as useNativeColorScheme } from "react-native";
import { Colors } from "../constants/theme";

export type ThemeMode = "system" | "light" | "dark";

type ThemeContextValue = {
  mode: ThemeMode;
  isDark: boolean;
  isReady: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleDarkMode: () => void;
  colors: typeof Colors.light;
};

const STORAGE_KEY = "@ecocidade/theme-mode";

const getStoredModeSync = (): ThemeMode | null => {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark" || stored === "system") {
        return stored;
      }
    } catch {}
  }
  return null;
};

const getSystemSchemeSync = (): "light" | "dark" => {
  if (typeof window !== "undefined" && window.matchMedia) {
    try {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        return "dark";
      }
    } catch {}
  }
  return Appearance.getColorScheme() ?? "light";
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const nativeScheme = useNativeColorScheme();
  const initialStored = getStoredModeSync();
  const [mode, setModeState] = useState<ThemeMode>(initialStored ?? "system");
  const [isReady, setIsReady] = useState<boolean>(initialStored !== null);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!mounted) return;
        if (value === "light" || value === "dark" || value === "system") {
          setModeState(value);
        } else {
          setModeState("system");
        }
      })
      .catch(() => {
        if (!mounted) return;
        setModeState("system");
      })
      .finally(() => {
        if (mounted) {
          setIsReady(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const setMode = (nextMode: ThemeMode) => {
    setModeState(nextMode);
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY, nextMode);
      } catch {}
    }
    AsyncStorage.setItem(STORAGE_KEY, nextMode).catch(() => undefined);
  };

  const systemScheme = nativeScheme ?? getSystemSchemeSync();
  const isDark = mode === "dark" || (mode === "system" && systemScheme === "dark");
  const colors = isDark ? Colors.dark : Colors.light;

  const value = useMemo(
    () => ({
      mode,
      isDark,
      isReady,
      setMode,
      toggleDarkMode: () => setMode(isDark ? "light" : "dark"),
      colors,
    }),
    [mode, isDark, isReady, colors],
  );

  if (!isReady) {
    return null;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useAppTheme deve ser usado dentro de ThemeProvider.");
  }
  return context;
}

export function getThemeScheme(mode: ThemeMode, systemScheme: "light" | "dark" | null | undefined) {
  return mode === "system" ? (systemScheme ?? getSystemSchemeSync()) : mode;
}
