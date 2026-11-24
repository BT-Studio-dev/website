"use client";

import { useState } from "react";
import { Avatar, presenceLabel } from "@/components/avatar";
import {
  HeadphonesIcon,
  MicIcon,
  MicOffIcon,
  SettingsIcon,
  FriendsIcon,
} from "@/components/icons";
import type { Profile } from "@/lib/types";

export function UserPanel({
  profile,
  onOpenSettings,
  onOpenAddFriend,
  pendingCount = 0,
}: {
  profile: Profile;
  onOpenSettings: () => void;
  /** Optional: when present, a friends shortcut is shown (Home view). */
  onOpenAddFriend?: () => void;
  pendingCount?: number;
}) {
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);

  const statusText =
    profile.custom_status ||
    (profile.bio && profile.bio.trim()) ||
    presenceLabel(profile.status);

  return (
    <div className="flex shrink-0 items-center gap-1 border-t border-line/60 bg-abyss/90 px-2 py-1.5 backdrop-blur">
      <button
        onClick={onOpenSettings}
        className="group flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left transition hover:bg-hover/70"
        title="User settings"
      >
        <Avatar
          name={profile.display_name}
          src={profile.avatar_url}
          accent={profile.accent_color}
          size={32}
          status={profile.status}
        />
        <span className="min-w-0">
          <span className="block truncate text-[13px] leading-tight font-semibold text-bright">
            {profile.display_name}
          </span>
          <span className="block truncate text-[11px] leading-tight text-dim">
            {statusText}
          </span>
        </span>
      </button>

      {onOpenAddFriend && (
        <button
          onClick={onOpenAddFriend}
          title={pendingCount > 0 ? `${pendingCount} pending friend requests` : "Add a friend"}
          aria-label="Add a friend"
          className="relative grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted transition hover:bg-hover/70 hover:text-bright"
        >
          <FriendsIcon width={17} height={17} />
          {pendingCount > 0 && (
            <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-rose" />
          )}
        </button>
      )}

      <div className="flex shrink-0 items-center">
        <IconToggle
          active={muted}
          activeLabel="Unmute"
          label="Mute"
          onClick={() => setMuted((v) => !v)}
        >
          {muted ? <MicOffIcon width={16} height={16} /> : <MicIcon width={16} height={16} />}
        </IconToggle>
        <IconToggle
          active={deafened}
          activeLabel="Undeafen"
          label="Deafen"
          onClick={() => setDeafened((v) => !v)}
        >
          <HeadphonesIcon width={16} height={16} />
        </IconToggle>
        <IconToggle label="User Settings" onClick={onOpenSettings}>
          <SettingsIcon width={16} height={16} />
        </IconToggle>
      </div>
    </div>
  );
}

function IconToggle({
  children,
  label,
  active,
  activeLabel,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  activeLabel?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={active ? (activeLabel ?? label) : label}
      aria-label={active ? (activeLabel ?? label) : label}
      aria-pressed={active}
      className={`grid h-8 w-8 place-items-center rounded-md transition ${
        active ? "bg-rose/15 text-rose" : "text-muted hover:bg-hover/70 hover:text-bright"
      }`}
    >
      {children}
    </button>
  );
}
