"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Appearance, Density, ThemeId } from "@/lib/types";

/**
 * Discord-style theme system.
 *
 * Each theme is a set of CSS custom properties applied to <html>. The Tailwind
 * theme in globals.css reads those variables, so every surface, border and
 * accent re-tints instantly — no re-render of the tree required.
 */

export type ThemeDefinition = {
  id: ThemeId;
  name: string;
  description: string;
  /** Two-stop gradient used for previews and the ambient background. */
  gradient: [string, string];
  vars: Record<string, string>;
  dark: boolean;
};

const base = (overrides: Record<string, string> = {}) => ({
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
    name: "Midnight Blurple",
    description: "The classic. Deep navy-to-black with blurple accents.",
    gradient: ["#1b2140", "#07080d"],
    dark: true,
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
    name: "Amethyst Dusk",
    description: "Deep purple fading into slate — the flagship gradient.",
    gradient: ["#2e1b4e", "#14121c"],
    dark: true,
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
    dark: true,
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
    name: "Ember Sunset",
    description: "Warm rose and amber on charcoal.",
    gradient: ["#4a1d2b", "#150a0d"],
    dark: true,
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
    dark: true,
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
    dark: true,
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
    id: "light",
    name: "Daylight",
    description: "The light counterpart, tuned for readability.",
    gradient: ["#eef1fb", "#ffffff"],
    dark: false,
    vars: {
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

export const DEFAULT_APPEARANCE: Appearance = {
  theme_id: "amethyst",
  message_density: "cozy",
  reduce_motion: false,
  reduced_saturation: false,
  font_scale: 1,
};

const STORAGE_KEY = "btcomms.appearance.v1";

export function themeById(id: ThemeId | string | undefined): ThemeDefinition {
  return THEMES.find((t) => t.id === id) ?? THEMES[1];
}

type AppearanceContextValue = {
  appearance: Appearance;
  theme: ThemeDefinition;
  setAppearance: (patch: Partial<Appearance>) => void;
  resetAppearance: () => void;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function AppearanceProvider({
  initial,
  children,
  persist,
}: {
  initial?: Partial<Appearance> | null;
  children: React.ReactNode;
  /** Called after a change settles — wire to Supabase to persist. */
  persist?: (next: Appearance) => void;
}) {
  const [appearance, setState] = useState<Appearance>(() => ({
    ...DEFAULT_APPEARANCE,
    ...(initial ?? {}),
  }));

  // Hydrate from localStorage on first mount (instant, pre-network).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<Appearance>;
      setState((prev) => ({ ...prev, ...parsed, ...(initial ?? {}) }));
    } catch {
      /* ignore corrupt storage */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply CSS variables + accessibility knobs to the document.
  useEffect(() => {
    const root = document.documentElement;
    const theme = themeById(appearance.theme_id);

    for (const [key, value] of Object.entries(theme.vars)) {
      root.style.setProperty(key, value);
    }

    root.dataset.theme = theme.id;
    root.dataset.density = appearance.message_density;
    root.dataset.motion = appearance.reduce_motion ? "reduced" : "full";
    root.dataset.saturation = appearance.reduced_saturation ? "reduced" : "full";
    root.style.setProperty("--font-scale", String(appearance.font_scale));
    root.style.colorScheme = theme.dark ? "dark" : "light";
  }, [appearance]);

  const setAppearance = useCallback(
    (patch: Partial<Appearance>) => {
      setState((prev) => {
        const next = { ...prev, ...patch };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          /* storage may be unavailable */
        }
        persist?.(next);
        return next;
      });
    },
    [persist],
  );

  const resetAppearance = useCallback(() => {
    setState(DEFAULT_APPEARANCE);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    persist?.(DEFAULT_APPEARANCE);
  }, [persist]);

  const value = useMemo<AppearanceContextValue>(
    () => ({
      appearance,
      theme: themeById(appearance.theme_id),
      setAppearance,
      resetAppearance,
    }),
    [appearance, setAppearance, resetAppearance],
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext);
  if (!ctx) {
    // Safe fallback so isolated components (or the demo) can still render.
    return {
      appearance: DEFAULT_APPEARANCE,
      theme: themeById(DEFAULT_APPEARANCE.theme_id),
      setAppearance: (() => undefined) as (patch: Partial<Appearance>) => void,
      resetAppearance: () => undefined,
    } satisfies AppearanceContextValue;
  }
  return ctx;
}

export const DENSITY_LABELS: Record<Density, string> = {
  compact: "Compact",
  cozy: "Cozy",
  roomy: "Roomy",
};
