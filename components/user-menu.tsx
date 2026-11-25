"use client";

import { useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import {
  MenuCheckbox,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  Popover,
} from "@/components/ui/popover";
import {
  BoltIcon,
  CopyIcon,
  DeviceIcon,
  PencilIcon as EditIcon,
  ShieldIcon,
  StatusDndIcon,
  StatusIdleIcon,
  StatusOfflineIcon,
  StatusOnlineIcon,
} from "@/components/icons";
import { STATUS_OPTIONS } from "@/lib/presence";
import { STATUS_DURATIONS, type Presence, type Profile, type StatusDuration } from "@/lib/types";

/**
 * The bottom-left avatar popover.
 *
 * Layer 1 is the profile card + quick actions; the status row opens a nested
 * flyout, and Idle / DND / Invisible open a second right-hand submenu listing
 * the duration presets (15 min → Forever).
 */
export function UserMenu({
  profile,
  status,
  statusExpiresAt,
  onSetStatus,
  onOpenSettings,
  onOpenProfile,
  onSwitchAccounts,
  onCopyUserId,
  orbs = 10130,
}: {
  profile: Profile;
  status: Presence;
  statusExpiresAt?: string | null;
  onSetStatus: (status: Presence, duration: StatusDuration) => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  onSwitchAccounts: () => void;
  onCopyUserId: () => void;
  orbs?: number;
}) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [durationFor, setDurationFor] = useState<Presence | null>(null);

  const name = profile.display_name || profile.username;

  function close() {
    setOpen(false);
    setStatusOpen(false);
    setDurationFor(null);
  }

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Profile and status"
        className="group relative -mx-1 flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left transition hover:bg-hover/60"
      >
        <span className="relative shrink-0">
          <Avatar
            name={name}
            src={profile.avatar_url}
            accent={profile.accent_color}
            size={32}
            status={status}
          />
          <span className="pointer-events-none absolute -right-1 -bottom-1 grid h-4 w-4 place-items-center rounded-full border-2 border-abyss bg-elevated text-[8px] font-bold text-muted opacity-0 transition group-hover:opacity-100">
            ✎
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] leading-tight font-semibold text-bright">
            {name}
          </span>
          <span className="block truncate text-[11px] leading-tight text-dim">
            {profile.custom_status || statusLabel(status)}
          </span>
        </span>
      </button>

      <Popover open={open} onClose={close} anchor={anchorRef.current} width={264} side="top">
        {/* ---- mini profile card ---- */}
        <div className="relative mx-1.5 mb-1 overflow-hidden rounded-lg border border-subtle">
          <div
            className="h-14 w-full"
            style={{
              backgroundImage: profile.banner_url
                ? `url(${profile.banner_url})`
                : `linear-gradient(120deg, ${profile.banner_color || "#7c3aed"}, ${
                    profile.theme_secondary || "#f59e0b"
                  })`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="absolute top-8 left-3">
            <div className="rounded-full ring-4 ring-[var(--c-void)]">
              <Avatar
                name={name}
                src={profile.avatar_url}
                accent={profile.accent_color}
                size={46}
                status={status}
              />
            </div>
          </div>
          <div className="bg-[color-mix(in_oklab,var(--c-elevated)_88%,transparent)] px-3 pt-6 pb-2.5">
            <p className="truncate text-[14px] font-bold text-bright">{name}</p>
            <p className="truncate text-[11.5px] text-dim">@{profile.username}</p>
            {profile.custom_status && (
              <p className="mt-1.5 line-clamp-2 text-[11.5px] text-muted">{profile.custom_status}</p>
            )}
          </div>
          <div className="flex items-center justify-center gap-1 border-t border-subtle bg-[color-mix(in_oklab,var(--c-elevated)_88%,transparent)] px-2 py-1.5">
            <button
              onClick={() => {
                close();
                onOpenProfile();
              }}
              className="flex-1 rounded-md py-1 text-[11.5px] font-semibold text-bright transition hover:bg-hover/60"
            >
              Edit Profile
            </button>
            <button
              onClick={close}
              className="grid h-6 w-6 place-items-center rounded-md text-muted transition hover:bg-hover/60 hover:text-bright"
              aria-label="Badges"
              title="Badges"
            >
              <ShieldIcon width={14} height={14} />
            </button>
            <button
              onClick={close}
              className="grid h-6 w-6 place-items-center rounded-md text-muted transition hover:bg-hover/60 hover:text-bright"
              aria-label="Avatar decoration"
              title="Avatar decorations"
            >
              <BoltIcon width={14} height={14} />
            </button>
          </div>
        </div>

        {/* ---- status row + flyout ---- */}
        <div className="relative px-1.5">
          <button
            type="button"
            onClick={() => setStatusOpen((v) => !v)}
            aria-expanded={statusOpen}
            className="flex w-full items-center justify-between rounded-md px-1.5 py-1.5 text-[12.5px] font-semibold text-bright transition hover:bg-hover/60"
          >
            <span className="flex items-center gap-1.5">
              <StatusIcon status={status} />
              {statusLabel(status)}
              {statusExpiresAt && <span className="text-[10px] text-dim">· timed</span>}
            </span>
            <span className="text-dim">▾</span>
          </button>

          {statusOpen && (
            <div className="animate-rise mt-1 rounded-md border border-subtle bg-[color-mix(in_oklab,var(--c-input)_92%,transparent)] p-1">
              {STATUS_OPTIONS.map((option) => (
                <div key={option.id} className="relative">
                  <button
                    type="button"
                    onMouseEnter={() => option.timed && setDurationFor(option.id)}
                    onClick={() =>
                      option.timed
                        ? setDurationFor((v) => (v === option.id ? null : option.id))
                        : (onSetStatus(option.id, "forever"), close())
                    }
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12.5px] font-medium text-muted transition hover:bg-blurple hover:text-[color:var(--c-on-accent)]"
                  >
                    <StatusIcon status={option.id} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{option.label}</span>
                      {option.description && (
                        <span className="block truncate text-[10px] opacity-80">
                          {option.description}
                        </span>
                      )}
                    </span>
                    {option.timed && <span className="text-[10px] opacity-80">›</span>}
                  </button>

                  {option.timed && durationFor === option.id && (
                    <div className="animate-rise absolute top-0 left-full z-10 ml-1 w-[150px] rounded-md border border-subtle bg-[color-mix(in_oklab,var(--c-void)_94%,transparent)] py-1 shadow-2xl shadow-black/60 backdrop-blur-2xl">
                      {STATUS_DURATIONS.map((duration) => (
                        <button
                          key={duration.id}
                          type="button"
                          onClick={() => {
                            onSetStatus(option.id, duration.id);
                            close();
                          }}
                          className="block w-full px-2.5 py-1.5 text-left text-[12.5px] font-medium text-muted transition hover:bg-blurple hover:text-[color:var(--c-on-accent)]"
                        >
                          {duration.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <MenuSeparator />
        <MenuItem
          icon={<BoltIcon width={14} height={14} />}
          onSelect={() => {
            close();
            onOpenProfile();
          }}
        >
          Badges · <span className="text-amber">{orbs.toLocaleString()} Orbs</span>
        </MenuItem>
        <MenuItem
          icon={<DeviceIcon width={14} height={14} />}
          onSelect={() => {
            close();
            onSwitchAccounts();
          }}
        >
          Switch Accounts
        </MenuItem>
        <MenuItem
          icon={<CopyIcon width={14} height={14} />}
          onSelect={() => {
            close();
            onCopyUserId();
          }}
        >
          Copy User ID
        </MenuItem>
        <MenuSeparator />
        <MenuItem
          icon={<EditIcon width={14} height={14} />}
          onSelect={() => {
            close();
            onOpenSettings();
          }}
        >
          User Settings
        </MenuItem>
      </Popover>
    </>
  );
}

export function StatusIcon({ status, size = 12 }: { status: Presence; size?: number }) {
  const map = {
    online: { Icon: StatusOnlineIcon, color: "#23a55a" },
    idle: { Icon: StatusIdleIcon, color: "#f0b232" },
    dnd: { Icon: StatusDndIcon, color: "#f23f43" },
    invisible: { Icon: StatusOfflineIcon, color: "#b5bac1" },
    offline: { Icon: StatusOfflineIcon, color: "#80848e" },
  } as const;
  const { Icon, color } = map[status] ?? map.offline;
  return (
    <span style={{ color }} className="grid shrink-0 place-items-center">
      <Icon width={size} height={size} />
    </span>
  );
}

export function statusLabel(status: Presence) {
  if (status === "dnd") return "Do Not Disturb";
  if (status === "invisible") return "Invisible";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/** Checkbox list reused by the server header dropdown. */
export { MenuCheckbox };
