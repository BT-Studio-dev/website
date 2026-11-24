"use client";

export type SoundId = "message" | "channel" | "ring" | "join" | "leave";

type Note = { freq: number; start: number; duration: number; gain?: number; type?: OscillatorType };

const RECIPES: Record<SoundId, { notes: Note[]; label: string }> = {
  message: {
    label: "New message",
    notes: [
      { freq: 880, start: 0, duration: 0.11, gain: 0.16 },
      { freq: 1318.5, start: 0.085, duration: 0.16, gain: 0.13 },
    ],
  },
  channel: {
    label: "Current channel",
    notes: [
      { freq: 659.25, start: 0, duration: 0.1, gain: 0.14 },
      { freq: 987.77, start: 0.075, duration: 0.13, gain: 0.12 },
      { freq: 1318.5, start: 0.15, duration: 0.14, gain: 0.09 },
    ],
  },
  ring: {
    label: "Incoming ring",
    notes: [
      { freq: 523.25, start: 0, duration: 0.18, gain: 0.14 },
      { freq: 659.25, start: 0.2, duration: 0.18, gain: 0.14 },
      { freq: 523.25, start: 0.4, duration: 0.18, gain: 0.12 },
    ],
  },
  join: {
    label: "Voice join",
    notes: [
      { freq: 587.33, start: 0, duration: 0.1, gain: 0.12 },
      { freq: 880, start: 0.09, duration: 0.14, gain: 0.1 },
    ],
  },
  leave: {
    label: "Voice leave",
    notes: [
      { freq: 880, start: 0, duration: 0.1, gain: 0.1 },
      { freq: 587.33, start: 0.09, duration: 0.14, gain: 0.09 },
    ],
  },
};

let context: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!context) context = new Ctor();
  if (context.state === "suspended") void context.resume();
  return context;
}

/**
 * Plays a short, clean Web Audio chime. No audio files, no network —
 * every notification sound is synthesised from sine/triangle partials with a
 * soft attack and exponential release so it never clicks.
 */
export function playSound(id: SoundId, volume = 1) {
  const ctx = getContext();
  if (!ctx) return;
  const recipe = RECIPES[id] ?? RECIPES.message;
  const master = ctx.createGain();
  master.gain.value = Math.max(0, Math.min(1, volume));
  master.connect(ctx.destination);

  const now = ctx.currentTime;
  for (const note of recipe.notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = note.type ?? "sine";
    osc.frequency.value = note.freq;

    const start = now + note.start;
    const end = start + note.duration;
    const peak = note.gain ?? 0.12;

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(end + 0.02);
  }

  window.setTimeout(() => master.disconnect(), 1400);
}

export const SOUND_LABELS: Record<SoundId, string> = {
  message: RECIPES.message.label,
  channel: RECIPES.channel.label,
  ring: RECIPES.ring.label,
  join: RECIPES.join.label,
  leave: RECIPES.leave.label,
};
