"use client";

import { useState } from "react";
import { Avatar } from "@/components/avatar";
import {
  HashIcon,
  SpeakerIcon,
  PlusIcon,
  MicOffIcon,
  ChevronIcon,
} from "@/components/icons";
import { UserPanel } from "@/components/user-panel";
import type { Channel, Profile, Server, VoiceState } from "@/lib/types";

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
}) {
  const textChannels = channels.filter((c) => c.kind === "text");
  const voiceChannels = channels.filter((c) => c.kind === "voice");
  const joinedVoice = voiceStates.find((v) => v.user_id === profile.id);

  return (
    <aside className="flex w-60 shrink-0 flex-col bg-ink">
      {/* Server header */}
      <button
        onClick={onCopyInvite}
        title="Copy invite link"
        className="group flex h-12 shrink-0 items-center justify-between border-b border-line/70 px-3.5 text-left transition hover:bg-hover/50"
      >
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-semibold tracking-tight text-bright">
            {server.name}
          </span>
          {server.is_default && (
            <span className="text-[10px] tracking-wide text-dim uppercase">
              Official server
            </span>
          )}
        </span>
        <span className="shrink-0 text-[10px] text-dim opacity-0 transition group-hover:opacity-100">
          copy invite
        </span>
      </button>

      <div className="scroll-thin flex-1 space-y-5 overflow-y-auto px-2 py-3">
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
          onAdd={() => onAddChannel("voice")}
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

      <UserPanel profile={profile} onOpenSettings={onOpenSettings} />
    </aside>
  );
}

function ChannelGroup({
  label,
  canManage,
  onAdd,
  children,
}: {
  label: string;
  kind: "text" | "voice";
  canManage: boolean;
  onAdd: () => void;
  children: React.ReactNode;
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
}: {
  icon: React.ReactNode;
  name: string;
  active: boolean;
  unread?: boolean;
  onClick: () => void;
  onJoin?: () => void;
  joinLabel?: string;
}) {
  return (
    <div
      className={`group flex items-center rounded-md transition ${
        active ? "bg-hover text-bright" : "text-muted hover:bg-hover/60 hover:text-bright"
      }`}
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
