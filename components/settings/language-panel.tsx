"use client";

import { useEffect, useState } from "react";
import { useAppearance } from "@/lib/appearance";
import {
  DEFAULT_LANGUAGE,
  DEFAULT_TIME_FORMAT,
  LANGUAGE_OPTIONS,
  LANGUAGE_STORAGE_KEY,
  TIME_FORMAT_OPTIONS,
  formatClock,
  languageLabel,
  localeFor,
  normalizeTimeFormat,
} from "@/lib/accessibility";
import {
  CardLabel,
  RadioRow,
  Select,
  SettingsCard,
  SettingsSection,
} from "@/components/settings/primitives";
import type { TimeFormat } from "@/lib/types";

/**
 * User Settings → Language & Time.
 *
 * Language drives `Intl` formatting (clock, dates, relative labels) and the
 * time format decides 12- vs 24-hour rendering. Both are written to
 * localStorage for an instant paint and to `profiles.user_settings` through the
 * appearance provider's persist hook.
 */
export function LanguageTimePanel() {
  const { appearance, setAppearance } = useAppearance();
  const language = appearance.language ?? DEFAULT_LANGUAGE;
  const timeFormat = normalizeTimeFormat(appearance.time_format ?? DEFAULT_TIME_FORMAT);

  // A stable sample time so the preview never flickers between renders.
  const [sample, setSample] = useState<string>(() => new Date(2026, 0, 2, 16, 32).toISOString());

  useEffect(() => {
    try {
      localStorage.setItem(
        LANGUAGE_STORAGE_KEY,
        JSON.stringify({ language, timeFormat }),
      );
    } catch {
      /* storage may be unavailable */
    }
  }, [language, timeFormat]);

  function setLanguage(next: string) {
    setAppearance({ language: next });
  }

  function setTimeFormat(next: TimeFormat) {
    setAppearance({ time_format: next });
  }

  return (
    <SettingsSection
      title="Language & Time"
      description="Pick the language BT Comms formats with, and how clock times are written."
    >
      <SettingsCard>
        <CardLabel>Select a Language</CardLabel>
        <p className="mt-0.5 mb-2 text-[12px] text-muted">
          Choose the language you want BT Comms to display.
        </p>
        <Select
          value={language}
          onChange={setLanguage}
          options={LANGUAGE_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
        />
        <p className="mt-1.5 text-[11px] text-dim">
          Currently formatting dates and numbers with <code className="font-mono">{localeFor(language)}</code>.
        </p>
      </SettingsCard>

      <SettingsCard>
        <CardLabel>Time Format</CardLabel>
        <div className="mt-2">
          <RadioRow
            options={TIME_FORMAT_OPTIONS}
            value={timeFormat}
            onChange={(value) => setTimeFormat(value)}
          />
        </div>
      </SettingsCard>

      <SettingsCard>
        <CardLabel>Preview</CardLabel>
        <div className="mt-2 overflow-hidden rounded-xl border border-subtle bg-void/60">
          <div className="flex items-baseline justify-between gap-3 border-b border-subtle px-3 py-2">
            <span className="text-[12.5px] font-semibold text-bright">Message timestamp</span>
            <span className="font-mono text-[12.5px] text-muted">
              Today at {formatClock(sample, language, timeFormat)}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3 border-b border-subtle px-3 py-2">
            <span className="text-[12.5px] font-semibold text-bright">Voice call timer</span>
            <span className="font-mono text-[12.5px] text-muted">12:04</span>
          </div>
          <div className="flex items-baseline justify-between gap-3 px-3 py-2">
            <span className="text-[12.5px] font-semibold text-bright">Member since</span>
            <span className="text-[12.5px] text-muted">
              {new Date(sample).toLocaleDateString(localeFor(language), {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
          <div className="border-t border-subtle px-3 py-2">
            <button
              type="button"
              onClick={() => setSample(new Date().toISOString())}
              className="rounded-md border border-line bg-hover/40 px-2.5 py-1 text-[11.5px] font-semibold text-muted transition hover:text-bright"
            >
              Use the current time
            </button>
            <span className="ml-2 text-[11px] text-dim">
              Language: {languageLabel(language)}
            </span>
          </div>
        </div>
      </SettingsCard>
    </SettingsSection>
  );
}
