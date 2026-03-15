export interface Theme {
  id: string;
  name: string;
  emoji: string;
  bg: string;
  bgSecondary: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentGlow: string;
  card: string;
  cardHover: string;
  dotGrid: string;
  topGlow: string;
  className: string;
}

export const THEMES: Theme[] = [
  {
    id: "midnight",
    name: "Midnight",
    emoji: "🌙",
    bg: "#09090b",
    bgSecondary: "rgba(255,255,255,0.02)",
    border: "rgba(255,255,255,0.06)",
    text: "#fafafa",
    textSecondary: "#a3a3a3",
    textMuted: "#525252",
    accent: "#3b82f6",
    accentGlow: "rgba(59,130,246,0.03)",
    card: "rgba(255,255,255,0.015)",
    cardHover: "rgba(255,255,255,0.03)",
    dotGrid: "rgba(255,255,255,0.03)",
    topGlow: "rgba(59,130,246,0.03)",
    className: "",
  },
  {
    id: "matrix",
    name: "Matrix",
    emoji: "🟢",
    bg: "#0a0a0a",
    bgSecondary: "rgba(0,255,65,0.02)",
    border: "rgba(0,255,65,0.1)",
    text: "#00ff41",
    textSecondary: "#00cc33",
    textMuted: "#005a1a",
    accent: "#00ff41",
    accentGlow: "rgba(0,255,65,0.05)",
    card: "rgba(0,255,65,0.02)",
    cardHover: "rgba(0,255,65,0.05)",
    dotGrid: "rgba(0,255,65,0.04)",
    topGlow: "rgba(0,255,65,0.04)",
    className: "theme-matrix",
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    emoji: "🦾",
    bg: "#0d0221",
    bgSecondary: "rgba(255,0,255,0.02)",
    border: "rgba(255,0,255,0.12)",
    text: "#f0e6ff",
    textSecondary: "#c084fc",
    textMuted: "#6b21a8",
    accent: "#ff00ff",
    accentGlow: "rgba(255,0,255,0.05)",
    card: "rgba(255,0,255,0.03)",
    cardHover: "rgba(255,0,255,0.06)",
    dotGrid: "rgba(255,0,255,0.03)",
    topGlow: "rgba(255,0,255,0.05)",
    className: "theme-cyberpunk",
  },
  {
    id: "ocean",
    name: "Ocean",
    emoji: "🌊",
    bg: "#020617",
    bgSecondary: "rgba(56,189,248,0.02)",
    border: "rgba(56,189,248,0.1)",
    text: "#e0f2fe",
    textSecondary: "#7dd3fc",
    textMuted: "#0c4a6e",
    accent: "#38bdf8",
    accentGlow: "rgba(56,189,248,0.05)",
    card: "rgba(56,189,248,0.02)",
    cardHover: "rgba(56,189,248,0.05)",
    dotGrid: "rgba(56,189,248,0.03)",
    topGlow: "rgba(56,189,248,0.04)",
    className: "theme-ocean",
  },
  {
    id: "ember",
    name: "Ember",
    emoji: "🔥",
    bg: "#0c0a09",
    bgSecondary: "rgba(249,115,22,0.02)",
    border: "rgba(249,115,22,0.1)",
    text: "#fff7ed",
    textSecondary: "#fdba74",
    textMuted: "#7c2d12",
    accent: "#f97316",
    accentGlow: "rgba(249,115,22,0.05)",
    card: "rgba(249,115,22,0.02)",
    cardHover: "rgba(249,115,22,0.05)",
    dotGrid: "rgba(249,115,22,0.03)",
    topGlow: "rgba(249,115,22,0.04)",
    className: "theme-ember",
  },
  {
    id: "light",
    name: "Light",
    emoji: "☀️",
    bg: "#fafafa",
    bgSecondary: "rgba(0,0,0,0.02)",
    border: "rgba(0,0,0,0.08)",
    text: "#171717",
    textSecondary: "#525252",
    textMuted: "#a3a3a3",
    accent: "#2563eb",
    accentGlow: "rgba(37,99,235,0.05)",
    card: "rgba(0,0,0,0.02)",
    cardHover: "rgba(0,0,0,0.04)",
    dotGrid: "rgba(0,0,0,0.04)",
    topGlow: "rgba(37,99,235,0.03)",
    className: "theme-light",
  },
];

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}
