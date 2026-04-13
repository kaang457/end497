import { Platform } from 'react-native';

const tintColorLight = '#2563eb'; // Daha canlı ve belirgin bir kurumsal mavi
const tintColorDark = '#3b82f6';

export const Colors = {
  light: {
    text: '#0f172a',
    background: '#f8fafc',
    tint: tintColorLight,
    icon: '#64748b',
    tabIconDefault: '#64748b',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ffffff',
    background: '#0d1117',
    tint: tintColorDark,
    icon: '#8b949e',
    tabIconDefault: '#8b949e',
    tabIconSelected: tintColorDark,
  },
};

export const AppTheme = {
  colors: {
    dark: {
      background: { main: "#0d1117", secondary: "#161b22", tertiary: "#1f2937", card: "#0d1117" },
      border: { default: "#30363d", light: "#21262d", focus: "#3b82f6" },
      text: { main: "#ffffff", secondary: "#e6edf3", muted: "#8b949e", dark: "#6b7280" },
      status: { primary: "#3b82f6", success: "#10b981", warning: "#f59e0b", danger: "#ef4444", purple: "#7c3aed" }
    },
    light: {
      // Modern, Yüksek Kontrastlı Kurumsal Palette (Tailwind Slate & Emerald tabanlı)
      background: { 
        main: "#f8fafc",      // Uygulama geneli arka planı (Çok açık arduvaz grisi)
        secondary: "#ffffff", // Kartlar, Sidebar ve menüler (Tam beyaz)
        tertiary: "#f1f5f9",  // Hover durumları, aktif menü arka planları
        card: "#ffffff" 
      },
      border: { 
        default: "#e2e8f0",   // Standart ayırıcılar ve çerçeveler
        light: "#f1f5f9",     // Çok hafif iç çizgiler
        focus: "#2563eb"      // Odaklanma durumu (Daha belirgin mavi)
      },
      text: { 
        main: "#0f172a",      // Ana başlıklar ve değerler (Neredeyse siyah, yüksek kontrast)
        secondary: "#334155", // Alt başlıklar ve tablo verileri
        muted: "#64748b",     // İkonlar, açıklamalar, placeholder'lar
        dark: "#020617"       // Ekstra vurgulu metinler
      },
      status: {
        primary: "#2563eb",   // Canlı ve güven veren mavi (Butonlar, ana vurgular)
        success: "#059669",   // Açık zeminde net okunan zümrüt yeşili
        warning: "#d97706",   // Okunabilir kehribar/turuncu (açık sarı yerine)
        danger: "#dc2626",    // Belirgin ve canlı uyarı kırmızısı
        purple: "#7c3aed"     // Aşama 2 ve mor vurgular için
      }
    }
  }
};

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
  web: { sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", serif: "Georgia, 'Times New Roman', serif", rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif", mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" },
});