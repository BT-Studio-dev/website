import type { Appearance, Density, ThemeId } from "./types.ts";

/**
 * Theme data lives apart from the React provider so it can be imported by
 * non-React code (and by the demo-store test suite) without pulling in React.
 */

export type ThemeDefinition = {
  id: ThemeId;
  name: string;
  description: string;
  /** Two-stop gradient used for previews and the ambient background. */
  gradient: [string, string];
  /**
   * Three ambient light pools painted behind the app (top-left, bottom-right,
   * centre). Gives the 2026 "aurora behind glass" look instead of flat slate.
   */
  ambient?: [string, string, string];
  vars: Record<string, string>;
  dark: boolean;
  /**
   * True for the 2026 gradient shells. Ambient themes paint the light pools
   * and raise the glass opacity so the wash bleeds through every pane.
   */
  ambientShell: boolean;
};

/**
 * Semantic surface tokens. These are what components should reference:
 * `--bg-sidebar`, `--bg-surface`, `--bg-elevated`, `--bg-input`,
 * `--border-subtle`, `--text-primary`, `--text-muted`.
 *
 * They are aliases onto the raw palette, so overriding the palette is still
 * enough to re-tint the whole app.
 */
const aliases = (): Record<string, string> => ({
  "--bg-sidebar": "var(--c-abyss)",
  "--bg-surface": "var(--c-ink)",
  "--bg-elevated": "var(--c-panel)",
  "--bg-input": "var(--c-void)",
  "--border-subtle": "var(--c-line)",
  "--text-primary": "var(--c-bright)",
  "--text-muted": "var(--c-muted)",
});

const base = (overrides: Record<string, string> = {}) => ({
  ...aliases(),
  "--c-void": "#05060a",
  "--c-abyss": "#090b11",
  "--c-ink": "#0d1018",
  "--c-panel": "#12161f",
  "--c-raised": "#191e29",
  "--c-hover": "#222836",
  "--c-line": "#232936",
  "--c-muted": "#8f98ad",
  "--c-dim": "#6a7386",
  "--c-bright": "#f3f5fa",
  "--c-accent": "#5865f2",
  "--c-accent-soft": "#8b95ff",
  "--c-mint": "#3ba55d",
  "--c-amber": "#faa61a",
  "--c-rose": "#ed4245",
  "--c-glow": "88, 101, 242",
  ...overrides,
});

export const THEMES: ThemeDefinition[] = [
  {
    id: "midnight",
    name: "Midnight Aurora",
    description: "The classic. Deep navy-to-black with blurple accents.",
    gradient: ["#1b2140", "#07080d"],
    ambient: ["rgba(88,101,242,0.42)", "rgba(56,189,248,0.20)", "rgba(15,23,42,0.9)"],
    dark: true,
    ambientShell: false,
    vars: base({
      "--c-void": "#05060b",
      "--c-abyss": "#080a12",
      "--c-ink": "#0c0f1a",
      "--c-panel": "#111524",
      "--c-raised": "#181d30",
      "--c-hover": "#212841",
      "--c-line": "#232a41",
      "--c-accent": "#5865f2",
      "--c-accent-soft": "#8b95ff",
      "--c-glow": "88, 101, 242",
    }),
  },
  {
    id: "amethyst",
    name: "Amethyst Twilight",
    description: "Deep purple fading into slate — the flagship gradient.",
    gradient: ["#2e1b4e", "#14121c"],
    ambient: ["rgba(168,85,247,0.40)", "rgba(251,146,60,0.16)", "rgba(24,16,40,0.9)"],
    dark: true,
    ambientShell: true,
    vars: base({
      "--c-void": "#0b0715",
      "--c-abyss": "#100b1d",
      "--c-ink": "#150f26",
      "--c-panel": "#1a1330",
      "--c-raised": "#241a3f",
      "--c-hover": "#2f2350",
      "--c-line": "#302450",
      "--c-muted": "#a79ac4",
      "--c-dim": "#7b6f96",
      "--c-accent": "#a855f7",
      "--c-accent-soft": "#c084fc",
      "--c-glow": "168, 85, 247",
    }),
  },
  {
    id: "aurora",
    name: "Aurora Teal",
    description: "Cool cyan and teal over ink.",
    gradient: ["#0c3b45", "#06121a"],
    ambient: ["rgba(6,182,212,0.38)", "rgba(45,212,191,0.18)", "rgba(4,20,28,0.92)"],
    dark: true,
    ambientShell: true,
    vars: base({
      "--c-void": "#04090d",
      "--c-abyss": "#061117",
      "--c-ink": "#08161d",
      "--c-panel": "#0b1c25",
      "--c-raised": "#102833",
      "--c-hover": "#163442",
      "--c-line": "#15323f",
      "--c-muted": "#8bb3c0",
      "--c-dim": "#64828d",
      "--c-accent": "#06b6d4",
      "--c-accent-soft": "#4dd9ee",
      "--c-glow": "6, 182, 212",
    }),
  },
  {
    id: "ember",
    name: "Crimson Sunset",
    description: "Crimson rose fading into ember amber on charcoal.",
    gradient: ["#4a1d2b", "#150a0d"],
    ambient: ["rgba(244,63,94,0.38)", "rgba(250,166,26,0.22)", "rgba(28,12,16,0.92)"],
    dark: true,
    ambientShell: true,
    vars: base({
      "--c-void": "#0c0507",
      "--c-abyss": "#12080b",
      "--c-ink": "#180b0f",
      "--c-panel": "#1e0f14",
      "--c-raised": "#2a151c",
      "--c-hover": "#361c25",
      "--c-line": "#361b24",
      "--c-muted": "#c4a0a8",
      "--c-dim": "#8f6f77",
      "--c-accent": "#f43f5e",
      "--c-accent-soft": "#fb7185",
      "--c-glow": "244, 63, 94",
    }),
  },
  {
    id: "forest",
    name: "Forest Night",
    description: "Mossy greens with a muted slate base.",
    gradient: ["#123222", "#070f0b"],
    ambient: ["rgba(34,197,94,0.34)", "rgba(20,184,166,0.16)", "rgba(6,18,12,0.92)"],
    dark: true,
    ambientShell: true,
    vars: base({
      "--c-void": "#040a06",
      "--c-abyss": "#07100a",
      "--c-ink": "#0a150e",
      "--c-panel": "#0d1c13",
      "--c-raised": "#13291c",
      "--c-hover": "#193526",
      "--c-line": "#183424",
      "--c-muted": "#93b4a0",
      "--c-dim": "#6a8474",
      "--c-accent": "#22c55e",
      "--c-accent-soft": "#4ade80",
      "--c-glow": "34, 197, 94",
    }),
  },
  {
    id: "mono",
    name: "Carbon Mono",
    description: "Neutral greys, zero chroma. Maximum focus.",
    gradient: ["#2b2d31", "#0a0b0d"],
    ambient: ["rgba(148,163,184,0.22)", "rgba(100,116,139,0.12)", "rgba(10,11,13,0.94)"],
    dark: true,
    ambientShell: false,
    vars: base({
      "--c-void": "#050506",
      "--c-abyss": "#0a0a0c",
      "--c-ink": "#0f1012",
      "--c-panel": "#151619",
      "--c-raised": "#1d1e22",
      "--c-hover": "#26282d",
      "--c-line": "#25272c",
      "--c-muted": "#9aa0ab",
      "--c-dim": "#71767f",
      "--c-accent": "#e2e4e9",
      "--c-accent-soft": "#ffffff",
      "--c-glow": "226, 228, 233",
    }),
  },
  {
    id: "ambient",
    name: "Deep Purple → Amber",
    description: "The 2026 default — deep purple melts into warm amber behind glass.",
    gradient: ["#3b1d63", "#1a0f26"],
    ambient: ["rgba(139,92,246,0.46)", "rgba(251,146,60,0.26)", "rgba(26,15,38,0.94)"],
    dark: true,
    ambientShell: true,
    vars: base({
      "--c-void": "#120a1c",
      "--c-abyss": "#170e24",
      "--c-ink": "#1c1230",
      "--c-panel": "#221638",
      "--c-raised": "#2d1f47",
      "--c-hover": "#3a2a58",
      "--c-line": "#3a2a55",
      "--c-muted": "#b3a3cc",
      "--c-dim": "#8677a3",
      "--c-accent": "#a855f7",
      "--c-accent-soft": "#c084fc",
      "--c-mint": "#3ba55d",
      "--c-amber": "#fbbf24",
      "--c-glow": "168, 85, 247",
    }),
  },
  {
    id: "charcoal",
    name: "Cyber Dusk",
    description: "Cool graphite with an electric indigo rim. Low-noise, high contrast.",
    gradient: ["#2b2d31", "#111214"],
    ambient: ["rgba(99,102,241,0.20)", "rgba(148,163,184,0.12)", "rgba(10,11,13,0.94)"],
    dark: true,
    ambientShell: false,
    vars: base({
      "--c-void": "#0b0c0e",
      "--c-abyss": "#111214",
      "--c-ink": "#16181b",
      "--c-panel": "#1a1c1f",
      "--c-raised": "#232529",
      "--c-hover": "#2b2d32",
      "--c-line": "#2c2f34",
      "--c-muted": "#a3a8b3",
      "--c-dim": "#7a8090",
      "--c-accent": "#5865f2",
      "--c-accent-soft": "#8b95ff",
      "--c-glow": "88, 101, 242",
    }),
  },
  {
    id: "custom",
    name: "Custom Gradient",
    description: "Your own two-tone ambient wash — pick both ends in Appearance.",
    gradient: ["#6d28d9", "#0ea5e9"],
    ambient: ["rgba(109,40,217,0.44)", "rgba(14,165,233,0.24)", "rgba(16,12,26,0.93)"],
    dark: true,
    ambientShell: true,
    vars: base({
      "--c-void": "#0f0a1a",
      "--c-abyss": "#140d22",
      "--c-ink": "#19112c",
      "--c-panel": "#1f1536",
      "--c-raised": "#2a1c47",
      "--c-hover": "#35245a",
      "--c-line": "#352451",
      "--c-muted": "#ada2c9",
      "--c-dim": "#80749e",
      "--c-accent": "#a855f7",
      "--c-accent-soft": "#c084fc",
      "--c-glow": "168, 85, 247",
    }),
  },
  {
    id: "light",
    name: "Light",
    description: "The light counterpart, tuned for readability.",
    gradient: ["#eef1fb", "#ffffff"],
    ambient: ["rgba(168,85,247,0.16)", "rgba(251,191,36,0.14)", "rgba(255,255,255,0.0)"],
    dark: false,
    ambientShell: false,
    vars: {
      ...aliases(),
      /* Light needs explicit surfaces — the palette alone reads as grey. */
      "--bg-sidebar": "#f4f6fc",
      "--bg-surface": "#ffffff",
      "--bg-elevated": "#ffffff",
      "--bg-input": "#ffffff",
      "--border-subtle": "#d8deec",
      "--text-primary": "#11141c",
      "--text-muted": "#5a6478",
      "--c-void": "#e6e9f2",
      "--c-abyss": "#f2f4fa",
      "--c-ink": "#fbfcff",
      "--c-panel": "#ffffff",
      "--c-raised": "#eef1f8",
      "--c-hover": "#e3e8f4",
      "--c-line": "#d6dce9",
      "--c-muted": "#5a6478",
      "--c-dim": "#828ca0",
      "--c-bright": "#11141c",
      "--c-accent": "#5865f2",
      "--c-accent-soft": "#4551d6",
      "--c-mint": "#248046",
      "--c-amber": "#b77b00",
      "--c-rose": "#d83c3e",
      "--c-glow": "88, 101, 242",
    },
  },
];

/**
 * The semantic surface tokens every theme must define. Components reference
 * these instead of hardcoded greys so a theme swap re-tints the whole shell.
 */
export const SURFACE_TOKENS = [
  "--bg-sidebar",
  "--bg-surface",
  "--bg-elevated",
  "--bg-input",
  "--border-subtle",
  "--text-primary",
  "--text-muted",
] as const;

/** Themes that paint the 2026 ambient gradient shell. */
export function ambientThemeIds(): ThemeId[] {
  return THEMES.filter((t) => t.ambientShell).map((t) => t.id);
}

export const DEFAULT_APPEARANCE: Appearance = {
  theme_id: "ambient",
  message_density: "cozy",
  reduce_motion: false,
  reduced_saturation: false,
  font_scale: 1,
};

const STORAGE_KEY = "btcomms.appearance.v1";

export function themeById(id: ThemeId | string | undefined): ThemeDefinition {
  return THEMES.find((t) => t.id === id) ?? themeById("ambient");
}


export const DENSITY_LABELS: Record<Density, string> = {
  compact: "Compact",
  cozy: "Cozy",
  roomy: "Roomy",
};
