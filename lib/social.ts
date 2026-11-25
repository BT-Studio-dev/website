"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Attachment,
  BlockedUser,
  DirectMessage,
  DmChannel,
  FriendRequest,
  Friendship,
  MessageAuthor,
  Profile,
  ProfileConnection,
  ProfileWidget,
  UserSettings,
} from "@/lib/types";
import type { FriendRequest as FriendRequestType } from "@/lib/types";

const AUTHOR_FIELDS = "id, username, display_name, avatar_url, accent_color";
const PROFILE_FIELDS =
  "id, username, display_name, avatar_url, accent_color, status, bio, custom_status, custom_status_emoji, custom_status_started_at, banner_color, theme_id, message_density, reduce_motion, reduced_saturation, font_scale, dm_privacy, message_filter, notify_direct_messages, notify_server_messages, notify_friend_requests, banner_url, theme_primary, theme_secondary, avatar_decoration, profile_effect, name_style, nameplate, pronouns, server_tag, connections, widgets, user_settings, bt_pro, appearance, created_at";

export { PROFILE_FIELDS };
export type { FriendRequestType as FriendRequest };

export type FriendEntry = {
  friendshipId: string;
  profile: MessageAuthor & {
    status?: string;
    custom_status?: string | null;
    custom_status_emoji?: string | null;
    custom_status_started_at?: string | null;
  };
  since: string;
};

/* ------------------------------- friends ------------------------------- */

export async function fetchFriends(supabase: SupabaseClient): Promise<{
  friends: FriendEntry[];
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
  blocked: FriendEntry[];
}> {
  // `note` ships with migration 0010; ask for it, but fall back to a select
  // without it so an un-migrated database never blanks the whole Friends tab.
  const withNote = await supabase
    .from("friendships")
    .select(
      `id, requester_id, addressee_id, status, note, created_at, responded_at,
       requester:profiles!friendships_requester_id_fkey(${AUTHOR_FIELDS}, status, custom_status, custom_status_emoji),
       addressee:profiles!friendships_addressee_id_fkey(${AUTHOR_FIELDS}, status, custom_status, custom_status_emoji)`,
    );

  const { data, error } = withNote.error
    ? await supabase
        .from("friendships")
        .select(
          `id, requester_id, addressee_id, status, created_at, responded_at,
           requester:profiles!friendships_requester_id_fkey(${AUTHOR_FIELDS}, status, custom_status, custom_status_emoji),
           addressee:profiles!friendships_addressee_id_fkey(${AUTHOR_FIELDS}, status, custom_status, custom_status_emoji)`,
        )
    : withNote;

  if (error || !data) return { friends: [], incoming: [], outgoing: [], blocked: [] };

  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;

  const friends: FriendEntry[] = [];
  const incoming: FriendRequest[] = [];
  const outgoing: FriendRequest[] = [];
  const blocked: FriendEntry[] = [];

  for (const row of data as unknown as (Friendship & {
    requester: FriendEntry["profile"] | null;
    addressee: FriendEntry["profile"] | null;
  })[]) {
    const isRequester = row.requester_id === me;
    const other = isRequester ? row.addressee : row.requester;
    if (!other) continue;

    if (row.status === "accepted") {
      friends.push({
        friendshipId: row.id,
        profile: other,
        since: row.responded_at ?? row.created_at,
      });
    } else if (row.status === "blocked") {
      if (isRequester) blocked.push({ friendshipId: row.id, profile: other, since: row.created_at });
    } else if (row.status === "pending") {
      const note = (row as { note?: string | null }).note ?? null;
      if (isRequester) {
        outgoing.push({
          id: row.id,
          direction: "outgoing",
          profile: other,
          created_at: row.created_at,
          note,
        });
      } else {
        incoming.push({
          id: row.id,
          direction: "incoming",
          profile: other,
          created_at: row.created_at,
          note,
        });
      }
    }
  }

  return { friends, incoming, outgoing, blocked };
}

export async function sendFriendRequest(
  supabase: SupabaseClient,
  username: string,
  note?: string,
): Promise<{ ok: boolean; message: string; status?: string }> {
  const cleaned = username.trim().replace(/^@/, "");
  // The optional personal note rides along with the friendship row.
  const trimmedNote = note?.trim().slice(0, 120) || null;
  if (!cleaned) return { ok: false, message: "Enter a username first." };

  const { data, error } = await supabase.rpc("send_friend_request", {
    p_username: cleaned,
    // Carried on the friendship row so the recipient sees why you added them.
    p_note: trimmedNote,
  });

  if (error) {
    // Fall back to a direct lookup so a freshly-scaffolded backend still works.
    const { data: found } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", cleaned)
      .maybeSingle<{ id: string }>();
    const { data: me } = await supabase.auth.getUser();
    const myId = me?.user?.id;
    if (!found || !myId) {
      return { ok: false, message: "We couldn't find anyone with that username." };
    }
    const { error: insertError } = await supabase.from("friendships").insert({
      requester_id: myId,
      addressee_id: found.id,
      status: "pending",
      ...(trimmedNote ? { note: trimmedNote } : {}),
    });
    if (insertError) {
      return {
        ok: false,
        message: insertError.code === "23505"
          ? "You already have a request with that person."
          : "Couldn't send the request.",
      };
    }
    return { ok: true, message: "Friend request sent.", status: "pending" };
  }

  const result = data as { ok: boolean; error?: string; message?: string; status?: string };
  return {
    ok: Boolean(result?.ok),
    message: result?.error ?? result?.message ?? "Friend request sent.",
    status: result?.status,
  };
}

export async function respondToRequest(
  supabase: SupabaseClient,
  id: string,
  accept: boolean,
) {
  const { data, error } = await supabase.rpc("respond_friend_request", {
    p_id: id,
    p_accept: accept,
  });
  if (error) {
    // Fallback for a database without the updated function: accept the row you
    // received, or delete either direction (a requester cancelling their own
    // outgoing request is a delete too — the old RPC silently no-opped there).
    if (accept) {
      const { error: updateError } = await supabase
        .from("friendships")
        .update({ status: "accepted", responded_at: new Date().toISOString() })
        .eq("id", id);
      return !updateError;
    }
    const { error: deleteError } = await supabase.from("friendships").delete().eq("id", id);
    return !deleteError;
  }
  return Boolean((data as { ok?: boolean })?.ok);
}

export async function removeFriend(supabase: SupabaseClient, otherUserId: string) {
  const { error } = await supabase.rpc("remove_friend", { p_other: otherUserId });
  if (error) {
    const { data: auth } = await supabase.auth.getUser();
    const me = auth.user?.id;
    if (!me) return false;
    await supabase
      .from("friendships")
      .delete()
      .or(
        `and(requester_id.eq.${me},addressee_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},addressee_id.eq.${me})`,
      );
  }
  return true;
}

/* --------------------------------- DMs --------------------------------- */

export async function fetchDmChannels(supabase: SupabaseClient): Promise<DmChannel[]> {
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me) return [];

  const { data, error } = await supabase
    .from("dm_channels")
    .select(
      `id, user_a, user_b, pair_key, created_at, last_message_at,
       a:profiles!dm_channels_user_a_fkey(${AUTHOR_FIELDS}, custom_status, custom_status_emoji, custom_status_started_at, status),
       b:profiles!dm_channels_user_b_fkey(${AUTHOR_FIELDS}, custom_status, custom_status_emoji, custom_status_started_at, status)`,
    )
    .or(`user_a.eq.${me},user_b.eq.${me}`)
    .order("last_message_at", { ascending: false });

  if (error || !data) return [];

  const channels: DmChannel[] = (data as unknown as (DmChannel & {
    a: DmChannel["peer"];
    b: DmChannel["peer"];
  })[]).map((row) => {
    const peer = row.user_a === me ? row.b : row.a;
    return { ...row, peer: peer ?? null };
  });

  // Attach the latest message + unread count per channel.
  await Promise.all(
    channels.map(async (channel) => {
      const [{ data: last }, { count }] = await Promise.all([
        supabase
          .from("direct_messages")
          .select("content, created_at, author_id")
          .eq("dm_channel_id", channel.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("direct_messages")
          .select("id", { count: "exact", head: true })
          .eq("dm_channel_id", channel.id)
          .neq("author_id", me)
          .is("read_at", null),
      ]);
      channel.last_message = last ?? null;
      channel.unread_count = count ?? 0;
    }),
  );

  return channels;
}

export async function ensureDmChannel(supabase: SupabaseClient, otherUserId: string) {
  const { data, error } = await supabase.rpc("ensure_dm_channel", { p_other: otherUserId });
  if (!error && data) return data as string;

  // Client-side fallback: compute the deterministic pair key ourselves.
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me) return null;

  const [lo, hi] = me < otherUserId ? [me, otherUserId] : [otherUserId, me];
  const key = `${lo}:${hi}`;

  const { data: existing } = await supabase
    .from("dm_channels")
    .select("id")
    .eq("pair_key", key)
    .maybeSingle<{ id: string }>();
  if (existing) return existing.id;

  const { data: created, error: insertError } = await supabase
    .from("dm_channels")
    .insert({ user_a: lo, user_b: hi, pair_key: key })
    .select("id")
    .single<{ id: string }>();
  if (insertError || !created) return null;
  return created.id;
}

export async function fetchDirectMessages(
  supabase: SupabaseClient,
  dmChannelId: string,
): Promise<DirectMessage[]> {
  const { data } = await supabase
    .from("direct_messages")
    .select(`id, dm_channel_id, author_id, content, created_at, edited_at, read_at, attachments, author:profiles(${AUTHOR_FIELDS})`)
    .eq("dm_channel_id", dmChannelId)
    .order("created_at", { ascending: false })
    .limit(100);
  return ((data ?? []) as unknown as DirectMessage[]).reverse();
}

export async function sendDirectMessage(
  supabase: SupabaseClient,
  dmChannelId: string,
  authorId: string,
  content: string,
  attachments: Attachment[] = [],
) {
  const { data, error } = await supabase
    .from("direct_messages")
    .insert({ dm_channel_id: dmChannelId, author_id: authorId, content, attachments })
    .select(`id, dm_channel_id, author_id, content, created_at, edited_at, read_at, attachments, author:profiles(${AUTHOR_FIELDS})`)
    .single<DirectMessage>();
  if (error) return null;
  return data;
}

export async function markDmRead(supabase: SupabaseClient, dmChannelId: string, meId: string) {
  await supabase
    .from("direct_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("dm_channel_id", dmChannelId)
    .neq("author_id", meId)
    .is("read_at", null);
}

/* ------------------------------- settings ------------------------------ */

export type ProfilePatch = Partial<
  Pick<
    Profile,
    | "display_name"
    | "bio"
    | "avatar_url"
    | "accent_color"
    | "banner_color"
    | "custom_status"
    | "custom_status_emoji"
    | "custom_status_started_at"
    | "theme_id"
    | "message_density"
    | "reduce_motion"
    | "reduced_saturation"
    | "font_scale"
    | "dm_privacy"
    | "message_filter"
    | "notify_direct_messages"
    | "notify_server_messages"
    | "notify_friend_requests"
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
    | "appearance"
    | "bt_pro"
  >
>;

export async function updateProfile(supabase: SupabaseClient, userId: string, patch: ProfilePatch) {
  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .select(PROFILE_FIELDS)
    .maybeSingle<Profile>();
  return { profile: data, error: error?.message ?? null };
}

/**
 * Upload an avatar into the public `avatars` bucket.
 *
 * Object paths are always `<userId>/<file>` so the storage policy
 * `(storage.foldername(name))[1] = auth.uid()` accepts the write. Every
 * failure is turned into a sentence a person can act on — the caller shows it
 * verbatim instead of a generic "Avatar upload failed".
 */
export async function uploadAvatar(
  supabase: SupabaseClient,
  userId: string,
  file: File,
): Promise<{ url: string | null; error: string | null }> {
  return uploadToBucket(supabase, "avatars", userId, "avatar", file);
}

/** Upload a banner into the public `banners` bucket. */
export async function uploadBanner(
  supabase: SupabaseClient,
  userId: string,
  file: File,
): Promise<{ url: string | null; error: string | null }> {
  return uploadToBucket(supabase, "banners", userId, "banner", file);
}

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"];

async function uploadToBucket(
  supabase: SupabaseClient,
  bucket: "avatars" | "banners" | "server-icons",
  userId: string,
  prefix: string,
  file: File,
): Promise<{ url: string | null; error: string | null }> {
  if (!file || file.size === 0) return { url: null, error: "That file is empty." };
  if (file.size > 8 * 1024 * 1024) {
    return { url: null, error: "Images must be 8 MB or smaller." };
  }
  if (file.type && !IMAGE_TYPES.includes(file.type)) {
    return { url: null, error: "Use a PNG, JPEG, WebP, GIF or AVIF image." };
  }

  const ext =
    file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
    (file.type.split("/")[1] ?? "png");
  // A stable filename keeps the URL cache-friendly while the timestamp busts it.
  const path = `${userId}/${prefix}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "31536000",
    upsert: true,
    contentType: file.type || "image/png",
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("bucket not found")) {
      return { url: null, error: `The \`${bucket}\` bucket is missing — run the storage migration.` };
    }
    if (message.includes("row-level security") || message.includes("unauthorized")) {
      return { url: null, error: "Storage rejected the upload. Sign out and back in, then retry." };
    }
    if (message.includes("payload too large") || message.includes("exceeded")) {
      return { url: null, error: "That image is too large for the bucket limit." };
    }
    return { url: null, error: error.message };
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  if (!data?.publicUrl) return { url: null, error: "Could not build a public URL for that image." };
  return { url: data.publicUrl, error: null };
}

export async function updateUsername(
  supabase: SupabaseClient,
  userId: string,
  username: string,
): Promise<{ ok: boolean; message: string }> {
  const cleaned = username.trim().toLowerCase();
  if (!/^[a-z0-9_.]{2,24}$/.test(cleaned)) {
    return {
      ok: false,
      message: "Usernames need 2–24 lowercase letters, numbers, dots or underscores.",
    };
  }
  const { data: taken } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", cleaned)
    .neq("id", userId)
    .maybeSingle<{ id: string }>();
  if (taken) return { ok: false, message: "That username is already taken." };

  const { error } = await supabase
    .from("profiles")
    .update({ username: cleaned })
    .eq("id", userId);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Username updated." };
}

export async function changeEmail(
  supabase: SupabaseClient,
  email: string,
): Promise<{ ok: boolean; message: string }> {
  const { error } = await supabase.auth.updateUser({ email });
  if (error) return { ok: false, message: error.message };
  return {
    ok: true,
    message: "Check your inbox — we sent a confirmation link to the new address.",
  };
}

export async function changePassword(
  supabase: SupabaseClient,
  password: string,
): Promise<{ ok: boolean; message: string }> {
  if (password.length < 8) {
    return { ok: false, message: "Use at least 8 characters." };
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Password updated." };
}

export async function listSessions(supabase: SupabaseClient) {
  const { data, error } = await supabase.auth.getSession();
  if (error) return [];
  const session = data.session;
  if (!session) return [];
  return [
    {
      id: session.access_token.slice(-12),
      user_agent: navigator.userAgent,
      created_at: new Date((session.expires_at ?? 0) * 1000 - 3600_000).toISOString(),
      last_seen: new Date().toISOString(),
      current: true,
    },
  ];
}

/* ---------------------- profile card customization --------------------- */

/** Merge the stored JSONB blob into the profile row so callers see one shape. */
export function normalizeProfile<T extends Profile | null | undefined>(row: T): T {
  if (!row) return row;
  return {
    ...row,
    connections: Array.isArray(row.connections) ? row.connections : [],
    widgets: Array.isArray(row.widgets) ? row.widgets : [],
    user_settings: row.user_settings ?? {},
    appearance: row.appearance ?? null,
  } as T;
}

export async function fetchProfileCard(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_FIELDS)
    .eq("id", userId)
    .maybeSingle<Profile>();
  if (error || !data) return null;
  return normalizeProfile(data);
}

export async function saveProfileCard(
  supabase: SupabaseClient,
  userId: string,
  patch: {
    display_name?: string;
    bio?: string | null;
    pronouns?: string | null;
    server_tag?: string | null;
    avatar_url?: string | null;
    banner_color?: string;
    banner_url?: string | null;
    theme_primary?: string | null;
    theme_secondary?: string | null;
    avatar_decoration?: string;
    profile_effect?: string;
    name_style?: string;
    nameplate?: string;
    connections?: ProfileConnection[];
    widgets?: ProfileWidget[];
    custom_status?: string | null;
    custom_status_emoji?: string | null;
    custom_status_started_at?: string | null;
  },
) {
  return updateProfile(supabase, userId, patch as ProfilePatch);
}

export async function exportAccountData(supabase: SupabaseClient) {
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me) return null;

  const [profile, messages, dms, friendships, blocks] = await Promise.all([
    supabase.from("profiles").select(PROFILE_FIELDS).eq("id", me).maybeSingle(),
    supabase
      .from("messages")
      .select("id, channel_id, content, created_at, edited_at")
      .eq("author_id", me)
      .order("created_at", { ascending: true }),
    supabase
      .from("direct_messages")
      .select("id, dm_channel_id, content, created_at")
      .eq("author_id", me)
      .order("created_at", { ascending: true }),
    supabase.from("friendships").select("*").or(`requester_id.eq.${me},addressee_id.eq.${me}`),
    supabase.from("blocked_users").select("blocked_id, created_at").eq("blocker_id", me),
  ]);

  return {
    exported_at: new Date().toISOString(),
    account: {
      id: me,
      email: auth.user?.email ?? null,
      created_at: auth.user?.created_at ?? null,
    },
    profile: profile.data ?? null,
    messages: messages.data ?? [],
    direct_messages: dms.data ?? [],
    friendships: friendships.data ?? [],
    blocked_users: blocks.data ?? [],
  };
}

/* --------------------------- blocked users ---------------------------- */

export async function fetchBlockedUsers(supabase: SupabaseClient): Promise<BlockedUser[]> {
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me) return [];

  const { data, error } = await supabase
    .from("blocked_users")
    .select(`id:blocked_id, blocked_id, created_at, profile:profiles!blocked_users_blocked_id_fkey(${AUTHOR_FIELDS}, status)`)
    .eq("blocker_id", me)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as unknown as BlockedUser[];
}

export async function blockUser(supabase: SupabaseClient, userId: string) {
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me || me === userId) return false;
  const { error } = await supabase
    .from("blocked_users")
    .insert({ blocker_id: me, blocked_id: userId });
  // 23505 = already blocked, which is fine.
  return !error || error.code === "23505";
}

export async function unblockUser(supabase: SupabaseClient, userId: string) {
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me) return false;
  const { error } = await supabase
    .from("blocked_users")
    .delete()
    .eq("blocker_id", me)
    .eq("blocked_id", userId);
  return !error;
}

/* ------------------------- user settings blob ------------------------- */

export async function fetchUserSettings(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserSettings> {
  const { data } = await supabase
    .from("profiles")
    .select("user_settings")
    .eq("id", userId)
    .maybeSingle<{ user_settings: UserSettings | null }>();
  return data?.user_settings ?? {};
}

export async function saveUserSettings(
  supabase: SupabaseClient,
  userId: string,
  next: UserSettings,
) {
  const { error } = await supabase
    .from("profiles")
    .update({ user_settings: next })
    .eq("id", userId);
  return { error: error?.message ?? null };
}
