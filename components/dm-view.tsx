"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { ChatComposer, type ComposerApi } from "@/components/chat-composer";
import { AttachmentGrid } from "@/components/attachments";
import { UploadDropzone } from "@/components/upload-dropzone";
import { uploadAttachments } from "@/lib/attachments";
import { MessageContent } from "@/components/message-content";
import { DmProfilePanel } from "@/components/dm-profile-panel";
import {
  BellIcon,
  CloseIcon,
  PhoneIcon,
  SearchIcon,
  TrashIcon,
  UsersIcon,
} from "@/components/icons";
import { formatDayLabel, formatTimestamp, formatTime, sameDay, shouldGroup } from "@/lib/format";
import type { Attachment, DirectMessage, DmChannel, MessageAuthor, Presence, Profile } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export function DmView({
  channel,
  messages,
  profile,
  onSend,
  onDelete,
  supabase,
  onOpenProfile,
  readMarker,
  group,
  onInviteToGroup,
  onEditGroup,
  members,
}: {
  channel: DmChannel;
  messages: DirectMessage[];
  profile: Profile;
  onSend: (content: string, attachments: Attachment[]) => void;
  onDelete: (id: string) => void;
  /** Used to upload attachments to the `chat-attachments` bucket. */
  supabase?: SupabaseClient | null;
  /** Clicking the peer's avatar/name opens their profile card. */
  onOpenProfile?: (userId: string) => void;
  /** Timestamp of the last message the viewer had already read. */
  readMarker?: string | null;
  /** When present the conversation is a group DM. */
  group?: {
    id: string;
    name: string | null;
    icon_url: string | null;
    members: MessageAuthor[];
    owner_id: string;
  } | null;
  onInviteToGroup?: () => void;
  onEditGroup?: () => void;
  members?: MessageAuthor[];
}) {
  const [search, setSearch] = useState<string | null>(null);
  const [composerNote, setComposerNote] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerApi = useRef<ComposerApi | null>(null);

  const peer = channel.peer as (MessageAuthor & { custom_status?: string | null; status?: string }) | null;
  const peerName = peer?.display_name || peer?.username || "Conversation";
  const groupName =
    group?.name ||
    (group?.members ?? [])
      .filter((m) => m.id !== profile.id)
      .map((m) => m.display_name || m.username)
      .join(", ") ||
    "Group Message";

  const filtered = useMemo(() => {
    if (!search?.trim()) return messages;
    const needle = search.trim().toLowerCase();
    return messages.filter(
      (m) =>
        m.content.toLowerCase().includes(needle) ||
        (m.attachments ?? []).some((a) => a.name.toLowerCase().includes(needle)),
    );
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

  // First message newer than the read marker marks the unread boundary.
  const unreadFromId = useMemo(() => {
    if (search) return null;
    const markerTime = readMarker ? new Date(readMarker).getTime() : 0;
    const firstUnread = messages.find(
      (m) => m.author_id !== profile.id && new Date(m.created_at).getTime() > markerTime,
    );
    // Only show the pill when there is older history above it.
    return firstUnread && messages.indexOf(firstUnread) > 0 ? firstUnread.id : null;
  }, [messages, readMarker, profile.id, search]);

  return (
    <section className="ambient-stage flex min-w-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <UploadDropzone
          target={group ? groupName : `@${peer?.username ?? "conversation"}`}
          onFiles={(files) => {
            composerApi.current?.addFiles(files);
            composerApi.current?.focus();
          }}
        >
        {/* header */}
        <header className="glass-bar flex h-12 min-w-0 shrink-0 items-center gap-2.5 overflow-hidden border-b px-4">
          <button
            type="button"
            onClick={() => peer?.id && onOpenProfile?.(peer.id)}
            aria-label={`Open ${group ? groupName : peerName}'s profile`}
            className="shrink-0 rounded-full transition hover:brightness-110"
          >
            {group ? (
              <GroupAvatar group={group} size={26} />
            ) : (
              <Avatar
                name={peerName}
                src={peer?.avatar_url}
                accent={peer?.accent_color}
                size={26}
                status={(peer?.status as Presence) ?? "offline"}
              />
            )}
          </button>
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => peer?.id && onOpenProfile?.(peer.id)}
              className="block max-w-full truncate text-left text-[14.5px] font-semibold tracking-tight text-bright hover:underline"
            >
              {group ? groupName : peerName}
            </button>
            {group ? (
              <p className="truncate text-[11px] text-dim">
                {group.members.length} members
              </p>
            ) : (
              peer?.custom_status && (
                <p className="truncate text-[11px] text-dim">{peer.custom_status}</p>
              )
            )}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            {group && onInviteToGroup && (
              <button
                onClick={onInviteToGroup}
                className="hidden items-center gap-1.5 rounded-md bg-hover/55 px-2.5 py-1 text-[12px] font-semibold text-bright transition hover:bg-hover/60 sm:flex"
              >
                <UsersIcon width={13} height={13} /> Invite
              </button>
            )}
            {group && onEditGroup && (
              <button
                onClick={onEditGroup}
                className="hidden items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-semibold text-muted transition hover:bg-hover/60 hover:text-bright sm:flex"
              >
                Edit Group
              </button>
            )}
            <button
              onClick={() => setSearch((v) => (v === null ? "" : null))}
              title="Search conversation"
              aria-label="Search conversation"
              className={`grid h-8 w-8 place-items-center rounded-md transition ${
                search !== null ? "bg-hover/55 text-bright" : "text-muted hover:bg-hover/60 hover:text-bright"
              }`}
            >
              <SearchIcon width={17} height={17} />
            </button>
            <button
              title="Start voice call"
              aria-label="Start voice call"
              className="grid h-8 w-8 place-items-center rounded-md text-muted transition hover:bg-hover/60 hover:text-bright"
            >
              <PhoneIcon width={16} height={16} />
            </button>
            {!group && (
              <button
                onClick={() => setShowPanel((v) => !v)}
                aria-pressed={showPanel}
                title={showPanel ? "Hide member panel" : "Show member panel"}
                aria-label={showPanel ? "Hide member panel" : "Show member panel"}
                className={`grid h-8 w-8 place-items-center rounded-md transition ${
                  showPanel ? "bg-hover/55 text-bright" : "text-muted hover:bg-hover/60 hover:text-bright"
                }`}
              >
                <UsersIcon width={17} height={17} />
              </button>
            )}
          </div>
        </header>

        {search !== null && (
          <div className="glass-bar flex min-w-0 items-center gap-2 overflow-hidden border-b px-4 py-2">
            <SearchIcon width={15} height={15} className="text-dim" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search this conversation…"
              className="w-full bg-transparent text-[13px] outline-none placeholder:text-dim"
            />
            <span className="shrink-0 text-[11px] text-dim">{filtered.length} results</span>
            <button
              onClick={() => setSearch(null)}
              aria-label="Close search"
              className="grid h-6 w-6 place-items-center rounded text-dim hover:text-bright"
            >
              <CloseIcon width={12} height={12} />
            </button>
          </div>
        )}

        {/* feed */}
        <div ref={scrollRef} className="scroll-auto flex-1 overflow-y-auto px-4 pt-4">
          <div className="mb-6 flex flex-col items-center rounded-xl border border-subtle bg-hover/55 px-4 py-6 text-center backdrop-blur-sm">
            {group ? (
              <GroupAvatar group={group} size={64} />
            ) : (
              <Avatar
                name={peerName}
                src={peer?.avatar_url}
                accent={peer?.accent_color}
                size={64}
                status={(peer?.status as Presence) ?? "offline"}
              />
            )}
            <h3 className="mt-3 text-lg font-bold tracking-tight text-bright">
              {group ? groupName : peerName}
            </h3>
            <p className="text-[12.5px] text-dim">
              {group ? `${group.members.length} members` : `@${peer?.username}`}
            </p>
            <p className="mt-1.5 max-w-sm text-[12.5px] text-muted">
              {group
                ? "This is the beginning of your group conversation."
                : `This is the beginning of your direct message history with ${peerName}.`}
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
            const name =
              message.author?.display_name ||
              message.author?.username ||
              (mine ? profile.display_name : peerName);

            return (
              <div key={message.id}>
                {message.id === unreadFromId && (
                  <div className="my-4 flex items-center gap-2" role="separator" aria-label="New messages">
                    <span className="h-px flex-1 bg-rose/60" />
                    <span className="rounded-full bg-rose px-2 py-0.5 text-[10px] font-bold tracking-[0.08em] text-white uppercase">
                      New
                    </span>
                    <span className="h-px flex-1 bg-rose/60" />
                  </div>
                )}

                {showDay && (
                  <div className="my-4 flex items-center gap-3" role="separator">
                    <span className="h-px flex-1 bg-hover/55" />
                    <span className="rounded-full border border-subtle bg-void/50 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-dim uppercase backdrop-blur">
                      {formatDayLabel(message.created_at)}
                    </span>
                    <span className="h-px flex-1 bg-hover/55" />
                  </div>
                )}

                <article
                  className={`group relative flex gap-3 rounded-md px-1.5 transition-colors hover:bg-hover/45 density-row ${
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
                    {message.content && (
                      <MessageContent
                        content={message.content}
                        selfId={profile.id}
                        onOpenProfile={onOpenProfile}
                      />
                    )}
                    {(message.attachments ?? []).length > 0 && (
                      <AttachmentGrid attachments={message.attachments ?? []} />
                    )}
                  </div>
                  {mine && (
                    <button
                      onClick={() => onDelete(message.id)}
                      title="Delete message"
                      aria-label="Delete message"
                      className="absolute top-1.5 right-2 grid h-7 w-7 place-items-center rounded-md border border-subtle bg-void/90 text-muted opacity-0 transition group-hover:opacity-100 hover:text-rose"
                    >
                      <TrashIcon width={14} height={14} />
                    </button>
                  )}
                </article>
              </div>
            );
          })}
          <div className="h-2" />
        </div>

        {composerNote && (
          <div className="mx-3 mb-1 flex items-center gap-2 rounded-lg border border-line/70 bg-raised/60 px-3 py-1.5 text-[12px] text-muted">
            <span className="min-w-0 flex-1 truncate">{composerNote}</span>
            <button
              type="button"
              onClick={() => setComposerNote(null)}
              aria-label="Dismiss"
              className="shrink-0 rounded px-1 text-dim transition hover:text-bright"
            >
              ✕
            </button>
          </div>
        )}
        <ChatComposer
          apiRef={composerApi}
          placeholder={group ? `Message ${groupName}` : `Message @${peer?.username ?? ""}`}
          ariaLabel={group ? `Message ${groupName}` : `Message ${peerName}`}
          onSubmit={onSend}
          onUpload={
            supabase ? (files) => uploadAttachments(supabase, profile.id, files) : undefined
          }
          onCreateThread={() =>
            setComposerNote("Threads are coming soon — reply here for now.")
          }
          onUseApps={() => setComposerNote("Apps and integrations are coming soon.")}
          members={group?.members ?? (peer ? [peer, profile as unknown as MessageAuthor] : [])}
          selfId={profile.id}
          leftSlot={
            <button
              type="button"
              title="Notifications"
              aria-label="Conversation notifications"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-hover/60 hover:text-bright"
            >
              <BellIcon width={15} height={15} />
            </button>
          }
        />
        </UploadDropzone>
      </div>

      {/* right-hand member panel (1:1 conversations) */}
      {!group && showPanel && peer?.id && (
        <DmProfilePanel
          peer={peer}
          onClose={() => setShowPanel(false)}
          onOpenProfile={() => onOpenProfile?.(peer.id)}
        />
      )}

      {group && showPanel && (
        <aside className="glass-panel hidden w-60 shrink-0 flex-col border-l border-subtle lg:flex">
          <div className="border-b border-subtle px-3 py-3">
            <p className="text-[11px] font-bold tracking-[0.12em] text-dim uppercase">
              Members—{group.members.length}
            </p>
          </div>
          <ul className="scroll-auto flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
            {group.members.map((member) => {
              const isOwner = member.id === group.owner_id;
              const name = member.display_name || member.username;
              return (
                <li key={member.id}>
                  <button
                    onClick={() => onOpenProfile?.(member.id)}
                    className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left transition hover:bg-hover/60"
                  >
                    <Avatar
                      name={name}
                      src={member.avatar_url}
                      accent={member.accent_color}
                      size={28}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1">
                        <span className="truncate text-[13px] font-medium text-muted">{name}</span>
                        {isOwner && (
                          <span className="rounded bg-amber/20 px-1 text-[9px] font-bold tracking-wide text-amber uppercase">
                            Owner
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
      )}
    </section>
  );
}

function GroupAvatar({
  group,
  size,
}: {
  group: { name: string | null; icon_url: string | null; members: MessageAuthor[] };
  size: number;
}) {
  if (group.icon_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={group.icon_url}
        alt={group.name ?? "Group"}
        style={{ width: size, height: size }}
        className="rounded-full object-cover"
      />
    );
  }
  const initials = group.members.slice(0, 4);
  return (
    <span
      style={{ width: size, height: size }}
      className="grid shrink-0 grid-cols-2 grid-rows-2 gap-px overflow-hidden rounded-full bg-raised"
    >
      {initials.map((member, index) => (
        <span
          key={`${member.id}-${index}`}
          className="grid place-items-center bg-gradient-to-br from-blurple/80 to-blurple-soft/60 text-[10px] font-bold text-white"
        >
          {(member.display_name || member.username).slice(0, 1).toUpperCase()}
        </span>
      ))}
    </span>
  );
}
