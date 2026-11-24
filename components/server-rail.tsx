"use client";

import Link from "next/link";
import { HomeIcon, CompassIcon, PlusIcon } from "@/components/icons";
import type { Server } from "@/lib/types";

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
}: Props) {
  const atHome = homeActive ?? activeServerId === null;

  return (
    <nav
      aria-label="Servers"
      className="scroll-thin flex w-[72px] shrink-0 flex-col items-center gap-2 overflow-y-auto bg-abyss py-3 app-gradient"
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
          icon={
            <span className="text-lg leading-none">
              {server.icon || server.name.slice(0, 1).toUpperCase()}
            </span>
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
        <RailTooltip>Add a Server</RailTooltip>
      </button>

      {/* Discover */}
      <button
        type="button"
        onClick={onExplore}
        title="Explore Discoverable Servers"
        aria-label="Explore Discoverable Servers"
        className="group relative grid h-12 w-12 shrink-0 place-items-center rounded-[24px] bg-raised text-muted transition-all hover:rounded-[16px] hover:bg-hover hover:text-bright"
      >
        <CompassIcon width={20} height={20} />
        <RailTooltip>Explore Servers</RailTooltip>
      </button>
    </nav>
  );
}

function RailItem({
  label,
  icon,
  active,
  onClick,
  href,
  badge = 0,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick?: () => void;
  href?: string;
  badge?: number;
}) {
  const className =
    "group relative flex h-12 w-full shrink-0 items-center justify-center";

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
        {icon}
        {badge > 0 && (
          <span className="absolute -right-1 -bottom-1 grid min-w-[18px] place-items-center rounded-full border-2 border-abyss bg-rose px-1 text-[10px] font-bold text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </span>
      <RailTooltip>{label}</RailTooltip>
    </>
  );

  if (href) {
    return (
      <Link href={href} title={label} aria-current={active ? "page" : undefined} className={className}>
        {body}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-current={active ? "page" : undefined}
      className={className}
    >
      {body}
    </button>
  );
}

function RailTooltip({ children }: { children: React.ReactNode }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-full z-50 ml-3 hidden whitespace-nowrap rounded-md bg-void px-2.5 py-1.5 text-[12px] font-semibold text-bright opacity-0 shadow-xl transition-opacity group-hover:opacity-100 lg:block"
    >
      {children}
    </span>
  );
}
