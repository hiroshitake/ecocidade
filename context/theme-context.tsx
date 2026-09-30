import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, useColorScheme as useNativeColorScheme } from "react-native";
import { Colors } from "../constants/theme";

export type ThemeMode = "system" | "light" | "dark";

type ThemeContextValue = {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleDarkMode: () => void;
  colors: typeof Colors.light;
};

const STORAGE_KEY = "@ecocidade/theme-mode";

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useNativeColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (value === "light" || value === "dark" || value === "system") {
          setModeState(value);
        }
      })
      .catch(() => undefined);
  }, []);

  const setMode = (nextMode: ThemeMode) => {
    setModeState(nextMode);
    AsyncStorage.setItem(STORAGE_KEY, nextMode).catch(() => undefined);
  };

  const isDark = mode === "dark" || (mode === "system" && systemScheme === "dark");
  const colors = isDark ? Colors.dark : Colors.light;

  const value = useMemo(
    () => ({
      mode,
      isDark,
      setMode,
      toggleDarkMode: () => setMode(isDark ? "light" : "dark"),
      colors,
    }),
    [mode, isDark, colors],
  );

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
  return mode === "system" ? (systemScheme ?? Appearance.getColorScheme() ?? "light") : mode;
}
