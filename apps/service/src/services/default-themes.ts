import type { ColorPalette } from '@pitchdeck/shared-types';

/**
 * Built-in visual themes for when no template is uploaded.
 *
 * Two selection layers:
 *  1. color_theme — user-chosen palette (navy_gold, teal_coral, etc.)
 *  2. pb_type — fallback if no color_theme is provided
 *
 * Colours are chosen for professional readability and print compatibility.
 */

export interface DefaultTheme {
  palette: ColorPalette;
  /** Large decorative shape color (usually primary with transparency) */
  decorPrimary: string;
  /** Secondary decorative shape color */
  decorSecondary: string;
  /** Subtle background tint for panels / content slide backgrounds */
  panelTint: string;
  /** Card/metric background */
  cardBg: string;
  /** Card border accent */
  cardAccent: string;
  /** Section header background gradient stops (simulated via layers) */
  sectionBgLayers: string[];
}

// ── COLOR THEMES (user-selectable) ──────────────────────────

/** Classic investment banking — deep navy + warm gold */
const navyGold: DefaultTheme = {
  palette: {
    primary: '#1B2A4A',
    secondary: '#2E5090',
    accent: '#C5961A',
    background: '#F4F6FA',
    text: '#2D2D2D',
    colors: ['#1B2A4A', '#2E5090', '#4A6FA5', '#7B9CC7', '#C5961A', '#E8B84B', '#2D2D2D', '#666666'],
  },
  decorPrimary: '#1B2A4A',
  decorSecondary: '#C5961A',
  panelTint: '#EEF1F7',
  cardBg: '#F7F8FB',
  cardAccent: '#C5961A',
  sectionBgLayers: ['#1B2A4A', '#233660', '#2E5090'],
};

/** Modern analytical — teal + coral */
const tealCoral: DefaultTheme = {
  palette: {
    primary: '#0A5E5E',
    secondary: '#148C8C',
    accent: '#E55934',
    background: '#F0F7F7',
    text: '#2A2A2A',
    colors: ['#0A5E5E', '#148C8C', '#1FB5B5', '#7DD4D4', '#E55934', '#F28C6C', '#2A2A2A', '#555555'],
  },
  decorPrimary: '#0A5E5E',
  decorSecondary: '#E55934',
  panelTint: '#E8F4F4',
  cardBg: '#F5FAFA',
  cardAccent: '#E55934',
  sectionBgLayers: ['#0A5E5E', '#0E7272', '#148C8C'],
};

/** Deal-focused — dark slate + emerald */
const slateEmerald: DefaultTheme = {
  palette: {
    primary: '#1E2D3D',
    secondary: '#34495E',
    accent: '#27AE60',
    background: '#F3F6F8',
    text: '#2C2C2C',
    colors: ['#1E2D3D', '#34495E', '#5D7B96', '#8FABC2', '#27AE60', '#6FCF8D', '#2C2C2C', '#777777'],
  },
  decorPrimary: '#1E2D3D',
  decorSecondary: '#27AE60',
  panelTint: '#ECF0F3',
  cardBg: '#F5F8F7',
  cardAccent: '#27AE60',
  sectionBgLayers: ['#1E2D3D', '#283D50', '#34495E'],
};

/** Clean corporate — midnight blue with blue accents */
const midnightBlue: DefaultTheme = {
  palette: {
    primary: '#1E293B',
    secondary: '#334155',
    accent: '#3B82F6',
    background: '#F1F5F9',
    text: '#1E293B',
    colors: ['#1E293B', '#334155', '#3B82F6', '#60A5FA', '#93C5FD', '#2563EB', '#475569', '#64748B'],
  },
  decorPrimary: '#1E293B',
  decorSecondary: '#3B82F6',
  panelTint: '#E8EDF4',
  cardBg: '#F5F8FC',
  cardAccent: '#3B82F6',
  sectionBgLayers: ['#1E293B', '#273448', '#334155'],
};

/** Bold and authoritative — charcoal with red accents */
const charcoalRed: DefaultTheme = {
  palette: {
    primary: '#1F2937',
    secondary: '#374151',
    accent: '#DC2626',
    background: '#F5F5F6',
    text: '#1F2937',
    colors: ['#1F2937', '#374151', '#DC2626', '#EF4444', '#F87171', '#991B1B', '#4B5563', '#6B7280'],
  },
  decorPrimary: '#1F2937',
  decorSecondary: '#DC2626',
  panelTint: '#ECECEE',
  cardBg: '#F8F8F9',
  cardAccent: '#DC2626',
  sectionBgLayers: ['#1F2937', '#2D3748', '#374151'],
};

/** Natural and sophisticated — forest green with lime accents */
const forestCream: DefaultTheme = {
  palette: {
    primary: '#14532D',
    secondary: '#166534',
    accent: '#A3E635',
    background: '#F0FDF4',
    text: '#1A2E1A',
    colors: ['#14532D', '#166534', '#22C55E', '#4ADE80', '#A3E635', '#BEF264', '#1A2E1A', '#4D6E4D'],
  },
  decorPrimary: '#14532D',
  decorSecondary: '#A3E635',
  panelTint: '#E3F5E8',
  cardBg: '#F2FAF4',
  cardAccent: '#A3E635',
  sectionBgLayers: ['#14532D', '#1A6B3A', '#166534'],
};

/** Regal and premium — deep purple with gold accents */
const purpleGold: DefaultTheme = {
  palette: {
    primary: '#4C1D95',
    secondary: '#5B21B6',
    accent: '#F59E0B',
    background: '#F5F3FF',
    text: '#2E1065',
    colors: ['#4C1D95', '#5B21B6', '#7C3AED', '#A78BFA', '#F59E0B', '#FBBF24', '#2E1065', '#6B5B8D'],
  },
  decorPrimary: '#4C1D95',
  decorSecondary: '#F59E0B',
  panelTint: '#EDE9FE',
  cardBg: '#F8F6FD',
  cardAccent: '#F59E0B',
  sectionBgLayers: ['#4C1D95', '#5726A8', '#5B21B6'],
};

/** Clean and understated — pure monochrome */
const monochrome: DefaultTheme = {
  palette: {
    primary: '#111827',
    secondary: '#374151',
    accent: '#6B7280',
    background: '#F3F4F6',
    text: '#111827',
    colors: ['#111827', '#1F2937', '#374151', '#4B5563', '#6B7280', '#9CA3AF', '#D1D5DB', '#E5E7EB'],
  },
  decorPrimary: '#111827',
  decorSecondary: '#6B7280',
  panelTint: '#E5E7EB',
  cardBg: '#F9FAFB',
  cardAccent: '#6B7280',
  sectionBgLayers: ['#111827', '#1A2234', '#1F2937'],
};

// ── THEME REGISTRIES ──────────────────────────────────

/** User-selectable color themes (matches frontend COLOR_THEMES) */
const colorThemes: Record<string, DefaultTheme> = {
  navy_gold: navyGold,
  teal_coral: tealCoral,
  slate_emerald: slateEmerald,
  midnight_blue: midnightBlue,
  charcoal_red: charcoalRed,
  forest_cream: forestCream,
  purple_gold: purpleGold,
  monochrome: monochrome,
};

/** pb_type fallback mapping (used when no color_theme is selected) */
const pbTypeThemes: Record<string, DefaultTheme> = {
  company_overview: navyGold,
  market_update: tealCoral,
  transaction_summary: slateEmerald,
  investor_pitch: midnightBlue,
  industry_overview: charcoalRed,
  fundraising_deck: purpleGold,
  due_diligence: monochrome,
};

/**
 * Resolve theme: color_theme takes priority, then pb_type fallback.
 */
export function getDefaultTheme(pbType?: string, colorTheme?: string): DefaultTheme {
  if (colorTheme && colorThemes[colorTheme]) {
    return colorThemes[colorTheme];
  }
  return pbTypeThemes[pbType || 'company_overview'] || navyGold;
}
