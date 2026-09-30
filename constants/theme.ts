export const lightColors = {
  background: "#F6F8FB",
  surface: "#FFFFFF",
  surfaceMuted: "#EEF2F6",
  surfaceStrong: "#E4EAF2",

  textPrimary: "#172033",
  textSecondary: "#526078",
  textTertiary: "#718096",
  textInverse: "#FFFFFF",

  border: "#DCE2EA",
  borderStrong: "#C8D1DD",

  primary: "#1557C0",
  primaryHover: "#10499F",
  primaryPressed: "#0D3D8F",
  primarySoft: "#E7F0FF",

  success: "#16834B",
  successSoft: "#E7F7EE",
  warning: "#A96800",
  warningSoft: "#FFF4D6",
  danger: "#C62828",
  dangerSoft: "#FDECEC",
  info: "#2563A9",
  infoSoft: "#E8F2FC",

  white: "#FFFFFF",
  black: "#111827",

  // Temporary compatibility aliases for legacy components.
  primaryDark: "#0D3D8F",
  primaryLight: "#E7F0FF",
  eco: "#16834B",
  ecoLight: "#E7F7EE",
  dangerLight: "#FDECEC",
  warningLight: "#FFF4D6",
  bg: "#F6F8FB",
  surface2: "#EEF2F6",
  text: "#172033",
  text2: "#526078",
  text3: "#718096",
  border2: "#C8D1DD",
  tint: "#1557C0",
} as const;

export const darkColors = {
  background: "#0B111B",
  surface: "#111A27",
  surfaceMuted: "#172232",
  surfaceStrong: "#1E2C3E",

  textPrimary: "#F4F7FB",
  textSecondary: "#B5C0D0",
  textTertiary: "#8996A8",
  textInverse: "#0B111B",

  border: "#263447",
  borderStrong: "#35465C",

  primary: "#6EA2FF",
  primaryHover: "#89B4FF",
  primaryPressed: "#A8C7FF",
  primarySoft: "#172C4D",

  success: "#48C982",
  successSoft: "#173D2B",
  warning: "#F2B84B",
  warningSoft: "#44351C",
  danger: "#F06A70",
  dangerSoft: "#472229",
  info: "#72B5F2",
  infoSoft: "#19344D",

  white: "#FFFFFF",
  black: "#000000",

  // Temporary compatibility aliases for legacy components.
  primaryDark: "#A8C7FF",
  primaryLight: "#172C4D",
  eco: "#48C982",
  ecoLight: "#173D2B",
  dangerLight: "#472229",
  warningLight: "#44351C",
  bg: "#0B111B",
  surface2: "#172232",
  text: "#F4F7FB",
  text2: "#B5C0D0",
  text3: "#8996A8",
  border2: "#35465C",
  tint: "#6EA2FF",
} as const;

export type ThemeColors = typeof lightColors;

export const Colors = {
  light: lightColors,
  dark: darkColors,
};

export const C = {
  primary: lightColors.primary,
  primaryDark: lightColors.primaryDark,
  primaryLight: lightColors.primaryLight,
  eco: lightColors.eco,
  ecoLight: lightColors.ecoLight,
  danger: lightColors.danger,
  dangerLight: lightColors.dangerLight,
  warning: lightColors.warning,
  warningLight: lightColors.warningLight,
  bg: lightColors.bg,
  surface: lightColors.surface,
  surface2: lightColors.surface2,
  text: lightColors.text,
  text2: lightColors.text2,
  text3: lightColors.text3,
  border: lightColors.border,
  border2: lightColors.border2,
  white: lightColors.white,
  tint: lightColors.tint,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  section: 48,
  display: 64,
} as const;

export const Radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const Typography = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: "800" as const },
  heading: { fontSize: 24, lineHeight: 30, fontWeight: "800" as const },
  headingSm: { fontSize: 20, lineHeight: 26, fontWeight: "700" as const },
  bodyLg: { fontSize: 17, lineHeight: 25, fontWeight: "400" as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: "400" as const },
  bodySm: { fontSize: 13, lineHeight: 19, fontWeight: "400" as const },
  label: { fontSize: 13, lineHeight: 18, fontWeight: "600" as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "500" as const },
} as const;

export const S = {
  radius: Radius,
  shadow: {
    sm: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
    },
    md: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 4,
    },
    lg: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.18,
      shadowRadius: 28,
      elevation: 8,
    },
    danger: {
      shadowColor: lightColors.danger,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.22,
      shadowRadius: 12,
      elevation: 5,
    },
  },
};

export const Fonts = {
  rounded: "System",
  body: "System",
} as const;
