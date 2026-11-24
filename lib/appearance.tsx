"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Appearance } from "@/lib/types";
import { DEFAULT_APPEARANCE, themeById } from "@/lib/themes";
import type { ThemeDefinition } from "@/lib/themes";
import { STORAGE_KEY, readStoredAppearance } from "@/lib/theme-boot";

/**
 * Discord-style theme system.
 *
 * Each theme is a set of CSS custom properties applied to <html>. The Tailwind
 * theme in globals.css reads those variables, so every surface, border and
 * accent re-tints instantly — no re-render of the tree required.
 *
 * Persistence is two-layer:
 *   1. `localStorage` — replayed before React mounts by APPEARANCE_BOOT_SCRIPT,
 *      so a reload never flashes the wrong theme.
 *   2. the `profiles` row — written by the caller through `persist`.
 */

type AppearanceContextValue = {
  appearance: Appearance;
  theme: ThemeDefinition;
  setAppearance: (patch: Partial<Appearance>) => void;
  resetAppearance: () => void;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

/** Write the CSS variables for one appearance value onto a root element. */
export function applyAppearance(root: HTMLElement, appearance: Appearance) {
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

  // The whole-shell wash follows the theme gradient (custom themes read the
  // user's two tones) so rail, sidebars and chat share one canvas.
  const [from, to] =
    theme.id === "custom"
      ? [appearance.gradient_from ?? "#7c3aed", appearance.gradient_to ?? "#f59e0b"]
      : theme.gradient;
  root.style.setProperty(
    "--bg-app-gradient",
    `linear-gradient(165deg, ${from} 0%, ${to} 62%, ${theme.gradient[1]} 100%)`,
  );

  root.dataset.theme = theme.id;
  root.dataset.ambient = theme.ambientShell ? "true" : "false";
  root.dataset.density = appearance.message_density;
  root.dataset.motion = appearance.reduce_motion ? "reduced" : "full";
  root.dataset.saturation = appearance.reduced_saturation ? "reduced" : "full";
  root.style.setProperty("--font-scale", String(appearance.font_scale));
  root.style.colorScheme = theme.dark ? "dark" : "light";
}

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
    const stored = readStoredAppearance();
    if (!stored) return;
    // A signed-in profile wins over the local cache for anything it defines.
    const merged: Record<string, unknown> = { ...stored };
    for (const [key, value] of Object.entries(initial ?? {})) {
      if (value !== undefined && value !== null) merged[key] = value;
    }
    setState((prev) => ({ ...prev, ...(merged as Partial<Appearance>) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply CSS variables + accessibility knobs to the document.
  useEffect(() => {
    applyAppearance(document.documentElement, appearance);
  }, [appearance]);

  // `persist` lives in a ref so a new callback identity from the parent never
  // re-fires a theme write (and never swallows a pending change).
  const persistRef = useRef(persist);
  persistRef.current = persist;

  const setAppearance = useCallback((patch: Partial<Appearance>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* storage may be unavailable */
      }
      persistRef.current?.(next);
      return next;
    });
  }, []);

  const resetAppearance = useCallback(() => {
    setState(DEFAULT_APPEARANCE);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    persistRef.current?.(DEFAULT_APPEARANCE);
  }, []);

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
export {
  THEMES,
  DEFAULT_APPEARANCE,
  themeById,
  DENSITY_LABELS,
  SURFACE_TOKENS,
  ambientThemeIds,
} from "@/lib/themes";
export type { ThemeDefinition } from "@/lib/themes";
