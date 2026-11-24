import type { SupabaseClient } from "@supabase/supabase-js";
import type { DirectMessage, GroupDm, MessageAuthor } from "./types.ts";

/**
 * Group DMs live in their own tables (`group_dms` / `group_dm_members` /
 * `group_messages`) because `dm_channels` enforces `user_a < user_b` for 1:1
 * pairs and can't represent N participants.
 */

const GROUP_SELECT = `
  id, owner_id, name, icon_url, created_at, last_message_at,
  group_dm_members(user_id, joined_at, last_read_at, profile:profiles(id, username, display_name, avatar_url, accent_color, status)),
  group_messages(content, created_at, author_id)
`;

type RawGroup = {
  id: string;
  owner_id: string;
  name: string | null;
  icon_url: string | null;
  created_at: string;
  last_message_at: string;
  group_dm_members?: {
    user_id: string;
    last_read_at: string | null;
    profile: MessageAuthor | null;
  }[];
  group_messages?: { content: string; created_at: string; author_id: string }[];
};

function shapeGroup(row: RawGroup, viewerId: string): GroupDm {
  const members = (row.group_dm_members ?? [])
    .map((m) => m.profile)
    .filter((p): p is MessageAuthor => Boolean(p));
  const last = (row.group_messages ?? [])[0] ?? null;
  const mine = (row.group_dm_members ?? []).find((m) => m.user_id === viewerId);
  const unread =
    last && mine?.last_read_at
      ? new Date(last.created_at) > new Date(mine.last_read_at) && last.author_id !== viewerId
        ? 1
        : 0
      : last && last.author_id !== viewerId
        ? 1
        : 0;

  return {
    id: row.id,
    owner_id: row.owner_id,
    name: row.name,
    icon_url: row.icon_url,
    created_at: row.created_at,
    last_message_at: row.last_message_at,
    members,
    last_message: last,
    unread_count: unread,
  };
}

export async function fetchGroupDms(
  supabase: SupabaseClient,
  viewerId: string,
): Promise<GroupDm[]> {
  const { data, error } = await supabase
    .from("group_dms")
    .select(GROUP_SELECT)
    .order("last_message_at", { ascending: false })
    .limit(30);

  if (error || !data) return [];
  return (data as unknown as RawGroup[]).map((row) => shapeGroup(row, viewerId));
}

export async function fetchGroupMessages(
  supabase: SupabaseClient,
  groupId: string,
): Promise<DirectMessage[]> {
  const { data } = await supabase
    .from("group_messages")
    .select(
      `id, group_id, author_id, content, created_at,
       author:profiles(id, username, display_name, avatar_url, accent_color)`,
    )
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(80);

  return ((data ?? []) as unknown as (DirectMessage & { group_id: string })[])
    .map((row) => ({ ...row, dm_channel_id: row.group_id }))
    .reverse();
}

export async function createGroupDm(
  supabase: SupabaseClient,
  ownerId: string,
  memberIds: string[],
  name?: string,
  iconUrl?: string | null,
): Promise<{ group: GroupDm | null; error: string | null }> {
  const unique = Array.from(new Set(memberIds.filter((id) => id !== ownerId))).slice(0, 9);

  const { data: created, error } = await supabase
    .from("group_dms")
    .insert({ owner_id: ownerId, name: name?.trim() || null, icon_url: iconUrl ?? null })
    .select("id, owner_id, name, icon_url, created_at, last_message_at")
    .maybeSingle<Omit<GroupDm, "members" | "last_message">>();

  if (error || !created) {
    return { group: null, error: error?.message ?? "Could not create the group." };
  }

  // The RLS insert policy checks membership, so the owner row must land first.
  const rows = [ownerId, ...unique].map((userId) => ({
    group_id: created.id,
    user_id: userId,
  }));
  await supabase.from("group_dm_members").insert(rows);

  const groups = await fetchGroupDms(supabase, ownerId);
  const found = groups.find((g) => g.id === created.id) ?? null;

  if (!found) {
    return {
      group: { ...created, members: [], last_message: null },
      error: null,
    };
  }
  return { group: found, error: null };
}

export async function addGroupMembers(
  supabase: SupabaseClient,
  groupId: string,
  userIds: string[],
) {
  const { error } = await supabase
    .from("group_dm_members")
    .insert(userIds.map((userId) => ({ group_id: groupId, user_id: userId })));
  return { error: error?.message ?? null };
}

export async function updateGroupDm(
  supabase: SupabaseClient,
  groupId: string,
  patch: { name?: string | null; icon_url?: string | null },
) {
  const { error } = await supabase.from("group_dms").update(patch).eq("id", groupId);
  return { error: error?.message ?? null };
}

export async function sendGroupMessage(
  supabase: SupabaseClient,
  groupId: string,
  authorId: string,
  content: string,
) {
  const { data, error } = await supabase
    .from("group_messages")
    .insert({ group_id: groupId, author_id: authorId, content })
    .select(
      `id, group_id, author_id, content, created_at,
       author:profiles(id, username, display_name, avatar_url, accent_color)`,
    )
    .maybeSingle<DirectMessage & { group_id: string }>();

  if (error || !data) return null;
  return { ...data, dm_channel_id: data.group_id };
}

export async function markGroupRead(
  supabase: SupabaseClient,
  groupId: string,
  userId: string,
) {
  await supabase
    .from("group_dm_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("group_id", groupId)
    .eq("user_id", userId);
}

/** Auto-names a group from its members, matching Discord's behaviour. */
export function autoGroupName(
  members: { id: string; display_name?: string | null; username: string }[],
  viewerId: string,
): string {
  const others = members
    .filter((m) => m.id !== viewerId)
    .map((m) => m.display_name || m.username);
  if (others.length === 0) return "Group Message";
  if (others.length <= 3) return others.join(", ");
  return `${others.slice(0, 3).join(", ")} +${others.length - 3}`;
}
