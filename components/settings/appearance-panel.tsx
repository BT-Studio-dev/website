"use client";

import { THEMES, useAppearance, DENSITY_LABELS } from "@/lib/appearance";
import {
  CardLabel,
  Divider,
  RadioRow,
  SettingsButton,
  SettingsCard,
  SettingsSection,
  Toggle,
} from "@/components/settings/primitives";
import { CheckIcon, MoonIcon, PaletteIcon, SparkleIcon, SunIcon } from "@/components/icons";
import { ICON_PACKS } from "@/lib/icon-packs";
import type {
  ChatDisplaySettings,
  Density,
  IconPackId,
  ThemeId,
  UserSettings,
} from "@/lib/types";

/**
 * Appearance settings.
 *
 * Theme tiles + gradient presets, app icon packs (with limited-time promos),
 * the chat-display switch set, DM search scope, and Streamer Mode.
 */
export function AppearancePanel({
  accentColor,
  onAccentChange,
  bannerColor,
  onBannerChange,
  settings,
  onChange,
}: {
  accentColor: string;
  onAccentChange: (color: string) => void;
  bannerColor: string | null;
  onBannerChange: (color: string) => void;
  settings: UserSettings;
  onChange: (patch: Partial<UserSettings>) => void;
}) {
  const { appearance, setAppearance, resetAppearance } = useAppearance();

  const chat: Required<ChatDisplaySettings> = {
    showMedia: settings.showMedia ?? true,
    showEmbeds: settings.showEmbeds ?? true,
    showReactions: settings.showReactions ?? true,
    splitThreads: settings.splitThreads ?? false,
    previewMarkup: settings.previewMarkup ?? true,
    emoticonToEmoji: settings.emoticonToEmoji ?? true,
    showSendButton: settings.showSendButton ?? true,
  };

  return (
    <div className="space-y-3">
      <SettingsSection
        title="Appearance"
        description="Pick a theme, tune the ambient gradient, and choose what the message feed shows you. Everything syncs to your account."
      >
        {/* ---- theme tiles ---- */}
        <SettingsCard>
          <CardLabel>Theme</CardLabel>
          <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {THEME_TILES.map((tile) => {
              const active = appearance.theme_id === tile.id;
              const theme = THEMES.find((t) => t.id === tile.id);
              return (
                <button
                  key={tile.id}
                  onClick={() => setAppearance({ theme_id: tile.id })}
                  aria-pressed={active}
                  className={`group relative overflow-hidden rounded-lg border text-left transition ${
                    active ? "border-blurple ring-2 ring-blurple/40" : "border-line hover:border-muted/50"
                  }`}
                >
                  <span
                    className="relative block h-16 w-full"
                    style={{
                      backgroundImage: theme
                        ? `radial-gradient(120% 120% at 8% 0%, ${theme.gradient[0]}, transparent 70%), linear-gradient(150deg, ${theme.gradient[0]}, ${theme.gradient[1]})`
                        : "linear-gradient(150deg,#8b5cf6,#f59e0b)",
                    }}
                  >
                    <span className="absolute inset-x-0 bottom-0 flex items-center gap-1 p-1.5">
                      <span className="h-2 w-7 rounded-full bg-white/80" />
                      <span className="h-2 w-4 rounded-full bg-white/40" />
                    </span>
                    {tile.promo && (
                      <span className="absolute top-1 right-1 rounded bg-amber px-1 py-0.5 text-[8px] font-bold tracking-wide text-black uppercase">
                        {tile.promo}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center justify-between gap-1 bg-void/70 px-2 py-1.5">
                    <span className="truncate text-[11.5px] font-semibold text-bright">{tile.name}</span>
                    {active && <CheckIcon width={12} height={12} className="shrink-0 text-blurple-soft" />}
                  </span>
                </button>
              );
            })}
          </div>
        </SettingsCard>

        {/* ---- custom gradient ---- */}
        <SettingsCard>
          <CardLabel>
            <span className="flex items-center gap-1.5">
              <SparkleIcon width={13} height={13} /> Ambient Gradient
            </span>
          </CardLabel>
          <p className="mt-1 text-[11.5px] text-muted">
            The two-tone wash that glows behind every pane. Pick a preset or roll your own.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {GRADIENT_PRESETS.map((preset) => {
              const active =
                (appearance.gradient_from ?? "#7c3aed").toLowerCase() === preset.from.toLowerCase() &&
                (appearance.gradient_to ?? "#f59e0b").toLowerCase() === preset.to.toLowerCase();
              return (
                <button
                  key={preset.id}
                  onClick={() =>
                    setAppearance({
                      theme_id: "custom",
                      gradient_from: preset.from,
                      gradient_to: preset.to,
                    })
                  }
                  aria-label={`${preset.name} gradient`}
                  title={preset.name}
                  className={`h-9 w-14 rounded-md ring-2 transition ${
                    active ? "ring-bright" : "ring-transparent hover:ring-subtle"
                  }`}
                  style={{ backgroundImage: `linear-gradient(120deg, ${preset.from}, ${preset.to})` }}
                />
              );
            })}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="color"
              aria-label="Gradient start colour"
              value={appearance.gradient_from ?? "#7c3aed"}
              onChange={(e) => setAppearance({ theme_id: "custom", gradient_from: e.target.value })}
              className="h-7 w-9 cursor-pointer rounded border border-line bg-transparent"
            />
            <span className="text-[11px] text-dim">→</span>
            <input
              type="color"
              aria-label="Gradient end colour"
              value={appearance.gradient_to ?? "#f59e0b"}
              onChange={(e) => setAppearance({ theme_id: "custom", gradient_to: e.target.value })}
              className="h-7 w-9 cursor-pointer rounded border border-line bg-transparent"
            />
            <span className="font-mono text-[11px] text-muted">
              {(appearance.gradient_from ?? "#7c3aed").toUpperCase()} →{" "}
              {(appearance.gradient_to ?? "#f59e0b").toUpperCase()}
            </span>
          </div>
        </SettingsCard>

        {/* ---- light / dark + density ---- */}
        <div className="grid gap-3 lg:grid-cols-2">
          <SettingsCard>
            <CardLabel>Base mode</CardLabel>
            <div className="mt-2 flex gap-2">
              <ModeButton
                label="Dark"
                icon={<MoonIcon width={15} height={15} />}
                active={appearance.theme_id !== "light"}
                onClick={() => setAppearance({ theme_id: "ambient" })}
              />
              <ModeButton
                label="Light"
                icon={<SunIcon width={15} height={15} />}
                active={appearance.theme_id === "light"}
                onClick={() => setAppearance({ theme_id: "light" })}
              />
            </div>
          </SettingsCard>

          <SettingsCard>
            <CardLabel>Message display</CardLabel>
            <div className="mt-2">
              <RadioRow<Density>
                value={appearance.message_density}
                onChange={(value) => setAppearance({ message_density: value })}
                options={[
                  { value: "compact", label: DENSITY_LABELS.compact, description: "More messages on screen." },
                  { value: "cozy", label: DENSITY_LABELS.cozy, description: "The default balance." },
                  { value: "roomy", label: DENSITY_LABELS.roomy, description: "Extra breathing room." },
                ]}
              />
            </div>
          </SettingsCard>
        </div>

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

        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-[11.5px] text-dim">
            <PaletteIcon width={13} height={13} /> Appearance saves automatically.
          </p>
          <SettingsButton tone="secondary" onClick={resetAppearance}>
            Reset to defaults
          </SettingsButton>
        </div>
      </SettingsSection>

      {/* ---- app icons ---- */}
      <SettingsSection title="App Icons" description="Change how the app icon looks in your dock and taskbar.">
        <SettingsCard>
          <CardLabel>Icon pack</CardLabel>
          <div className="mt-2.5 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {ICON_PACKS.map((pack) => {
              const active = (settings.iconPack ?? appearance.icon_pack ?? "classic") === pack.id;
              return (
                <button
                  key={pack.id}
                  onClick={() => {
                    onChange({ iconPack: pack.id as IconPackId });
                    setAppearance({ icon_pack: pack.id as IconPackId });
                  }}
                  aria-pressed={active}
                  className={`relative rounded-lg border p-2 transition ${
                    active ? "border-blurple bg-blurple/10" : "border-line hover:bg-hover/40"
                  }`}
                >
                  <span
                    className="mx-auto grid h-11 w-11 place-items-center rounded-xl text-[15px] font-black text-white"
                    style={{ backgroundImage: pack.gradient }}
                  >
                    BT
                  </span>
                  <span className="mt-1 block truncate text-[10.5px] font-semibold text-bright">
                    {pack.name}
                  </span>
                  {pack.promo && (
                    <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 rounded bg-amber px-1 text-[8px] font-bold tracking-wide whitespace-nowrap text-black uppercase">
                      {pack.promo}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </SettingsCard>
      </SettingsSection>

      {/* ---- chat display ---- */}
      <SettingsSection
        title="Chat Display"
        description="Decide what shows up in the message feed."
      >
        <SettingsCard>
          <div className="space-y-3">
            <Toggle
              checked={chat.showMedia}
              onChange={(next) => onChange({ showMedia: next })}
              label="Show images, videos, and lolcats"
              description="Inline previews instead of plain links."
            />
            <Divider />
            <Toggle
              checked={chat.showEmbeds}
              onChange={(next) => onChange({ showEmbeds: next })}
              label="Show embeds and link previews"
              description="Rich cards for links you and others post."
            />
            <Divider />
            <Toggle
              checked={chat.showReactions}
              onChange={(next) => onChange({ showReactions: next })}
              label="Show emoji reactions"
              description="Reactions appear under each message."
            />
            <Divider />
            <Toggle
              checked={chat.splitThreads}
              onChange={(next) => onChange({ splitThreads: next })}
              label="Open threads in split view"
              description="Keep the channel visible next to the thread."
            />
            <Divider />
            <Toggle
              checked={chat.previewMarkup}
              onChange={(next) => onChange({ previewMarkup: next })}
              label="Preview emoji, mentions, and markdown"
              description="Renders **bold**, *italics* and :shortcodes: as you type."
            />
            <Divider />
            <Toggle
              checked={chat.emoticonToEmoji}
              onChange={(next) => onChange({ emoticonToEmoji: next })}
              label="Automatically convert emoticons to emoji"
              description=":) becomes 🙂 on send."
            />
            <Divider />
            <Toggle
              checked={chat.showSendButton}
              onChange={(next) => onChange({ showSendButton: next })}
              label="Show send message button"
              description="Adds a send button to the composer."
            />
          </div>
        </SettingsCard>

        <SettingsCard>
          <CardLabel>Direct message search</CardLabel>
          <div className="mt-2">
            <RadioRow<"selected" | "all">
              value={settings.dmSearchScope ?? "selected"}
              onChange={(value) => onChange({ dmSearchScope: value })}
              options={[
                {
                  value: "selected",
                  label: "Searches only in the selected DM",
                  description: "Default — the search box stays scoped to the conversation you opened.",
                },
                {
                  value: "all",
                  label: "Searches across all DMs",
                  description: "Find anything you've ever been sent, from any conversation.",
                },
              ]}
            />
          </div>
        </SettingsCard>
      </SettingsSection>

      {/* ---- streamer mode ---- */}
      <SettingsSection
        title="Streamer Mode"
        description="Hide personal information while you're live."
      >
        <SettingsCard>
          <Toggle
            checked={settings.streamerMode ?? false}
            onChange={(next) => onChange({ streamerMode: next })}
            label="Enable Streamer Mode"
            description="Blurs emails, tokens and invite links anywhere they appear."
          />
          <div className={`mt-3 space-y-3 ${settings.streamerMode ? "" : "pointer-events-none opacity-45"}`}>
            <Divider />
            <Toggle
              checked={settings.streamerHidePersonal ?? true}
              onChange={(next) => onChange({ streamerHidePersonal: next })}
              label="Hide personal information"
              description="Hides your email, connected accounts and account ID."
              disabled={!settings.streamerMode}
            />
            <Toggle
              checked={settings.streamerHideInvites ?? true}
              onChange={(next) => onChange({ streamerHideInvites: next })}
              label="Hide invite links"
              description="Masks server invite codes so viewers can't join."
              disabled={!settings.streamerMode}
            />
            <Toggle
              checked={settings.streamerMuteSounds ?? false}
              onChange={(next) => onChange({ streamerMuteSounds: next })}
              label="Disable sound effects and notifications"
              description="Keeps pings out of your stream audio."
              disabled={!settings.streamerMode}
            />
          </div>
        </SettingsCard>
      </SettingsSection>
    </div>
  );
}

const THEME_TILES: { id: ThemeId; name: string; promo?: string }[] = [
  { id: "light", name: "Light" },
  { id: "charcoal", name: "Dark Charcoal" },
  { id: "midnight", name: "Midnight" },
  { id: "ambient", name: "Amber Dusk", promo: "New" },
  { id: "custom", name: "Custom Gradient", promo: "2026" },
  { id: "aurora", name: "Aurora" },
  { id: "amethyst", name: "Amethyst" },
  { id: "ember", name: "Ember" },
  { id: "forest", name: "Forest" },
  { id: "mono", name: "Mono" },
];

const GRADIENT_PRESETS = [
  { id: "amber-dusk", name: "Amber Dusk", from: "#7c3aed", to: "#f59e0b" },
  { id: "cotton-candy", name: "Cotton Candy", from: "#f472b6", to: "#60a5fa" },
  { id: "deep-sea", name: "Deep Sea", from: "#0ea5e9", to: "#14b8a6" },
  { id: "sunset", name: "Sunset", from: "#f97316", to: "#db2777" },
  { id: "forest", name: "Forest", from: "#16a34a", to: "#0f172a" },
  { id: "mono", name: "Mono", from: "#64748b", to: "#0f172a" },
];

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
        active
          ? "border-blurple/60 bg-blurple/10 text-bright"
          : "border-line bg-void/40 text-muted hover:bg-hover/40"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
