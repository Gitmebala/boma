/**
 * BOMA design system — "Modern Homestead v2".
 *
 * Rebuilt around a few principles that the first pass violated:
 *
 *  1. HIERARCHY (Von Restorff) — a screen gets ONE hero number. Everything
 *     else steps down in size, weight and colour. The old 2x2 grid of four
 *     identical tiles made everything equally loud, so nothing landed.
 *  2. DATA-INK (Tufte) — surfaces carry information, not decoration. Tiles
 *     pair a figure with its trend and its context in the same footprint.
 *  3. LUMINANCE SEPARATION — dark mode needs real steps between bg / surface
 *     / raised, or cards dissolve into the page. v1 had ~3% separation; the
 *     scale below is built on measured steps.
 *  4. FITTS'S LAW — nothing interactive may sit under the floating tab bar,
 *     so the bar's true height is a token every screen pads by.
 *  5. SEMANTIC COLOUR — green/amber/red mean on-track / watch / act. Colour
 *     is never decorative, so a red figure always demands a decision.
 *
 * Type: Epilogue for display + money, Inter for everything else.
 */
import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------
// Each surface step is a deliberate luminance jump so a card always reads as
// sitting *on* the page rather than blending into it.

const light = {
  bg: '#F6F8F4',
  surface: '#FFFFFF',
  surfaceSunken: '#EDF1EA',
  surfaceRaised: '#FFFFFF',
  surfaceContainer: '#E6EBE3',
  bgElevated: '#FFFFFF',

  border: '#DCE3DA',
  borderStrong: '#C2CCC1',
  borderFaint: '#E9EEE6',

  textPrimary: '#141812',
  textSecondary: '#414A3F',
  textTertiary: '#6E786C',
  textQuiet: '#98A196',

  accent: '#115238',
  accentText: '#FFFFFF',
  accentSoft: '#DDEFE4',
  accentContainer: '#1C6644',
  onAccentContainer: '#B4EBCD',

  terracotta: '#C6522F',
  terracottaSoft: '#FBE6DE',

  success: '#256B47',
  successSoft: '#DCEFE3',
  warning: '#9A6608',
  warningSoft: '#FBEED4',
  danger: '#A93B3D',
  dangerSoft: '#FAE1E1',
  info: '#3C6C82',
  infoSoft: '#DFEDF3',

  overlay: 'rgba(20,24,18,0.42)',
  tabBarBg: 'rgba(255,255,255,0.92)',
  scrim: 'rgba(246,248,244,0)',
  scrimSolid: '#F6F8F4',
  shadow: '#0E2A1C',
};

const dark = {
  // Measured steps: #0A0D0B -> #141915 -> #1C231E gives clear card edges
  // without the washed grey that plagues most "dark green" palettes.
  bg: '#0A0D0B',
  surface: '#141915',
  surfaceSunken: '#0F140F',
  surfaceRaised: '#1C231E',
  surfaceContainer: '#222A24',
  bgElevated: '#171E19',

  border: '#28312A',
  borderStrong: '#3A453C',
  borderFaint: '#1E251F',

  textPrimary: '#EEF3EC',
  textSecondary: '#B4BEB3',
  textTertiary: '#828C81',
  textQuiet: '#5F685E',

  accent: '#7FD3A3',
  accentText: '#06180F',
  accentSoft: '#132A1D',
  accentContainer: '#1E5C3E',
  onAccentContainer: '#B4EBCD',

  terracotta: '#E8906E',
  terracottaSoft: '#2C1710',
  successSoft: '#12251A',
  success: '#7FD3A3',
  warning: '#E8B75A',
  warningSoft: '#2A2010',
  danger: '#E88486',
  dangerSoft: '#2C1415',
  info: '#8CBBD1',
  infoSoft: '#122029',

  overlay: 'rgba(0,0,0,0.66)',
  tabBarBg: 'rgba(20,25,21,0.94)',
  scrim: 'rgba(10,13,11,0)',
  scrimSolid: '#0A0D0B',
  shadow: '#000000',
};

export type ThemeColors = typeof light;
export type SchemeName = 'light' | 'dark';

export const palettes = { light, dark };

// ---------------------------------------------------------------------------
// Type
// ---------------------------------------------------------------------------
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

/** Money and any figure that changes in place gets tabular figures so digits
 *  don't jitter as values update. */
const tabular = { fontVariant: ['tabular-nums' as const] };

export const type = {
  display: { fontSize: 40, lineHeight: 46, letterSpacing: -1.1, fontFamily: font.displayHeavy },
  hero: { fontSize: 32, lineHeight: 39, letterSpacing: -0.7, fontFamily: font.display },
  h1: { fontSize: 26, lineHeight: 32, letterSpacing: -0.4, fontFamily: font.display },
  h2: { fontSize: 21, lineHeight: 28, letterSpacing: -0.2, fontFamily: font.displaySemi },
  h3: { fontSize: 17, lineHeight: 23, fontFamily: font.displaySemi },

  // Figures — always tabular.
  statHero: { fontSize: 44, lineHeight: 50, letterSpacing: -1.4, fontFamily: font.displayHeavy, ...tabular },
  statNumberLg: { fontSize: 34, lineHeight: 40, letterSpacing: -0.8, fontFamily: font.displayHeavy, ...tabular },
  statNumber: { fontSize: 26, lineHeight: 31, letterSpacing: -0.5, fontFamily: font.displayHeavy, ...tabular },
  statSm: { fontSize: 19, lineHeight: 24, letterSpacing: -0.3, fontFamily: font.displaySemi, ...tabular },

  bodyLg: { fontSize: 17, lineHeight: 26, fontFamily: font.body },
  body: { fontSize: 15, lineHeight: 22, fontFamily: font.body },
  bodyMed: { fontSize: 15, lineHeight: 22, fontFamily: font.bodySemi },
  label: { fontSize: 13, lineHeight: 18, letterSpacing: 0.1, fontFamily: font.bodySemi },
  caption: { fontSize: 13, lineHeight: 18, fontFamily: font.body },
  micro: { fontSize: 11, lineHeight: 15, letterSpacing: 0.6, fontFamily: font.bodySemi },
};

// ---------------------------------------------------------------------------
// Space / radius
// ---------------------------------------------------------------------------
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
  gutter: 20,
  touchTarget: 48,
};

export const radius = { xs: 6, sm: 8, md: 12, lg: 16, xl: 22, xxl: 28, pill: 999 };

// ---------------------------------------------------------------------------
// Layout — the tab bar's real footprint
// ---------------------------------------------------------------------------
/**
 * The tab bar floats (position:absolute), so it covers whatever is beneath it.
 * v1 left every screen to guess its height, which is why "28 days old",
 * "Help & support" and the sheet's Save button all ended up underneath it.
 * These are the single source of truth — pair with `useScreenPadding()`.
 */
export const layout = {
  tabBarHeight: 62,
  tabBarBottomGap: 12,
  /** Clearance any scroll view must leave below its last item. */
  tabBarClearance: 62 + 12 + 16,
  headerHeight: 52,
  maxContentWidth: 560,
};

// ---------------------------------------------------------------------------
// Elevation — subtle, and only where depth carries meaning
// ---------------------------------------------------------------------------
export function elevation(level: 0 | 1 | 2 | 3, shadowColor: string) {
  if (level === 0) return {};
  const map = {
    1: { shadowOpacity: 0.06, shadowRadius: 6, elevation: 2, offset: 2 },
    2: { shadowOpacity: 0.1, shadowRadius: 14, elevation: 5, offset: 5 },
    3: { shadowOpacity: 0.16, shadowRadius: 26, elevation: 10, offset: 10 },
  }[level];
  return {
    shadowColor,
    shadowOpacity: map.shadowOpacity,
    shadowRadius: map.shadowRadius,
    shadowOffset: { width: 0, height: map.offset },
    elevation: map.elevation,
  };
}

// ---------------------------------------------------------------------------
// Motion — confirm, don't entertain
// ---------------------------------------------------------------------------
export const motion = {
  fast: 140,
  base: 220,
  slow: 340,
  springSnappy: { damping: 18, stiffness: 220, mass: 0.7 },
  springSoft: { damping: 20, stiffness: 140, mass: 0.9 },
  easeOut: [0.16, 1, 0.3, 1] as const,
};

export function useThemeColors(scheme: SchemeName | null | undefined): ThemeColors {
  return scheme === 'dark' ? dark : light;
}
