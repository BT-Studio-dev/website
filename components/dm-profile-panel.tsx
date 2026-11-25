"use client";

import { useEffect, useState } from "react";
import { Avatar, presenceLabel } from "@/components/avatar";
import { CloseIcon, HeadphonesIcon, MessageBubbleIcon, MoreIcon } from "@/components/icons";
import { activityFromStatus, activityLabel } from "@/lib/activity";
import { effectiveStatus, statusCaption } from "@/lib/presence";
import type { ActiveActivity, MessageAuthor, Presence } from "@/lib/types";

/**
 * Right-hand profile panel for a 1:1 DM.
 *
 * Banner, avatar + presence dot, display name / handle, badges, Member Since,
 * a live-ticking Current Activity card, and a full-width View Full Profile
 * button.
 */
export function DmProfilePanel({
  peer,
  onClose,
  onOpenProfile,
  activity,
  onOpenUserMenu,
}: {
  peer: MessageAuthor & {
    custom_status?: string | null;
    status?: string;
    status_expires_at?: string | null;
    pronouns?: string | null;
    bio?: string | null;
    created_at?: string;
    banner_color?: string | null;
    banner_url?: string | null;
    theme_secondary?: string | null;
  };
  onClose: () => void;
  onOpenProfile: () => void;
  /** The peer's real activity, derived by the caller from their status. */
  activity?: ActiveActivity | null;
  /** Opens the `…` action menu anchored to the button that was clicked. */
  onOpenUserMenu?: (anchor: HTMLElement) => void;
}) {
  const status = effectiveStatus(peer.status, peer.status_expires_at);
  const caption = statusCaption(status, peer.status_expires_at);
  const name = peer.display_name || peer.username;

  /**
   * Prefer the activity the caller resolved; otherwise read it straight off the
   * peer's status. Never invent one — an absent activity renders no card.
   */
  const resolved = activity
    ? { activity, label: activityLabel(activity.kind) }
    : activityFromStatus(peer.custom_status);
  const current = resolved?.activity ?? null;

  // The elapsed clock is anchored to the real start time, so it survives a
  // panel remount and never restarts from zero while the user watches.
  const startedAt = current?.started_at ? Date.parse(current.started_at) : null;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  const elapsed = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : null;

  // The viewer can dismiss the card; it stays dismissed for this session.
  const [activityHidden, setActivityHidden] = useState(false);

  const memberSince = peer.created_at
    ? new Date(peer.created_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Recently";

  return (
    <aside className="glass-panel flex w-[280px] shrink-0 flex-col border-l border-subtle">
      <div className="scroll-auto flex-1 overflow-y-auto">
        {/* banner */}
        <div className="relative">
          <div
            className="h-[84px] w-full"
            style={{
              backgroundImage: peer.banner_url
                ? `url(${peer.banner_url})`
                : `linear-gradient(120deg, ${peer.banner_color || "#7c3aed"}, ${
                    peer.theme_secondary || "#f59e0b"
                  })`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="absolute top-2 right-2 flex items-center gap-1">
            {onOpenUserMenu && (
              <button
                type="button"
                onClick={(event) => onOpenUserMenu(event.currentTarget)}
                aria-label={`More options for ${name}`}
                title="More options"
                aria-haspopup="menu"
                className="grid h-6 w-6 place-items-center rounded-full bg-black/45 text-white/80 transition hover:bg-black/70 hover:text-white"
              >
                <MoreIcon width={13} height={13} />
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close profile panel"
              className="grid h-6 w-6 place-items-center rounded-full bg-black/45 text-white/80 transition hover:bg-black/70 hover:text-white"
            >
              <CloseIcon width={12} height={12} />
            </button>
          </div>
          <div className="absolute -bottom-7 left-4">
            <div className="rounded-full ring-[5px] ring-[color-mix(in_oklab,var(--c-sidebar)_80%,transparent)]">
              <Avatar
                name={name}
                src={peer.avatar_url}
                accent={peer.accent_color}
                size={62}
                status={status}
              />
            </div>
          </div>
        </div>

        <div className="px-4 pt-9">
          <h3 className="truncate text-[16px] font-bold tracking-tight text-bright">{name}</h3>
          <p className="truncate text-[12px] text-dim">@{peer.username}</p>
          {peer.pronouns && <p className="mt-0.5 text-[11px] text-dim">{peer.pronouns}</p>}

          {peer.custom_status && (
            <div className="mt-2.5 rounded-md border border-subtle bg-hover/55 px-2.5 py-1.5">
              <p className="text-[12px] leading-relaxed text-muted">{peer.custom_status}</p>
            </div>
          )}

          <div className="mt-2 flex flex-wrap gap-1">
            <Badge tone="mint">{presenceLabel(status)}</Badge>
            {caption && <Badge tone="dim">{caption}</Badge>}
            <Badge tone="amber">BT Pro</Badge>
          </div>

          {peer.bio && (
            <p className="mt-3 border-t border-subtle pt-3 text-[12px] leading-relaxed whitespace-pre-wrap text-muted">
              {peer.bio}
            </p>
          )}

          {/* member since */}
          <Card title="Member Since">
            <p className="text-[12.5px] font-semibold text-bright">{memberSince}</p>
          </Card>

          {/* current activity — only when the peer actually reports one */}
          {status !== "offline" && current && !activityHidden && (
            <Card
              title={resolved?.label ?? activityLabel(current.kind)}
              action={
                <button
                  type="button"
                  onClick={() => setActivityHidden(true)}
                  aria-label={`Hide ${name}'s activity`}
                  title="Hide activity"
                  className="grid h-4 w-4 place-items-center rounded text-dim transition hover:bg-hover hover:text-bright"
                >
                  <CloseIcon width={11} height={11} />
                </button>
              }
            >
              <div className="flex items-start gap-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-blurple to-blurple-soft text-[color:var(--c-on-accent)]">
                  {current.kind === "music" ? (
                    <HeadphonesIcon width={16} height={16} />
                  ) : (
                    <BoltMark />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-semibold text-bright">
                    {current.title}
                  </p>
                  {current.detail && (
                    <p className="truncate text-[11px] text-dim">{current.detail}</p>
                  )}
                  {elapsed !== null && (
                    <p className="mt-0.5 font-mono text-[11px] tabular-nums text-mint">
                      {formatElapsed(elapsed)} elapsed
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-subtle p-3">
        <button
          onClick={onOpenProfile}
          className="flex w-full items-center justify-center gap-1.5 rounded-md bg-blurple py-2 text-[12.5px] font-semibold text-[color:var(--c-on-accent)] transition hover:bg-blurple-soft"
        >
          <MessageBubbleIcon width={14} height={14} />
          View Full Profile
        </button>
      </div>
    </aside>
  );
}

function Card({
  title,
  action,
  children,
}: {
  title: string;
  /** Optional control pinned to the right of the heading (e.g. dismiss). */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-3 rounded-lg border border-subtle bg-hover/45 p-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold tracking-[0.12em] text-dim uppercase">{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

function Badge({ tone, children }: { tone: "mint" | "amber" | "dim"; children: React.ReactNode }) {
  const cls =
    tone === "mint"
      ? "bg-mint/15 text-mint"
      : tone === "amber"
        ? "bg-amber/15 text-amber"
        : "bg-hover/55 text-dim";
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase ${cls}`}>
      {children}
    </span>
  );
}

function BoltMark() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
    </svg>
  );
}

function formatElapsed(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export { formatElapsed };
