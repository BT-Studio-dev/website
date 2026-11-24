"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { CompassIcon, DownloadIcon, PlusIcon } from "@/components/icons";
import type { Server } from "@/lib/types";
import { initialsFor } from "@/lib/naming";

type Props = {
  servers: Server[];
  /** null means the Home / DMs view is active. */
  activeServerId: string | null;
  onAddServer: () => void;
  onExplore: () => void;
  /** When provided, servers switch in-place instead of navigating. */
  onSelect?: (serverId: string) => void;
  onHome?: () => void;
  /** Unread badges keyed by server id. */
  unreadByServer?: Record<string, number>;
  /** Total unread DMs, shown on the Home button. */
  homeUnread?: number;
  /** Force the server list to be treated as the active view. */
  homeActive?: boolean;
  /** Opened from the `+` menu's "Join a Server" option. */
  onJoinServer?: () => void;
};

export function ServerRail({
  servers,
  activeServerId,
  onAddServer,
  onExplore,
  onSelect,
  onHome,
  unreadByServer = {},
  homeUnread = 0,
  homeActive,
  onJoinServer,
}: Props) {
  const atHome = homeActive ?? activeServerId === null;

  return (
    <nav
      aria-label="Servers"
      className="scrollbar-none flex h-full w-[72px] shrink-0 flex-col items-center gap-2 overflow-y-auto overflow-x-hidden bg-sidebar py-3 app-gradient"
    >
      {/* Home / Direct Messages */}
      <RailItem
        label="Direct Messages"
        active={atHome}
        onClick={onHome}
        href={onHome ? undefined : "/channels/@me"}
        badge={homeUnread}
        icon={
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M12 3.2c-4.9 0-8.8 3.4-8.8 7.6 0 2.4 1.3 4.5 3.4 5.9l-.9 3.4 3.6-2a10.6 10.6 0 0 0 2.7.3c4.9 0 8.8-3.4 8.8-7.6S16.9 3.2 12 3.2Z"
              fill="currentColor"
              fillOpacity={atHome ? 1 : 0.85}
            />
            <circle cx="8.6" cy="10.9" r="1.15" fill="var(--c-abyss)" />
            <circle cx="12" cy="10.9" r="1.15" fill="var(--c-abyss)" />
            <circle cx="15.4" cy="10.9" r="1.15" fill="var(--c-abyss)" />
          </svg>
        }
      />

      <div className="my-0.5 h-px w-8 shrink-0 bg-line" />

      {servers.map((server) => (
        <RailItem
          key={server.id}
          label={server.name}
          active={server.id === activeServerId}
          badge={unreadByServer[server.id] ?? 0}
          onClick={onSelect ? () => onSelect(server.id) : undefined}
          href={onSelect ? undefined : `/channels/${server.id}`}
          initials={!server.icon ? initialsFor(server.name) : undefined}
          icon={
            server.icon ? (
              <span className="text-lg leading-none">{server.icon}</span>
            ) : undefined
          }
        />
      ))}

      {/* Add a Server */}
      <button
        type="button"
        onClick={onAddServer}
        title="Add a Server"
        aria-label="Add a Server"
        className="group relative grid h-12 w-12 shrink-0 place-items-center rounded-[24px] border border-dashed border-line text-mint transition-all hover:rounded-[16px] hover:border-mint/70 hover:bg-mint/10"
      >
        <PlusIcon width={20} height={20} />
      </button>

      {/* Join a Server */}
      {onJoinServer && (
        <button
          type="button"
          onClick={onJoinServer}
          title="Join a Server"
          aria-label="Join a Server"
          className="group relative grid h-9 w-9 shrink-0 place-items-center rounded-[16px] text-[11px] font-bold text-muted transition hover:bg-hover/60 hover:text-bright"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 8l-5 4 5 4M5 12h11" />
          </svg>

        </button>
      )}

      {/* Discover */}
      <button
        type="button"
        onClick={onExplore}
        title="Explore Discoverable Servers"
        aria-label="Explore Discoverable Servers"
        className="group relative grid h-12 w-12 shrink-0 place-items-center rounded-[24px] bg-raised text-muted transition-all hover:rounded-[16px] hover:bg-hover hover:text-bright"
      >
        <CompassIcon width={20} height={20} />
      </button>

      {/* Download Apps */}
      <a
        href="https://btcomms.gg/download"
        target="_blank"
        rel="noopener noreferrer"
        title="Download Apps"
        aria-label="Download Apps"
        className="group relative grid h-12 w-12 shrink-0 place-items-center rounded-[24px] bg-raised text-mint transition-all hover:rounded-[16px] hover:bg-mint/20"
      >
        <DownloadIcon width={20} height={20} />
      </a>
    </nav>
  );
}

function RailItem({
  label,
  icon,
  initials,
  active,
  onClick,
  href,
  badge = 0,
}: {
  label: string;
  icon?: React.ReactNode;
  /** Shown instead of an icon when the server has no emoji/icon set. */
  initials?: string;
  active: boolean;
  onClick?: () => void;
  href?: string;
  badge?: number;
}) {
  const className =
    "group relative flex h-12 w-full shrink-0 items-center justify-center";

  const { tipTop, bind } = useRailTooltip();

  const body = (
    <>
      {/* active pill */}
      <span
        aria-hidden
        className={`absolute left-0 w-[4px] rounded-r-full bg-bright transition-all duration-200 ${
          active ? "h-10" : "h-0 group-hover:h-5"
        }`}
      />
      <span
        className={`relative grid h-12 w-12 place-items-center transition-all duration-200 ${
          active
            ? "rounded-[16px] bg-blurple text-white shadow-lg"
            : "rounded-[24px] bg-raised text-muted group-hover:rounded-[16px] group-hover:bg-blurple/90 group-hover:text-white"
        }`}
        style={active ? { boxShadow: "0 10px 26px -10px rgba(var(--c-glow),.8)" } : undefined}
      >
        {initials ? (
          <span className="text-[12.5px] font-bold tracking-tight text-white">{initials}</span>
        ) : (
          icon
        )}
        {badge > 0 && (
          <span className="absolute -right-1 -bottom-1 grid min-w-[18px] place-items-center rounded-full border-2 border-abyss bg-rose px-1 text-[10px] font-bold text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </span>
      {tipTop !== null && <RailTooltip top={tipTop}>{label}</RailTooltip>}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        className={className}
        {...bind}
      >
        {body}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={className}
      {...bind}
    >
      {body}
    </button>
  );
}

/**
 * The rail scrolls, which means any absolutely-positioned tooltip gets clipped
 * by its overflow box. Track the hovered item and paint the label as a fixed
 * element just outside the rail instead.
 */
function useRailTooltip() {
  const [tipTop, setTipTop] = useState<number | null>(null);
  const ref = useRef<number>(0);

  const show = (event: React.MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    ref.current = rect.top + rect.height / 2;
    setTipTop(ref.current);
  };

  return {
    tipTop,
    bind: {
      onMouseEnter: show,
      onFocus: show as unknown as React.FocusEventHandler<HTMLElement>,
      onMouseLeave: () => setTipTop(null),
      onBlur: () => setTipTop(null),
    },
  };
}

function RailTooltip({ top, children }: { top: number; children: React.ReactNode }) {
  return (
    <span
      role="tooltip"
      style={{ top }}
      className="pointer-events-none fixed left-[80px] z-[95] hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-void px-2.5 py-1.5 text-[12px] font-semibold text-bright shadow-xl ring-1 ring-line lg:block"
    >
      {children}
    </span>
  );
}
