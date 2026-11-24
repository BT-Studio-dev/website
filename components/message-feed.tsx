"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Avatar } from "@/components/avatar";
import { MessageContent } from "@/components/message-content";
import { HashIcon, SendIcon, TrashIcon, UsersIcon, SearchIcon } from "@/components/icons";
import { formatDayLabel, formatTimestamp, sameDay, shouldGroup, formatTime } from "@/lib/format";
import type { Channel, Message, Profile, Server, ServerMember } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_LENGTH = 4000;

export function MessageFeed({
  supabase,
  server,
  channel,
  initialMessages,
  profile,
  memberCount,
  members,
  canManage,
  onToggleMembers,
  onOpenMemberList,
}: {
  supabase: SupabaseClient;
  server: Server;
  channel: Channel;
  initialMessages: Message[];
  profile: Profile;
  memberCount: number;
  members: ServerMember[];
  canManage: boolean;
  onToggleMembers: () => void;
  onOpenMemberList: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [typing, setTyping] = useState<Record<string, { name: string; at: number }>>({});
  const [search, setSearch] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pinnedToBottom = useRef(true);
  const channelRef = useRef(channel.id);

  const membersById = useMemo(() => {
    const map = new Map<
      string,
      { name: string; username: string; avatar: string | null; accent: string | null }
    >();
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
    return messages.filter(
      (m) =>
        m.content.toLowerCase().includes(needle) ||
        (m.author?.display_name ?? m.system_author ?? "").toLowerCase().includes(needle),
    );
  }, [messages, search]);

  // Reset when switching channels (the parent remounts, but be defensive).
  useEffect(() => {
    if (channelRef.current !== channel.id) {
      channelRef.current = channel.id;
      setMessages(initialMessages);
      setSearch(null);
    }
  }, [channel.id, initialMessages]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior });
  }, []);

  useLayoutEffect(() => {
    scrollToBottom();
    pinnedToBottom.current = true;
  }, [channel.id, scrollToBottom]);

  // ---- Realtime subscription ----------------------------------------------
  useEffect(() => {
    const channelName = `messages:${channel.id}`;
    const sub = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channel.id}`,
        },
        async (payload) => {
          const incoming = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev;
            const optimisticIndex = prev.findIndex(
              (m) => m.id.startsWith("tmp-") && m.content === incoming.content,
            );
            if (optimisticIndex >= 0) {
              const next = [...prev];
              next[optimisticIndex] = incoming;
              return next;
            }
            return [...prev, incoming];
          });

          if (incoming.author_id && incoming.author_id !== profile.id && !incoming.author) {
            const authorId = incoming.author_id;
            const known = membersById.get(authorId);
            let author: Message["author"] = known
              ? {
                  id: authorId,
                  username: known.username ?? "member",
                  display_name: known.name,
                  avatar_url: known.avatar,
                  accent_color: known.accent,
                }
              : null;

            if (!author) {
              const { data } = await supabase
                .from("profiles")
                .select("id, username, display_name, avatar_url, accent_color")
                .eq("id", authorId)
                .maybeSingle();
              if (data) author = data as NonNullable<Message["author"]>;
            }

            if (author) {
              const resolved = author;
              setMessages((prev) =>
                prev.map((m) => (m.id === incoming.id ? { ...m, author: resolved } : m)),
              );
            }
          }

          if (pinnedToBottom.current) {
            requestAnimationFrame(() => scrollToBottom("smooth"));
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channel.id}`,
        },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? { ...m, ...updated, author: m.author } : m)),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channel.id}`,
        },
        (payload) => {
          const removed = payload.old as { id?: string };
          if (!removed?.id) return;
          setMessages((prev) => prev.filter((m) => m.id !== removed.id));
        },
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    return () => {
      void supabase.removeChannel(sub);
    };
  }, [supabase, channel.id, profile.id, membersById, scrollToBottom]);

  // ---- Typing indicator (broadcast, ephemeral) ----------------------------
  useEffect(() => {
    const typingChannel = supabase.channel(`typing:${channel.id}`, {
      config: { broadcast: { self: false } },
    });

    typingChannel
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const p = payload as { userId: string; name: string };
        if (!p?.userId || p.userId === profile.id) return;
        setTyping((prev) => ({ ...prev, [p.userId]: { name: p.name, at: Date.now() } }));
      })
      .subscribe();

    const interval = setInterval(() => {
      setTyping((prev) => {
        const now = Date.now();
        const next: typeof prev = {};
        let changed = false;
        for (const [key, value] of Object.entries(prev)) {
          if (now - value.at < 4500) next[key] = value;
          else changed = true;
        }
        return changed ? next : prev;
      });
    }, 1200);

    return () => {
      clearInterval(interval);
      void supabase.removeChannel(typingChannel);
    };
  }, [supabase, channel.id, profile.id]);

  const broadcastTyping = useCallback(() => {
    const typingChannel = supabase.channel(`typing:${channel.id}`);
    void typingChannel.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: profile.id, name: profile.display_name },
    });
  }, [supabase, channel.id, profile.id, profile.display_name]);

  // ---- Scroll tracking ----------------------------------------------------
  function handleScroll() {
    const node = scrollRef.current;
    if (!node) return;
    const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
    pinnedToBottom.current = distance < 120;
  }

  // ---- Sending ------------------------------------------------------------
  async function sendMessage() {
    const content = draft.trim();
    if (!content || sending) return;
    if (content.length > MAX_LENGTH) {
      setError(`Messages are capped at ${MAX_LENGTH} characters.`);
      return;
    }

    setSending(true);
    setError(null);

    const tempId = `tmp-${crypto.randomUUID()}`;
    const optimistic: Message = {
      id: tempId,
      channel_id: channel.id,
      author_id: profile.id,
      system_author: null,
      content,
      created_at: new Date().toISOString(),
      edited_at: null,
      author: {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        accent_color: profile.accent_color,
      },
    };

    setMessages((prev) => [...prev, optimistic]);
    setDraft("");
    pinnedToBottom.current = true;
    requestAnimationFrame(() => scrollToBottom("smooth"));

    const { data, error: insertError } = await supabase
      .from("messages")
      .insert({ channel_id: channel.id, author_id: profile.id, content })
      .select(
        `id, channel_id, author_id, system_author, content, created_at, edited_at,
         author:profiles(id, username, display_name, avatar_url, accent_color)`,
      )
      .single<Message>();

    if (insertError) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setDraft(content);
      setError(
        insertError.message.includes("row-level security")
          ? "You don't have permission to post in this channel."
          : "Message failed to send. Please try again.",
      );
    } else if (data) {
      setMessages((prev) =>
        prev.some((m) => m.id === data.id)
          ? prev.filter((m) => m.id !== tempId)
          : prev.map((m) => (m.id === tempId ? data : m)),
      );
    }

    setSending(false);
    inputRef.current?.focus();
  }

  async function deleteMessage(id: string) {
    const snapshot = messages;
    setMessages((prev) => prev.filter((m) => m.id !== id));
    const { error: deleteError } = await supabase.from("messages").delete().eq("id", id);
    if (deleteError) setMessages(snapshot);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  const typingNames = Object.values(typing).map((t) => t.name);

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-panel/25">
      {/* Channel header */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line/70 bg-panel/50 px-4 backdrop-blur">
        <HashIcon width={18} height={18} className="shrink-0 text-muted" />
        <h2 className="truncate text-[14.5px] font-semibold tracking-tight text-bright">
          {channel.name}
        </h2>
        {channel.topic && (
          <>
            <span className="mx-1 h-4 w-px shrink-0 bg-line" />
            <p className="hidden min-w-0 truncate text-[12.5px] text-dim md:block">
              {channel.topic}
            </p>
          </>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <span
            className="mr-1 flex items-center gap-1.5 rounded-full border border-line bg-void/50 px-2 py-1 text-[10px] font-medium tracking-wide text-dim"
            title={live ? "Realtime connected" : "Connecting to realtime…"}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${live ? "bg-mint" : "bg-amber animate-pulse"}`}
            />
            {live ? "LIVE" : "SYNC"}
          </span>

          <button
            onClick={() => setSearch((v) => (v === null ? "" : null))}
            title="Search this channel"
            aria-label="Search this channel"
            className={`grid h-8 w-8 place-items-center rounded-md transition ${
              search !== null
                ? "bg-hover text-bright"
                : "text-muted hover:bg-hover/70 hover:text-bright"
            }`}
          >
            <SearchIcon width={17} height={17} />
          </button>
          <button
            onClick={onToggleMembers}
            title="Toggle member list"
            aria-label="Toggle member list"
            className="grid h-8 w-8 place-items-center rounded-md text-muted transition hover:bg-hover/70 hover:text-bright md:hidden"
          >
            <UsersIcon width={17} height={17} />
          </button>
          <button
            onClick={onOpenMemberList}
            title={`${memberCount} members`}
            className="hidden items-center gap-1.5 rounded-md px-2 py-1 text-[12px] text-muted transition hover:bg-hover/70 hover:text-bright md:flex"
          >
            <UsersIcon width={16} height={16} />
            {memberCount}
          </button>
        </div>
      </header>

      {search !== null && (
        <div className="flex items-center gap-2 border-b border-line/70 bg-panel/40 px-4 py-2">
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

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="scroll-thin flex-1 overflow-y-auto px-4 pt-4 pb-2"
        aria-live="polite"
        aria-label={`Messages in ${channel.name}`}
      >
        <div className="mb-6 rounded-xl border border-line/70 bg-ink/50 px-4 py-5">
          <span className="mb-2 grid h-11 w-11 place-items-center rounded-xl bg-blurple/15 text-blurple-soft">
            <HashIcon width={22} height={22} />
          </span>
          <h3 className="text-lg font-bold tracking-tight">
            Welcome to #{channel.name}
          </h3>
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
          const showDay =
            !previous || !sameDay(previous.created_at, message.created_at);
          const grouped =
            !showDay &&
            previous &&
            previous.author_id === message.author_id &&
            !message.system_author &&
            shouldGroup(previous.created_at, message.created_at);

          const name =
            message.author?.display_name ??
            message.author?.username ??
            message.system_author ??
            membersById.get(message.author_id ?? "")?.name ??
            "Member";
          const avatarSrc =
            message.author?.avatar_url ??
            membersById.get(message.author_id ?? "")?.avatar ??
            null;
          const accent =
            message.author?.accent_color ??
            membersById.get(message.author_id ?? "")?.accent ??
            null;
          const username = message.author?.username ?? "system";
          const mine = message.author_id === profile.id;
          const isSystem = !message.author_id;
          const isPending = message.id.startsWith("tmp-");

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
                } ${isPending ? "opacity-60" : ""}`}
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
                      <time
                        dateTime={message.created_at}
                        className="text-[10.5px] text-dim"
                        title={new Date(message.created_at).toLocaleString()}
                      >
                        {formatTimestamp(message.created_at)}
                      </time>
                      {mine && (
                        <span className="rounded border border-line px-1 py-px text-[9px] font-medium tracking-wide text-dim uppercase">
                          You
                        </span>
                      )}
                    </div>
                  )}

                  {!grouped && !isSystem && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-dim">@{username}</span>
                    </div>
                  )}

                  <div className="mt-0.5">
                    <MessageContent content={message.content} />
                    {isPending && (
                      <span className="mt-0.5 block text-[10px] text-dim">Sending…</span>
                    )}
                  </div>
                </div>

                {(mine || canManage) && !isPending && (
                  <button
                    onClick={() => void deleteMessage(message.id)}
                    title="Delete message"
                    aria-label="Delete message"
                    className="absolute top-1.5 right-2 grid h-7 w-7 place-items-center rounded-md border border-line bg-ink text-muted opacity-0 transition group-hover:opacity-100 hover:text-rose"
                  >
                    <TrashIcon width={14} height={14} />
                  </button>
                )}
              </article>
            </div>
          );
        })}
      </div>

      {/* Composer */}
      <div className="shrink-0 px-4 pb-4">
        {error && (
          <p
            role="alert"
            className="mb-2 flex items-center justify-between rounded-lg border border-rose/30 bg-rose/10 px-3 py-1.5 text-[12px] text-rose"
          >
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-3 text-[11px] underline opacity-70 hover:opacity-100"
            >
              dismiss
            </button>
          </p>
        )}

        <div className="rounded-xl border border-line bg-ink/90 transition focus-within:border-blurple/50 focus-within:ring-2 focus-within:ring-blurple/15">
          <div className="flex items-end gap-2 px-3 py-2">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                if (e.target.value.trim()) broadcastTyping();
              }}
              onKeyDown={handleKeyDown}
              rows={1}
              maxLength={MAX_LENGTH}
              placeholder={`Message #${channel.name}`}
              aria-label={`Message #${channel.name}`}
              className="scroll-thin max-h-40 min-h-[26px] w-full resize-none bg-transparent py-1 text-[14px] leading-relaxed outline-none placeholder:text-dim"
              style={{
                height: `${Math.min(160, Math.max(26, draft.split("\n").length * 22))}px`,
              }}
            />
            <button
              onClick={() => void sendMessage()}
              disabled={!draft.trim() || sending}
              aria-label="Send message"
              title="Send (Enter)"
              className="mb-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blurple text-white transition hover:bg-blurple-soft disabled:cursor-not-allowed disabled:bg-raised disabled:text-dim"
            >
              <SendIcon width={16} height={16} />
            </button>
          </div>

          <div className="flex items-center justify-between border-t border-line/60 px-3 py-1.5">
            <p className="text-[10px] text-dim">
              <span className="font-semibold">Enter</span> to send ·{" "}
              <span className="font-semibold">Shift + Enter</span> for a new line ·{" "}
              <span className="font-mono">**bold**</span>{" "}
              <span className="font-mono">`code`</span>
            </p>
            {draft.length > MAX_LENGTH * 0.8 && (
              <p
                className={`text-[10px] ${
                  draft.length >= MAX_LENGTH ? "text-rose" : "text-amber"
                }`}
              >
                {draft.length}/{MAX_LENGTH}
              </p>
            )}
          </div>
        </div>

        <div className="mt-1.5 h-4 px-1">
          {typingNames.length > 0 && (
            <p className="truncate text-[11px] text-muted">
              <span className="inline-flex gap-0.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1 w-1 animate-bounce rounded-full bg-muted"
                    style={{ animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </span>{" "}
              {typingNames.slice(0, 3).join(", ")}{" "}
              {typingNames.length === 1 ? "is" : "are"} typing…
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
