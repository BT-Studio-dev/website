"use client";

/**
 * BT Comms soundboard.
 *
 * Every sound is synthesized with the Web Audio API instead of shipping audio
 * files: no binary assets in the repo, no CDN fetch before the first press, and
 * the clips are short enough that a filtered oscillator reads as a sound effect.
 * The catalogue mirrors the reference UI (Creeper, hrrh, pake, npc background,
 * hmm, mlom, door …) with a premium tier gated behind BT Pro.
 */

export type SoundId =
  | "creeper"
  | "hrrh"
  | "pake"
  | "npc"
  | "hmm"
  | "mlom"
  | "door"
  | "bruh"
  | "yeet"
  | "bonk"
  | "rizz"
  | "oof";

export type SoundEffect = {
  id: SoundId;
  name: string;
  emoji: string;
  /** Free for everyone, or needs BT Pro. */
  premium?: boolean;
  /** Category used to group the grid. */
  group: "Memes" | "Ambient" | "Utility";
  /** Seconds — shown in the tooltip. */
  duration: number;
};

export const SOUNDBOARD: SoundEffect[] = [
  { id: "creeper", name: "Creeper", emoji: "🟩", group: "Memes", duration: 1.1 },
  { id: "hrrh", name: "hrrh", emoji: "😤", group: "Memes", duration: 0.6 },
  { id: "pake", name: "pake", emoji: "🥁", group: "Memes", duration: 0.5 },
  { id: "bruh", name: "bruh", emoji: "😐", group: "Memes", duration: 0.8 },
  { id: "yeet", name: "yeet", emoji: "🚀", group: "Memes", duration: 0.7 },
  { id: "bonk", name: "bonk", emoji: "🔨", group: "Memes", duration: 0.4 },
  { id: "rizz", name: "rizz", emoji: "✨", group: "Memes", duration: 0.9, premium: true },
  { id: "oof", name: "oof", emoji: "💀", group: "Memes", duration: 0.6, premium: true },
  { id: "npc", name: "npc background", emoji: "🎧", group: "Ambient", duration: 2.4 },
  { id: "hmm", name: "hmm", emoji: "🤔", group: "Ambient", duration: 1.0 },
  { id: "mlom", name: "mlom", emoji: "👽", group: "Ambient", duration: 1.2, premium: true },
  { id: "door", name: "door", emoji: "🚪", group: "Utility", duration: 0.7 },
];

export const SOUND_GROUPS = ["Memes", "Ambient", "Utility"] as const;

/** Volume sliders and stored settings both feed through here. */
export function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

let context: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  context ??= new Ctor();
  if (context.state === "suspended") void context.resume();
  return context;
}

type ToneOptions = {
  type?: OscillatorType;
  from: number;
  to?: number;
  duration: number;
  gain?: number;
  /** Sweep starts after this many ms. */
  delay?: number;
  /** Lowpass cutoff; keeps square waves from sounding harsh. */
  filter?: number;
};

function tone(ctx: AudioContext, destination: AudioNode, options: ToneOptions) {
  const {
    type = "sine",
    from,
    to = from,
    duration,
    gain = 0.22,
    delay = 0,
    filter = 6000,
  } = options;

  const start = ctx.currentTime + delay / 1000;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  const lowpass = ctx.createBiquadFilter();

  osc.type = type;
  osc.frequency.setValueAtTime(from, start);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + duration);

  lowpass.type = "lowpass";
  lowpass.frequency.value = filter;

  // Short attack, exponential release — avoids the click a hard stop makes.
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(gain, start + Math.min(0.02, duration / 4));
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(lowpass).connect(amp).connect(destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/** Filtered noise burst — used for impacts and textures. */
function noise(
  ctx: AudioContext,
  destination: AudioNode,
  { duration, gain = 0.18, cutoff = 1800, sweepTo = cutoff }: {
    duration: number;
    gain?: number;
    cutoff?: number;
    sweepTo?: number;
  },
) {
  const frames = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) {
    // Decaying white noise reads as an impact rather than a hiss.
    data[i] = (Math.random() * 2 - 1) * (1 - i / frames) ** 2;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(cutoff, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(Math.max(80, sweepTo), ctx.currentTime + duration);

  const amp = ctx.createGain();
  amp.gain.value = gain;

  source.connect(filter).connect(amp).connect(destination);
  source.start();
}

/**
 * Play one sound effect.
 *
 * `volume` is 0–100 and matches the Soundboard volume slider in Voice & Video
 * settings; `muted` lets a deafened user preview locally without hearing it.
 */
export function playSound(id: SoundId, opts: { volume?: number; destination?: AudioNode } = {}) {
  const ctx = audioContext();
  if (!ctx) return false;

  const master = ctx.createGain();
  master.gain.value = clampVolume(opts.volume ?? 65) / 100;
  master.connect(opts.destination ?? ctx.destination);
  const out = master;

  switch (id) {
    case "creeper":
      // The three-note "aw man" tease: descending, detuned squares.
      tone(ctx, out, { type: "square", from: 392, to: 392, duration: 0.16, gain: 0.16, filter: 2200 });
      tone(ctx, out, { type: "square", from: 330, to: 330, duration: 0.16, gain: 0.16, delay: 170, filter: 2200 });
      tone(ctx, out, { type: "square", from: 262, to: 200, duration: 0.5, gain: 0.16, delay: 340, filter: 2000 });
      break;
    case "hrrh":
      tone(ctx, out, { type: "sawtooth", from: 140, to: 90, duration: 0.5, gain: 0.2, filter: 900 });
      noise(ctx, out, { duration: 0.4, gain: 0.1, cutoff: 900, sweepTo: 200 });
      break;
    case "pake":
      // Rim-shot: a click plus a fast pitch drop.
      noise(ctx, out, { duration: 0.08, gain: 0.25, cutoff: 5200, sweepTo: 1200 });
      tone(ctx, out, { type: "triangle", from: 900, to: 180, duration: 0.2, gain: 0.18, delay: 40 });
      break;
    case "npc":
      // Looping-ish bed: a warm fifth with a wandering top voice.
      tone(ctx, out, { type: "sine", from: 174, duration: 2.2, gain: 0.12 });
      tone(ctx, out, { type: "sine", from: 261, duration: 2.2, gain: 0.08 });
      tone(ctx, out, { type: "triangle", from: 392, to: 523, duration: 1.1, gain: 0.06, delay: 260 });
      tone(ctx, out, { type: "triangle", from: 523, to: 392, duration: 0.9, gain: 0.05, delay: 1300 });
      break;
    case "hmm":
      tone(ctx, out, { type: "sine", from: 196, to: 220, duration: 0.45, gain: 0.18 });
      tone(ctx, out, { type: "sine", from: 220, to: 175, duration: 0.45, gain: 0.16, delay: 460 });
      break;
    case "mlom":
      // Wobbly alien warble.
      tone(ctx, out, { type: "sine", from: 620, to: 320, duration: 0.55, gain: 0.16 });
      tone(ctx, out, { type: "square", from: 320, to: 700, duration: 0.55, gain: 0.07, delay: 380, filter: 1400 });
      break;
    case "door":
      noise(ctx, out, { duration: 0.35, gain: 0.2, cutoff: 1400, sweepTo: 260 });
      tone(ctx, out, { type: "sine", from: 96, to: 60, duration: 0.4, gain: 0.22, delay: 30 });
      break;
    case "bruh":
      tone(ctx, out, { type: "sawtooth", from: 180, to: 120, duration: 0.7, gain: 0.14, filter: 1100 });
      break;
    case "yeet":
      tone(ctx, out, { type: "triangle", from: 220, to: 1200, duration: 0.55, gain: 0.16 });
      break;
    case "bonk":
      noise(ctx, out, { duration: 0.18, gain: 0.3, cutoff: 900, sweepTo: 120 });
      tone(ctx, out, { type: "square", from: 150, to: 70, duration: 0.22, gain: 0.16, filter: 700 });
      break;
    case "rizz":
      tone(ctx, out, { type: "sine", from: 523, duration: 0.14, gain: 0.14 });
      tone(ctx, out, { type: "sine", from: 659, duration: 0.14, gain: 0.14, delay: 150 });
      tone(ctx, out, { type: "sine", from: 784, duration: 0.3, gain: 0.14, delay: 300 });
      break;
    case "oof":
      tone(ctx, out, { type: "sawtooth", from: 300, to: 110, duration: 0.55, gain: 0.16, filter: 1200 });
      noise(ctx, out, { duration: 0.2, gain: 0.08, cutoff: 800, sweepTo: 200 });
      break;
    default:
      return false;
  }

  return true;
}

/** Routes soundboard audio into a call when a mesh is active. */
export function soundboardNode(): GainNode | null {
  const ctx = audioContext();
  if (!ctx) return null;
  const gain = ctx.createGain();
  gain.gain.value = 1;
  gain.connect(ctx.destination);
  return gain;
}
