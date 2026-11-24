"use client";

import { useMemo, useState } from "react";
import { Avatar } from "@/components/avatar";
import { CopyIcon, CheckIcon, CloseIcon, SearchIcon } from "@/components/icons";
import type { ServerMember, VoiceState } from "@/lib/types";

const roleLabel: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

const roleOrder: Record<string, number> = { owner: 0, admin: 1, member: 2 };

export function MemberList({
  members,
  voiceStates,
  viewerId,
  onClose,
  onOpenProfile,
}: {
  members: ServerMember[];
  voiceStates: VoiceState[];
  viewerId: string;
  onClose?: () => void;
  /** Clicking an avatar/name opens that member's profile card. */
  onOpenProfile?: (userId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = members
      .filter((m) => !needle || (m.profile?.display_name ?? "").toLowerCase().includes(needle) || (m.profile?.username ?? "").toLowerCase().includes(needle))
      .sort((a, b) => {
        const role = (roleOrder[a.role] ?? 3) - (roleOrder[b.role] ?? 3);
        if (role !== 0) return role;
        return (a.profile?.display_name ?? "").localeCompare(b.profile?.display_name ?? "");
      });
    return list;
  }, [members, query]);

  const online = filtered.filter((m) => m.profile?.status && m.profile.status !== "offline");
  const offline = filtered.filter((m) => !m.profile?.status || m.profile.status === "offline");

  const voiceByUser = useMemo(() => {
    const map = new Map<string, string>();
    for (const state of voiceStates) {
      if (!map.has(state.user_id)) map.set(state.user_id, state.channel_id);
    }
    return map;
  }, [voiceStates]);

  async function copyUsername(username: string, id: string) {
    try {
      await navigator.clipboard.writeText(`@${username}`);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1400);
    } catch {
      setCopiedId(null);
    }
  }

  return (
    <aside className="glass-panel flex w-60 shrink-0 flex-col border-l border-subtle">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-line/70 px-3">
        <SearchIcon width={14} height={14} className="text-dim" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a member"
          className="w-full bg-transparent text-[12.5px] outline-none placeholder:text-dim"
        />
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close member list"
            className="grid h-6 w-6 shrink-0 place-items-center rounded text-muted transition hover:bg-hover hover:text-bright md:hidden"
          >
            <CloseIcon width={15} height={15} />
          </button>
        )}
      </div>

      <div className="scroll-auto flex-1 overflow-y-auto px-2 py-3">
        <Group label="Online" count={online.length}>
          {online.map((member) => (
            <MemberRow
              key={member.user_id}
              member={member}
              isViewer={member.user_id === viewerId}
              onOpenProfile={onOpenProfile}
              inVoice={voiceByUser.has(member.user_id)}
              copied={copiedId === member.user_id}
              onCopy={() => void copyUsername(member.profile?.username ?? "member", member.user_id)}
            />
          ))}
          {online.length === 0 && <p className="px-2 text-[11px] text-dim">Nobody online</p>}
        </Group>

        {offline.length > 0 && (
          <Group label="Offline" count={offline.length} className="mt-5">
            {offline.map((member) => (
              <MemberRow
                key={member.user_id}
                member={member}
                isViewer={member.user_id === viewerId}
              onOpenProfile={onOpenProfile}
                dim
                inVoice={voiceByUser.has(member.user_id)}
                copied={copiedId === member.user_id}
                onCopy={() => void copyUsername(member.profile?.username ?? "member", member.user_id)}
              />
            ))}
          </Group>
        )}
      </div>

      <div className="border-t border-line/70 px-3 py-2.5">
        <p className="text-[10px] tracking-wide text-dim">
          {members.length} member{members.length === 1 ? "" : "s"} · {voiceStates.length} in voice
        </p>
      </div>
    </aside>
  );
}

function Group({
  label,
  count,
  className = "",
  children,
}: {
  label: string;
  count: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={className}>
      <h3 className="mb-1.5 px-2 text-[10.5px] font-semibold tracking-widest text-dim uppercase">
        {label} — {count}
      </h3>
      <div className="space-y-0.5">{children}</div>
    </section>
  );
}

function MemberRow({
  member,
  isViewer,
  inVoice,
  dim,
  copied,
  onCopy,
  onOpenProfile,
}: {
  member: ServerMember;
  isViewer: boolean;
  inVoice: boolean;
  dim?: boolean;
  copied: boolean;
  onCopy: () => void;
  onOpenProfile?: (userId: string) => void;
}) {
  const profile = member.profile;
  const name = profile?.display_name || profile?.username || "Member";

  return (
    <div
      className={`group flex items-center gap-2 rounded-md px-2 py-1.5 transition hover:bg-hover/60 ${
        dim ? "opacity-45 hover:opacity-80" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => onOpenProfile?.(member.user_id)}
        aria-label={`Open ${name}'s profile`}
        className="shrink-0 rounded-full transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blurple"
      >
        <Avatar
          name={name}
          src={profile?.avatar_url}
          accent={profile?.accent_color}
          size={30}
          status={profile?.status}
        />
      </button>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 truncate text-[12.5px] font-medium text-bright">
          <button
            type="button"
            onClick={() => onOpenProfile?.(member.user_id)}
            className="truncate text-left hover:underline"
          >
            {name}
          </button>
          {isViewer && (
            <span className="shrink-0 rounded border border-line px-1 text-[8.5px] tracking-wide text-dim uppercase">
              you
            </span>
          )}
        </p>
        <p className="truncate text-[10.5px] text-dim">
          {member.role !== "member" ? roleLabel[member.role] : `@${profile?.username ?? "member"}`}
          {inVoice && <span className="ml-1 text-mint">· in voice</span>}
        </p>
      </div>
      <button
        onClick={onCopy}
        title="Copy username"
        aria-label={`Copy ${profile?.username ?? "username"}`}
        className="grid h-6 w-6 shrink-0 place-items-center rounded text-dim opacity-0 transition group-hover:opacity-100 hover:bg-hover hover:text-bright"
      >
        {copied ? <CheckIcon width={12} height={12} className="text-mint" /> : <CopyIcon width={12} height={12} />}
      </button>
    </div>
  );
}
