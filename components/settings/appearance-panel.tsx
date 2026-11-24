"use client";

import { THEMES, useAppearance, DENSITY_LABELS } from "@/lib/appearance";
import {
  CardLabel,
  Field,
  RadioRow,
  SettingsButton,
  SettingsCard,
  SettingsSection,
  TextInput,
  Toggle,
} from "@/components/settings/primitives";
import { CheckIcon, MoonIcon, PaletteIcon, SunIcon } from "@/components/icons";
import type { Density, ThemeId } from "@/lib/types";

export function AppearancePanel({
  accentColor,
  onAccentChange,
  bannerColor,
  onBannerChange,
}: {
  accentColor: string;
  onAccentChange: (color: string) => void;
  bannerColor: string | null;
  onBannerChange: (color: string) => void;
}) {
  const { appearance, setAppearance, resetAppearance } = useAppearance();

  return (
    <div>
      <SettingsSection
        title="Appearance"
        description="Pick a theme, tune your message density, and make BT Comms feel like yours. Changes apply instantly and sync to your account."
      >
        {/* Theme picker */}
        <SettingsCard>
          <CardLabel>Theme</CardLabel>
          <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {THEMES.map((theme) => {
              const active = theme.id === appearance.theme_id;
              return (
                <button
                  key={theme.id}
                  onClick={() => setAppearance({ theme_id: theme.id as ThemeId })}
                  aria-pressed={active}
                  title={theme.description}
                  className={`group relative overflow-hidden rounded-lg border text-left transition ${
                    active
                      ? "border-blurple ring-2 ring-blurple/40"
                      : "border-line hover:border-muted/50"
                  }`}
                >
                  <span
                    className="block h-14 w-full"
                    style={{
                      backgroundImage: `linear-gradient(150deg, ${theme.gradient[0]}, ${theme.gradient[1]})`,
                    }}
                  >
                    <span className="flex h-full items-end p-1.5">
                      <span
                        className="h-2 w-8 rounded-full"
                        style={{ background: theme.vars["--c-accent"] }}
                      />
                    </span>
                  </span>
                  <span className="flex items-center justify-between gap-1 bg-void/70 px-2 py-1.5">
                    <span className="truncate text-[11.5px] font-semibold text-bright">
                      {theme.name}
                    </span>
                    {active && <CheckIcon width={12} height={12} className="shrink-0 text-blurple-soft" />}
                  </span>
                </button>
              );
            })}
          </div>
        </SettingsCard>

        {/* Light / dark quick toggle */}
        <SettingsCard>
          <CardLabel>Base mode</CardLabel>
          <div className="mt-2 flex gap-2">
            <ModeButton
              label="Dark"
              icon={<MoonIcon width={15} height={15} />}
              active={appearance.theme_id !== "light"}
              onClick={() =>
                setAppearance({ theme_id: appearance.theme_id === "light" ? "amethyst" : appearance.theme_id })
              }
            />
            <ModeButton
              label="Light"
              icon={<SunIcon width={15} height={15} />}
              active={appearance.theme_id === "light"}
              onClick={() => setAppearance({ theme_id: "light" })}
            />
          </div>
        </SettingsCard>

        {/* Density */}
        <SettingsCard>
          <CardLabel>Message display</CardLabel>
          <div className="mt-2">
            <RadioRow<Density>
              value={appearance.message_density}
              onChange={(value) => setAppearance({ message_density: value })}
              options={[
                { value: "compact", label: DENSITY_LABELS.compact, description: "More messages on screen." },
                { value: "cozy", label: DENSITY_LABELS.cozy, description: "The default balance." },
                { value: "roomy", label: DENSITY_LABELS.roomy, description: "Extra breathing room between messages." },
              ]}
            />
          </div>
        </SettingsCard>

        {/* Accent + banner colours */}
        <div className="grid gap-3 sm:grid-cols-2">
          <SettingsCard>
            <CardLabel>Your accent colour</CardLabel>
            <ColourPicker value={accentColor} onChange={onAccentChange} />
          </SettingsCard>
          <SettingsCard>
            <CardLabel>Profile banner</CardLabel>
            <ColourPicker value={bannerColor ?? accentColor} onChange={onBannerChange} />
          </SettingsCard>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="flex items-center gap-1.5 text-[11.5px] text-dim">
            <PaletteIcon width={13} height={13} />
            Appearance saves automatically to your profile.
          </p>
          <SettingsButton tone="secondary" onClick={resetAppearance}>
            Reset to defaults
          </SettingsButton>
        </div>
      </SettingsSection>
    </div>
  );
}

const SWATCHES = [
  "#5865f2",
  "#a855f7",
  "#eb459e",
  "#f43f5e",
  "#faa61a",
  "#22c55e",
  "#06b6d4",
  "#00a8fc",
  "#9b59b6",
  "#e2e4e9",
];

function ColourPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-1.5">
        {SWATCHES.map((color) => (
          <button
            key={color}
            onClick={() => onChange(color)}
            aria-label={`Use ${color}`}
            aria-pressed={value.toLowerCase() === color.toLowerCase()}
            className={`h-7 w-7 rounded-full transition ${
              value.toLowerCase() === color.toLowerCase()
                ? "ring-2 ring-bright ring-offset-2 ring-offset-raised"
                : "opacity-80 hover:opacity-100"
            }`}
            style={{ background: color }}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Custom colour"
          className="h-7 w-9 cursor-pointer rounded border border-line bg-transparent"
        />
        <span className="font-mono text-[11.5px] text-muted">{value.toUpperCase()}</span>
      </div>
    </div>
  );
}

function ModeButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-[12.5px] font-semibold transition ${
        active ? "border-blurple/60 bg-blurple/10 text-bright" : "border-line bg-void/40 text-muted hover:bg-hover/40"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
