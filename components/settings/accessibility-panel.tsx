"use client";

import { useMemo, useState } from "react";
import { useAppearance } from "@/lib/appearance";
import {
  CHAT_DISPLAY_OPTIONS,
  CHAT_FONT_SIZE_RANGE,
  GROUP_SPACING_RANGE,
  NOTIFICATION_DURATION_RANGE,
  OFFICIAL_MESSAGE_OPTIONS,
  ROLE_COLOR_OPTIONS,
  SATURATION_RANGE,
  STICKER_ANIMATION_OPTIONS,
  TTS_RATE_RANGE,
  UI_DENSITY_OPTIONS,
  normalizeAccessibility,
} from "@/lib/accessibility";
import {
  CardLabel,
  RadioRow,
  Select,
  SettingsButton,
  SettingsCard,
  SettingsSection,
  Toggle,
} from "@/components/settings/primitives";
import type { AccessibilitySettings } from "@/lib/types";

/**
 * User Settings → Accessibility.
 *
 * Every control writes straight through `setAppearance`, which (a) repaints the
 * document immediately via `applyAppearance` and (b) mirrors the blob into
 * `localStorage` + `profiles` through the provider's persist hook. The preview
 * card at the top reads the same values, so what you tick is what you see.
 */
export function AccessibilityPanel() {
  const { appearance, setAppearance } = useAppearance();

  // The provider stores accessibility as flat Appearance keys; expose one blob
  // to the panel and write changes back through the same setter.
  const a11y = useMemo(
    () =>
      normalizeAccessibility({
        chatFontSize: appearance.chat_font_size,
        underlineLinks: appearance.underline_links,
        displayNameStyles: appearance.display_name_styles,
        uiDensity: appearance.ui_density,
        chatDisplay: appearance.chat_display,
        groupSpacing: appearance.message_group_spacing,
        saturation: appearance.saturation,
        saturationCustomColors: appearance.saturation_custom_colors,
        highContrast: appearance.high_contrast,
        syncContrast: appearance.sync_contrast,
        roleColors: appearance.role_colors,
        officialMessages: appearance.official_messages,
        showOnOff: appearance.show_on_off,
        reduceMotion: appearance.reduce_motion,
        reduceMotionSystem: appearance.reduce_motion_system,
        notificationDuration: appearance.notification_duration,
        playGifsFocused: appearance.play_gifs_focused,
        playAnimatedEmoji: appearance.play_animated_emoji,
        stickerAnimations: appearance.sticker_animations,
        ttsRate: appearance.tts_rate,
        showImageDescriptions: appearance.show_image_descriptions,
        legacyChatInput: appearance.legacy_chat_input,
      }),
    [appearance],
  );

  function patch(next: Partial<AccessibilitySettings>) {
    const updated = normalizeAccessibility({ ...a11y, ...next });
    setAppearance({
      chat_font_size: updated.chatFontSize,
      underline_links: updated.underlineLinks,
      display_name_styles: updated.displayNameStyles,
      ui_density: updated.uiDensity,
      chat_display: updated.chatDisplay,
      message_group_spacing: updated.groupSpacing,
      saturation: updated.saturation,
      saturation_custom_colors: updated.saturationCustomColors,
      high_contrast: updated.highContrast,
      sync_contrast: updated.syncContrast,
      role_colors: updated.roleColors,
      official_messages: updated.officialMessages,
      show_on_off: updated.showOnOff,
      reduce_motion: updated.reduceMotion,
      reduce_motion_system: updated.reduceMotionSystem,
      notification_duration: updated.notificationDuration,
      play_gifs_focused: updated.playGifsFocused,
      play_animated_emoji: updated.playAnimatedEmoji,
      sticker_animations: updated.stickerAnimations,
      tts_rate: updated.ttsRate,
      show_image_descriptions: updated.showImageDescriptions,
      legacy_chat_input: updated.legacyChatInput,
    });
  }

  return (
    <SettingsSection
      title="Accessibility"
      description="Tune readability, density, motion and audio. Every change applies instantly."
    >
      <AccessibilityPreview a11y={a11y} />

      <SettingsCard>
        <CardLabel>Text Readability</CardLabel>
        <div className="mt-3 space-y-4">
          <Range
            label="Text Size in Chat"
            min={CHAT_FONT_SIZE_RANGE.min}
            max={CHAT_FONT_SIZE_RANGE.max}
            value={a11y.chatFontSize}
            suffix="px"
            onChange={(value) => patch({ chatFontSize: value })}
          />
          <Toggle
            checked={a11y.underlineLinks}
            onChange={(value) => patch({ underlineLinks: value })}
            label="Always underline links"
            description="Underlines every link in chat so it stands out from plain text."
          />
          <Toggle
            checked={a11y.displayNameStyles}
            onChange={(value) => patch({ displayNameStyles: value })}
            label="Display Name Styles"
            description="Enable display name styles — including font, effect, and color."
          />
        </div>
      </SettingsCard>

      <SettingsCard>
        <CardLabel>Visual Density</CardLabel>
        <div className="mt-3 space-y-4">
          <div>
            <p className="mb-1.5 text-[12px] font-semibold text-muted">UI Density</p>
            <RadioRow
              options={UI_DENSITY_OPTIONS}
              value={a11y.uiDensity}
              onChange={(value) => patch({ uiDensity: value })}
            />
          </div>
          <div>
            <p className="mb-1.5 text-[12px] font-semibold text-muted">Chat Message Display</p>
            <div className="flex gap-2">
              {CHAT_DISPLAY_OPTIONS.map((option) => (
                <SettingsButton
                  key={option.value}
                  tone={a11y.chatDisplay === option.value ? "primary" : "secondary"}
                  onClick={() => patch({ chatDisplay: option.value })}
                >
                  {option.label}
                </SettingsButton>
              ))}
            </div>
          </div>
          <Range
            label="Space Between Message Groups"
            min={GROUP_SPACING_RANGE.min}
            max={GROUP_SPACING_RANGE.max}
            value={a11y.groupSpacing}
            suffix="px"
            onChange={(value) => patch({ groupSpacing: value })}
          />
        </div>
      </SettingsCard>

      <SettingsCard>
        <CardLabel>Color &amp; Contrast</CardLabel>
        <div className="mt-3 space-y-4">
          <Range
            label="Saturation"
            min={SATURATION_RANGE.min}
            max={SATURATION_RANGE.max}
            value={a11y.saturation}
            suffix="%"
            onChange={(value) => patch({ saturation: value })}
          />
          <Toggle
            checked={a11y.saturationCustomColors}
            onChange={(value) => patch({ saturationCustomColors: value })}
            label="Apply saturation setting to custom colors"
            description="Applies the saturation slider to role and profile colors too."
          />
          <Toggle
            checked={a11y.highContrast}
            onChange={(value) => patch({ highContrast: value })}
            label="Enable High Contrast Mode"
            description="Stronger borders and brighter secondary text."
          />
          <Toggle
            checked={a11y.syncContrast}
            onChange={(value) => patch({ syncContrast: value })}
            label="Sync contrast settings"
            description="Use the same contrast level on every device you sign in to."
          />
          <Select
            label="Role Colors"
            value={a11y.roleColors}
            onChange={(value) => patch({ roleColors: value as AccessibilitySettings["roleColors"] })}
            options={ROLE_COLOR_OPTIONS}
          />
          <Select
            label="Official Messages"
            value={a11y.officialMessages}
            onChange={(value) =>
              patch({ officialMessages: value as AccessibilitySettings["officialMessages"] })
            }
            options={OFFICIAL_MESSAGE_OPTIONS}
          />
          <Toggle
            checked={a11y.showOnOff}
            onChange={(value) => patch({ showOnOff: value })}
            label="Show on/off indicators"
            description="Labels toggles with a visible on or off state next to the switch."
          />
        </div>
      </SettingsCard>

      <SettingsCard>
        <CardLabel>Reduced Motion</CardLabel>
        <div className="mt-3 space-y-4">
          <Toggle
            checked={a11y.reduceMotion}
            onChange={(value) => patch({ reduceMotion: value })}
            label="Enable Reduced Motion"
            description="Turns off transitions, hover lifts and animated entrances."
          />
          <Toggle
            checked={a11y.reduceMotionSystem}
            onChange={(value) => patch({ reduceMotionSystem: value })}
            label="Sync with computer setting"
            description="Follow your operating system's reduce-motion preference."
          />
          <Range
            label="Minimum Notification Duration"
            min={NOTIFICATION_DURATION_RANGE.min}
            max={NOTIFICATION_DURATION_RANGE.max}
            value={a11y.notificationDuration}
            suffix="s"
            onChange={(value) => patch({ notificationDuration: value })}
          />
          <Toggle
            checked={a11y.playGifsFocused}
            onChange={(value) => patch({ playGifsFocused: value })}
            label="Play GIFs when BT Comms is focused"
            description="Pauses animated GIFs while the tab is in the background."
          />
          <Toggle
            checked={a11y.playAnimatedEmoji}
            onChange={(value) => patch({ playAnimatedEmoji: value })}
            label="Play animated emoji"
            description="Lets animated emoji loop in messages and the picker."
          />
          <div>
            <p className="mb-1.5 text-[12px] font-semibold text-muted">Play sticker animations</p>
            <RadioRow
              options={STICKER_ANIMATION_OPTIONS}
              value={a11y.stickerAnimations}
              onChange={(value) => patch({ stickerAnimations: value })}
            />
          </div>
        </div>
      </SettingsCard>

      <SettingsCard>
        <CardLabel>Audio &amp; Screen Reader</CardLabel>
        <div className="mt-3 space-y-4">
          <Range
            label="Text-to-Speech rate"
            min={TTS_RATE_RANGE.min}
            max={TTS_RATE_RANGE.max}
            step={0.1}
            value={a11y.ttsRate}
            suffix="x"
            format={(value) => value.toFixed(1)}
            onChange={(value) => patch({ ttsRate: value })}
          />
          <TtsPreview rate={a11y.ttsRate} />
          <Toggle
            checked={a11y.showImageDescriptions}
            onChange={(value) => patch({ showImageDescriptions: value })}
            label="Show image descriptions"
            description="Displays the alt text of an attachment when one is available."
          />
          <Toggle
            checked={a11y.legacyChatInput}
            onChange={(value) => patch({ legacyChatInput: value })}
            label="Use the legacy chat input"
            description="The classic single-line input without the floating pill."
          />
        </div>
      </SettingsCard>
    </SettingsSection>
  );
}

/* ------------------------------- preview ------------------------------- */

function AccessibilityPreview({ a11y }: { a11y: Required<AccessibilitySettings> }) {
  const [clicks, setClicks] = useState(0);
  const [reacted, setReacted] = useState(false);

  const nameColor =
    a11y.roleColors === "off" ? "var(--text-primary)" : "var(--c-accent-soft, var(--c-accent))";

  return (
    <SettingsCard>
      <CardLabel>Preview</CardLabel>
      <p className="mt-0.5 text-[12px] text-muted">
        A sample conversation — tweak a setting and watch it update.
      </p>
      <div
        className="mt-3 overflow-hidden rounded-xl border border-subtle bg-void/60"
        data-ui-density={a11y.uiDensity}
      >
        <div className="flex items-center gap-1.5 border-b border-subtle px-3 py-1.5">
          <span className="text-[11px] font-bold tracking-[0.1em] text-dim uppercase">#preview</span>
          {a11y.showOnOff && (
            <span className="rounded bg-mint/15 px-1.5 py-0.5 text-[9.5px] font-bold tracking-wide text-mint uppercase">
              on
            </span>
          )}
        </div>

        <div
          className="space-y-0 px-3 py-2"
          style={{ ["--message-group-gap" as string]: `${a11y.groupSpacing}px` }}
        >
          <SampleMessage
            a11y={a11y}
            name="Ada"
            nameColor={nameColor}
            time="Today at 9:14 AM"
            first
            body={
              <p className="chat-text text-bright">
                Morning! Shipping the new member list today —{" "}
                <a href="#preview" className="text-blurple-soft">
                  here&apos;s the design
                </a>
                .
              </p>
            }
          />
          <SampleMessage
            a11y={a11y}
            name="Ada"
            nameColor={nameColor}
            time="Today at 9:16 AM"
            body={
              <>
                <p className="chat-text text-muted">
                  Presence dots are finally <strong className="text-bright">realtime</strong> 🎉
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setReacted((v) => !v)}
                    aria-pressed={reacted}
                    className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] transition ${
                      reacted
                        ? "border-blurple/60 bg-blurple/20 text-bright"
                        : "border-subtle bg-hover/40 text-muted hover:text-bright"
                    }`}
                  >
                    🎉 <span>{reacted ? 2 : 1}</span>
                  </button>
                </div>
              </>
            }
          />
          <SampleMessage
            a11y={a11y}
            name="Linus"
            nameColor={nameColor}
            time="Today at 9:21 AM"
            body={
              <>
                <p className="chat-text text-bright">
                  Nice. Screenshot attached
                  {a11y.showImageDescriptions && (
                    <span className="ml-1 text-[11px] text-dim italic">
                      (alt: member list with presence dots)
                    </span>
                  )}
                </p>
                <div
                  className="mt-1 grid h-16 w-28 place-items-center rounded-lg border border-subtle bg-gradient-to-br from-blurple/40 to-blurple-soft/20 text-[10px] font-semibold text-white/90"
                  role="img"
                  aria-label="member list with presence dots"
                >
                  image
                </div>
              </>
            }
          />
        </div>

        <div className="border-t border-subtle px-3 py-2">
          <button
            type="button"
            onClick={() => setClicks((n) => n + 1)}
            className="rounded-md bg-blurple px-2.5 py-1 text-[12px] font-semibold text-[color:var(--c-on-accent)] transition hover:bg-blurple-soft"
          >
            Example Button
            {clicks > 0 && <span className="ml-1.5 opacity-80">×{clicks}</span>}
          </button>
          <p className="mt-1 text-[11px] text-dim">
            Button padding follows UI density ({a11y.uiDensity}); message rows follow chat display (
            {a11y.chatDisplay}) and spacing ({a11y.groupSpacing}px).
          </p>
        </div>
      </div>
    </SettingsCard>
  );
}

function SampleMessage({
  a11y,
  name,
  nameColor,
  time,
  body,
  first,
}: {
  a11y: Required<AccessibilitySettings>;
  name: string;
  nameColor: string;
  time: string;
  body: React.ReactNode;
  first?: boolean;
}) {
  const compact = a11y.chatDisplay === "compact";
  return (
    <article
      className={`flex gap-2 ${first ? "" : "message-group"}`}
      style={compact ? { paddingTop: 0, paddingBottom: 0 } : undefined}
    >
      <span
        className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
        style={{ background: "var(--c-accent)" }}
        aria-hidden
      >
        {name.slice(0, 1)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline gap-1.5">
          <span
            className="text-[13px] font-bold"
            style={{ color: nameColor, fontFamily: a11y.displayNameStyles ? undefined : "inherit" }}
          >
            {name}
          </span>
          <span className="text-[10px] text-dim">{time}</span>
        </p>
        {body}
      </div>
    </article>
  );
}

/* -------------------------------- controls ------------------------------ */

function Range({
  label,
  min,
  max,
  step = 1,
  value,
  suffix,
  format,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  suffix?: string;
  format?: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11.5px]">
        <span className="text-muted">{label}</span>
        <span className="font-mono text-dim">
          {format ? format(value) : value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--c-accent)]"
      />
    </div>
  );
}

/** Speaks a short sample at the configured rate; silently no-ops when TTS is unavailable. */
function TtsPreview({ rate }: { rate: number }) {
  const [played, setPlayed] = useState(false);

  function speak() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      "This is how messages will be read aloud in BT Comms.",
    );
    utterance.rate = rate;
    window.speechSynthesis.speak(utterance);
    setPlayed(true);
  }

  return (
    <div className="flex items-center gap-2">
      <SettingsButton tone="secondary" onClick={speak}>
        Preview
      </SettingsButton>
      <span className="text-[11px] text-dim">
        {played ? `Playing at ${rate.toFixed(1)}x` : "Reads a sample at the chosen speed."}
      </span>
    </div>
  );
}
