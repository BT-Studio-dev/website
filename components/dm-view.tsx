"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { MessageContent } from "@/components/message-content";
import { SendIcon, PhoneIcon, SearchIcon, TrashIcon } from "@/components/icons";
import { formatDayLabel, formatTimestamp, formatTime, sameDay, shouldGroup } from "@/lib/format";
import type { DirectMessage, DmChannel, MessageAuthor, Presence, Profile } from "@/lib/types";

export function DmView({
  channel,
  messages,
  profile,
  onSend,
  onDelete,
}: {
  channel: DmChannel;
  messages: DirectMessage[];
  profile: Profile;
  onSend: (content: string) => void;
  onDelete: (id: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const peer = channel.peer as (MessageAuthor & { custom_status?: string | null; status?: string }) | null;
  const peerName = peer?.display_name || peer?.username || "Conversation";

  const filtered = useMemo(() => {
    if (!search?.trim()) return messages;
    const needle = search.trim().toLowerCase();
    return messages.filter((m) => m.content.toLowerCase().includes(needle));
  }, [messages, search]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [channel.id]);

  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages.length]);

  function submit() {
    const content = draft.trim();
    if (!content) return;
    onSend(content);
    setDraft("");
    inputRef.current?.focus();
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-panel/25">
      <header className="flex h-12 shrink-0 items-center gap-2.5 border-b border-line/60 px-4">
        <Avatar
          name={peerName}
          src={peer?.avatar_url}
          accent={peer?.accent_color}
          size={26}
          status={(peer?.status as Presence) ?? "offline"}
        />
        <div className="min-w-0">
          <h2 className="truncate text-[14.5px] font-semibold tracking-tight text-bright">
            {peerName}
          </h2>
          {peer?.custom_status && (
            <p className="truncate text-[11px] text-dim">{peer.custom_status}</p>
          )}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <button
            onClick={() => setSearch((v) => (v === null ? "" : null))}
            title="Search conversation"
            aria-label="Search conversation"
            className={`grid h-8 w-8 place-items-center rounded-md transition ${
              search !== null ? "bg-hover text-bright" : "text-muted hover:bg-hover/70 hover:text-bright"
            }`}
          >
            <SearchIcon width={17} height={17} />
          </button>
          <button
            title="Start voice call"
            aria-label="Start voice call"
            className="grid h-8 w-8 place-items-center rounded-md text-muted transition hover:bg-hover/70 hover:text-bright"
          >
            <PhoneIcon width={16} height={16} />
          </button>
        </div>
      </header>

      {search !== null && (
        <div className="flex items-center gap-2 border-b border-line/60 bg-panel/40 px-4 py-2">
          <SearchIcon width={15} height={15} className="text-dim" />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search this conversation…"
            className="w-full bg-transparent text-[13px] outline-none placeholder:text-dim"
          />
          <span className="shrink-0 text-[11px] text-dim">{filtered.length} results</span>
        </div>
      )}

      <div ref={scrollRef} className="scroll-thin flex-1 overflow-y-auto px-4 pt-4 pb-2">
        <div className="mb-6 flex flex-col items-center rounded-xl border border-line/60 bg-ink/40 px-4 py-6 text-center">
          <Avatar
            name={peerName}
            src={peer?.avatar_url}
            accent={peer?.accent_color}
            size={64}
            status={(peer?.status as Presence) ?? "offline"}
          />
          <h3 className="mt-3 text-lg font-bold tracking-tight text-bright">{peerName}</h3>
          <p className="text-[12.5px] text-dim">@{peer?.username}</p>
          <p className="mt-1.5 max-w-sm text-[12.5px] text-muted">
            This is the beginning of your direct message history with{" "}
            <span className="font-semibold text-bright">{peerName}</span>.
          </p>
        </div>

        {filtered.length === 0 && (
          <p className="py-6 text-center text-[13px] text-dim">
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
            shouldGroup(previous.created_at, message.created_at);
          const mine = message.author_id === profile.id;
          const name = message.author?.display_name || message.author?.username || (mine ? profile.display_name : peerName);

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
                className={`group relative flex gap-3 rounded-md px-1.5 transition-colors hover:bg-hover/25 density-row ${
                  grouped ? "" : "mt-3"
                }`}
              >
                <div className="w-10 shrink-0">
                  {!grouped ? (
                    <Avatar
                      name={name}
                      src={message.author?.avatar_url}
                      accent={message.author?.accent_color}
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
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span
                        className="text-[14px] font-semibold tracking-tight"
                        style={{ color: message.author?.accent_color ?? "var(--c-bright)" }}
                      >
                        {name}
                      </span>
                      <time className="text-[10.5px] text-dim">
                        {formatTimestamp(message.created_at)}
                      </time>
                    </div>
                  )}
                  <MessageContent content={message.content} />
                </div>
                {mine && (
                  <button
                    onClick={() => onDelete(message.id)}
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

      <div className="shrink-0 px-4 pb-4">
        <div className="rounded-xl border border-line bg-ink/90 transition focus-within:border-blurple/50 focus-within:ring-2 focus-within:ring-blurple/15">
          <div className="flex items-end gap-2 px-3 py-2">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={1}
              maxLength={4000}
              placeholder={`Message @${peer?.username ?? ""}`}
              aria-label={`Message ${peerName}`}
              className="scroll-thin max-h-40 w-full resize-none bg-transparent py-1 text-[14px] leading-relaxed outline-none placeholder:text-dim"
            />
            <button
              onClick={submit}
              disabled={!draft.trim()}
              aria-label="Send message"
              className="mb-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blurple text-white transition hover:bg-blurple-soft disabled:cursor-not-allowed disabled:bg-raised disabled:text-dim"
            >
              <SendIcon width={16} height={16} />
            </button>
          </div>
          <div className="border-t border-line/60 px-3 py-1.5">
            <p className="text-[10px] text-dim">
              <span className="font-semibold">Enter</span> to send ·{" "}
              <span className="font-semibold">Shift + Enter</span> for a new line
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
