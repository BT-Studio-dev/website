"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Channel,
  Message,
  Profile,
  Server,
  ServerMember,
  VoiceState,
} from "@/lib/types";

export const PROFILE_FIELDS =
  "id, username, display_name, avatar_url, accent_color, status, bio, created_at";

export const MESSAGE_SELECT = `id, channel_id, author_id, system_author, content, created_at, edited_at,
  author:profiles(id, username, display_name, avatar_url, accent_color)`;

export type CommsSnapshot = {
  profile: Profile;
  servers: Server[];
  server: Server;
  channels: Channel[];
  members: ServerMember[];
  messages: Message[];
  voiceStates: VoiceState[];
  viewerRole: "owner" | "admin" | "member";
};

export type LoadOutcome =
  | { status: "unauth" }
  | { status: "empty"; profile: Profile; servers: Server[] }
  | { status: "ready"; data: CommsSnapshot }
  | { status: "error"; message: string };

/** Fetches (or lazily creates) the profile row for the signed-in user. */
export async function fetchProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<Profile | null> {
  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_FIELDS)
    .eq("id", userId)
    .maybeSingle<Profile>();

  if (data) return data;

  // The DB trigger normally creates this row. Fall back if it is missing
  // (for example accounts created before the trigger existed).
  const { data: created } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      username: `member${userId.slice(0, 6)}`,
      display_name: "New Member",
    })
    .select(PROFILE_FIELDS)
    .maybeSingle<Profile>();

  return created ?? null;
}

export async function fetchServers(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ servers: Server[]; roles: Record<string, "owner" | "admin" | "member"> }> {
  const { data: memberships } = await supabase
    .from("server_members")
    .select("server_id, role")
    .eq("user_id", userId);

  const ids = (memberships ?? []).map((m) => m.server_id);
  if (ids.length === 0) return { servers: [], roles: {} };

  const { data: servers } = await supabase
    .from("servers")
    .select("id, name, icon, description, invite_code, is_default, owner_id")
    .in("id", ids)
    .order("created_at", { ascending: true });

  const roles: Record<string, "owner" | "admin" | "member"> = {};
  for (const m of memberships ?? []) {
    roles[m.server_id] = m.role as "owner" | "admin" | "member";
  }

  return { servers: (servers ?? []) as Server[], roles };
}

export async function fetchServerBundle(
  supabase: SupabaseClient,
  server: Server,
  viewerRole: "owner" | "admin" | "member",
  channelId?: string,
): Promise<CommsSnapshot | null> {
  const { data: channels } = await supabase
    .from("channels")
    .select("id, server_id, name, kind, topic, position")
    .eq("server_id", server.id)
    .order("position", { ascending: true });

  if (!channels || channels.length === 0) return null;

  const activeChannel =
    channels.find((c) => c.id === channelId && c.kind === "text") ??
    channels.find((c) => c.kind === "text") ??
    channels[0];

  const profileId = (await supabase.auth.getUser()).data.user?.id ?? "";

  const [{ data: profileRow }, { data: members }, { data: messages }, { data: voice }] =
    await Promise.all([
      supabase.from("profiles").select(PROFILE_FIELDS).eq("id", profileId).maybeSingle<Profile>(),
      supabase
        .from("server_members")
        .select(`server_id, user_id, role, joined_at, profile:profiles(${PROFILE_FIELDS})`)
        .eq("server_id", server.id)
        .order("joined_at", { ascending: true }),
      supabase
        .from("messages")
        .select(MESSAGE_SELECT)
        .eq("channel_id", activeChannel.id)
        .order("created_at", { ascending: false })
        .limit(80),
      supabase
        .from("voice_states")
        .select(
          `channel_id, user_id, muted, joined_at,
           profile:profiles(id, username, display_name, avatar_url, accent_color)`,
        )
        .in(
          "channel_id",
          channels.filter((c) => c.kind === "voice").map((c) => c.id),
        ),
    ]);

  if (!profileRow) return null;

  return {
    profile: profileRow,
    servers: [],
    server,
    channels: channels as Channel[],
    members: ((members ?? []) as unknown as ServerMember[]).filter((m) => m.profile),
    messages: ((messages ?? []) as unknown as Message[]).reverse(),
    voiceStates: (voice ?? []) as unknown as VoiceState[],
    viewerRole,
  };
}

export async function fetchMembers(
  supabase: SupabaseClient,
  serverId: string,
): Promise<ServerMember[]> {
  const { data } = await supabase
    .from("server_members")
    .select(`server_id, user_id, role, joined_at, profile:profiles(${PROFILE_FIELDS})`)
    .eq("server_id", serverId)
    .order("joined_at", { ascending: true });
  return ((data ?? []) as unknown as ServerMember[]).filter((m) => m.profile);
}

export async function fetchMessages(
  supabase: SupabaseClient,
  channelId: string,
): Promise<Message[]> {
  const { data } = await supabase
    .from("messages")
    .select(MESSAGE_SELECT)
    .eq("channel_id", channelId)
    .order("created_at", { ascending: false })
    .limit(80);
  return ((data ?? []) as unknown as Message[]).reverse();
}

export async function fetchVoiceStates(
  supabase: SupabaseClient,
  voiceChannelIds: string[],
): Promise<VoiceState[]> {
  if (voiceChannelIds.length === 0) return [];
  const { data } = await supabase
    .from("voice_states")
    .select(
      `channel_id, user_id, muted, joined_at,
       profile:profiles(id, username, display_name, avatar_url, accent_color)`,
    )
    .in("channel_id", voiceChannelIds);
  return (data ?? []) as unknown as VoiceState[];
}

/** Joins a server by invite code. Returns the server on success. */
export async function joinServerByCode(
  supabase: SupabaseClient,
  userId: string,
  rawCode: string,
): Promise<{ ok: true; server: Pick<Server, "id" | "name"> } | { ok: false; message: string }> {
  const code = rawCode.trim().toLowerCase().replace(/^.*[?&]invite=/, "").replace(/\/+$/, "");
  if (!code) return { ok: false, message: "Enter an invite code first." };

  const { data: found, error } = await supabase
    .from("servers")
    .select("id, name")
    .eq("invite_code", code)
    .maybeSingle<{ id: string; name: string }>();

  if (error) return { ok: false, message: "Couldn't look up that invite." };
  if (!found) return { ok: false, message: "That invite code doesn't match a server." };

  const { error: joinError } = await supabase
    .from("server_members")
    .insert({ server_id: found.id, user_id: userId });

  if (joinError && joinError.code !== "23505") {
    return { ok: false, message: "Couldn't join that server." };
  }

  return { ok: true, server: found };
}
