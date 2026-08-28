/**
 * BOMA design tokens — "Modern Homestead".
 *
 * These are the real tokens from the Stitch design system (see the exported
 * screens in Downloads: Farmer Support Hub, Financial Ledger, Debt Book,
 * Symptom Checker, Agrovet Directory). Light-first, earthy, warm — a farm
 * tool, not a fintech app.
 *
 *   primary         #115238  deep forest green
 *   growth-green    #2E6B4F  healthy / on-track
 *   earth-terracotta #D95D39 action, warmth, secondary emphasis
 *   alert-amber     #F2A622  attention / due soon
 *   status-red      #BC4749  overdue / danger
 *   charcoal-leaf   #1B1C1C  primary text
 *   background      #F8FAF6  dust white
 *
 * Type: Epilogue for headlines and money figures, Inter for everything else.
 */
import { Platform } from 'react-native';

const light = {
  bg: '#F8FAF6',
  bgElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceSunken: '#F2F4F0',
  surfaceContainer: '#ECEFEA',
  border: '#DDE3DD',
  borderStrong: '#BFC9C1',
  textPrimary: '#1B1C1C',
  textSecondary: '#404943',
  textTertiary: '#707973',
  accent: '#115238',
  accentText: '#FFFFFF',
  accentSoft: '#DCEFE3',
  accentContainer: '#2E6B4F',
  onAccentContainer: '#A9E9C6',
  terracotta: '#D95D39',
  terracottaSoft: '#FBE7E0',
  success: '#2E6B4F',
  successSoft: '#DFEFE4',
  warning: '#B07A12',
  warningSoft: '#FDF0DA',
  danger: '#BC4749',
  dangerSoft: '#FBE4E4',
  skyBlue: '#89B3C4',
  overlay: 'rgba(27,28,28,0.45)',
  tabBarBg: 'rgba(248,250,246,0.94)',
  shadow: '#11523814',
};

const dark = {
  bg: '#101410',
  bgElevated: '#171C17',
  surface: '#191F19',
  surfaceSunken: '#131813',
  surfaceContainer: '#1E241E',
  border: '#2A312A',
  borderStrong: '#3A423A',
  textPrimary: '#EDF1EC',
  textSecondary: '#AFB8AF',
  textTertiary: '#7C857C',
  accent: '#86C9A3',
  accentText: '#0C1A12',
  accentSoft: '#172A1F',
  accentContainer: '#2E6B4F',
  onAccentContainer: '#A9E9C6',
  terracotta: '#E88564',
  terracottaSoft: '#2E1811',
  success: '#86C9A3',
  successSoft: '#16261B',
  warning: '#E3B24C',
  warningSoft: '#2A2110',
  danger: '#E28183',
  dangerSoft: '#2C1516',
  skyBlue: '#89B3C4',
  overlay: 'rgba(0,0,0,0.6)',
  tabBarBg: 'rgba(16,20,16,0.92)',
  shadow: '#00000040',
};

export type ThemeColors = typeof light;

export const palettes = { light, dark };

// ---------- Type: Epilogue (display) + Inter (everything else) ----------
export const font = {
  display: 'Epilogue_700Bold',
  displayHeavy: 'Epilogue_800ExtraBold',
  displaySemi: 'Epilogue_600SemiBold',
  displayMed: 'Epilogue_600SemiBold',
  body: 'Inter_400Regular',
  bodyMed: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
};

export const type = {
  // headline-lg
  hero: { fontSize: 32, lineHeight: 40, letterSpacing: -0.6, fontFamily: font.display },
  // headline-lg-mobile
  h1: { fontSize: 26, lineHeight: 32, letterSpacing: -0.3, fontFamily: font.display },
  // headline-md
  h2: { fontSize: 22, lineHeight: 30, fontFamily: font.displaySemi },
  // headline-sm
  h3: { fontSize: 18, lineHeight: 24, fontFamily: font.displaySemi },
  // financial-display — money figures get their own weight, per the Stitch system
  statNumber: { fontSize: 30, lineHeight: 36, fontFamily: font.displayHeavy },
  statNumberLg: { fontSize: 36, lineHeight: 44, fontFamily: font.displayHeavy },
  // body-md / body-lg
  body: { fontSize: 16, lineHeight: 24, fontFamily: font.body },
  bodyLg: { fontSize: 18, lineHeight: 28, fontFamily: font.body },
  bodyMed: { fontSize: 16, lineHeight: 24, fontFamily: font.bodySemi },
  // label-md
  label: { fontSize: 14, lineHeight: 20, letterSpacing: 0.14, fontFamily: font.bodySemi },
  caption: { fontSize: 13, lineHeight: 18, fontFamily: font.body },
  micro: { fontSize: 11, lineHeight: 16, letterSpacing: 0.55, fontFamily: font.bodySemi },
};

// ---------- Spacing (Stitch scale) ----------
export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 16,
  xl: 20,
  xxl: 32,
  xxxl: 40,
  gutter: 16,
  touchTarget: 56,
};

export const radius = { sm: 4, md: 8, lg: 12, xl: 16, pill: 999 };

// ---------- Motion — confirm, don't entertain ----------
export const motion = {
  fast: 140,
  base: 220,
  slow: 340,
  springSnappy: { damping: 18, stiffness: 220, mass: 0.7 },
  springSoft: { damping: 20, stiffness: 140, mass: 0.9 },
  easeOut: [0.16, 1, 0.3, 1] as const,
};

export function useThemeColors(scheme: 'light' | 'dark' | null | undefined): ThemeColors {
  return scheme === 'dark' ? dark : light;
}
