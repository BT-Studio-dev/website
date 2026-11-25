"use client";

import { useEffect, useRef, useState } from "react";
import { useAppearance } from "@/lib/appearance";
import {
  CardLabel,
  Field,
  InlineNote,
  Select,
  SettingsButton,
  SettingsCard,
  SettingsSection,
  Toggle,
} from "@/components/settings/primitives";
import { MicIcon, SpeakerIcon, SparkleIcon, BoostIcon, GiftIcon, CardIcon, AppsIcon } from "@/components/icons";

/* ------------------------------- Voice & Video ------------------------------ */

export function VoicePanel({
  micMuted,
  onMicMutedChange,
  deafened,
}: {
  micMuted: boolean;
  onMicMutedChange: (muted: boolean) => void;
  deafened: boolean;
}) {
  const [inputDevice, setInputDevice] = useState("default");
  const [outputDevice, setOutputDevice] = useState("default");
  const [inputVolume, setInputVolume] = useState(72);
  const [outputVolume, setOutputVolume] = useState(88);
  const [testing, setTesting] = useState(false);
  const [level, setLevel] = useState(0);
  const [devices, setDevices] = useState<{ value: string; label: string }[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    navigator.mediaDevices
      ?.enumerateDevices?.()
      .then((list) => {
        const mapped = list
          .filter((d) => d.kind === "audioinput")
          .map((d, i) => ({ value: d.deviceId || `mic-${i}`, label: d.label || `Microphone ${i + 1}` }));
        if (mapped.length) setDevices(mapped);
      })
      .catch(() => undefined);
  }, []);

  async function runMicTest() {
    if (testing) {
      setTesting(false);
      setLevel(0);
      if (raf.current) cancelAnimationFrame(raf.current);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      setTesting(true);

      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        setLevel(Math.min(1, Math.sqrt(sum / data.length) * 4));
        raf.current = requestAnimationFrame(tick);
      };
      tick();

      setTimeout(() => {
        stream.getTracks().forEach((track) => track.stop());
        void ctx.close();
      }, 8000);
    } catch {
      setNote("We couldn't access your microphone. Check browser permissions.");
    }
  }

  const micOptions = [
    { value: "default", label: "Default" },
    ...devices.filter((d) => d.value !== "default"),
  ];

  return (
    <SettingsSection
      title="Voice & Video"
      description="Choose your devices and set the right levels before you jump into a channel."
    >
      <div className="grid gap-3 lg:grid-cols-2">
        <SettingsCard>
          <CardLabel>
            <span className="flex items-center gap-1.5">
              <MicIcon width={13} height={13} /> Input — Microphone
            </span>
          </CardLabel>
          <div className="mt-2">
            <Select
              value={inputDevice}
              onChange={setInputDevice}
              options={micOptions}
            />
          </div>
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-[11.5px]">
              <span className="text-muted">Input volume</span>
              <span className="font-mono text-dim">{inputVolume}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={inputVolume}
              onChange={(e) => setInputVolume(Number(e.target.value))}
              aria-label="Input volume"
              className="w-full accent-[var(--c-accent)]"
            />
          </div>

          <div className="mt-3 rounded-lg bg-void/60 p-2.5">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[11.5px] text-muted">Mic test</p>
              <SettingsButton
                tone={testing ? "danger" : "secondary"}
                onClick={() => void runMicTest()}
              >
                {testing ? "Stop" : "Let's Check"}
              </SettingsButton>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-mint transition-[width] duration-75"
                style={{ width: `${Math.round((testing ? level : 0.12) * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-[10.5px] text-dim">
              {testing ? "Speak — the bar should move." : "Click Let's Check to test your mic."}
            </p>
          </div>

          <div className="mt-3">
            <Toggle
              checked={micMuted}
              onChange={onMicMutedChange}
              label="Mute microphone"
              description="You can still hear everyone."
            />
          </div>
        </SettingsCard>

        <SettingsCard>
          <CardLabel>
            <span className="flex items-center gap-1.5">
              <SpeakerIcon width={13} height={13} /> Output — Speaker
            </span>
          </CardLabel>
          <div className="mt-2">
            <Select
              value={outputDevice}
              onChange={setOutputDevice}
              options={[
                { value: "default", label: "Default" },
                { value: "speakers", label: "System Speakers" },
                { value: "headphones", label: "Headphones" },
              ]}
            />
          </div>
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-[11.5px]">
              <span className="text-muted">Output volume</span>
              <span className="font-mono text-dim">{outputVolume}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={outputVolume}
              onChange={(e) => setOutputVolume(Number(e.target.value))}
              aria-label="Output volume"
              className="w-full accent-[var(--c-accent)]"
            />
          </div>
          <div className="mt-3 space-y-2">
            <Toggle checked={false} onChange={() => undefined} label="Echo cancellation" />
            <Toggle checked={true} onChange={() => undefined} label="Noise suppression" />
            <Toggle checked={false} onChange={() => undefined} label="Automatic gain control" />
            <Toggle checked={deafened} onChange={() => undefined} label="Deafen" disabled />
          </div>
        </SettingsCard>
      </div>

      {note && <InlineNote tone="error">{note}</InlineNote>}
    </SettingsSection>
  );
}

/* ------------------------------ Accessibility ------------------------------ */

export function AccessibilityPanel() {
  const { appearance, setAppearance } = useAppearance();

  return (
    <SettingsSection
      title="Accessibility"
      description="Make the interface comfortable to read and use."
    >
      <SettingsCard>
        <CardLabel>Motion</CardLabel>
        <div className="mt-2 space-y-2">
          <Toggle
            checked={appearance.reduce_motion}
            onChange={(value) => setAppearance({ reduce_motion: value })}
            label="Reduce motion"
            description="Disables transitions, animations and smooth scrolling."
          />
        </div>
      </SettingsCard>

      <SettingsCard>
        <CardLabel>Colour & saturation</CardLabel>
        <div className="mt-2">
          <Toggle
            checked={appearance.reduced_saturation}
            onChange={(value) => setAppearance({ reduced_saturation: value })}
            label="Reduce colour saturation"
            description="Softens vivid colours across the app."
          />
        </div>
      </SettingsCard>

      <SettingsCard>
        <CardLabel>Font scaling</CardLabel>
        <div className="mt-2">
          <div className="mb-1 flex items-center justify-between text-[11.5px]">
            <span className="text-muted">Interface scale</span>
            <span className="font-mono text-dim">{Math.round(appearance.font_scale * 100)}%</span>
          </div>
          <input
            type="range"
            min={80}
            max={140}
            step={5}
            value={Math.round(appearance.font_scale * 100)}
            onChange={(e) => setAppearance({ font_scale: Number(e.target.value) / 100 })}
            aria-label="Font scale"
            className="w-full accent-[var(--c-accent)]"
          />
          <div className="mt-2 flex gap-2">
            {[90, 100, 115, 130].map((preset) => (
              <SettingsButton
                key={preset}
                tone={Math.round(appearance.font_scale * 100) === preset ? "primary" : "secondary"}
                onClick={() => setAppearance({ font_scale: preset / 100 })}
              >
                {preset}%
              </SettingsButton>
            ))}
          </div>
        </div>
      </SettingsCard>

      <SettingsCard>
        <CardLabel>Preview</CardLabel>
        <div className="mt-2 rounded-lg bg-void/50 p-3">
          <p className="text-[13.5px] text-bright">
            The quick brown fox jumps over the lazy dog.
          </p>
          <p className="text-[12px] text-muted">
            Secondary text at the current scale. Adjust the slider above to change it.
          </p>
        </div>
      </SettingsCard>
    </SettingsSection>
  );
}

/* ------------------------------- Billing / Pro ---------------------------- */

export function ProPanel() {
  return (
    <SettingsSection
      title="BT Pro"
      description="Bigger uploads, HD streaming, custom emoji everywhere, and a profile that pops."
    >
      <div
        className="relative overflow-hidden rounded-xl border border-blurple/40 p-5"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(var(--c-glow),.28), transparent 60%), linear-gradient(180deg, var(--c-panel), var(--c-ink))",
        }}
      >
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blurple/25 px-2.5 py-1 text-[10.5px] font-bold tracking-widest text-blurple-soft uppercase">
          <SparkleIcon width={12} height={12} /> BT Pro
        </span>
        <h3 className="mt-3 text-2xl font-bold tracking-tight text-bright">
          Level up your profile
        </h3>
        <p className="mt-1 max-w-md text-[13px] text-muted">
          Animated avatars, 100 MB uploads, 4K screen share, custom themes and
          per-server nicknames.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div>
            <p className="text-[22px] font-bold text-bright">
              $4.99<span className="text-[13px] font-medium text-muted">/mo</span>
            </p>
            <p className="text-[11px] text-dim">or $49.99/year — 2 months free</p>
          </div>
          <SettingsButton tone="primary">Subscribe to BT Pro</SettingsButton>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ["Animated avatar", "Bring your avatar to life with GIF support."],
          ["Larger uploads", "Share files up to 100 MB in any channel."],
          ["HD streaming", "Go live in 1080p60 with stereo audio."],
          ["Custom emoji", "Use your emoji in every server you join."],
        ].map(([title, body]) => (
          <SettingsCard key={title}>
            <p className="text-[13px] font-semibold text-bright">{title}</p>
            <p className="mt-0.5 text-[12px] text-muted">{body}</p>
          </SettingsCard>
        ))}
      </div>

      <InlineNote>Billing is not connected in this environment — this is the plan preview.</InlineNote>
    </SettingsSection>
  );
}

export function BoostPanel() {
  return (
    <SettingsSection
      title="Server Boost"
      description="Boosts unlock better audio, more emoji slots, and a sharper server banner."
    >
      <SettingsCard>
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#ff73fa]/15 text-[#ff73fa]">
            <BoostIcon width={20} height={20} />
          </span>
          <div>
            <p className="text-[13.5px] font-semibold text-bright">You have 0 boosts</p>
            <p className="mt-0.5 max-w-md text-[12px] leading-relaxed text-muted">
              Boosting a server you love unlocks perks for everyone in it. Level 1
              starts at 2 boosts.
            </p>
            <div className="mt-3">
              <SettingsButton tone="primary">Buy Boosts</SettingsButton>
            </div>
          </div>
        </div>
      </SettingsCard>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Level 1", "2 boosts", "Audio quality 128 kbps · 50 emoji slots"],
          ["Level 2", "7 boosts", "150 MB uploads · server banner"],
          ["Level 3", "14 boosts", "384 kbps audio · vanity URL"],
        ].map(([level, req, perk]) => (
          <SettingsCard key={level}>
            <CardLabel>{level}</CardLabel>
            <p className="mt-1 text-[13px] font-semibold text-bright">{req}</p>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">{perk}</p>
          </SettingsCard>
        ))}
      </div>
    </SettingsSection>
  );
}

export function SubscriptionsPanel() {
  return (
    <SettingsSection title="Subscriptions" description="Your active plans and server subscriptions.">
      <SettingsCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[13.5px] font-semibold text-bright">BT Pro</p>
            <p className="text-[12px] text-muted">Not subscribed</p>
          </div>
          <SettingsButton tone="primary">Subscribe</SettingsButton>
        </div>
      </SettingsCard>
      <SettingsCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[13.5px] font-semibold text-bright">Server subscriptions</p>
            <p className="text-[12px] text-muted">No active server subscriptions.</p>
          </div>
          <SettingsButton tone="secondary">Browse</SettingsButton>
        </div>
      </SettingsCard>
    </SettingsSection>
  );
}

export function GiftsPanel() {
  return (
    <SettingsSection title="Gift Inventory" description="Gifts you've received, ready to redeem.">
      <SettingsCard>
        <div className="flex flex-col items-center py-6 text-center">
          <span className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-raised text-dim">
            <GiftIcon width={22} height={22} />
          </span>
          <p className="text-[13.5px] font-semibold text-bright">Your inventory is empty</p>
          <p className="mt-1 max-w-xs text-[12px] text-muted">
            When someone sends you a gift, it lands here. You can redeem it into your
            account any time.
          </p>
        </div>
      </SettingsCard>
      <SettingsCard>
        <Field label="Redeem a gift code">
          <div className="flex gap-2">
            <input
              placeholder="BT-XXXX-XXXX"
              className="w-full rounded-lg border border-line bg-void/70 px-3 py-2 font-mono text-[13px] outline-none focus:border-blurple/60"
            />
            <SettingsButton tone="secondary">Redeem</SettingsButton>
          </div>
        </Field>
      </SettingsCard>
    </SettingsSection>
  );
}

export function BillingPanel() {
  return (
    <SettingsSection title="Billing" description="Payment methods and invoices.">
      <SettingsCard>
        <CardLabel>
          <span className="flex items-center gap-1.5">
            <CardIcon width={13} height={13} /> Payment methods
          </span>
        </CardLabel>
        <p className="mt-2 text-[12.5px] text-muted">No payment methods on file.</p>
        <div className="mt-3">
          <SettingsButton tone="secondary">Add payment method</SettingsButton>
        </div>
      </SettingsCard>
      <SettingsCard>
        <CardLabel>Billing history</CardLabel>
        <p className="mt-2 text-[12.5px] text-muted">No invoices yet.</p>
      </SettingsCard>
    </SettingsSection>
  );
}

/* --------------------------------- Apps ---------------------------------- */

export function AppsPanel() {
  return (
    <SettingsSection
      title="Authorized Apps"
      description="Third-party apps that can access your account, and games BT Comms can detect."
    >
      <SettingsCard>
        <CardLabel>
          <span className="flex items-center gap-1.5">
            <AppsIcon width={13} height={13} /> Authorized applications
          </span>
        </CardLabel>
        <div className="mt-2 flex flex-col items-center py-6 text-center">
          <p className="text-[13px] font-semibold text-bright">No authorized apps</p>
          <p className="mt-1 max-w-xs text-[12px] text-muted">
            Apps you connect will appear here with the permissions they requested.
          </p>
        </div>
      </SettingsCard>
      <SettingsCard>
        <Toggle
          checked={true}
          onChange={() => undefined}
          label="Show current game as status"
          description="Friends can see what you're playing in the member list."
        />
      </SettingsCard>
    </SettingsSection>
  );
}
