export type Presence = "online" | "idle" | "dnd" | "offline";

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  accent_color: string;
  status: Presence;
  bio: string | null;
  created_at: string;
  /* v2 — persisted settings & custom status */
  custom_status?: string | null;
  custom_status_emoji?: string | null;
  banner_color?: string | null;
  theme_id?: ThemeId;
  message_density?: Density;
  reduce_motion?: boolean;
  reduced_saturation?: boolean;
  font_scale?: number;
  dm_privacy?: "everyone" | "friends" | "none";
  message_filter?: "off" | "standard" | "strict";
  notify_direct_messages?: boolean;
  notify_server_messages?: boolean;
  notify_friend_requests?: boolean;
};

export type Server = {
  id: string;
  name: string;
  icon: string;
  description: string | null;
  invite_code: string;
  is_default: boolean;
  owner_id: string | null;
};

export type Channel = {
  id: string;
  server_id: string;
  name: string;
  kind: "text" | "voice";
  topic: string | null;
  position: number;
};

export type MessageAuthor = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  accent_color: string | null;
  status?: string | null;
  custom_status?: string | null;
  custom_status_emoji?: string | null;
};

export type Message = {
  id: string;
  channel_id: string;
  author_id: string | null;
  system_author: string | null;
  content: string;
  created_at: string;
  edited_at: string | null;
  author?: MessageAuthor | null;
};

export type ServerMember = {
  server_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  joined_at: string;
  profile?: Profile | null;
};

export type VoiceState = {
  channel_id: string;
  user_id: string;
  muted: boolean;
  joined_at: string;
  profile?: MessageAuthor | null;
};

/* ------------------------------------------------------------------ */
/* v2: friends, DMs, appearance                                        */
/* ------------------------------------------------------------------ */

export type CustomStatus = {
  text: string | null;
  emoji: string | null;
};

export type ThemeId =
  | "midnight"
  | "amethyst"
  | "aurora"
  | "ember"
  | "forest"
  | "mono"
  | "light";

export type Density = "compact" | "cozy" | "roomy";

export type Appearance = {
  theme_id: ThemeId;
  message_density: Density;
  reduce_motion: boolean;
  reduced_saturation: boolean;
  font_scale: number;
};

export type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "blocked";
  created_at: string;
  responded_at: string | null;
  requester?: MessageAuthor | null;
  addressee?: MessageAuthor | null;
};

export type DmChannel = {
  id: string;
  user_a: string;
  user_b: string;
  pair_key: string;
  created_at: string;
  last_message_at: string;
  peer?: MessageAuthor | null;
  last_message?: { content: string; created_at: string; author_id: string } | null;
  unread_count?: number;
};

export type DirectMessage = {
  id: string;
  dm_channel_id: string;
  author_id: string;
  content: string;
  created_at: string;
  edited_at: string | null;
  read_at: string | null;
  author?: MessageAuthor | null;
};

export type FriendRequest = {
  id: string;
  direction: "incoming" | "outgoing";
  profile: MessageAuthor;
  created_at: string;
};

export type ActiveActivity = {
  kind: "game" | "music" | "code" | "custom" | "voice";
  title: string;
  detail?: string;
  started_at?: string;
};
