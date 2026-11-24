"use client";

import { useRef, useState } from "react";
import { Avatar, presenceLabel } from "@/components/avatar";
import {
  ChevronDownIcon,
  DeviceIcon,
  FriendsIcon,
  HeadphonesIcon,
  MicIcon,
  MicOffIcon,
  SettingsIcon,
  VolumeIcon,
} from "@/components/icons";
import { MenuItem, MenuLabel, MenuSeparator, Popover } from "@/components/ui/popover";
import { UserMenu } from "@/components/user-menu";
import type { Presence, Profile, StatusDuration, VoiceSettings } from "@/lib/types";

/**
 * Bottom-left bar.
 *
 * The avatar opens the profile quick-action popover; the chevrons next to the
 * mic / headphones icons open device pickers with input & output volume
 * sliders and a link straight into Voice Settings.
 */
export function UserPanel({
  profile,
  status,
  statusExpiresAt,
  onSetStatus,
  voice,
  onVoiceChange,
  onOpenSettings,
  onOpenVoiceSettings,
  onOpenAddFriend,
  onOpenProfile,
  onSwitchAccounts,
  onCopyUserId,
  pendingCount = 0,
  muted: mutedProp,
  deafened: deafenedProp,
  onToggleMute,
  onToggleDeafen,
  onPreviewSound,
}: {
  profile: Profile;
  status?: Presence;
  statusExpiresAt?: string | null;
  onSetStatus?: (status: Presence, duration: StatusDuration) => void;
  voice?: VoiceSettings;
  onVoiceChange?: (patch: Partial<VoiceSettings>) => void;
  onOpenSettings: () => void;
  onOpenVoiceSettings?: () => void;
  onOpenAddFriend?: () => void;
  onOpenProfile?: () => void;
  onSwitchAccounts?: () => void;
  onCopyUserId?: () => void;
  pendingCount?: number;
  muted?: boolean;
  deafened?: boolean;
  onToggleMute?: () => void;
  onToggleDeafen?: () => void;
  onPreviewSound?: (id: string) => void;
}) {
  const micRef = useRef<HTMLButtonElement>(null);
  const outRef = useRef<HTMLButtonElement>(null);
  const [micOpen, setMicOpen] = useState(false);
  const [outOpen, setOutOpen] = useState(false);
  const [localMuted, setLocalMuted] = useState(false);
  const [localDeafened, setLocalDeafened] = useState(false);

  const muted = mutedProp ?? localMuted;
  const deafened = deafenedProp ?? localDeafened;
  const toggleMute = onToggleMute ?? (() => setLocalMuted((v) => !v));
  const toggleDeafen = onToggleDeafen ?? (() => setLocalDeafened((v) => !v));

  const currentStatus = status ?? profile.status;
  const inputVolume = voice?.inputVolume ?? 72;
  const outputVolume = voice?.outputVolume ?? 85;
  const inputDevice = voice?.inputDevice ?? "Default — MacBook Pro Microphone";
  const outputDevice = voice?.outputDevice ?? "Default — MacBook Pro Speakers";

  const statusText =
    profile.custom_status || (profile.bio?.trim() ?? "") || presenceLabel(currentStatus);

  return (
    <div className="glass-bar relative flex shrink-0 items-center gap-0.5 border-t px-2 py-1.5">
      {onSetStatus ? (
        <UserMenu
          profile={profile}
          status={currentStatus}
          statusExpiresAt={statusExpiresAt}
          onSetStatus={onSetStatus}
          onOpenSettings={onOpenSettings}
          onOpenProfile={onOpenProfile ?? onOpenSettings}
          onSwitchAccounts={onSwitchAccounts ?? (() => undefined)}
          onCopyUserId={onCopyUserId ?? (() => undefined)}
        />
      ) : (
        <button
          onClick={onOpenSettings}
          className="group flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left transition hover:bg-white/8"
        >
          <Avatar
            name={profile.display_name}
            src={profile.avatar_url}
            accent={profile.accent_color}
            size={32}
            status={currentStatus}
          />
          <span className="min-w-0">
            <span className="block truncate text-[13px] leading-tight font-semibold text-bright">
              {profile.display_name}
            </span>
            <span className="block truncate text-[11px] leading-tight text-dim">{statusText}</span>
          </span>
        </button>
      )}

      {onOpenAddFriend && (
        <button
          onClick={onOpenAddFriend}
          title={pendingCount > 0 ? `${pendingCount} pending friend requests` : "Add a friend"}
          aria-label="Add a friend"
          className="relative grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted transition hover:bg-white/8 hover:text-bright"
        >
          <FriendsIcon width={17} height={17} />
          {pendingCount > 0 && (
            <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-rose" />
          )}
        </button>
      )}

      <div className="ml-auto flex shrink-0 items-center">
        {/* mic + device chevron */}
        <div className="flex items-center">
          <button
            onClick={toggleMute}
            title={muted ? "Unmute" : "Mute"}
            aria-label={muted ? "Unmute" : "Mute"}
            aria-pressed={muted}
            className={`grid h-8 w-8 place-items-center rounded-md transition ${
              muted ? "text-rose hover:bg-rose/15" : "text-muted hover:bg-white/8 hover:text-bright"
            }`}
          >
            {muted ? <MicOffIcon width={16} height={16} /> : <MicIcon width={16} height={16} />}
          </button>
          <button
            ref={micRef}
            onClick={() => setMicOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={micOpen}
            title="Input devices & volume"
            aria-label="Input devices and volume"
            className="grid h-5 w-3 place-items-center rounded text-dim transition hover:text-bright"
          >
            <ChevronDownIcon width={11} height={11} />
          </button>
        </div>

        {/* headphones + device chevron */}
        <div className="flex items-center">
          <button
            onClick={toggleDeafen}
            title={deafened ? "Undeafen" : "Deafen"}
            aria-label={deafened ? "Undeafen" : "Deafen"}
            aria-pressed={deafened}
            className={`grid h-8 w-8 place-items-center rounded-md transition ${
              deafened ? "text-rose hover:bg-rose/15" : "text-muted hover:bg-white/8 hover:text-bright"
            }`}
          >
            <HeadphonesIcon width={16} height={16} />
          </button>
          <button
            ref={outRef}
            onClick={() => setOutOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={outOpen}
            title="Output devices & volume"
            aria-label="Output devices and volume"
            className="grid h-5 w-3 place-items-center rounded text-dim transition hover:text-bright"
          >
            <ChevronDownIcon width={11} height={11} />
          </button>
        </div>

        <button
          onClick={onOpenSettings}
          title="User Settings"
          aria-label="User Settings"
          className="grid h-8 w-8 place-items-center rounded-md text-muted transition hover:bg-white/8 hover:text-bright"
        >
          <SettingsIcon width={16} height={16} />
        </button>
      </div>

      {/* --------------------------- input devices --------------------------- */}
      <Popover open={micOpen} onClose={() => setMicOpen(false)} anchor={micRef.current} width={276}>
        <MenuLabel>Input Device</MenuLabel>
        {[
          "Default — MacBook Pro Microphone",
          "Studio Display Microphone",
          "AirPods Pro",
          "BT Comms Virtual Mic",
        ].map((label) => (
          <MenuItem
            key={label}
            onSelect={() => {
              onVoiceChange?.({ inputDevice: label });
              setMicOpen(false);
            }}
            tone={inputDevice === label ? "accent" : "default"}
          >
            {label}
          </MenuItem>
        ))}
        <MenuSeparator />
        <div className="px-2.5 pb-2 pt-1">
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-muted">
            <span className="flex items-center gap-1.5">
              <VolumeIcon width={12} height={12} /> Input Volume
            </span>
            <span className="text-dim">{inputVolume}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={inputVolume}
            onChange={(e) => onVoiceChange?.({ inputVolume: Number(e.target.value) })}
            aria-label="Input volume"
            className="w-full accent-[var(--c-accent)]"
          />
          <button
            onClick={() => {
              setMicOpen(false);
              (onOpenVoiceSettings ?? onOpenSettings)();
            }}
            className="mt-1.5 w-full rounded-md border border-white/10 py-1.5 text-[12px] font-semibold text-bright transition hover:bg-white/10"
          >
            Voice Settings
          </button>
        </div>
      </Popover>

      {/* --------------------------- output devices -------------------------- */}
      <Popover open={outOpen} onClose={() => setOutOpen(false)} anchor={outRef.current} width={276}>
        <MenuLabel>Output Device</MenuLabel>
        {[
          "Default — MacBook Pro Speakers",
          "Studio Display Speakers",
          "AirPods Pro",
          "BT Comms Virtual Output",
        ].map((label) => (
          <MenuItem
            key={label}
            onSelect={() => {
              onVoiceChange?.({ outputDevice: label });
              setOutOpen(false);
            }}
            tone={outputDevice === label ? "accent" : "default"}
          >
            {label}
          </MenuItem>
        ))}
        <MenuSeparator />
        <div className="px-2.5 pb-2 pt-1">
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-muted">
            <span className="flex items-center gap-1.5">
              <VolumeIcon width={12} height={12} /> Output Volume
            </span>
            <span className="text-dim">{outputVolume}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={outputVolume}
            onChange={(e) => onVoiceChange?.({ outputVolume: Number(e.target.value) })}
            aria-label="Output volume"
            className="w-full accent-[var(--c-accent)]"
          />
          <div className="mt-2 grid grid-cols-3 gap-1">
            {[
              { id: "deafen", label: "Deafen" },
              { id: "mute", label: "Mute" },
              { id: "undeafen", label: "Undeafen" },
            ].map((sound) => (
              <button
                key={sound.id}
                onClick={() => onPreviewSound?.(sound.id)}
                className="rounded border border-white/10 py-1 text-[10.5px] font-semibold text-muted transition hover:bg-white/10 hover:text-bright"
              >
                {sound.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              setOutOpen(false);
              (onOpenVoiceSettings ?? onOpenSettings)();
            }}
            className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-md border border-white/10 py-1.5 text-[12px] font-semibold text-bright transition hover:bg-white/10"
          >
            <DeviceIcon width={12} height={12} /> Voice Settings
          </button>
        </div>
      </Popover>
    </div>
  );
}
