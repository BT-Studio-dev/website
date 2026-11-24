"use client";

import { presenceLabel } from "@/components/avatar";
import {
  connectionMeta,
  coverGradient,
  decorationById,
  effectById,
  nameStyleById,
  nameplateById,
} from "@/lib/profile-cosmetics";
import { BoltIcon } from "@/components/icons";
import type {
  Presence,
  ProfileConnection,
  ProfileWidget,
  WidgetKind,
} from "@/lib/types";

export type CardProfile = {
  display_name: string;
  username: string;
  avatar_url: string | null;
  accent_color: string;
  status: Presence;
  bio: string | null;
  pronouns?: string | null;
  server_tag?: string | null;
  custom_status?: string | null;
  custom_status_emoji?: string | null;
  banner_color?: string | null;
  banner_url?: string | null;
  theme_primary?: string | null;
  theme_secondary?: string | null;
  avatar_decoration?: string | null;
  profile_effect?: string | null;
  name_style?: string | null;
  nameplate?: string | null;
  connections?: ProfileConnection[];
  widgets?: ProfileWidget[];
  created_at?: string;
};

const STATUS_COLOR: Record<Presence, string> = {
  online: "#3ba55d",
  idle: "#faa61a",
  dnd: "#ed4245",
  offline: "#6b7280",
};

function initials(name: string) {
  return (
    name
      .replace(/[^\p{L}\p{N} ]/gu, "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

/** Avatar with decoration ring + status dot — the hero of the card. */
export function DecoratedAvatar({
  name,
  src,
  accent,
  status,
  decoration,
  size = 92,
  ringColor = "#1a1330",
}: {
  name: string;
  src?: string | null;
  accent?: string | null;
  status?: Presence;
  decoration?: string | null;
  size?: number;
  ringColor?: string;
}) {
  const deco = decorationById(decoration);
  const frames = deco.id === "none" ? 0 : 6;

  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {deco.id !== "none" && (
        <span
          aria-hidden
          className={`absolute inset-0 rounded-full ${deco.animated ? "animate-spin-slow" : ""}`}
          style={{
            margin: -frames,
            width: size + frames * 2,
            height: size + frames * 2,
            background: deco.ring,
            boxShadow: deco.glow ? `0 0 22px ${deco.glow}` : undefined,
            borderRadius: "9999px",
          }}
        />
      )}
      <span
        className="relative grid place-items-center overflow-hidden rounded-full font-semibold text-white select-none"
        style={{
          width: size,
          height: size,
          border: `${Math.max(3, Math.round(size * 0.045))}px solid ${ringColor}`,
          background: src ? undefined : `linear-gradient(145deg, ${accent ?? "#5865f2"}, ${accent ?? "#5865f2"}cc)`,
          fontSize: size * 0.34,
        }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={name} className="h-full w-full object-cover" />
        ) : (
          initials(name)
        )}
      </span>
      {status && (
        <span
          className="absolute right-0 bottom-0 rounded-full border-[3px]"
          style={{
            width: size * 0.3,
            height: size * 0.3,
            backgroundColor: STATUS_COLOR[status],
            borderColor: ringColor,
          }}
          aria-label={presenceLabel(status)}
        />
      )}
    </span>
  );
}

/**
 * The full "profile card" — banner, avatar, status bubble, name, bio,
 * connections and widget rail. Everything is driven by props so the
 * editor can re-render it on every keystroke.
 */
export function ProfileCard({
  profile,
  memberSince,
  compact = false,
  actionSlot,
}: {
  profile: CardProfile;
  memberSince?: string | null;
  compact?: boolean;
  actionSlot?: React.ReactNode;
}) {
  const deco = decorationById(profile.avatar_decoration);
  const effect = effectById(profile.profile_effect);
  const nameStyle = nameStyleById(profile.name_style);
  const nameplate = nameplateById(profile.nameplate);
  const connections = profile.connections ?? [];
  const widgets = profile.widgets ?? [];

  const banner = profile.banner_url
    ? `url(${profile.banner_url}) center/cover no-repeat`
    : `linear-gradient(120deg, ${profile.banner_color ?? profile.accent_color}, ${
        profile.theme_secondary ?? "#0ea5e9"
      })`;

  return (
    <article
      className="relative overflow-hidden rounded-2xl border border-line/80 bg-panel shadow-xl shadow-black/40"
      style={{
        backgroundImage:
          profile.theme_primary && profile.theme_secondary
            ? `linear-gradient(165deg, ${profile.theme_primary}, ${profile.theme_secondary})`
            : undefined,
      }}
    >
      {effect.id !== "none" && (
        <div aria-hidden className="pointer-events-none absolute inset-0 z-20 opacity-80" style={{ background: effect.overlay }} />
      )}

      {/* Banner */}
      <div
        className="relative h-28 w-full"
        style={{
          background: banner,
          backgroundColor: profile.banner_color ?? profile.accent_color,
        }}
      >
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent" />
      </div>

      {/* Avatar overhangs the banner */}
      <div className="relative -mt-11 px-5">
        <div className="flex items-end justify-between gap-3">
          <div style={{ filter: deco.glow ? `drop-shadow(0 0 14px ${deco.glow})` : undefined }}>
            <DecoratedAvatar
              name={profile.display_name || profile.username}
              src={profile.avatar_url}
              accent={profile.accent_color}
              status={profile.status}
              decoration={profile.avatar_decoration}
              size={compact ? 76 : 92}
              ringColor="#1a1330"
            />
          </div>
          {actionSlot}
        </div>

        {/* Floating custom-status speech bubble */}
        {(profile.custom_status || profile.custom_status_emoji) && (
          <div className="mt-3 flex justify-start">
            <div className="animate-rise relative max-w-full rounded-2xl rounded-bl-md border border-line/80 bg-void/80 px-3 py-2 text-[12.5px] text-bright shadow-lg backdrop-blur">
              <span aria-hidden className="absolute -top-1.5 left-4 h-3 w-3 rotate-45 border-t border-l border-line/80 bg-void/80" />
              <span className="relative flex items-center gap-1.5">
                {profile.custom_status_emoji && <span>{profile.custom_status_emoji}</span>}
                <span className="truncate">{profile.custom_status ?? "Set a custom status"}</span>
              </span>
            </div>
          </div>
        )}

        {/* Name + pills */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <h3
            className="max-w-full truncate rounded-md px-1.5 py-0.5 text-[22px] leading-tight font-bold"
            style={{ ...nameStyle.style, ...(nameplate.id === "none" ? {} : nameplate.style) }}
          >
            {profile.display_name || profile.username}
          </h3>
          {profile.pronouns && (
            <span className="rounded-full bg-raised px-2 py-0.5 text-[11px] font-medium text-muted">
              {profile.pronouns}
            </span>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-dim">
          <span className="truncate">@{profile.username}</span>
          {profile.server_tag && (
            <span className="rounded-md bg-blurple/20 px-1.5 py-0.5 text-[10.5px] font-bold tracking-wide text-blurple-soft uppercase ring-1 ring-blurple/40">
              {profile.server_tag} tag
            </span>
          )}
        </div>

        {/* Platform badges */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge label="Web" color="#38bdf8" />
          <Badge label="Desktop" color="#a855f7" />
          <Badge label="Mobile" color="#22c55e" />
          {connections.slice(0, 3).map((c) => (
            <Badge key={c.id} label={connectionMeta(c.kind).label} color={connectionMeta(c.kind).color} />
          ))}
        </div>

        {profile.bio && (
          <div className="mt-4 rounded-xl border border-line/70 bg-void/40 p-3">
            <p className="mb-1 text-[10.5px] font-semibold tracking-widest text-dim uppercase">About me</p>
            <p className="text-[12.5px] leading-relaxed whitespace-pre-line text-muted">{profile.bio}</p>
          </div>
        )}

        {/* Connections */}
        <div className="mt-4">
          <p className="mb-1.5 text-[10.5px] font-semibold tracking-widest text-dim uppercase">Connections</p>
          {connections.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line/80 px-3 py-2 text-[12px] text-dim">
              No connections yet.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {connections.map((connection) => (
                <li key={connection.id} className="flex items-center gap-2 rounded-lg bg-void/40 px-2.5 py-1.5">
                  <span
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-[10px] font-bold text-black"
                    style={{ background: connectionMeta(connection.kind).color }}
                  >
                    {connectionMeta(connection.kind).label.slice(0, 2).toUpperCase()}
                  </span>
                  <a
                    href={connection.url}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-bright hover:underline"
                  >
                    {connection.handle}
                  </a>
                  <span className="shrink-0 text-[10.5px] text-dim">{connectionMeta(connection.kind).label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Widgets */}
        {widgets.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-[10.5px] font-semibold tracking-widest text-dim uppercase">Player widgets</p>
            <div className="grid grid-cols-3 gap-2">
              {widgets.slice(0, 3).map((widget) => (
                <WidgetTile key={widget.id} widget={widget} />
              ))}
            </div>
          </div>
        )}

        {memberSince && (
          <p className="mt-4 border-t border-line/60 pt-3 text-[11.5px] text-dim">
            Member since <span className="font-medium text-muted">{memberSince}</span>
          </p>
        )}
        <div className="pb-5" />
      </div>
    </article>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
      style={{ background: `${color}22`, color, boxShadow: `inset 0 0 0 1px ${color}55` }}
    >
      {label}
    </span>
  );
}

const WIDGET_LABEL: Record<WidgetKind, string> = {
  favorite: "Favorite game",
  like: "Games I like",
  want: "Want to play",
};

export function WidgetTile({ widget, onRemove }: { widget: ProfileWidget; onRemove?: () => void }) {
  const { game } = widget;
  return (
    <div className="group relative overflow-hidden rounded-lg border border-line/70 bg-void/50">
      <div className="relative h-20 w-full" style={{ background: coverGradient(game.name) }}>
        {game.cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={game.cover} alt={game.name} className="h-full w-full object-cover" />
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 pt-3 pb-1">
          <p className="truncate text-[10.5px] font-bold text-white">{game.name}</p>
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${game.name}`}
            className="absolute top-1 right-1 grid h-5 w-5 place-items-center rounded-full bg-black/70 text-[11px] text-white opacity-0 transition group-hover:opacity-100"
          >
            ✕
          </button>
        )}
      </div>
      <p className="truncate px-1.5 py-1 text-[9.5px] font-semibold tracking-wide text-dim uppercase">
        {WIDGET_LABEL[widget.kind]}
      </p>
    </div>
  );
}

/** Small empty-state used by the widget panel and the preview. */
export function WidgetPlaceholder() {
  return (
    <div className="grid place-items-center rounded-lg border border-dashed border-line/80 p-3 text-center">
      <BoltIcon width={15} height={15} className="text-dim" />
      <PlayerIconHint />
    </div>
  );
}

function PlayerIconHint() {
  return (
    <p className="mt-1 text-[10.5px] leading-snug text-dim">
      Add a game from the <span className="text-muted">Widgets</span> panel
    </p>
  );
}
