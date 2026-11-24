"use client";

import { useState } from "react";
import { Avatar } from "@/components/avatar";
import {
  HeadphonesIcon,
  MicIcon,
  MicOffIcon,
  SettingsIcon,
  LogoutIcon,
} from "@/components/icons";
import type { Profile } from "@/lib/types";

export function UserPanel({
  profile,
  onOpenSettings,
}: {
  profile: Profile;
  onOpenSettings: () => void;
}) {
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);

  return (
    <div className="flex items-center gap-1.5 border-t border-line/70 bg-abyss px-2 py-2">
      <button
        onClick={onOpenSettings}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1 text-left transition hover:bg-hover/60"
        title="Edit profile"
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
            @{profile.username}
          </span>
        </span>
      </button>

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
          <HeadphonesIcon
            width={16}
            height={16}
            className={deafened ? "opacity-60" : undefined}
          />
        </IconToggle>
        <IconToggle label="User settings" onClick={onOpenSettings}>
          <SettingsIcon width={16} height={16} />
        </IconToggle>
        <form action="/auth/signout" method="post" className="contents">
          <button
            type="submit"
            title="Log out"
            aria-label="Log out"
            className="grid h-8 w-8 place-items-center rounded-md text-muted transition hover:bg-rose/15 hover:text-rose"
          >
            <LogoutIcon width={16} height={16} />
          </button>
        </form>
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
        active
          ? "bg-rose/15 text-rose"
          : "text-muted hover:bg-hover/70 hover:text-bright"
      }`}
    >
      {children}
    </button>
  );
}
