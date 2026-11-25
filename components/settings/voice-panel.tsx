"use client";

import { useEffect, useRef, useState } from "react";
import {
  CardLabel,
  Divider,
  InlineNote,
  RadioRow,
  Select,
  SettingsButton,
  SettingsCard,
  SettingsSection,
  Toggle,
} from "@/components/settings/primitives";
import {
  CameraIcon,
  HeadphonesIcon,
  MicIcon,
  SpeakerIcon,
  VolumeIcon,
} from "@/components/icons";
import type { UserSettings } from "@/lib/types";

/**
 * Voice & Video settings.
 *
 * Everything writes through `onChange` into `user_settings`, so every choice
 * here survives a reload. The mic test uses a real AnalyserNode when the
 * browser allows it and falls back to a synthetic level otherwise (so the
 * meter still animates in demos and in headless previews).
 */

const INPUT_DEVICES = [
  { value: "Default", label: "Default — System Microphone" },
  { value: "Studio Display Microphone", label: "Studio Display Microphone" },
  { value: "AirPods Pro", label: "AirPods Pro" },
  { value: "BT Comms Virtual Mic", label: "BT Comms Virtual Mic" },
];

const OUTPUT_DEVICES = [
  { value: "Default", label: "Default — System Speakers" },
  { value: "Studio Display Speakers", label: "Studio Display Speakers" },
  { value: "AirPods Pro", label: "AirPods Pro" },
  { value: "BT Comms Virtual Output", label: "BT Comms Virtual Output" },
];

const CAMERAS = [
  { value: "Default", label: "Default — FaceTime HD Camera" },
  { value: "OBS Virtual Camera", label: "OBS Virtual Camera" },
  { value: "Studio Display Camera", label: "Studio Display Camera" },
];

const SOUND_ITEMS: { id: string; label: string; key: keyof UserSettings }[] = [
  { id: "deafen", label: "Deafen", key: "callSoundDeafen" },
  { id: "undeafen", label: "Undeafen", key: "callSoundUndeafen" },
  { id: "mute", label: "Mute", key: "callSoundMute" },
  { id: "unmute", label: "Unmute", key: "callSoundUnmute" },
  { id: "camera", label: "Camera On", key: "callSoundCamera" },
];

export function VoiceVideoPanel({
  settings,
  onChange,
  onPreviewSound,
}: {
  settings: UserSettings;
  onChange: (patch: Partial<UserSettings>) => void;
  onPreviewSound?: (id: string) => void;
}) {
  const [testing, setTesting] = useState(false);
  const [level, setLevel] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [videoOn, setVideoOn] = useState(false);
  const raf = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const inputVolume = settings.voiceInputVolume ?? 72;
  const outputVolume = settings.voiceOutputVolume ?? 88;
  const soundboardVolume = settings.voiceSoundboardVolume ?? 65;

  useEffect(() => {
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function toggleMicTest() {
    if (testing) {
      setTesting(false);
      setLevel(0);
      if (raf.current) cancelAnimationFrame(raf.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      return;
    }

    setNote(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
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
    } catch {
      // Headless / permission-less: animate a synthetic level so the meter
      // still demonstrates the feature.
      setTesting(true);
      setNote("Microphone access was denied — showing a simulated level.");
      let t = 0;
      const tick = () => {
        t += 0.05;
        setLevel(0.35 + Math.abs(Math.sin(t)) * 0.5);
        raf.current = requestAnimationFrame(tick);
      };
      tick();
    }
  }

  return (
    <div className="space-y-3">
      <SettingsSection
        title="Voice & Video"
        description="Choose your devices and dial in your levels before you jump into a channel."
      >
        <div className="grid gap-3 lg:grid-cols-2">
          {/* ---------------- input ---------------- */}
          <SettingsCard>
            <CardLabel>
              <span className="flex items-center gap-1.5">
                <MicIcon width={13} height={13} /> Input — Microphone
              </span>
            </CardLabel>
            <div className="mt-2">
              <Select
                value={settings.voiceInputDevice ?? "Default"}
                onChange={(value) => onChange({ voiceInputDevice: value })}
                options={INPUT_DEVICES}
              />
            </div>
            <div className="mt-3">
              <Slider
                label="Input volume"
                value={inputVolume}
                onChange={(value) => onChange({ voiceInputVolume: value })}
              />
            </div>

            <div className="mt-3 rounded-lg bg-void/60 p-2.5">
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-[11.5px] text-muted">Mic test</p>
                <SettingsButton tone={testing ? "danger" : "secondary"} onClick={() => void toggleMicTest()}>
                  {testing ? "Stop Testing" : "Let's Check"}
                </SettingsButton>
              </div>
              <div className="flex h-3 items-end gap-[2px]">
                {Array.from({ length: 28 }).map((_, index) => {
                  const threshold = index / 28;
                  const lit = testing && level > threshold;
                  return (
                    <span
                      key={index}
                      className={`flex-1 rounded-sm transition-all duration-75 ${
                        lit
                          ? index > 22
                            ? "bg-rose"
                            : index > 17
                              ? "bg-amber"
                              : "bg-mint"
                          : "bg-line/70"
                      }`}
                      style={{ height: lit ? `${35 + threshold * 65}%` : "22%" }}
                    />
                  );
                })}
              </div>
              <p className="mt-1 text-[10.5px] text-dim">
                {testing ? "Speak — the meter should move." : "Click Let's Check to test your mic."}
              </p>
            </div>

            <Divider />
            <div className="mt-3">
              <CardLabel>Input Profile</CardLabel>
              <div className="mt-2">
                <RadioRow<"voice_isolation" | "studio" | "custom">
                  value={settings.voiceInputProfile ?? "voice_isolation"}
                  onChange={(value) => onChange({ voiceInputProfile: value })}
                  options={[
                    {
                      value: "voice_isolation",
                      label: "Voice Isolation",
                      description: "Cuts background noise and focuses on your voice.",
                    },
                    {
                      value: "studio",
                      label: "Studio",
                      description: "Balanced for music, streaming and richer mics.",
                    },
                    {
                      value: "custom",
                      label: "Custom",
                      description: "Set every filter yourself, including Push to Talk.",
                    },
                  ]}
                />
              </div>
            </div>
          </SettingsCard>

          {/* ---------------- output ---------------- */}
          <SettingsCard>
            <CardLabel>
              <span className="flex items-center gap-1.5">
                <SpeakerIcon width={13} height={13} /> Output — Speaker
              </span>
            </CardLabel>
            <div className="mt-2">
              <Select
                value={settings.voiceOutputDevice ?? "Default"}
                onChange={(value) => onChange({ voiceOutputDevice: value })}
                options={OUTPUT_DEVICES}
              />
            </div>
            <div className="mt-3">
              <Slider
                label="Output volume"
                value={outputVolume}
                onChange={(value) => onChange({ voiceOutputVolume: value })}
              />
            </div>
            <div className="mt-3">
              <Slider
                label="Soundboard volume"
                value={soundboardVolume}
                onChange={(value) => onChange({ voiceSoundboardVolume: value })}
              />
            </div>

            <Divider />
            <div className="mt-3 space-y-3">
              <RadioRow<"krisp" | "standard" | "off">
                value={settings.noiseSuppression ?? "krisp"}
                onChange={(value) => onChange({ noiseSuppression: value } as Partial<UserSettings>)}
                options={[
                  {
                    value: "krisp",
                    label: "Noise Suppression (Krisp)",
                    description: "Removes keyboard clatter, fans and background chatter.",
                  },
                  { value: "standard", label: "Standard", description: "Light built-in suppression." },
                  { value: "off", label: "Off", description: "Send raw microphone audio." },
                ]}
              />
              <Toggle
                checked={settings.echoCancellation ?? true}
                onChange={(next) => onChange({ echoCancellation: next })}
                label="Echo Cancellation"
                description="Stops your speakers from feeding back into your mic."
              />
              <Toggle
                checked={settings.automaticGain ?? true}
                onChange={(next) => onChange({ automaticGain: next })}
                label="Automatic Gain Control"
                description="Keeps your volume steady as you move around."
              />
              <Toggle
                checked={settings.pushToTalk ?? false}
                onChange={(next) => onChange({ pushToTalk: next })}
                label="Push to Talk"
                description={`Only transmit while holding ${settings.pushToTalkKey ?? "Ctrl + Shift + M"}.`}
              />
              {settings.pushToTalk && (
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold tracking-[0.12em] text-dim uppercase">
                    Shortcut
                  </span>
                  <input
                    value={settings.pushToTalkKey ?? "Ctrl + Shift + M"}
                    onChange={(e) => onChange({ pushToTalkKey: e.target.value.slice(0, 40) })}
                    className="w-full rounded-md border border-line bg-void/70 px-3 py-2 font-mono text-[12.5px] outline-none focus:border-blurple/60"
                  />
                </label>
              )}
            </div>
          </SettingsCard>
        </div>

        {/* ---------------- camera ---------------- */}
        <SettingsCard>
          <CardLabel>
            <span className="flex items-center gap-1.5">
              <CameraIcon width={13} height={13} /> Video
            </span>
          </CardLabel>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <div>
              <Select
                value={settings.voiceCameraDevice ?? "Default"}
                onChange={(value) => onChange({ voiceCameraDevice: value })}
                options={CAMERAS}
              />
              <div className="mt-2.5">
                <SettingsButton tone={videoOn ? "danger" : "primary"} onClick={() => setVideoOn((v) => !v)}>
                  {videoOn ? "Stop Video Preview" : "Test Video"}
                </SettingsButton>
              </div>
              <div className="mt-2.5">
                <Toggle
                  checked={settings.showStreamPreviews ?? true}
                  onChange={(next) => onChange({ showStreamPreviews: next })}
                  label="Show Stream Previews"
                  description="Hover a stream to preview it before you join."
                />
              </div>
            </div>
            <div className="relative grid aspect-video place-items-center overflow-hidden rounded-lg border border-line bg-void/70">
              {videoOn ? (
                <div className="grid h-full w-full place-items-center bg-gradient-to-br from-blurple/30 to-blurple-soft/20">
                  <span className="animate-pulse text-[12px] font-semibold text-bright">
                    Camera preview running
                  </span>
                </div>
              ) : (
                <span className="text-[11.5px] text-dim">Video preview is off</span>
              )}
            </div>
          </div>
        </SettingsCard>

        {/* ---------------- sounds ---------------- */}
        <SettingsCard>
          <CardLabel>Sounds & Soundboard</CardLabel>
          <p className="mt-1 text-[11.5px] text-muted">
            Preview each call sound, or switch it off if you&apos;d rather stay silent.
          </p>
          <ul className="mt-2 divide-y divide-line/60">
            {SOUND_ITEMS.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-2">
                <span className="flex items-center gap-2 text-[12.5px] font-medium text-bright">
                  <VolumeIcon width={13} height={13} className="text-muted" />
                  {item.label}
                </span>
                <span className="flex items-center gap-2">
                  <button
                    onClick={() => onPreviewSound?.(item.id)}
                    className="rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-muted transition hover:bg-hover hover:text-bright"
                  >
                    Preview Sound
                  </button>
                  <Toggle
                    checked={settings[item.key] !== false}
                    onChange={(next) => onChange({ [item.key]: next } as Partial<UserSettings>)}
                    label={`${item.label} sound`}
                  />
                </span>
              </li>
            ))}
          </ul>

          <Divider />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-[11px] font-bold tracking-[0.12em] text-dim uppercase">
                Entrance Sound — Server
              </p>
              <Select
                value={settings.entranceSoundServer ?? "disabled"}
                onChange={(value) => onChange({ entranceSoundServer: value })}
                options={[
                  { value: "disabled", label: "Don't play" },
                  { value: "all", label: "Every server" },
                  { value: "design-guild", label: "Design Guild only" },
                  { value: "bt-comms", label: "BT Comms only" },
                ]}
              />
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-bold tracking-[0.12em] text-dim uppercase">
                Custom Entrance Sound
              </p>
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate rounded-md border border-line bg-void/70 px-3 py-2 text-[12.5px] text-muted">
                  {settings.entranceSound ?? "No file selected"}
                </span>
                <label className="shrink-0 cursor-pointer rounded-md border border-line px-2.5 py-2 text-[11.5px] font-semibold text-bright transition hover:bg-hover">
                  Choose
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onChange({ entranceSound: file.name });
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        </SettingsCard>

        <div className="rounded-xl border border-line/60 bg-void/40 p-3">
          <p className="flex items-center gap-1.5 text-[11.5px] text-dim">
            <HeadphonesIcon width={13} height={13} /> All voice settings save to your profile
            automatically and follow you across devices.
          </p>
        </div>

        {note && <InlineNote tone="info">{note}</InlineNote>}
      </SettingsSection>
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11.5px]">
        <span className="text-muted">{label}</span>
        <span className="font-mono text-dim">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="w-full accent-[var(--c-accent)]"
      />
    </div>
  );
}
