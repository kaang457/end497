import { Platform } from 'react-native';

const tintColorLight = '#3b82f6'; // Uygulamanın ana mavi tonu
const tintColorDark = '#3b82f6';

// Expo Router'ın varsayılan Navigation yapıları için kullanacağı temel objemiz
export const Colors = {
  light: {
    text: '#11181C',
    background: '#ffffff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ffffff',
    background: '#0d1117', // Beko uygulamasının ana arka planı
    tint: tintColorDark,
    icon: '#8b949e',
    tabIconDefault: '#8b949e',
    tabIconSelected: tintColorDark,
  },
};

// Uygulama içindeki bileşenlerde (Dashboard, Kartlar vs.) kullanacağımız detaylı palet
export const AppTheme = {
  colors: {
    dark: {
      background: { main: "#0d1117", secondary: "#161b22", tertiary: "#1f2937", card: "#0d1117" },
      border: { default: "#30363d", light: "#21262d", focus: "#3b82f6" },
      text: { main: "#ffffff", secondary: "#e6edf3", muted: "#8b949e", dark: "#6b7280" },
      status: { primary: "#3b82f6", success: "#10b981", warning: "#f59e0b", danger: "#ef4444", purple: "#7c3aed" }
    },
    light: {
      background: { main: "#f0f4f8", secondary: "#ffffff", tertiary: "#e2e8f0", card: "#ffffff" },
      border: { default: "#cbd5e1", light: "#e2e8f0", focus: "#3b82f6" },
      text: { main: "#0f172a", secondary: "#334155", muted: "#64748b", dark: "#94a3b8" },
      status: { primary: "#2563eb", success: "#059669", warning: "#d97706", danger: "#dc2626", purple: "#6d28d9" }
    }
  }
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});