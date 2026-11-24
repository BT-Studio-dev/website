import type {
  AvatarDecorationId,
  ConnectionKind,
  NameplateId,
  NameStyleId,
  ProfileEffectId,
  WidgetGame,
} from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Avatar decorations — animated rings/frames around the avatar        */
/* ------------------------------------------------------------------ */

export type Decoration = {
  id: AvatarDecorationId;
  label: string;
  /** CSS background used for the ring. */
  ring: string;
  glow?: string;
  animated?: boolean;
};

export const DECORATIONS: Decoration[] = [
  { id: "none", label: "None", ring: "transparent" },
  {
    id: "aurora",
    label: "Aurora",
    ring: "conic-gradient(from 0deg, #22d3ee, #a855f7, #22c55e, #22d3ee)",
    glow: "rgba(168,85,247,0.55)",
    animated: true,
  },
  {
    id: "ember",
    label: "Ember",
    ring: "conic-gradient(from 210deg, #f97316, #ef4444, #fbbf24, #f97316)",
    glow: "rgba(249,115,22,0.5)",
    animated: true,
  },
  {
    id: "circuit",
    label: "Circuit",
    ring: "conic-gradient(from 90deg, #38bdf8, #1e3a8a, #38bdf8)",
    glow: "rgba(56,189,248,0.45)",
    animated: true,
  },
  {
    id: "bloom",
    label: "Bloom",
    ring: "conic-gradient(from 45deg, #f472b6, #fb7185, #fbcfe8, #f472b6)",
    glow: "rgba(244,114,182,0.45)",
    animated: true,
  },
  {
    id: "stars",
    label: "Stars",
    ring: "conic-gradient(from 180deg, #fde047, #a855f7, #38bdf8, #fde047)",
    glow: "rgba(253,224,71,0.4)",
    animated: true,
  },
];

export function decorationById(id: string | null | undefined) {
  return DECORATIONS.find((d) => d.id === id) ?? DECORATIONS[0];
}

/* ------------------------------------------------------------------ */
/* Profile effects — overlay on the whole card (BT Pro)                */
/* ------------------------------------------------------------------ */

export type ProfileEffect = {
  id: ProfileEffectId;
  label: string;
  /** Radial gradient overlay for the card. */
  overlay: string;
  pro?: boolean;
};

export const PROFILE_EFFECTS: ProfileEffect[] = [
  { id: "none", label: "None", overlay: "transparent" },
  {
    id: "sparkle",
    label: "Sparkle",
    overlay:
      "radial-gradient(circle at 18% 12%, rgba(255,255,255,0.45) 0%, transparent 32%), radial-gradient(circle at 82% 26%, rgba(255,255,255,0.35) 0%, transparent 28%)",
    pro: true,
  },
  {
    id: "glow",
    label: "Neon Glow",
    overlay:
      "radial-gradient(circle at 50% 0%, rgba(168,85,247,0.55) 0%, transparent 60%)",
    pro: true,
  },
  {
    id: "confetti",
    label: "Confetti",
    overlay:
      "radial-gradient(circle at 20% 80%, rgba(244,114,182,0.5) 0%, transparent 35%), radial-gradient(circle at 75% 70%, rgba(56,189,248,0.5) 0%, transparent 35%)",
    pro: true,
  },
  {
    id: "snow",
    label: "Snowfall",
    overlay:
      "radial-gradient(circle at 30% 20%, rgba(226,232,240,0.45) 0%, transparent 30%), radial-gradient(circle at 70% 60%, rgba(191,219,254,0.4) 0%, transparent 30%)",
    pro: true,
  },
];

export function effectById(id: string | null | undefined) {
  return PROFILE_EFFECTS.find((e) => e.id === id) ?? PROFILE_EFFECTS[0];
}

/* ------------------------------------------------------------------ */
/* Display-name styles                                                 */
/* ------------------------------------------------------------------ */

export type NameStyle = {
  id: NameStyleId;
  label: string;
  /** Applied inline to the display-name element. */
  style: React.CSSProperties;
  pro?: boolean;
};

export const NAME_STYLES: NameStyle[] = [
  { id: "default", label: "Default", style: {} },
  {
    id: "neon",
    label: "Neon",
    style: {
      color: "#f5f3ff",
      textShadow:
        "0 0 6px rgba(168,85,247,0.95), 0 0 18px rgba(168,85,247,0.7), 0 0 34px rgba(168,85,247,0.45)",
    },
    pro: true,
  },
  {
    id: "gradient",
    label: "Gradient",
    style: {
      backgroundImage: "linear-gradient(95deg, #a855f7, #38bdf8 55%, #f472b6)",
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
    },
    pro: true,
  },
  {
    id: "sunset",
    label: "Sunset",
    style: {
      backgroundImage: "linear-gradient(95deg, #fb923c, #ef4444 60%, #f472b6)",
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
    },
    pro: true,
  },
  {
    id: "outline",
    label: "Outline",
    style: {
      color: "transparent",
      WebkitTextStroke: "1.2px #e2e8f0",
    },
    pro: true,
  },
  {
    id: "serif",
    label: "Editorial",
    style: {
      fontFamily: 'Georgia, "Times New Roman", serif',
      letterSpacing: "0.01em",
    },
  },
  {
    id: "mono",
    label: "Terminal",
    style: {
      fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
      textShadow: "0 0 10px rgba(74,222,128,0.6)",
      color: "#d9f99d",
    },
  },
];

export function nameStyleById(id: string | null | undefined) {
  return NAME_STYLES.find((s) => s.id === id) ?? NAME_STYLES[0];
}

/* ------------------------------------------------------------------ */
/* Nameplates                                                          */
/* ------------------------------------------------------------------ */

export type Nameplate = {
  id: NameplateId;
  label: string;
  style: React.CSSProperties;
};

export const NAMEPLATES: Nameplate[] = [
  { id: "none", label: "None", style: {} },
  {
    id: "glass",
    label: "Glass",
    style: {
      background: "rgba(255,255,255,0.10)",
      border: "1px solid rgba(255,255,255,0.22)",
      backdropFilter: "blur(6px)",
    },
  },
  {
    id: "neon",
    label: "Neon",
    style: {
      background: "rgba(168,85,247,0.18)",
      border: "1px solid rgba(168,85,247,0.65)",
      boxShadow: "0 0 18px rgba(168,85,247,0.45)",
    },
  },
  {
    id: "gradient",
    label: "Gradient",
    style: { backgroundImage: "linear-gradient(95deg, #a855f7, #38bdf8)" },
  },
  {
    id: "sunset",
    label: "Sunset",
    style: { backgroundImage: "linear-gradient(95deg, #fb923c, #ef4444, #f472b6)" },
  },
  {
    id: "grid",
    label: "Grid",
    style: {
      backgroundImage:
        "linear-gradient(to right, rgba(255,255,255,0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.14) 1px, transparent 1px)",
      backgroundSize: "10px 10px",
      backgroundColor: "rgba(11,7,21,0.55)",
      border: "1px solid rgba(255,255,255,0.16)",
    },
  },
];

export function nameplateById(id: string | null | undefined) {
  return NAMEPLATES.find((n) => n.id === id) ?? NAMEPLATES[0];
}

/* ------------------------------------------------------------------ */
/* Connections                                                         */
/* ------------------------------------------------------------------ */

export type ConnectionMeta = {
  kind: ConnectionKind;
  label: string;
  color: string;
  urlPrefix: string;
  placeholder: string;
};

export const CONNECTIONS: ConnectionMeta[] = [
  { kind: "roblox", label: "Roblox", color: "#e2231a", urlPrefix: "https://roblox.com/users/", placeholder: "username" },
  { kind: "tiktok", label: "TikTok", color: "#25f4ee", urlPrefix: "https://tiktok.com/@", placeholder: "handle" },
  { kind: "twitch", label: "Twitch", color: "#9146ff", urlPrefix: "https://twitch.tv/", placeholder: "channel" },
  { kind: "youtube", label: "YouTube", color: "#ff0033", urlPrefix: "https://youtube.com/@", placeholder: "channel" },
  { kind: "github", label: "GitHub", color: "#e2e8f0", urlPrefix: "https://github.com/", placeholder: "username" },
  { kind: "spotify", label: "Spotify", color: "#1db954", urlPrefix: "https://open.spotify.com/user/", placeholder: "user id" },
  { kind: "steam", label: "Steam", color: "#66c0f4", urlPrefix: "https://steamcommunity.com/id/", placeholder: "vanity id" },
];

export function connectionMeta(kind: string) {
  return CONNECTIONS.find((c) => c.kind === kind) ?? CONNECTIONS[0];
}

/* ------------------------------------------------------------------ */
/* Game catalogue for the widget panel                                 */
/* ------------------------------------------------------------------ */

export const GAME_CATALOGUE: WidgetGame[] = [
  { id: "g-hades2", name: "Hades II", cover: null, genre: "Roguelike" },
  { id: "g-celeste", name: "Celeste", cover: null, genre: "Platformer" },
  { id: "g-silksong", name: "Hollow Knight: Silksong", cover: null, genre: "Metroidvania" },
  { id: "g-val", name: "VALORANT", cover: null, genre: "Tactical shooter" },
  { id: "g-minecraft", name: "Minecraft", cover: null, genre: "Sandbox" },
  { id: "g-eldenring", name: "Elden Ring", cover: null, genre: "Action RPG" },
  { id: "g-fortnite", name: "Fortnite", cover: null, genre: "Battle royale" },
  { id: "g-roblox", name: "Roblox", cover: null, genre: "Platform" },
  { id: "g-among", name: "Among Us", cover: null, genre: "Social deduction" },
  { id: "g-stardew", name: "Stardew Valley", cover: null, genre: "Farming sim" },
  { id: "g-terraria", name: "Terraria", cover: null, genre: "Sandbox" },
  { id: "g-lol", name: "League of Legends", cover: null, genre: "MOBA" },
  { id: "g-apex", name: "Apex Legends", cover: null, genre: "Battle royale" },
  { id: "g-genshin", name: "Genshin Impact", cover: null, genre: "Action RPG" },
  { id: "g-rocket", name: "Rocket League", cover: null, genre: "Sports" },
  { id: "g-portal", name: "Portal 2", cover: null, genre: "Puzzle" },
];

export function searchGames(query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return GAME_CATALOGUE.slice(0, 8);
  return GAME_CATALOGUE.filter((game) => game.name.toLowerCase().includes(needle)).slice(0, 8);
}

/** Deterministic cover gradient so catalogue tiles look like box art. */
export function coverGradient(name: string) {
  const palettes = [
    ["#7c3aed", "#2563eb"],
    ["#f97316", "#dc2626"],
    ["#0ea5e9", "#14b8a6"],
    ["#db2777", "#7c3aed"],
    ["#16a34a", "#0d9488"],
    ["#eab308", "#f97316"],
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  const [from, to] = palettes[Math.abs(hash) % palettes.length];
  return `linear-gradient(160deg, ${from}, ${to})`;
}
