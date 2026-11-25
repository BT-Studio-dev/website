import type {
  AccessibilitySettings,
  ChatMessageDisplay,
  OfficialMessageMode,
  RoleColorMode,
  StickerAnimation,
  TimeFormat,
  UiDensity,
} from "./types.ts";

/**
 * Accessibility defaults + normalisation.
 *
 * The blob lives in two places that must agree:
 *   1. `localStorage["btcomms.accessibility.v1"]` for an instant, network-free
 *      paint (replayed by the appearance boot script), and
 *   2. `profiles.user_settings.accessibility` so the choices follow the account
 *      to another browser.
 *
 * Everything here is pure so `lib/demo.test.mjs` can exercise it directly.
 */

export const ACCESSIBILITY_STORAGE_KEY = "btcomms.accessibility.v1";

export const DEFAULT_ACCESSIBILITY: Required<AccessibilitySettings> = {
  chatFontSize: 16,
  underlineLinks: false,
  displayNameStyles: true,
  uiDensity: "default",
  chatDisplay: "default",
  groupSpacing: 12,
  saturation: 100,
  saturationCustomColors: true,
  highContrast: false,
  syncContrast: true,
  roleColors: "names",
  officialMessages: "text-color",
  showOnOff: false,
  reduceMotion: false,
  reduceMotionSystem: true,
  notificationDuration: 6,
  playGifsFocused: true,
  playAnimatedEmoji: true,
  stickerAnimations: "always",
  ttsRate: 1,
  showImageDescriptions: false,
  legacyChatInput: false,
};

export const CHAT_FONT_SIZE_RANGE = { min: 12, max: 24 } as const;
export const GROUP_SPACING_RANGE = { min: 0, max: 24 } as const;
export const SATURATION_RANGE = { min: 0, max: 100 } as const;
export const NOTIFICATION_DURATION_RANGE = { min: 3, max: 20 } as const;
export const TTS_RATE_RANGE = { min: 0.5, max: 2 } as const;

export const UI_DENSITY_OPTIONS: { value: UiDensity; label: string; description: string }[] = [
  { value: "compact", label: "Compact", description: "Tighter padding and smaller rows." },
  { value: "default", label: "Default", description: "The standard BT Comms spacing." },
  { value: "spacious", label: "Spacious", description: "More room around every control." },
];

export const CHAT_DISPLAY_OPTIONS: { value: ChatMessageDisplay; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "compact", label: "Compact" },
];

export const ROLE_COLOR_OPTIONS: { value: RoleColorMode; label: string }[] = [
  { value: "names", label: "In names" },
  { value: "dots", label: "In dots" },
  { value: "off", label: "Off" },
];

export const OFFICIAL_MESSAGE_OPTIONS: { value: OfficialMessageMode; label: string }[] = [
  { value: "text-color", label: "Text color" },
  { value: "no-text-color", label: "No text color" },
];

export const STICKER_ANIMATION_OPTIONS: { value: StickerAnimation; label: string }[] = [
  { value: "always", label: "Always animate" },
  { value: "interaction", label: "Animate on interaction" },
  { value: "never", label: "Never animate" },
];

/* ------------------------------- helpers ------------------------------- */

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function bool(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

/**
 * Coerce anything (DB jsonb, localStorage, a partial patch) into a complete,
 * in-range accessibility blob. Never throws — a corrupt cache degrades to the
 * defaults instead of breaking the settings page.
 */
export function normalizeAccessibility(raw: unknown): Required<AccessibilitySettings> {
  const input = (raw && typeof raw === "object" ? raw : {}) as Partial<
    Record<keyof AccessibilitySettings, unknown>
  >;
  const d = DEFAULT_ACCESSIBILITY;

  return {
    chatFontSize: clamp(
      Number(input.chatFontSize ?? d.chatFontSize),
      CHAT_FONT_SIZE_RANGE.min,
      CHAT_FONT_SIZE_RANGE.max,
    ),
    underlineLinks: bool(input.underlineLinks, d.underlineLinks),
    displayNameStyles: bool(input.displayNameStyles, d.displayNameStyles),
    uiDensity: oneOf(input.uiDensity, ["compact", "default", "spacious"], d.uiDensity),
    chatDisplay: oneOf(input.chatDisplay, ["default", "compact"], d.chatDisplay),
    groupSpacing: clamp(
      Number(input.groupSpacing ?? d.groupSpacing),
      GROUP_SPACING_RANGE.min,
      GROUP_SPACING_RANGE.max,
    ),
    saturation: clamp(
      Number(input.saturation ?? d.saturation),
      SATURATION_RANGE.min,
      SATURATION_RANGE.max,
    ),
    saturationCustomColors: bool(input.saturationCustomColors, d.saturationCustomColors),
    highContrast: bool(input.highContrast, d.highContrast),
    syncContrast: bool(input.syncContrast, d.syncContrast),
    roleColors: oneOf(input.roleColors, ["names", "dots", "off"], d.roleColors),
    officialMessages: oneOf(
      input.officialMessages,
      ["text-color", "no-text-color"],
      d.officialMessages,
    ),
    showOnOff: bool(input.showOnOff, d.showOnOff),
    reduceMotion: bool(input.reduceMotion, d.reduceMotion),
    reduceMotionSystem: bool(input.reduceMotionSystem, d.reduceMotionSystem),
    notificationDuration: clamp(
      Number(input.notificationDuration ?? d.notificationDuration),
      NOTIFICATION_DURATION_RANGE.min,
      NOTIFICATION_DURATION_RANGE.max,
    ),
    playGifsFocused: bool(input.playGifsFocused, d.playGifsFocused),
    playAnimatedEmoji: bool(input.playAnimatedEmoji, d.playAnimatedEmoji),
    stickerAnimations: oneOf(
      input.stickerAnimations,
      ["always", "interaction", "never"],
      d.stickerAnimations,
    ),
    ttsRate: Number(
      clamp(Number(input.ttsRate ?? d.ttsRate), TTS_RATE_RANGE.min, TTS_RATE_RANGE.max).toFixed(2),
    ),
    showImageDescriptions: bool(input.showImageDescriptions, d.showImageDescriptions),
    legacyChatInput: bool(input.legacyChatInput, d.legacyChatInput),
  };
}

/** `ctx.filter`-style saturation string for the chosen percentage. */
export function saturationFilter(percent: number) {
  return `saturate(${clamp(percent, 0, 100) / 100})`;
}

/* --------------------------- language & time --------------------------- */

export const LANGUAGE_STORAGE_KEY = "btcomms.language.v1";

export type LanguageOption = { value: string; label: string; locale: string };

/** A small, honest list: each entry is a real BCP-47 tag we format dates with. */
export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: "en-US", label: "English, US", locale: "en-US" },
  { value: "en-GB", label: "English, UK", locale: "en-GB" },
  { value: "es-ES", label: "Español", locale: "es-ES" },
  { value: "fr", label: "Français", locale: "fr" },
  { value: "de", label: "Deutsch", locale: "de" },
  { value: "pt-BR", label: "Português do Brasil", locale: "pt-BR" },
  { value: "ar", label: "العربية", locale: "ar" },
  { value: "ja", label: "日本語", locale: "ja" },
  { value: "ko", label: "한국어", locale: "ko" },
  { value: "zh-CN", label: "中文", locale: "zh-CN" },
];

export const DEFAULT_LANGUAGE = "en-US";
export const DEFAULT_TIME_FORMAT: TimeFormat = "auto";

export const TIME_FORMAT_OPTIONS: { value: TimeFormat; label: string; description: string }[] = [
  { value: "auto", label: "Auto", description: "Follow your device's clock setting." },
  { value: "12h", label: "12-hour", description: "e.g. 4:32 PM" },
  { value: "24h", label: "24-hour", description: "e.g. 16:32" },
];

export function localeFor(language: string | undefined): string {
  const found = LANGUAGE_OPTIONS.find((l) => l.value === language);
  return found?.locale ?? DEFAULT_LANGUAGE;
}

export function languageLabel(language: string | undefined): string {
  return LANGUAGE_OPTIONS.find((l) => l.value === language)?.label ?? "English, US";
}

export function normalizeTimeFormat(value: unknown): TimeFormat {
  return oneOf(value, ["auto", "12h", "24h"], DEFAULT_TIME_FORMAT);
}

/** Resolve `auto` against the user's device preference. */
export function resolveHourCycle(format: TimeFormat, preferred?: string | null): "h12" | "h23" {
  if (format === "12h") return "h12";
  if (format === "24h") return "h23";
  return preferred === "h23" || preferred === "h24" ? "h23" : "h12";
}

/**
 * Format a clock time honouring the saved language + time format.
 * Falls back to the runtime default if `Intl` rejects the locale.
 */
export function formatClock(iso: string | Date, language?: string, format?: TimeFormat): string {
  const date = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const locale = localeFor(language);
  let hour12: boolean | undefined;
  if (format === "12h") hour12 = true;
  else if (format === "24h") hour12 = false;

  try {
    return new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      minute: "2-digit",
      hour12,
    }).format(date);
  } catch {
    return date.toLocaleTimeString();
  }
}

/* --------------------- persisted blob <-> appearance --------------------- */

/** Read the accessibility slice out of `profiles.user_settings`. */
export function accessibilityFromSettings(settings: unknown): Required<AccessibilitySettings> {
  const value =
    settings && typeof settings === "object"
      ? (settings as { accessibility?: unknown }).accessibility
      : undefined;
  return normalizeAccessibility(value);
}

/** Write the accessibility slice back without clobbering other settings. */
export function withAccessibility(
  settings: Record<string, unknown> | null | undefined,
  accessibility: AccessibilitySettings,
): Record<string, unknown> {
  return { ...(settings ?? {}), accessibility: normalizeAccessibility(accessibility) };
}

/**
 * The saved language + time format, read from localStorage.
 *
 * Kept deliberately synchronous and non-reactive: `formatTime` is called from
 * every message row, and a context subscription there would re-render the whole
 * feed. Changing the setting bumps a document attribute; the settings panel
 * shows the live preview itself.
 */
export function readLanguagePreference(): { language: string; timeFormat: TimeFormat } {
  const fallback = { language: DEFAULT_LANGUAGE, timeFormat: DEFAULT_TIME_FORMAT };
  if (typeof window === "undefined" || typeof localStorage === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (!raw) {
      // Fall back to the appearance blob written by the provider.
      const appearance = localStorage.getItem("btcomms.appearance.v1");
      if (appearance) {
        const parsed = JSON.parse(appearance) as { language?: string; time_format?: string };
        return {
          language: parsed.language ?? fallback.language,
          timeFormat: normalizeTimeFormat(parsed.time_format),
        };
      }
      return fallback;
    }
    const parsed = JSON.parse(raw) as { language?: string; timeFormat?: string };
    return {
      language: parsed.language ?? fallback.language,
      timeFormat: normalizeTimeFormat(parsed.timeFormat),
    };
  } catch {
    return fallback;
  }
}
