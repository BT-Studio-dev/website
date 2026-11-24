/**
 * Server templates + the multi-step creation wizard's data.
 *
 * Each template pre-seeds text/voice channels so a brand-new server lands with
 * a usable structure — exactly what Discord's template picker does.
 */

export type ServerTemplate = {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  channels: { name: string; kind: "text" | "voice"; topic?: string }[];
};

export const SERVER_TEMPLATES: ServerTemplate[] = [
  {
    id: "gaming",
    name: "Gaming",
    emoji: "🎮",
    blurb: "Squad up, share clips, and run game nights.",
    channels: [
      { name: "welcome", kind: "text", topic: "Say hi and pick your roles." },
      { name: "lfg", kind: "text", topic: "Looking for group." },
      { name: "clips", kind: "text" },
      { name: "Voice Channels", kind: "voice" },
      { name: "Game Night", kind: "voice" },
    ],
  },
  {
    id: "friends",
    name: "Friends",
    emoji: "🫂",
    blurb: "A cozy hangout for your group chat.",
    channels: [
      { name: "general", kind: "text", topic: "Anything and everything." },
      { name: "memes", kind: "text" },
      { name: "plans", kind: "text" },
      { name: "General", kind: "voice" },
    ],
  },
  {
    id: "study",
    name: "Study Group",
    emoji: "📚",
    blurb: "Focus sessions, notes, and shared deadlines.",
    channels: [
      { name: "announcements", kind: "text" },
      { name: "notes", kind: "text" },
      { name: "questions", kind: "text" },
      { name: "Study Room", kind: "voice" },
      { name: "Silent Focus", kind: "voice" },
    ],
  },
  {
    id: "school",
    name: "School Club",
    emoji: "🎓",
    blurb: "Meetings, sign-ups, and club updates.",
    channels: [
      { name: "welcome", kind: "text" },
      { name: "announcements", kind: "text" },
      { name: "meeting-notes", kind: "text" },
      { name: "Club Voice", kind: "voice" },
    ],
  },
  {
    id: "community",
    name: "Local Community",
    emoji: "🏙️",
    blurb: "Events, recommendations, and neighbours.",
    channels: [
      { name: "general", kind: "text" },
      { name: "events", kind: "text" },
      { name: "recommendations", kind: "text" },
      { name: "Town Square", kind: "voice" },
    ],
  },
  {
    id: "creators",
    name: "Artists & Creators",
    emoji: "🎨",
    blurb: "Share work, get feedback, collab.",
    channels: [
      { name: "showcase", kind: "text" },
      { name: "feedback", kind: "text" },
      { name: "commissions", kind: "text" },
      { name: "Studio", kind: "voice" },
    ],
  },
];

/** Step 1 options — "just a few friends" vs "a club or community". */
export const SERVER_INTENTS = [
  {
    id: "friends",
    emoji: "🫂",
    title: "For me and my friends",
    blurb: "A private space for your group to hang out.",
  },
  {
    id: "community",
    emoji: "🌍",
    title: "For a club or community",
    blurb: "A bigger space where people can discover and join.",
  },
] as const;

export type ServerIntent = (typeof SERVER_INTENTS)[number]["id"];

/** "Have an invite already?" footer links straight to Join a Server. */
export const INVITE_EXAMPLES = ["hTKzmak", "https://btcomms.gg/invite-code"];
