"use client";

import { useState } from "react";
import { Avatar } from "@/components/avatar";
import {
  HashIcon,
  SpeakerIcon,
  PlusIcon,
  MicOffIcon,
  ChevronIcon,
  CrownIcon,
  BoostIcon,
} from "@/components/icons";
import { UserPanel } from "@/components/user-panel";
import { ServerMenu, type ServerMenuAction } from "@/components/server-menu";
import type {
  Channel,
  Presence,
  Profile,
  Server,
  StatusDuration,
  VoiceSettings,
  VoiceState,
} from "@/lib/types";

export function ChannelSidebar({
  server,
  channels,
  activeChannelId,
  voiceStates,
  profile,
  canManage,
  onSelectChannel,
  onSelectVoice,
  onOpenSettings,
  onJoinVoice,
  onLeaveVoice,
  onAddChannel,
  onCopyInvite,
  onServerAction,
  onQuickCreate,
  isNewServer,
  showAllChannels = true,
  hideMutedChannels = false,
  onToggleShowAll,
  onToggleHideMuted,
  status,
  statusExpiresAt,
  onSetStatus,
  voice,
  onVoiceChange,
  onOpenVoiceSettings,
  onOpenProfile,
  onSwitchAccounts,
  onCopyUserId,
  muted,
  deafened,
  onToggleMute,
  onToggleDeafen,
  onPreviewSound,
}: {
  server: Server;
  channels: Channel[];
  activeChannelId: string;
  voiceStates: VoiceState[];
  profile: Profile;
  canManage: boolean;
  onSelectChannel: (id: string) => void;
  onSelectVoice: (id: string) => void;
  onOpenSettings: () => void;
  onJoinVoice: (channelId: string) => void;
  onLeaveVoice: () => void;
  onAddChannel: (kind: "text" | "voice") => void;
  onCopyInvite: () => void;
  onServerAction?: (action: ServerMenuAction) => void;
  /** The `+` next to a category header, scoped to that category. */
  onQuickCreate?: (category: string, kind: "text" | "voice") => void;
  isNewServer?: boolean;
  showAllChannels?: boolean;
  hideMutedChannels?: boolean;
  onToggleShowAll?: (next: boolean) => void;
  onToggleHideMuted?: (next: boolean) => void;
  status?: Presence;
  statusExpiresAt?: string | null;
  onSetStatus?: (status: Presence, duration: StatusDuration) => void;
  voice?: VoiceSettings;
  onVoiceChange?: (patch: Partial<VoiceSettings>) => void;
  onOpenVoiceSettings?: () => void;
  onOpenProfile?: () => void;
  onSwitchAccounts?: () => void;
  onCopyUserId?: () => void;
  muted?: boolean;
  deafened?: boolean;
  onToggleMute?: () => void;
  onToggleDeafen?: () => void;
  onPreviewSound?: (id: string) => void;
}) {
  const textChannels = channels.filter((c) => c.kind === "text");
  const voiceChannels = channels.filter((c) => c.kind === "voice");
  const joinedVoice = voiceStates.find((v) => v.user_id === profile.id);

  return (
    <aside className="glass-panel flex w-60 shrink-0 flex-col border-r border-subtle">
      {/* Server header */}
      <div className="flex h-12 shrink-0 items-center gap-1 border-b border-subtle px-2 shadow-sm">
        {canManage && (
          <ServerMenu
            serverName={server.name}
            canManage={canManage}
            showAllChannels={showAllChannels}
            hideMutedChannels={hideMutedChannels}
            onToggleAll={(next) => onToggleShowAll?.(next)}
            onToggleMuted={(next) => onToggleHideMuted?.(next)}
            onAction={(action) => onServerAction?.(action)}
          />
        )}
        {!canManage && (
          <button
            onClick={onCopyInvite}
            title="Copy invite link"
            className="flex min-w-0 flex-1 items-center rounded-md px-1 py-1 text-left transition hover:bg-hover/60"
          >
            <span className="min-w-0 flex-1 truncate text-[14px] font-semibold tracking-tight text-bright">
              {server.name}
            </span>
          </button>
        )}
        <button
          onClick={() => onServerAction?.("invite")}
          title="Invite people"
          aria-label="Invite people"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted transition hover:bg-hover/60 hover:text-bright"
        >
          <PlusIcon width={15} height={15} />
        </button>
      </div>

      <div className="scroll-auto flex-1 space-y-5 overflow-y-auto px-2 py-3">
        {isNewServer && <GetStartedBanner />}

        <ChannelGroup
          label="Information"
          kind="text"
          canManage={canManage}
          onAdd={() => (onQuickCreate ? onQuickCreate("Information", "text") : onAddChannel("text"))}
          collapsible
        >
          <ChannelRow
            active={false}
            icon={<BoostIcon width={15} height={15} />}
            name="server-guide"
            onClick={() => undefined}
            readOnly
          />
        </ChannelGroup>

        <ChannelGroup
          label="Text Channels"
          kind="text"
          canManage={canManage}
          onAdd={() => onAddChannel("text")}
        >
          {textChannels.map((channel) => (
            <ChannelRow
              key={channel.id}
              active={channel.id === activeChannelId}
              icon={<HashIcon width={15} height={15} />}
              name={channel.name}
              onClick={() => onSelectChannel(channel.id)}
              unread={channel.id !== activeChannelId}
            />
          ))}
          {textChannels.length === 0 && <EmptyHint label="No text channels yet" />}
        </ChannelGroup>

        <ChannelGroup
          label="Voice Channels"
          kind="voice"
          canManage={canManage}
          onAdd={() => (onQuickCreate ? onQuickCreate("Voice Channels", "voice") : onAddChannel("voice"))}
        >
          {voiceChannels.map((channel) => {
            const occupants = voiceStates.filter((v) => v.channel_id === channel.id);
            const joined = occupants.some((v) => v.user_id === profile.id);
            return (
              <div key={channel.id}>
                <ChannelRow
                  active={joined}
                  icon={<SpeakerIcon width={15} height={15} />}
                  name={channel.name}
                  onClick={() => onSelectVoice(channel.id)}
                  onJoin={joined ? onLeaveVoice : () => onJoinVoice(channel.id)}
                  joinLabel={joined ? "Leave" : "Join"}
                />
                {occupants.length > 0 && (
                  <ul className="mt-0.5 mb-1 ml-3 space-y-0.5">
                    {occupants.map((occupant) => {
                      const name =
                        occupant.profile?.display_name ??
                        occupant.profile?.username ??
                        "Member";
                      return (
                        <li
                          key={occupant.user_id}
                          className="flex items-center gap-1.5 rounded px-1.5 py-1"
                        >
                          <Avatar
                            name={name}
                            src={occupant.profile?.avatar_url}
                            accent={occupant.profile?.accent_color}
                            size={20}
                          />
                          <span className="truncate text-[12px] text-muted">{name}</span>
                          {occupant.muted && (
                            <MicOffIcon width={12} height={12} className="ml-auto text-rose" />
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
          {voiceChannels.length === 0 && <EmptyHint label="No voice channels yet" />}
        </ChannelGroup>
      </div>

      {joinedVoice && (
        <div className="border-t border-line/70 px-2 py-2">
          <div className="flex items-center justify-between gap-2 rounded-lg border border-mint/25 bg-mint/10 px-2.5 py-2">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-widest text-mint uppercase">
                Voice connected
              </p>
              <p className="truncate text-[12px] text-bright">
                {channels.find((c) => c.id === joinedVoice.channel_id)?.name}
              </p>
            </div>
            <button
              onClick={onLeaveVoice}
              className="shrink-0 rounded-md bg-rose/20 px-2 py-1 text-[11px] font-semibold text-rose transition hover:bg-rose/30"
            >
              Leave
            </button>
          </div>
        </div>
      )}

      <UserPanel
        profile={profile}
        status={status}
        statusExpiresAt={statusExpiresAt}
        onSetStatus={onSetStatus}
        voice={voice}
        onVoiceChange={onVoiceChange}
        onOpenSettings={onOpenSettings}
        onOpenVoiceSettings={onOpenVoiceSettings}
        onOpenProfile={onOpenProfile}
        onSwitchAccounts={onSwitchAccounts}
        onCopyUserId={onCopyUserId}
        muted={muted}
        deafened={deafened}
        onToggleMute={onToggleMute}
        onToggleDeafen={onToggleDeafen}
        onPreviewSound={onPreviewSound}
      />
    </aside>
  );
}

function ChannelGroup({
  label,
  canManage,
  onAdd,
  children,
  collapsible,
}: {
  label: string;
  kind: "text" | "voice";
  canManage: boolean;
  onAdd: () => void;
  children: React.ReactNode;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(true);

  return (
    <section>
      <header className="mb-1 flex items-center justify-between px-1.5">
        <button
          onClick={() => setOpen((v) => !v)}
          className="group flex items-center gap-1 text-[11px] font-semibold tracking-widest text-dim uppercase transition hover:text-muted"
          aria-expanded={open}
        >
          <ChevronIcon
            width={11}
            height={11}
            className={`transition-transform ${open ? "rotate-90" : ""}`}
          />
          {label}
        </button>
        {canManage && (
          <button
            onClick={onAdd}
            title={`Create ${label.toLowerCase()}`}
            aria-label={`Create ${label.toLowerCase()}`}
            className="grid h-5 w-5 place-items-center rounded text-dim transition hover:bg-hover hover:text-bright"
          >
            <PlusIcon width={13} height={13} />
          </button>
        )}
      </header>
      {open && <div className="space-y-0.5">{children}</div>}
    </section>
  );
}

function ChannelRow({
  icon,
  name,
  active,
  unread,
  onClick,
  onJoin,
  joinLabel,
  readOnly,
}: {
  icon: React.ReactNode;
  name: string;
  active: boolean;
  unread?: boolean;
  onClick: () => void;
  onJoin?: () => void;
  joinLabel?: string;
  readOnly?: boolean;
}) {
  return (
    <div
      className={`group flex items-center rounded-md transition ${
        active ? "bg-hover/55 text-bright" : "text-muted hover:bg-hover/60 hover:text-bright"
      } ${readOnly ? "opacity-60" : ""}`}
    >
      <button
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-1.5 px-1.5 py-1.5 text-left text-[13.5px]"
      >
        <span className="shrink-0 opacity-70">{icon}</span>
        <span className="truncate">{name}</span>
        {!active && unread && (
          <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-bright/70 opacity-0 transition group-hover:opacity-100" />
        )}
      </button>
      {onJoin && (
        <button
          onClick={onJoin}
          className="mr-1 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold text-mint opacity-0 transition group-hover:opacity-100 hover:bg-mint/15"
        >
          {joinLabel}
        </button>
      )}
    </div>
  );
}



function EmptyHint({ label }: { label: string }) {
  return <p className="px-2 py-1 text-[11px] text-dim/80">{label}</p>;
}

/** Shown in freshly created servers until the owner dismisses onboarding. */
function GetStartedBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="relative overflow-hidden rounded-lg border border-mint/30 bg-gradient-to-br from-mint/20 to-blurple/15 p-2.5">
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss Get Started"
        className="absolute top-1 right-1 grid h-4 w-4 place-items-center rounded text-mint/70 hover:text-white"
      >
        ×
      </button>
      <p className="flex items-center gap-1 text-[11.5px] font-bold text-bright">
        <CrownIcon width={12} height={12} className="text-amber" /> Get Started
      </p>
      <p className="mt-0.5 text-[10.5px] leading-snug text-muted">
        Set up your server and invite your friends.
      </p>
    </div>
  );
}
