"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { Popover } from "@/components/ui/popover";
import {
  CameraIcon,
  CheckIcon,
  CloseIcon,
  CrownIcon,
  HeadphonesIcon,
  MicIcon,
  MicOffIcon,
  MoreIcon,
  SettingsIcon,
  SpeakerIcon,
  UsersIcon,
  VolumeIcon,
} from "@/components/icons";
import { SOUNDBOARD, SOUND_GROUPS, playSound, type SoundId } from "@/lib/soundboard";
import type { Profile, VoiceState } from "@/lib/types";

export type VoicePreferences = {
  gridView: boolean;
  showNonVideo: boolean;
  showPreviews: boolean;
};

const DEFAULT_PREFS: VoicePreferences = {
  gridView: true,
  showNonVideo: true,
  showPreviews: true,
};

const PREFS_KEY = "btcomms.voiceView.v1";

function readPrefs(): VoicePreferences {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<VoicePreferences>) };
  } catch {
    return DEFAULT_PREFS;
  }
}

/* --------------------------------- icons -------------------------------- */

function ShareScreenIcon({ width = 18, height = 18 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2.5" y="4" width="19" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 20.5h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M12 17.5v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M9.5 8.6 12 11l2.5-2.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SoundboardIcon({ width = 18, height = 18 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="7.5" height="7.5" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17.25" cy="17.25" r="3.75" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function SmileIcon({ width = 18, height = 18 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="9" cy="10" r="1.1" fill="currentColor" />
      <circle cx="15" cy="10" r="1.1" fill="currentColor" />
      <path d="M8.4 14.2a4.2 4.2 0 0 0 7.2 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------ control bar ------------------------------ */

function ControlButton({
  label,
  active,
  danger,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition ${
        danger
          ? "bg-rose/20 text-rose hover:bg-rose/30"
          : active
            ? "bg-blurple text-white hover:brightness-110"
            : "bg-hover/50 text-muted hover:bg-hover hover:text-bright"
      }`}
    >
      {children}
    </button>
  );
}

/* ------------------------------ the panel ------------------------------- */

export function VoiceRoomPanel({
  channelName,
  occupants,
  viewerId,
  muted,
  deafened,
  onToggleMute,
  onToggleDeafen,
  onLeave,
  onOpenSettings,
  onFlash,
  soundboardVolume = 65,
  isPro = false,
  localScreen,
  screenOwnerId,
  screenHint,
  onStartScreen,
  onStopScreen,
  remoteVideo,
  cameraOn,
  onToggleCamera,
  onOpenMembers,
  openBoardSignal,
}: {
  channelName: string;
  occupants: VoiceState[];
  viewerId: string;
  muted: boolean;
  deafened: boolean;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onLeave: () => void;
  onOpenSettings: () => void;
  onFlash: (message: string) => void;
  soundboardVolume?: number;
  isPro?: boolean;
  /** The local capture, when this user is sharing. */
  localScreen?: MediaStream | null;
  /** user_id of whoever is sharing right now, if anyone. */
  screenOwnerId?: string | null;
  /** Post-capture advice ("you're mirroring this tab"). */
  screenHint?: string | null;
  onStartScreen: () => void;
  onStopScreen: () => void;
  /** Remote peer's video stream, if one arrived. */
  remoteVideo?: { userId: string; stream: MediaStream } | null;
  cameraOn: boolean;
  onToggleCamera: () => void;
  onOpenMembers?: () => void;
  /**
   * Increment to open the soundboard from outside (Ctrl+Shift+B). A counter
   * rather than a boolean keeps repeat presses working.
   */
  openBoardSignal?: number;
}) {
  const [prefs, setPrefs] = useState<VoicePreferences>(DEFAULT_PREFS);
  const [menuOpen, setMenuOpen] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);
  const menuAnchor = useRef<HTMLSpanElement>(null);
  const boardAnchor = useRef<HTMLSpanElement>(null);

  useEffect(() => setPrefs(readPrefs()), []);

  const patchPrefs = useCallback((patch: Partial<VoicePreferences>) => {
    setPrefs((current) => {
      const next = { ...current, ...patch };
      try {
        window.localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {
        /* storage is full or blocked — the in-memory value still applies */
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (openBoardSignal) setBoardOpen(true);
  }, [openBoardSignal]);

  const visibleOccupants = useMemo(
    () =>
      prefs.showNonVideo
        ? occupants
        : occupants.filter((o) => o.user_id === screenOwnerId || o.user_id === viewerId),
    [occupants, prefs.showNonVideo, screenOwnerId, viewerId],
  );

  const sharing = Boolean(screenOwnerId);
  const sharerName = (userId: string) =>
    occupants.find((o) => o.user_id === userId)?.profile?.display_name ??
    occupants.find((o) => o.user_id === userId)?.profile?.username ??
    "Someone";

  const playing = (id: SoundId) => {
    if (deafened) {
      onFlash("You're deafened — undeafen to hear the soundboard.");
      return;
    }
    const ok = playSound(id, { volume: soundboardVolume });
    if (!ok) onFlash("This browser blocked audio playback.");
  };

  return (
    <section className="ambient-stage flex min-w-0 flex-1 flex-col">
      <header className="glass-bar flex h-12 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
        <SpeakerIcon width={17} height={17} className="shrink-0 text-muted" />
        <h2 className="min-w-0 truncate text-[14.5px] font-semibold tracking-tight text-bright">
          {channelName}
        </h2>
        <span className="ml-1 hidden shrink-0 rounded-full bg-mint/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-mint sm:inline">
          {occupants.length} connected
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {onOpenMembers && (
            <button
              type="button"
              onClick={onOpenMembers}
              title="Toggle member list"
              aria-label="Toggle member list"
              className="grid h-8 w-8 place-items-center rounded-md text-muted transition hover:bg-hover/60 hover:text-bright"
            >
              <UsersIcon width={17} height={17} />
            </button>
          )}
        </div>
      </header>

      {screenHint && (
        <div className="flex shrink-0 items-start gap-2 border-b border-amber/25 bg-amber/10 px-3 py-2 text-[12px] text-amber sm:px-4">
          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-amber" />
          <p className="min-w-0 flex-1">{screenHint}</p>
        </div>
      )}

      <div className="scroll-auto min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
        <div
          className={
            prefs.gridView
              ? "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
              : "flex flex-col gap-2"
          }
        >
          {/* Local screen share takes the widest tile. */}
          {localScreen && (
            <ScreenTile
              stream={localScreen}
              label={`${sharerName(viewerId)} (you)`}
              muted
              wide={prefs.gridView}
              // Blur our own monitor while we are the ones mirroring: that is
              // what turns an infinite reflection into a soft gradient.
              blurred={Boolean(screenHint)}
            />
          )}

          {remoteVideo && (
            <ScreenTile
              stream={remoteVideo.stream}
              label={sharerName(remoteVideo.userId)}
              wide={prefs.gridView}
            />
          )}

          {!localScreen && !remoteVideo && screenOwnerId && (
            <div className="grid aspect-video place-items-center rounded-xl border border-line/70 bg-void/60 text-center">
              <div>
                <p className="text-[13px] font-semibold text-bright">
                  {sharerName(screenOwnerId)} is sharing their screen
                </p>
                <p className="mt-1 text-[11.5px] text-dim">
                  Waiting for the peer connection to deliver video…
                </p>
              </div>
            </div>
          )}

          {visibleOccupants.map((occupant) => {
            const name =
              occupant.profile?.display_name ?? occupant.profile?.username ?? "Member";
            const self = occupant.user_id === viewerId;
            return (
              <div
                key={occupant.user_id}
                className="relative flex aspect-video flex-col items-center justify-center rounded-xl border border-line/60 bg-gradient-to-br from-surface/70 to-void/70 p-3"
              >
                <Avatar
                  name={name}
                  src={occupant.profile?.avatar_url}
                  accent={occupant.profile?.accent_color}
                  size={56}
                />
                <p className="mt-2 max-w-full truncate text-[12.5px] font-semibold text-bright">
                  {name}
                  {self && <span className="text-dim"> (you)</span>}
                </p>
                {occupant.muted && (
                  <span className="absolute top-2 right-2 grid h-6 w-6 place-items-center rounded-full bg-void/80 text-rose">
                    <MicOffIcon width={12} height={12} />
                  </span>
                )}
              </div>
            );
          })}

          {visibleOccupants.length === 0 && !localScreen && !remoteVideo && (
            <div className="grid aspect-video place-items-center rounded-xl border border-dashed border-line text-center">
              <div>
                <p className="text-[13px] font-semibold text-bright">No one else is here yet</p>
                <p className="mt-1 text-[11.5px] text-dim">Invite a friend to this channel.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ---------------------------- control bar --------------------------- */}
      <div className="glass-bar flex shrink-0 flex-wrap items-center justify-center gap-2 border-t px-3 py-3">
        <ControlButton
          label={muted ? "Unmute" : "Mute"}
          active={!muted}
          danger={muted}
          onClick={onToggleMute}
        >
          {muted ? <MicOffIcon width={17} height={17} /> : <MicIcon width={17} height={17} />}
        </ControlButton>

        <ControlButton
          label={deafened ? "Undeafen" : "Deafen"}
          danger={deafened}
          onClick={onToggleDeafen}
        >
          <HeadphonesIcon width={17} height={17} />
        </ControlButton>

        <ControlButton
          label={cameraOn ? "Turn off camera" : "Turn on camera"}
          active={cameraOn}
          onClick={onToggleCamera}
        >
          <CameraIcon width={17} height={17} />
        </ControlButton>

        <ControlButton
          label={sharing ? "Stop sharing" : "Share your screen"}
          active={sharing}
          onClick={sharing ? onStopScreen : onStartScreen}
        >
          <ShareScreenIcon />
        </ControlButton>

        <span ref={boardAnchor} className="inline-flex">
          <ControlButton
            label="Soundboard"
            active={boardOpen}
            onClick={() => setBoardOpen((v) => !v)}
          >
            <SoundboardIcon />
          </ControlButton>
        </span>

        <ControlButton label="Leave voice" danger onClick={onLeave}>
          <CloseIcon width={17} height={17} />
        </ControlButton>

        <span ref={menuAnchor} className="inline-flex">
          <ControlButton label="Voice settings" active={menuOpen} onClick={() => setMenuOpen((v) => !v)}>
            <MoreIcon width={17} height={17} />
          </ControlButton>
        </span>
      </div>

      {/* --------------------------- overflow menu -------------------------- */}
      <Popover
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        anchor={menuAnchor.current}
        width={252}
        side="top"
      >
        <div className="p-1.5">
          <MenuItem
            label="Grid View"
            checked={prefs.gridView}
            onClick={() => patchPrefs({ gridView: !prefs.gridView })}
          />
          <MenuItem
            label="Show Non-Video Participants"
            checked={prefs.showNonVideo}
            onClick={() => patchPrefs({ showNonVideo: !prefs.showNonVideo })}
          />
          <MenuItem
            label="Show New Message Previews"
            checked={prefs.showPreviews}
            onClick={() => patchPrefs({ showPreviews: !prefs.showPreviews })}
          />
          <div className="my-1 h-px bg-line/70" />
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onOpenSettings();
            }}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12.5px] font-medium text-muted transition hover:bg-blurple hover:text-white"
          >
            <SettingsIcon width={14} height={14} />
            Voice &amp; Video Settings
          </button>
        </div>
      </Popover>

      {/* ---------------------------- soundboard ---------------------------- */}
      <Popover
        open={boardOpen}
        onClose={() => setBoardOpen(false)}
        anchor={boardAnchor.current}
        width={320}
        side="top"
      >
        <div className="p-2">
          <div className="mb-1 flex items-center justify-between px-1">
            <p className="text-[11px] font-bold tracking-[0.14em] text-dim uppercase">
              Soundboard
            </p>
            <span className="flex items-center gap-1 text-[10.5px] font-medium text-muted">
              <VolumeIcon width={12} height={12} /> {soundboardVolume}%
            </span>
          </div>

          {SOUND_GROUPS.map((group) => {
            const items = SOUNDBOARD.filter((sound) => sound.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group} className="mb-1.5">
                <p className="px-1 pt-1 pb-1 text-[10px] font-semibold tracking-wider text-dim uppercase">
                  {group}
                </p>
                <div className="grid grid-cols-4 gap-1">
                  {items.map((sound) => {
                    const locked = sound.premium && !isPro;
                    return (
                      <button
                        key={sound.id}
                        type="button"
                        title={
                          locked
                            ? `${sound.name} — BT Pro required`
                            : `${sound.name} · ${sound.duration.toFixed(1)}s`
                        }
                        aria-label={locked ? `${sound.name} (BT Pro)` : sound.name}
                        onClick={() => {
                          if (locked) {
                            onFlash(`${sound.name} is a BT Pro sound — upgrade to unlock it.`);
                            return;
                          }
                          playing(sound.id);
                        }}
                        className={`relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-md text-[15px] transition ${
                          locked
                            ? "bg-void/50 opacity-60 hover:opacity-90"
                            : "bg-hover/45 hover:bg-blurple/30 active:scale-95"
                        }`}
                      >
                        <span>{sound.emoji}</span>
                        <span className="max-w-full truncate px-0.5 text-[9px] font-medium text-muted">
                          {sound.name}
                        </span>
                        {locked && (
                          <span className="absolute top-0.5 right-0.5 text-[8px] text-amber">
                            <CrownIcon width={9} height={9} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {!isPro && (
            <button
              type="button"
              onClick={() =>
                onFlash("BT Pro unlocks premium sounds — open Settings → BT Pro to upgrade.")
              }
              className="mt-1 flex w-full items-center gap-2 rounded-md bg-gradient-to-r from-blurple/30 to-blurple-soft/20 px-2.5 py-2 text-left transition hover:brightness-110"
            >
              <CrownIcon width={15} height={15} className="shrink-0 text-amber" />
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-bold text-bright">Get Nitro</span>
                <span className="block text-[10.5px] text-muted">
                  Unlock premium sounds with BT Pro.
                </span>
              </span>
              <span className="shrink-0 text-[11px] font-semibold text-bright">→</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setBoardOpen(false);
              onOpenSettings();
            }}
            className="mt-1 flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-[11.5px] text-muted transition hover:text-bright"
          >
            <SmileIcon width={13} height={13} /> Soundboard volume in Voice &amp; Video
          </button>
        </div>
      </Popover>
    </section>
  );
}

/* -------------------------------- pieces -------------------------------- */

function MenuItem({
  label,
  checked,
  onClick,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={checked}
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12.5px] font-medium text-muted transition hover:bg-blurple hover:text-white"
    >
      <span className="min-w-0 flex-1">{label}</span>
      {checked && <CheckIcon width={13} height={13} className="shrink-0 text-mint" />}
    </button>
  );
}

/**
 * A live <video> for a screen share.
 *
 * Muted whenever the stream belongs to us — otherwise the mic loop would
 * echo back through the local speakers.
 */
function ScreenTile({
  stream,
  label,
  muted = false,
  wide,
  blurred = false,
}: {
  stream: MediaStream;
  label: string;
  muted?: boolean;
  wide?: boolean;
  /** Softens the local monitor while it is mirroring itself. */
  blurred?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;
    element.srcObject = stream;
    const play = () => {
      void element.play().catch(() => undefined);
    };
    play();
    return () => {
      element.srcObject = null;
    };
  }, [stream]);

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-line bg-black ${
        wide ? "sm:col-span-2 xl:col-span-2" : ""
      }`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={`aspect-video w-full bg-black object-contain transition ${
          blurred ? "scale-105 blur-md" : ""
        }`}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-2 p-2">
        <span className="flex items-center gap-1.5 rounded-full bg-rose px-2 py-0.5 text-[10px] font-bold tracking-[0.1em] text-white">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
          LIVE
        </span>
        <span className="rounded bg-void/75 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-bright">
          720P 30FPS
        </span>
      </div>
      <p className="absolute bottom-0 left-0 max-w-full truncate bg-gradient-to-t from-black/80 to-transparent px-2 pt-4 pb-1.5 text-[11.5px] font-semibold text-white">
        {label}
      </p>
    </div>
  );
}
