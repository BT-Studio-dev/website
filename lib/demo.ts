/**
 * Demo mode
 * ---------
 * When the browser cannot reach Supabase (offline preview, locked-down
 * network, or simply no project configured yet) BT Comms boots into a fully
 * interactive, in-memory replica of the workspace so the UI can still be
 * explored. Every write stays in memory and is dropped on reload.
 *
 * Real deployments never hit this path: the loader probes Supabase first and
 * only falls back when the request genuinely fails.
 */

import type {
  Channel,
  Message,
  MessageAuthor,
  Profile,
  Server,
  ServerMember,
  VoiceState,
} from "@/lib/types";

export const DEMO_USER_ID = "demo-user-ada";

const ME: Profile = {
  id: DEMO_USER_ID,
  username: "ada",
  display_name: "Ada Lovelace",
  avatar_url: null,
  accent_color: "#eb459e",
  status: "online",
  bio: "Demo mode · building BT Comms",
  created_at: "2026-10-02T10:00:00.000Z",
  pronouns: "she/her",
  server_tag: "BT",
  banner_color: "#7c3aed",
  theme_primary: "#7c3aed",
  theme_secondary: "#0ea5e9",
  avatar_decoration: "aurora",
  profile_effect: "sparkle",
  name_style: "neon",
  nameplate: "glass",
  custom_status: "Shipping the profile studio",
  custom_status_emoji: "🚀",
  connections: [
    { id: "demo-c1", kind: "twitch", handle: "adalovelace", url: "https://twitch.tv/adalovelace" },
    { id: "demo-c2", kind: "youtube", handle: "@ada", url: "https://youtube.com/@ada" },
    { id: "demo-c3", kind: "github", handle: "ada", url: "https://github.com/ada" },
  ],
  widgets: [
    { id: "demo-w1", kind: "favorite", game: { id: "g-hades2", name: "Hades II", cover: null, genre: "Roguelike" } },
    { id: "demo-w2", kind: "like", game: { id: "g-celeste", name: "Celeste", cover: null, genre: "Platformer" } },
    { id: "demo-w3", kind: "want", game: { id: "g-silksong", name: "Hollow Knight: Silksong", cover: null, genre: "Metroidvania" } },
  ],
  user_settings: {
    dataImprove: true,
    dataPersonalize: false,
    voiceInClips: true,
    profileShareScope: "friends_servers",
    profileShareUpdates: true,
    sensitiveDmFriends: "show",
    sensitiveDmOthers: "blur",
    sensitiveServer: "blur",
    spamFilter: "non_friends",
    dmPrivacy: "everyone",
    dmAllowServerMembers: true,
    dmRequests: true,
    friendRequestsEnabled: true,
    friendRequestsFrom: "server_members",
    friendRequestNotes: true,
    notifyDesktop: true,
    notifyStreaming: true,
    notifyFriendsOnline: false,
    notifyEvents: true,
    notifyProfileUpdates: false,
    notifyReactions: "all",
    soundMessage: true,
    soundCurrentChannel: true,
    soundRing: true,
    soundDisabled: false,
    unreadBadge: true,
    emailCommunication: true,
    emailSocial: false,
    emailAnnouncements: true,
    emailTips: true,
    emailRecommendations: false,
    ttsEnabled: false,
    ttsRate: 1,
    advancedTelemetry: false,
  },
  bt_pro: true,
};

const AUTHOR = (over: Partial<MessageAuthor> & { id: string; username: string }): MessageAuthor => ({
  display_name: over.display_name ?? over.username,
  avatar_url: null,
  accent_color: "#5865f2",
  ...over,
});

const PEOPLE: MessageAuthor[] = [
  AUTHOR({ id: "demo-user-sol", username: "sol", display_name: "Sol Kim", accent_color: "#3ba55d" }),
  AUTHOR({ id: "demo-user-mira", username: "mira", display_name: "Mira Okafor", accent_color: "#faa61a" }),
  AUTHOR({ id: "demo-user-dev", username: "dev", display_name: "Dev Patel", accent_color: "#00a8fc" }),
  AUTHOR({ id: "demo-user-june", username: "june", display_name: "June Park", accent_color: "#9b59b6" }),
];

const min = 60_000;
const now = Date.now();
const at = (minutesAgo: number) => new Date(now - minutesAgo * min).toISOString();

type DemoChannel = Channel & { demoMessages: Message[] };

function channel(
  id: string,
  serverId: string,
  name: string,
  kind: "text" | "voice",
  topic: string | null,
  position: number,
  demoMessages: Message[] = [],
): DemoChannel {
  return { id, server_id: serverId, name, kind, topic, position, demoMessages };
}

function msg(
  id: string,
  channelId: string,
  author: Profile | MessageAuthor | null,
  content: string,
  minutesAgo: number,
  systemAuthor?: string,
): Message {
  const isProfile = author && "created_at" in author;
  return {
    id,
    channel_id: channelId,
    author_id: author?.id ?? null,
    system_author: systemAuthor ?? null,
    content,
    created_at: at(minutesAgo),
    edited_at: null,
    author: author
      ? {
          id: author.id,
          username: author.username,
          display_name: author.display_name,
          avatar_url: author.avatar_url,
          accent_color: author.accent_color,
        }
      : null,
  };
}

const SERVER_A: Server = {
  id: "demo-server-bt",
  name: "BT Comms",
  icon: "⚡",
  description: "The official BT Comms community.",
  invite_code: "bt-comms",
  is_default: true,
  owner_id: "demo-user-sol",
};

const SERVER_B: Server = {
  id: "demo-server-guild",
  name: "Design Guild",
  icon: "🎨",
  description: "Weekly critiques and pixel pushes.",
  invite_code: "design-guild",
  is_default: false,
  owner_id: DEMO_USER_ID,
};

const CHANNELS: Record<string, DemoChannel[]> = {
  [SERVER_A.id]: [
    channel("demo-ch-welcome", SERVER_A.id, "welcome", "text", "Start here — say hi and grab a role.", 0, [
      msg("m1", "demo-ch-welcome", null, "Welcome to **BT Comms** — a tiny, fast place to talk with your team. Click around, send a message, hop into a voice channel.", 2880, "BT Comms"),
      msg("m2", "demo-ch-welcome", null, "You're viewing an offline **demo snapshot**. Connect Supabase and every message below becomes live and shared.", 2870, "BT Comms"),
    ]),
    channel("demo-ch-general", SERVER_A.id, "general", "text", "Anything and everything BT Comms.", 1, [
      msg("m3", "demo-ch-general", PEOPLE[0], "Morning all ☀️ shipping the new presence dots today.", 240),
      msg("m4", "demo-ch-general", PEOPLE[1], "Nice — do they respect **Do Not Disturb**?", 218),
      msg("m5", "demo-ch-general", ME, "Yep, and `status` is realtime so no refresh needed.", 213),
      msg("m6", "demo-ch-general", PEOPLE[2], "Also added day dividers + message grouping. Feels much calmer.", 96),
      msg("m7", "demo-ch-general", PEOPLE[0], "The composer now supports ~~long~~ multi-line drafts with Shift + Enter.", 42),
      msg("m8", "demo-ch-general", PEOPLE[3], "Someone jump in **General Voice** — doing a quick design review 🎧", 8),
    ]),
    channel("demo-ch-dev", SERVER_A.id, "development", "text", "Build logs, bugs, and PR reviews.", 2, [
      msg("m9", "demo-ch-dev", PEOPLE[2], "Realtime is wired through `postgres_changes` on `messages` — no polling.", 150),
      msg("m10", "demo-ch-dev", PEOPLE[1], "RLS is doing the heavy lifting: outsiders read zero rows.", 120),
      msg("m11", "demo-ch-dev", ME, "Added optimistic sends so the composer never feels laggy.", 60),
    ]),
    channel("demo-ch-design", SERVER_A.id, "design", "text", "Pixel pushes and UI feedback.", 3, [
      msg("m12", "demo-ch-design", PEOPLE[3], "New palette: blurple `#5865f2` on near-black `#0b0d12`. Thoughts?", 200),
      msg("m13", "demo-ch-design", PEOPLE[1], "Love it. The sidebar finally recedes into the background.", 180),
    ]),
    channel("demo-ch-voice-general", SERVER_A.id, "General Voice", "voice", "Drop-in voice hangout.", 4),
    channel("demo-ch-voice-focus", SERVER_A.id, "Focus Room", "voice", "Silent co-working session.", 5),
  ],
  [SERVER_B.id]: [
    channel("demo-ch-guild-general", SERVER_B.id, "general", "text", "Guild chatter.", 0, [
      msg("g1", "demo-ch-guild-general", PEOPLE[3], "Critique thread is open for the onboarding flow.", 300),
      msg("g2", "demo-ch-guild-general", PEOPLE[1], "Left notes on spacing and focus states.", 90),
    ]),
    channel("demo-ch-guild-crit", SERVER_B.id, "critique", "text", "Bring work, leave with better work.", 1, [
      msg("g3", "demo-ch-guild-crit", PEOPLE[0], "Round 14 — bring your best three frames.", 420),
    ]),
    channel("demo-ch-guild-voice", SERVER_B.id, "Studio", "voice", "Live critique room.", 2),
  ],
};

const MEMBERS: Record<string, ServerMember[]> = {
  [SERVER_A.id]: [
    { server_id: SERVER_A.id, user_id: ME.id, role: "owner", joined_at: at(5000), profile: ME },
    { server_id: SERVER_A.id, user_id: PEOPLE[0].id, role: "admin", joined_at: at(4000), profile: personProfile(PEOPLE[0], "online") },
    { server_id: SERVER_A.id, user_id: PEOPLE[1].id, role: "member", joined_at: at(3000), profile: personProfile(PEOPLE[1], "online") },
    { server_id: SERVER_A.id, user_id: PEOPLE[2].id, role: "member", joined_at: at(2000), profile: personProfile(PEOPLE[2], "idle") },
    { server_id: SERVER_A.id, user_id: PEOPLE[3].id, role: "member", joined_at: at(1000), profile: personProfile(PEOPLE[3], "dnd") },
  ],
  [SERVER_B.id]: [
    { server_id: SERVER_B.id, user_id: ME.id, role: "owner", joined_at: at(5000), profile: ME },
    { server_id: SERVER_B.id, user_id: PEOPLE[1].id, role: "member", joined_at: at(2000), profile: personProfile(PEOPLE[1], "online") },
    { server_id: SERVER_B.id, user_id: PEOPLE[3].id, role: "member", joined_at: at(1500), profile: personProfile(PEOPLE[3], "dnd") },
  ],
};

function personProfile(author: MessageAuthor, status: Profile["status"]): Profile {
  return {
    id: author.id,
    username: author.username,
    display_name: author.display_name,
    avatar_url: null,
    accent_color: author.accent_color ?? "#5865f2",
    status,
    bio: null,
    created_at: at(10000),
  };
}

const VOICE: VoiceState[] = [
  {
    channel_id: "demo-ch-voice-general",
    user_id: PEOPLE[0].id,
    muted: false,
    joined_at: at(30),
    profile: PEOPLE[0],
  },
  {
    channel_id: "demo-ch-voice-general",
    user_id: PEOPLE[3].id,
    muted: true,
    joined_at: at(12),
    profile: PEOPLE[3],
  },
];

let messageCounter = 1000;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

/** Delivers a fake "someone is typing/sent something" ping every so often. */
let ambientTimer: ReturnType<typeof setInterval> | null = null;

export const demoStore = {
  profile: { ...ME } as Profile,
  servers: [SERVER_A, SERVER_B] as Server[],
  channels: CHANNELS,
  members: MEMBERS,
  voice: VOICE,

  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  membersOf(serverId: string) {
    return MEMBERS[serverId] ?? [];
  },

  channelsOf(serverId: string) {
    return CHANNELS[serverId] ?? [];
  },

  messagesOf(channelId: string): Message[] {
    const found = Object.values(CHANNELS)
      .flat()
      .find((c) => c.id === channelId);
    return [...(found?.demoMessages ?? [])];
  },

  addMessage(channelId: string, content: string) {
    const found = Object.values(CHANNELS)
      .flat()
      .find((c) => c.id === channelId);
    if (!found) return null;
    const message: Message = {
      id: `demo-msg-${++messageCounter}`,
      channel_id: channelId,
      author_id: ME.id,
      system_author: null,
      content,
      created_at: new Date().toISOString(),
      edited_at: null,
      author: {
        id: ME.id,
        username: ME.username,
        display_name: ME.display_name,
        avatar_url: null,
        accent_color: ME.accent_color,
      },
    };
    found.demoMessages = [...found.demoMessages, message];
    notify();
    return message;
  },

  deleteMessage(id: string) {
    for (const ch of Object.values(CHANNELS).flat()) {
      ch.demoMessages = ch.demoMessages.filter((m) => m.id !== id);
    }
    notify();
  },

  joinVoice(channelId: string) {
    demoStore.voice = demoStore.voice.filter((v) => v.user_id !== ME.id);
    demoStore.voice.push({
      channel_id: channelId,
      user_id: ME.id,
      muted: false,
      joined_at: new Date().toISOString(),
      profile: {
        id: ME.id,
        username: ME.username,
        display_name: ME.display_name,
        avatar_url: null,
        accent_color: ME.accent_color,
      },
    });
    notify();
  },

  leaveVoice() {
    demoStore.voice = demoStore.voice.filter((v) => v.user_id !== ME.id);
    notify();
  },

  addChannel(serverId: string, name: string, kind: "text" | "voice", topic: string | null) {
    const list = CHANNELS[serverId] ?? [];
    if (list.some((c) => c.name.toLowerCase() === name.toLowerCase() && c.kind === kind)) {
      return { ok: false as const, message: "A channel with that name already exists." };
    }
    const created: DemoChannel = channel(
      `demo-ch-${Date.now()}`,
      serverId,
      name,
      kind,
      topic,
      list.length,
      [],
    );
    CHANNELS[serverId] = [...list, created];
    notify();
    return { ok: true as const, channel: created };
  },

  addServer(name: string, icon: string) {
    const id = `demo-server-${Date.now()}`;
    const server: Server = {
      id,
      name,
      icon,
      description: null,
      invite_code: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      is_default: false,
      owner_id: ME.id,
    };
    demoStore.servers = [...demoStore.servers, server];
    CHANNELS[id] = [
      channel(`demo-ch-${id}-general`, id, "general", "text", `Say hi in ${name}.`, 0, []),
      channel(`demo-ch-${id}-voice`, id, "voice", "voice", null, 1, []),
    ];
    MEMBERS[id] = [
      { server_id: id, user_id: ME.id, role: "owner", joined_at: new Date().toISOString(), profile: ME },
    ];
    notify();
    return server;
  },

  updateProfile(
    patch: Partial<
      Pick<
        Profile,
        | "display_name"
        | "bio"
        | "status"
        | "custom_status"
        | "custom_status_emoji"
        | "accent_color"
        | "banner_color"
        | "avatar_url"
        | "banner_url"
        | "theme_primary"
        | "theme_secondary"
        | "avatar_decoration"
        | "profile_effect"
        | "name_style"
        | "nameplate"
        | "pronouns"
        | "server_tag"
        | "connections"
        | "widgets"
        | "user_settings"
        | "bt_pro"
      >
    >,
  ) {
    demoStore.profile = { ...demoStore.profile, ...patch };
    // keep membership rows in sync so the member list updates
    for (const list of Object.values(MEMBERS)) {
      for (const member of list) {
        if (member.user_id === ME.id && member.profile) {
          member.profile = { ...member.profile, ...patch };
        }
      }
    }
    notify();
  },

  joinByCode(code: string) {
    const cleaned = code.trim().toLowerCase().replace(/^.*[?&]invite=/, "").replace(/\/+$/, "");
    const server = demoStore.servers.find((s) => s.invite_code === cleaned);
    if (!server) return { ok: false as const, message: "That invite code doesn't match a server." };
    if (!(MEMBERS[server.id] ?? []).some((m) => m.user_id === ME.id)) {
      MEMBERS[server.id] = [
        ...(MEMBERS[server.id] ?? []),
        { server_id: server.id, user_id: ME.id, role: "member", joined_at: new Date().toISOString(), profile: ME },
      ];
      notify();
    }
    return { ok: true as const, server };
  },

  /** Simulates a teammate replying, so the realtime feel is visible. */
  startAmbient() {
    if (ambientTimer) return;
    const lines = [
      "This is demo mode — wire up Supabase and this becomes a real shared channel.",
      "Try clicking the + next to Text Channels.",
      "Voice channels below the divider are live too 👇",
      "Message grouping kicks in after a few minutes of silence.",
    ];
    let i = 0;
    ambientTimer = setInterval(() => {
      const target = CHANNELS[SERVER_A.id].find((c) => c.name === "general");
      if (!target) return;
      const speaker = PEOPLE[i % PEOPLE.length];
      target.demoMessages = [
        ...target.demoMessages,
        {
          id: `demo-msg-ambient-${++messageCounter}`,
          channel_id: target.id,
          author_id: speaker.id,
          system_author: null,
          content: lines[i % lines.length],
          created_at: new Date().toISOString(),
          edited_at: null,
          author: speaker,
        },
      ];
      i += 1;
      notify();
    }, 26_000);
  },

  stopAmbient() {
    if (ambientTimer) clearInterval(ambientTimer);
    ambientTimer = null;
  },
};

/* ------------------------------------------------------------------ */
/* v2 demo: friends, DMs, activity                                     */
/* ------------------------------------------------------------------ */

export type DemoFriend = {
  id: string;
  profile: MessageAuthor & { status?: string | null; custom_status?: string | null };
  request?: "incoming" | "outgoing" | null;
};

const FRIEND_PEOPLE = [
  { ...PEOPLE[0], status: "online", custom_status: "Shipping the settings modal" },
  { ...PEOPLE[1], status: "idle", custom_status: "Coffee break ☕" },
  { ...PEOPLE[2], status: "online", custom_status: "Playing BT Comms Arena" },
  { ...PEOPLE[3], status: "dnd", custom_status: "Deep work — do not disturb" },
];

export const demoFriends: DemoFriend[] = [
  { id: "f1", profile: FRIEND_PEOPLE[0], request: null },
  { id: "f2", profile: FRIEND_PEOPLE[1], request: null },
  { id: "f3", profile: FRIEND_PEOPLE[2], request: null },
  { id: "f4", profile: FRIEND_PEOPLE[3], request: null },
  { id: "f5", profile: AUTHOR({ id: "demo-user-kai", username: "kai", display_name: "Kai Rivera", accent_color: "#22c55e" }), request: "incoming" },
];

export type DemoDm = {
  id: string;
  peer: MessageAuthor & { status?: string | null; custom_status?: string | null };
  messages: { id: string; author_id: string; content: string; created_at: string }[];
  unread: number;
};

const dmMin = (n: number) => new Date(Date.now() - n * 60_000).toISOString();

export const demoDms: DemoDm[] = [
  {
    id: "demo-dm-sol",
    peer: FRIEND_PEOPLE[0],
    unread: 2,
    messages: [
      { id: "d1", author_id: PEOPLE[0].id, content: "hey! did the friends tab land on prod yet?", created_at: dmMin(120) },
      { id: "d2", author_id: DEMO_USER_ID, content: "shipping it now — settings modal is the last piece 🎧", created_at: dmMin(95) },
      { id: "d3", author_id: PEOPLE[0].id, content: "perfect. ping me when the deploy is green 👀", created_at: dmMin(12) },
    ],
  },
  {
    id: "demo-dm-mira",
    peer: FRIEND_PEOPLE[1],
    unread: 0,
    messages: [
      { id: "d4", author_id: PEOPLE[1].id, content: "the amethyst theme is *chef's kiss*", created_at: dmMin(300) },
      { id: "d5", author_id: DEMO_USER_ID, content: "gradients everywhere 🎨", created_at: dmMin(280) },
    ],
  },
  {
    id: "demo-dm-dev",
    peer: FRIEND_PEOPLE[2],
    unread: 0,
    messages: [
      { id: "d6", author_id: PEOPLE[2].id, content: "DMs are realtime now — two tabs, instant.", created_at: dmMin(600) },
    ],
  },
];

export const demoActivities: Record<string, { kind: "game" | "music" | "code" | "voice"; title: string; detail?: string }> = {
  [PEOPLE[0].id]: { kind: "code", title: "bt-comms/app", detail: "Editing components/settings" },
  [PEOPLE[1].id]: { kind: "music", title: "Lo-fi Beats to Ship To", detail: "Spotify · playlist" },
  [PEOPLE[2].id]: { kind: "game", title: "BT Comms Arena", detail: "Ranked · 3 of 5" },
};

let dmCounter = 500;

export const demoSocial = {
  addDmMessage(dmId: string, content: string) {
    const dm = demoDms.find((d) => d.id === dmId);
    if (!dm) return null;
    const message = {
      id: `demo-dm-${++dmCounter}`,
      author_id: DEMO_USER_ID,
      content,
      created_at: new Date().toISOString(),
    };
    dm.messages.push(message);
    notify();
    return message;
  },
  deleteDmMessage(id: string) {
    for (const dm of demoDms) dm.messages = dm.messages.filter((m) => m.id !== id);
    notify();
  },
  ensureDm(peerId: string) {
    const existing = demoDms.find((d) => d.peer.id === peerId);
    if (existing) return existing.id;
    const peer = FRIEND_PEOPLE.find((p) => p.id === peerId) ?? PEOPLE[0];
    const dm: DemoDm = { id: `demo-dm-${++dmCounter}`, peer, unread: 0, messages: [] };
    demoDms.unshift(dm);
    notify();
    return dm.id;
  },
  addFriend(username: string) {
    const cleaned = username.trim().replace(/^@/, "").toLowerCase();
    if (!cleaned) return { ok: false, message: "Enter a username first." };
    if (FRIEND_PEOPLE.some((p) => p.username === cleaned)) {
      return { ok: true, message: "You're already friends with that person." };
    }
    const found = demoFriends.find((f) => f.profile.username === cleaned);
    if (found) {
      found.request = "outgoing";
      notify();
      return { ok: true, message: "Friend request sent." };
    }
    // Accept anything else so the flow is always demoable.
    const profile = AUTHOR({
      id: `demo-user-${cleaned}`,
      username: cleaned,
      display_name: cleaned.charAt(0).toUpperCase() + cleaned.slice(1),
      accent_color: "#00a8fc",
    });
    demoFriends.push({
      id: `f-${cleaned}`,
      profile: { ...profile, status: "online", custom_status: "Just joined BT Comms" },
      request: "incoming",
    });
    notify();
    return { ok: true, message: `Friend request sent to @${cleaned}.` };
  },
  respond(id: string, accept: boolean) {
    const friend = demoFriends.find((f) => f.id === id);
    if (!friend) return;
    if (accept) friend.request = null;
    else demoFriends.splice(demoFriends.indexOf(friend), 1);
    notify();
  },
  remove(peerId: string) {
    const index = demoFriends.findIndex((f) => f.profile.id === peerId);
    if (index >= 0) demoFriends.splice(index, 1);
    notify();
  },
};
