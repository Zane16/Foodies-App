/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#7c3aed';
const tintColorDark = '#a78bfa';
const indigoAccent = "#4F46E5" // Modern indigo
const indigoLight = "#6366F1" // Lighter indigo for interactions
const indigoDark = "#3730A3" // Darker indigo for depth

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
    text: "#0F172A", // Rich black for text
    background: "#FFFFFF", // Pure white background
    surface: "#F8FAFC", // Subtle off-white for cards
    tint: indigoAccent,
    icon: "#64748B", // Neutral gray for icons
    tabIconDefault: "#94A3B8",
    tabIconSelected: indigoAccent,
    border: "#E2E8F0", // Light border
    input: "#F1F5F9", // Input background
    placeholder: "#94A3B8", // Placeholder text
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    primary: indigoAccent,
    primaryLight: indigoLight,
    primaryDark: indigoDark,
    shadow: "rgba(15, 23, 42, 0.1)",
  },
  dark: {
    text: "#F8FAFC",
    background: "#0F172A",
    surface: "#1E293B",
    tint: indigoLight,
    icon: "#94A3B8",
    tabIconDefault: "#64748B",
    tabIconSelected: indigoLight,
    border: "#334155",
    input: "#1E293B",
    placeholder: "#64748B",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    primary: indigoLight,
    primaryLight: "#818CF8",
    primaryDark: indigoAccent,
    shadow: "rgba(0, 0, 0, 0.3)",
   
  },
  
};
