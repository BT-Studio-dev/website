"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { MessageContent } from "@/components/message-content";
import { HashIcon, TrashIcon, UsersIcon, SearchIcon } from "@/components/icons";
import { ChatComposer } from "@/components/chat-composer";
import { GlobalSearchButton } from "@/components/global-search-button";
import { formatDayLabel, formatTimestamp, formatTime, sameDay, shouldGroup } from "@/lib/format";
import type { Channel, Message, Profile, Server, ServerMember } from "@/lib/types";

const MAX_LENGTH = 4000;

/** Same layout as the live feed, backed by the in-memory demo store. */
export function DemoMessageFeed({
  server,
  channel,
  messages,
  members,
  profile,
  memberCount,
  canManage,
  onToggleMembers,
  onOpenSearch,
  onSend,
  onDelete,
}: {
  server: Server;
  channel: Channel;
  messages: Message[];
  members: ServerMember[];
  profile: Profile;
  memberCount: number;
  canManage: boolean;
  onToggleMembers: () => void;
  /** Opens the global Quick Switcher. */
  onOpenSearch?: () => void;
  onSend: (content: string) => void;
  onDelete: (id: string) => void;
}) {
  const [, setDraft] = useState("");
  const [search, setSearch] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const membersById = useMemo(() => {
    const map = new Map<string, { name: string; username: string; avatar: string | null; accent: string | null }>();
    for (const member of members) {
      if (!member.profile) continue;
      map.set(member.user_id, {
        name: member.profile.display_name || member.profile.username,
        username: member.profile.username,
        avatar: member.profile.avatar_url,
        accent: member.profile.accent_color,
      });
    }
    return map;
  }, [members]);

  const filtered = useMemo(() => {
    if (!search?.trim()) return messages;
    const needle = search.trim().toLowerCase();
    return messages.filter((m) => m.content.toLowerCase().includes(needle));
  }, [messages, search]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [channel.id, messages.length]);

  function submit(explicit?: string) {
    const content = (explicit ?? "").trim();
    if (!content) return;
    onSend(content);
    setDraft("");
    inputRef.current?.focus();
  }

  return (
    <section className="ambient-stage flex min-w-0 flex-1 flex-col">
      <header className="glass-bar flex h-12 min-w-0 shrink-0 items-center gap-2 overflow-hidden border-b px-4">
        <HashIcon width={18} height={18} className="shrink-0 text-muted" />
        <h2 className="truncate text-[14.5px] font-semibold tracking-tight text-bright">
          {channel.name}
        </h2>
        {channel.topic && (
          <>
            <span className="mx-1 h-4 w-px shrink-0 bg-line" />
            <p className="hidden min-w-0 truncate text-[12.5px] text-dim md:block">{channel.topic}</p>
          </>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <span className="mr-1 flex items-center gap-1.5 rounded-full border border-amber/30 bg-amber/10 px-2 py-1 text-[10px] font-medium tracking-wide text-amber">
            <span className="h-1.5 w-1.5 rounded-full bg-amber" />
            DEMO
          </span>
          {onOpenSearch && (
            <GlobalSearchButton
              label={channel.name}
              onOpen={onOpenSearch}
              className="hidden lg:flex"
            />
          )}
          <button
            onClick={() => setSearch((v) => (v === null ? "" : null))}
            aria-label="Search this channel"
            className={`grid h-8 w-8 place-items-center rounded-md transition ${
              search !== null ? "bg-hover text-bright" : "text-muted hover:bg-hover/70 hover:text-bright"
            }`}
          >
            <SearchIcon width={17} height={17} />
          </button>
          <button
            onClick={onToggleMembers}
            aria-label="Toggle member list"
            className="grid h-8 w-8 place-items-center rounded-md text-muted transition hover:bg-hover/70 hover:text-bright md:hidden"
          >
            <UsersIcon width={17} height={17} />
          </button>
          <button
            onClick={onToggleMembers}
            className="hidden items-center gap-1.5 rounded-md px-2 py-1 text-[12px] text-muted transition hover:bg-hover/70 hover:text-bright md:flex"
          >
            <UsersIcon width={16} height={16} />
            {memberCount}
          </button>
        </div>
      </header>

      {search !== null && (
        <div className="flex items-center gap-2 border-b border-line/70 bg-surface/40 px-4 py-2">
          <SearchIcon width={15} height={15} className="text-dim" />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search messages in this channel…"
            className="w-full bg-transparent text-[13px] outline-none placeholder:text-dim"
          />
          <span className="shrink-0 text-[11px] text-dim">
            {filtered.length} result{filtered.length === 1 ? "" : "s"}
          </span>
        </div>
      )}

      <div ref={scrollRef} className="scroll-auto flex-1 overflow-y-auto px-4 pt-4 pb-2">
        <div className="mb-6 rounded-xl border border-line/70 bg-input/60 px-4 py-5">
          <span className="mb-2 grid h-11 w-11 place-items-center rounded-xl bg-blurple/15 text-blurple-soft">
            <HashIcon width={22} height={22} />
          </span>
          <h3 className="text-lg font-bold tracking-tight">Welcome to #{channel.name}</h3>
          <p className="mt-1 text-[13px] text-muted">
            {channel.topic ?? `This is the start of #${channel.name} in ${server.name}.`}
          </p>
        </div>

        {filtered.length === 0 && (
          <p className="py-8 text-center text-[13px] text-dim">
            {search ? "No messages match that search." : "No messages yet — say hi 👋"}
          </p>
        )}

        {filtered.map((message, index) => {
          const previous = filtered[index - 1];
          const showDay = !previous || !sameDay(previous.created_at, message.created_at);
          const grouped =
            !showDay &&
            previous &&
            previous.author_id === message.author_id &&
            !message.system_author &&
            shouldGroup(previous.created_at, message.created_at);

          const meta = membersById.get(message.author_id ?? "");
          const name =
            message.author?.display_name ?? message.author?.username ?? message.system_author ?? meta?.name ?? "Member";
          const avatarSrc = message.author?.avatar_url ?? meta?.avatar ?? null;
          const accent = message.author?.accent_color ?? meta?.accent ?? null;
          const username = message.author?.username ?? "system";
          const mine = message.author_id === profile.id;
          const isSystem = !message.author_id;

          return (
            <div key={message.id}>
              {showDay && (
                <div className="my-4 flex items-center gap-3" role="separator">
                  <span className="h-px flex-1 bg-line/70" />
                  <span className="rounded-full border border-line/70 bg-void/60 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-dim uppercase">
                    {formatDayLabel(message.created_at)}
                  </span>
                  <span className="h-px flex-1 bg-line/70" />
                </div>
              )}

              <article
                className={`group relative flex gap-3 rounded-md px-1.5 transition-colors hover:bg-hover/25 ${
                  grouped ? "py-0.5" : "mt-3 py-1"
                }`}
              >
                <div className="w-10 shrink-0">
                  {!grouped ? (
                    <Avatar
                      name={name}
                      src={avatarSrc}
                      accent={isSystem ? "#5865f2" : accent}
                      size={40}
                      className="mt-0.5"
                    />
                  ) : (
                    <span className="mt-1 hidden text-[10px] text-dim group-hover:block">
                      {formatTime(message.created_at)}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  {!grouped && (
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span
                        className="text-[14px] font-semibold tracking-tight"
                        style={{ color: isSystem ? "#8ba4ff" : (accent ?? "#f2f4f9") }}
                      >
                        {name}
                      </span>
                      {isSystem && (
                        <span className="rounded bg-blurple/25 px-1 py-px text-[9px] font-bold tracking-wide text-blurple-soft uppercase">
                          System
                        </span>
                      )}
                      <time className="text-[10.5px] text-dim">{formatTimestamp(message.created_at)}</time>
                      {mine && (
                        <span className="rounded border border-line px-1 py-px text-[9px] font-medium tracking-wide text-dim uppercase">
                          You
                        </span>
                      )}
                    </div>
                  )}
                  {!grouped && !isSystem && (
                    <span className="text-[11px] text-dim">@{username}</span>
                  )}
                  <div className="mt-0.5">
                    <MessageContent content={message.content} selfId={profile.id} />
                  </div>
                </div>

                {(mine || canManage) && (
                  <button
                    onClick={() => onDelete(message.id)}
                    title="Delete message"
                    aria-label="Delete message"
                    className="absolute top-1.5 right-2 grid h-7 w-7 place-items-center rounded-md border border-line bg-input text-muted opacity-0 transition group-hover:opacity-100 hover:text-rose"
                  >
                    <TrashIcon width={14} height={14} />
                  </button>
                )}
              </article>
            </div>
          );
        })}
      </div>

      <div className="shrink-0 px-4 pb-4">
        <ChatComposer
          placeholder={`Message #${channel.name}`}
          ariaLabel={`Message #${channel.name}`}
          onSubmit={(content) => submit(content)}
          members={members.map((m) => m.profile).filter(Boolean) as Profile[]}
          selfId={profile.id}
        />
      </div>
    </section>
  );
}
