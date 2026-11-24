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
