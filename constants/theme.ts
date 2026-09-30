// Ecocidade design system — "Mapa cívico calmo"
// Navy #0b1f4a · Brand #2456d6 · Mist #e9eefb · Leaf #22b573 · Sora + Manrope
export const C = {
  primary:      '#2456d6',
  primaryDark:  '#0b1f4a',
  primaryLight: '#e3eafb',
  navy:         '#0b1f4a',
  eco:          '#22b573',
  ecoLight:     '#dcf4e9',
  danger:       '#e5533c',
  dangerLight:  '#fce7e3',
  warning:      '#f5a623',
  warningLight: '#fef1dc',
  bg:           '#e9eefb',
  background:   '#e9eefb',
  surface:      '#ffffff',
  surface2:     '#f5f7fd',
  text:         '#0b1f4a',
  text2:        '#4a5578',
  text3:        '#8591ad',
  border:       '#e1e7f5',
  border2:      '#cfd8ec',
  white:        '#ffffff',
  tint:         '#2456d6',
};

export const S = {
  radius: { sm: 10, md: 14, lg: 18, xl: 24, full: 999 },
  shadow: {
    sm: {
      shadowColor: '#0b1f4a',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 2,
    },
    lg: {
      shadowColor: '#0b1f4a',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.14,
      shadowRadius: 32,
      elevation: 8,
    },
    danger: {
      shadowColor: '#e5533c',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.28,
      shadowRadius: 12,
      elevation: 6,
    },
  },
};

export const MOTION = {
  pressIn: 110,
  pressOut: 150,
  hover: 140,
  pressedScale: 0.985,
};

export const CONTROL = {
  filterHeight: 44,
  buttonHeight: 48,
  categoryTileHeight: 92,
  categoryIconSize: 22,
};

export const Colors = {
  light: C,
  dark: C,
};

export const Fonts = {
  rounded: 'Manrope_600SemiBold',
  display: 'Sora_700Bold',
  displayHeavy: 'Sora_800ExtraBold',
  body: 'Manrope_500Medium',
  bodyBold: 'Manrope_700Bold',
};

// Pass these as inline style entries (not inside StyleSheet.create) so the
// web build keeps them as inline font-family and the global body font does
// not override them: style={[styles.title, T.display]}
export const T = {
  display: { fontFamily: Fonts.displayHeavy },
  displayBold: { fontFamily: Fonts.display },
};
