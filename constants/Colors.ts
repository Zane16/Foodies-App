/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

// New Color Scheme
const purplePrimary = "#4A5EE8" // Main accent (CTAs, active states, vendor primary)
const purpleLight = "#7C7FE5" // Light purple variation
const purpleDark = "#4A4DB8" // Dark purple variation
const tealSecondary = "#14B8A6" // Secondary accent (navigation, deliverer actions)

// Dark Neutrals
const darkNavy = "#1E293B" // Headers
const darkCharcoal = "#2D3748"
const darkSlate = "#1A202C" // Text

// Grays
const backgroundGray = "#F7F7F7"
const surfaceWhite = "#FFFFFF"
const textPrimary = "#1A202C"
const textSecondary = "#6B7280"
const textTertiary = "#9CA3AF"
const borderGray = "#E5E7EB"

// Status Colors
const successGreen = "#10B981"
const warningOrange = "#F59E0B"
const errorRed = "#EF4444"
const infoBlue = "#3B82F6"

export const BorderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 9999,
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
} as const;

type ColorTheme = {
  text: string;
  background: string;
  surface?: string;
  tint: string;
  icon: string;
  tabIconDefault: string;
  tabIconSelected: string;
  border: string;
  primary: string;
  primaryText?: string;
  primaryLight?: string;
  primaryDark?: string;
  secondary?: string;
  input: string;
  inputBorder?: string;
  placeholder?: string;
  card?: string;
  mutedText?: string;
  cardBorder?: string;
  success?: string;
  warning?: string;
  error?: string;
  shadow?: string;
};

type ColorsType = {
  light: ColorTheme;
  dark: ColorTheme;
};

export const Colors: ColorsType = {
  light: {
    text: textPrimary,
    background: backgroundGray,
    surface: surfaceWhite,
    tint: purplePrimary,
    icon: textSecondary,
    tabIconDefault: textTertiary,
    tabIconSelected: purplePrimary,
    border: borderGray,
    input: surfaceWhite,
    inputBorder: borderGray,
    placeholder: textTertiary,
    success: successGreen,
    warning: warningOrange,
    error: errorRed,
    primary: purplePrimary,
    primaryLight: purpleLight,
    primaryDark: purpleDark,
    primaryText: surfaceWhite,
    secondary: tealSecondary,
    card: surfaceWhite,
    mutedText: textSecondary,
    cardBorder: borderGray,
    shadow: "rgba(26, 32, 44, 0.1)",
  },
  dark: {
    text: surfaceWhite,
    background: darkSlate,
    surface: darkNavy,
    tint: purpleLight,
    icon: textTertiary,
    tabIconDefault: textSecondary,
    tabIconSelected: purpleLight,
    border: darkCharcoal,
    input: darkNavy,
    inputBorder: darkCharcoal,
    placeholder: textSecondary,
    success: successGreen,
    warning: warningOrange,
    error: errorRed,
    primary: purpleLight,
    primaryLight: purpleLight,
    primaryDark: purpleDark,
    primaryText: surfaceWhite,
    secondary: tealSecondary,
    card: darkNavy,
    mutedText: textSecondary,
    cardBorder: darkCharcoal,
    shadow: "rgba(0, 0, 0, 0.3)",
  },

};
