"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Appearance } from "@/lib/types";
import { DEFAULT_APPEARANCE, THEMES, themeById } from "@/lib/themes";
import type { ThemeDefinition } from "@/lib/themes";

/** Set to "1" to force the default theme regardless of saved prefs. */
const STORAGE_KEY = "btcomms.appearance.v1";

/**
 * Discord-style theme system.
 *
 * Each theme is a set of CSS custom properties applied to <html>. The Tailwind
 * theme in globals.css reads those variables, so every surface, border and
 * accent re-tints instantly — no re-render of the tree required.
 */

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

    // Ambient pools: the custom gradient theme reads the user's two tones.
    const ambient =
      theme.id === "custom"
        ? ([
            `${appearance.gradient_from ?? "#7c3aed"}88`,
            `${appearance.gradient_to ?? "#f59e0b"}55`,
            "rgba(16,12,26,0.94)",
          ] as [string, string, string])
        : (theme.ambient ?? ["rgba(168,85,247,0.4)", "rgba(251,146,60,0.2)", "rgba(16,12,26,0.9)"]);

    root.style.setProperty("--ambient-1", ambient[0]);
    root.style.setProperty("--ambient-2", ambient[1]);
    root.style.setProperty("--ambient-3", ambient[2]);

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

/* Theme data is re-exported so existing imports keep working. */
export { THEMES, DEFAULT_APPEARANCE, themeById, DENSITY_LABELS } from "@/lib/themes";
export type { ThemeDefinition } from "@/lib/themes";
