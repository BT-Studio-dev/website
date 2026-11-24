"use client";

import { useState } from "react";
import { Avatar } from "@/components/avatar";
import { UserPanel } from "@/components/user-panel";
import { FriendsIcon, StoreIcon, CompassIcon, SearchIcon, PlusIcon } from "@/components/icons";
import { defaultGroupName } from "@/lib/naming";
import type {
  DmChannel,
  GroupDm,
  Presence,
  Profile,
  StatusDuration,
  VoiceSettings,
} from "@/lib/types";

export type HomeTab = "friends" | "store" | "discover";

const TABS: { id: HomeTab; label: string; icon: React.ReactNode }[] = [
  { id: "friends", label: "Friends", icon: <FriendsIcon width={19} height={19} /> },
  { id: "store", label: "Store", icon: <StoreIcon width={19} height={19} /> },
  { id: "discover", label: "Discover", icon: <CompassIcon width={19} height={19} /> },
];

export function HomeSidebar({
  profile,
  dms,
  activeDmId,
  tab,
  onChangeTab,
  onSelectDm,
  onOpenDm,
  onOpenSettings,
  onOpenAddFriend,
  onlineFriends,
  pendingCount,
  filter,
  onFilterChange,
  groups = [],
  activeGroupId = null,
  onSelectGroup,
  onOpenNewMessage,
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
  profile: Profile;
  dms: DmChannel[];
  activeDmId: string | null;
  tab: HomeTab;
  onChangeTab: (tab: HomeTab) => void;
  onSelectDm: (id: string) => void;
  onOpenDm: () => void;
  onOpenSettings: () => void;
  onOpenAddFriend: () => void;
  onlineFriends: number;
  pendingCount: number;
  filter: string;
  onFilterChange: (value: string) => void;
  /* ---- v4: group DMs + the shared user bar ---- */
  groups?: GroupDm[];
  activeGroupId?: string | null;
  onSelectGroup?: (id: string) => void;
  onOpenNewMessage?: () => void;
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
  return (
    <aside className="glass-panel flex w-60 shrink-0 flex-col border-r border-white/5">
      {/* Find or start a conversation */}
      <div className="shrink-0 p-2.5">
        <div className="flex items-center gap-1 rounded-md bg-void/60 px-2.5 py-1.5 text-[12.5px] ring-1 ring-line/70 focus-within:ring-blurple/50">
          <input
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
            placeholder="Find or start a conversation"
            aria-label="Find or start a conversation"
            className="w-full bg-transparent outline-none placeholder:text-dim"
          />
          <SearchIcon width={13} height={13} className="shrink-0 text-dim" />
        </div>
      </div>

      {/* Primary tabs */}
      <nav className="shrink-0 space-y-0.5 px-2">
        {TABS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChangeTab(item.id)}
              aria-current={active ? "page" : undefined}
              className={`group flex w-full items-center gap-3 rounded-md px-2 py-2 text-[14px] font-medium transition ${
                active
                  ? "bg-hover text-bright"
                  : "text-muted hover:bg-hover/50 hover:text-bright"
              }`}
            >
              <span className={active ? "text-bright" : "text-muted"}>{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
              {item.id === "friends" && (onlineFriends > 0 || pendingCount > 0) && (
                <span className="rounded-full bg-raised px-1.5 text-[10px] font-bold text-muted">
                  {onlineFriends + pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="my-2.5 shrink-0 px-3">
        <div className="h-px bg-line/70" />
      </div>

      {/* Direct messages */}
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="mb-1 flex shrink-0 items-center justify-between px-3.5">
          <h2 className="text-[11px] font-semibold tracking-widest text-dim uppercase">
            Direct Messages
          </h2>
          <button
            onClick={onOpenNewMessage ?? onOpenDm}
            title="Create DM or group DM"
            aria-label="Create DM or group DM"
            className="grid h-5 w-5 place-items-center rounded text-dim transition hover:bg-hover hover:text-bright"
          >
            <PlusIcon width={13} height={13} />
          </button>
        </header>

        <div className="scroll-thin min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
          {dms.length === 0 && (
            <p className="px-2 py-3 text-[12px] leading-relaxed text-dim">
              No conversations yet. Add a friend, then start a DM.
            </p>
          )}

          {groups.length > 0 && (
            <h3 className="mt-2 mb-1 px-2 text-[10.5px] font-bold tracking-[0.12em] text-dim/80 uppercase">
              Group Messages
            </h3>
          )}

          {groups.map((group) => {
            const members = group.members ?? [];
            const name = group.name || defaultGroupName(members, profile.id);
            const unread = (group.unread_count ?? 0) > 0;
            const active = group.id === activeGroupId;
            return (
              <button
                key={group.id}
                onClick={() => onSelectGroup?.(group.id)}
                aria-current={active ? "page" : undefined}
                title={`${name} · ${members.length} members`}
                className={`group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition ${
                  active ? "bg-hover" : "hover:bg-hover/50"
                }`}
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-raised">
                  {group.icon_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={group.icon_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <GroupInitials members={members} />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-[13.5px] ${
                      unread ? "font-semibold text-bright" : "font-medium text-muted group-hover:text-bright"
                    }`}
                  >
                    {name}
                  </span>
                  <span className="block truncate text-[11px] text-dim">
                    {group.last_message
                      ? group.last_message.author_id === profile.id
                        ? `You: ${group.last_message.content}`
                        : group.last_message.content
                      : `${members.length} members`}
                  </span>
                </span>
                {unread && (
                  <span className="grid h-4 min-w-4 shrink-0 place-items-center rounded-full bg-rose px-1 text-[10px] font-bold text-white">
                    {group.unread_count}
                  </span>
                )}
              </button>
            );
          })}

          {dms.map((dm) => {
            const peer = dm.peer;
            const name = peer?.display_name || peer?.username || "Unknown";
            const unread = (dm.unread_count ?? 0) > 0;
            const active = dm.id === activeDmId;

            return (
              <button
                key={dm.id}
                onClick={() => onSelectDm(dm.id)}
                aria-current={active ? "page" : undefined}
                className={`group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition ${
                  active ? "bg-hover" : "hover:bg-hover/50"
                }`}
              >
                <span className="relative shrink-0">
                  <Avatar
                    name={name}
                    src={peer?.avatar_url}
                    accent={peer?.accent_color}
                    size={32}
                    status={(peer?.status as Presence) ?? "offline"}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-1.5">
                    <span
                      className={`truncate text-[13.5px] ${
                        unread ? "font-semibold text-bright" : "font-medium text-muted group-hover:text-bright"
                      }`}
                    >
                      {name}
                    </span>
                  </span>
                  <span className="block truncate text-[11px] text-dim">
                    {(peer as { custom_status?: string | null })?.custom_status ||
                      (dm.last_message
                        ? dm.last_message.author_id === profile.id
                          ? `You: ${dm.last_message.content}`
                          : dm.last_message.content
                        : "No messages yet")}
                  </span>
                </span>
                {unread && (
                  <span className="grid h-4 min-w-4 shrink-0 place-items-center rounded-full bg-rose px-1 text-[10px] font-bold text-white">
                    {dm.unread_count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <UserPanel
        profile={profile}
        status={status}
        statusExpiresAt={statusExpiresAt}
        onSetStatus={onSetStatus}
        voice={voice}
        onVoiceChange={onVoiceChange}
        onOpenSettings={onOpenSettings}
        onOpenVoiceSettings={onOpenVoiceSettings}
        onOpenAddFriend={onOpenAddFriend}
        onOpenProfile={onOpenProfile}
        onSwitchAccounts={onSwitchAccounts}
        onCopyUserId={onCopyUserId}
        pendingCount={pendingCount}
        muted={muted}
        deafened={deafened}
        onToggleMute={onToggleMute}
        onToggleDeafen={onToggleDeafen}
        onPreviewSound={onPreviewSound}
      />
    </aside>
  );
}

export { defaultGroupName };

function GroupInitials({ members }: { members: { display_name?: string | null; username: string }[] }) {
  return (
    <span className="grid h-full w-full grid-cols-2 grid-rows-2 gap-px">
      {members.slice(0, 4).map((member, index) => (
        <span
          key={`${member.username}-${index}`}
          className="grid place-items-center bg-gradient-to-br from-blurple/70 to-blurple-soft/60 text-[8px] font-bold text-white"
        >
          {(member.display_name || member.username).slice(0, 1).toUpperCase()}
        </span>
      ))}
    </span>
  );
}
