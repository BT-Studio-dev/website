"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Server } from "@/lib/types";
import { CompassIcon, PlusIcon } from "@/components/icons";

export function ServerRail({
  servers,
  activeServerId,
  onAddServer,
  onExplore,
  onSelect,
}: {
  servers: Server[];
  activeServerId: string;
  onAddServer: () => void;
  onExplore: () => void;
  /** When provided, servers switch in-place instead of navigating. */
  onSelect?: (serverId: string) => void;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Servers"
      className="flex w-[68px] shrink-0 flex-col items-center gap-2 border-r border-line/60 bg-void py-3"
    >
      <Link
        href="/"
        title="BT Comms home"
        className="group relative mb-1 grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-blurple-soft to-blurple text-white shadow-lg shadow-blurple/25 transition hover:rounded-xl"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M13.5 2 5 13h5.5l-1 9L19 11h-5.5l1-9Z" fill="currentColor" />
        </svg>
      </Link>

      <div className="my-1 h-px w-8 bg-line" />

      <div className="scroll-thin flex w-full flex-1 flex-col items-center gap-2 overflow-y-auto">
        {servers.map((server) => {
          const active =
            server.id === activeServerId || pathname.includes(server.id);
          const label = server.icon || server.name.slice(0, 1).toUpperCase();

          const body = (
            <>
              <span
                className={`absolute left-0 w-[3px] rounded-r-full bg-bright transition-all ${
                  active ? "h-8" : "h-0 group-hover:h-4"
                }`}
              />
              <span
                className={`grid h-11 w-11 place-items-center text-lg font-semibold transition-all duration-200 ${
                  active
                    ? "rounded-xl bg-blurple text-white shadow-lg shadow-blurple/25"
                    : "rounded-2xl bg-raised text-muted hover:rounded-xl hover:bg-hover hover:text-bright"
                }`}
              >
                {label}
              </span>
            </>
          );

          const className =
            "group relative flex h-11 w-full items-center justify-center";

          return onSelect ? (
            <button
              key={server.id}
              type="button"
              title={server.name}
              onClick={() => onSelect(server.id)}
              aria-current={active ? "page" : undefined}
              className={className}
            >
              {body}
            </button>
          ) : (
            <Link
              key={server.id}
              href={`/channels/${server.id}`}
              title={server.name}
              aria-current={active ? "page" : undefined}
              className={className}
            >
              {body}
            </Link>
          );
        })}

        <button
          onClick={onAddServer}
          title="Add a server"
          className="grid h-11 w-11 place-items-center rounded-2xl border border-dashed border-line/80 text-mint transition hover:rounded-xl hover:border-mint/60 hover:bg-mint/10"
        >
          <PlusIcon width={19} height={19} />
        </button>

        <button
          onClick={onExplore}
          title="Explore public servers"
          className="grid h-11 w-11 place-items-center rounded-2xl bg-raised text-muted transition hover:rounded-xl hover:bg-hover hover:text-bright"
        >
          <CompassIcon width={19} height={19} />
        </button>
      </div>
    </nav>
  );
}
