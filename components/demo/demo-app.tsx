"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ServerRail } from "@/components/server-rail";
import { ChannelSidebar } from "@/components/channel-sidebar";
import { DemoMessageFeed } from "@/components/demo/demo-message-feed";
import { MemberList } from "@/components/member-list";
import { Modal } from "@/components/modal";
import { Avatar } from "@/components/avatar";
import { HomeSidebar, type HomeTab } from "@/components/home-sidebar";
import { FriendsView, ActiveNowPanel } from "@/components/friends-view";
import { DmView } from "@/components/dm-view";
import { AppearancePanel, EditProfilesPanel } from "@/components/settings/appearance-panel";
import { SettingsNav, type SettingsSectionId } from "@/components/settings/settings-nav";
import { SettingsButton, SettingsCard } from "@/components/settings/primitives";
import { AppearanceProvider } from "@/lib/appearance";
import {
  CheckIcon,
  CloseIcon,
  CopyIcon,
  HashIcon,
  SpeakerIcon,
} from "@/components/icons";
import {
  demoStore,
  demoFriends,
  demoDms,
  demoActivities,
  demoSocial,
  DEMO_USER_ID,
} from "@/lib/demo";
import type {
  ActiveActivity,
  Channel,
  DirectMessage,
  DmChannel,
  Message,
  Presence,
  ServerMember,
  VoiceState,
} from "@/lib/types";
import type { FriendEntry, FriendRequest } from "@/lib/social";

type Dialog = "server" | "invite" | "channel" | "explore" | "newdm" | null;

/**
 * Offline demo of the workspace. Mirrors the real app's layout and
 * interactions but keeps all state in memory.
 */
export function DemoApp({
  serverId,
  channelId,
  reason,
}: {
  serverId?: string;
  channelId?: string;
  reason: string;
}) {
  const [, forceRender] = useState(0);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [showMembers, setShowMembers] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [bannerVisible, setBannerVisible] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const me = demoStore.profile;

  const startingHome = serverId === "@me" || !serverId;
  const [view, setView] = useState<"home" | "server">(
    startingHome && serverId === "@me" ? "home" : "server",
  );
  const [homeTab, setHomeTab] = useState<HomeTab>("friends");
  const [activeDmId, setActiveDmId] = useState<string | null>(null);
  const [homeFilter, setHomeFilter] = useState("");

  const [activeServerId, setActiveServerId] = useState(
    serverId && demoStore.servers.some((s) => s.id === serverId)
      ? serverId
      : demoStore.servers[0].id,
  );

  const channels = demoStore.channelsOf(activeServerId);
  const [activeChannelId, setActiveChannelId] = useState(
    channelId && channels.some((c) => c.id === channelId)
      ? channelId
      : (channels.find((c) => c.kind === "text")?.id ?? channels[0]?.id ?? ""),
  );

  const server = demoStore.servers.find((s) => s.id === activeServerId)!;
  const activeChannel =
    channels.find((c) => c.id === activeChannelId) ??
    channels.find((c) => c.kind === "text") ??
    channels[0];
  const messages: Message[] = activeChannel ? demoStore.messagesOf(activeChannel.id) : [];
  const members: ServerMember[] = demoStore.membersOf(activeServerId);
  const voiceStates: VoiceState[] = demoStore.voice;

  const canManage = members.some(
    (m) => m.user_id === DEMO_USER_ID && (m.role === "owner" || m.role === "admin"),
  );

  const flash = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast((c) => (c === message ? null : c)), 2400);
  }, []);

  // Re-render whenever the demo store mutates; also run the ambient bot.
  useEffect(() => {
    const unsubscribe = demoStore.subscribe(() => forceRender((n) => n + 1));
    demoStore.startAmbient();
    return () => {
      unsubscribe();
      demoStore.stopAmbient();
    };
  }, []);

  useEffect(() => {
    if (serverId && serverId !== "@me") return;
    const first = channels.find((c) => c.kind === "text");
    if (first && !channelId) setActiveChannelId(first.id);
  }, [channels, serverId, channelId]);

  /* ----------------------------- social data ----------------------------- */
  const friends: FriendEntry[] = useMemo(
    () =>
      demoFriends
        .filter((f) => !f.request)
        .map((f) => ({
          friendshipId: f.id,
          profile: { ...f.profile, status: f.profile.status ?? "offline" },
          since: new Date().toISOString(),
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [demoFriends.length, demoFriends.map((f) => f.request).join(",")],
  );

  const incoming: FriendRequest[] = useMemo(
    () =>
      demoFriends
        .filter((f) => f.request === "incoming")
        .map((f) => ({
          id: f.id,
          direction: "incoming" as const,
          profile: f.profile,
          created_at: new Date().toISOString(),
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [demoFriends.map((f) => f.request).join(",")],
  );

  const outgoing: FriendRequest[] = useMemo(
    () =>
      demoFriends
        .filter((f) => f.request === "outgoing")
        .map((f) => ({
          id: f.id,
          direction: "outgoing" as const,
          profile: f.profile,
          created_at: new Date().toISOString(),
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [demoFriends.map((f) => f.request).join(",")],
  );

  const dmChannels: DmChannel[] = useMemo(
    () =>
      demoDms.map((dm) => ({
        id: dm.id,
        user_a: DEMO_USER_ID,
        user_b: dm.peer.id,
        pair_key: [DEMO_USER_ID, dm.peer.id].sort().join(":"),
        created_at: new Date().toISOString(),
        last_message_at: dm.messages[dm.messages.length - 1]?.created_at ?? new Date().toISOString(),
        peer: { ...dm.peer, status: dm.peer.status ?? "offline" },
        last_message: dm.messages[dm.messages.length - 1] ?? null,
        unread_count: dm.unread,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [demoDms.map((d) => `${d.id}:${d.messages.length}`).join(",")],
  );

  const dmMessages: DirectMessage[] = useMemo(() => {
    const dm = demoDms.find((d) => d.id === activeDmId);
    if (!dm) return [];
    return dm.messages.map((m) => ({
      id: m.id,
      dm_channel_id: dm.id,
      author_id: m.author_id,
      content: m.content,
      created_at: m.created_at,
      edited_at: null,
      read_at: null,
      author:
        m.author_id === DEMO_USER_ID
          ? { id: me.id, username: me.username, display_name: me.display_name, avatar_url: me.avatar_url, accent_color: me.accent_color }
          : { id: dm.peer.id, username: dm.peer.username, display_name: dm.peer.display_name, avatar_url: dm.peer.avatar_url, accent_color: dm.peer.accent_color },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDmId, demoDms.map((d) => d.messages.length).join(","), me]);

  const activities = demoActivities as Record<string, ActiveActivity>;
  const activeNow = friends
    .filter((f) => activities[f.profile.id])
    .map((f) => ({ friend: f, activity: activities[f.profile.id] }));

  const onlineFriends = friends.filter((f) => (f.profile.status ?? "offline") !== "offline");

  /* ------------------------------ navigation ----------------------------- */
  const selectChannel = (id: string) => setActiveChannelId(id);

  const switchServer = (id: string) => {
    setView("server");
    setActiveServerId(id);
    setActiveDmId(null);
    const list = demoStore.channelsOf(id);
    setActiveChannelId(list.find((c) => c.kind === "text")?.id ?? list[0]?.id ?? "");
  };

  const openHome = () => {
    setView("home");
    setActiveDmId(null);
    setHomeTab("friends");
  };

  const openDm = (dmId: string) => {
    setView("home");
    setHomeTab("friends");
    setActiveDmId(dmId);
  };

  // form state
  const [serverName, setServerName] = useState("");
  const [serverIcon, setServerIcon] = useState("🚀");
  const [channelName, setChannelName] = useState("");
  const [channelTopic, setChannelTopic] = useState("");
  const [channelKind, setChannelKind] = useState<"text" | "voice">("text");
  const [status, setStatus] = useState<Presence>(me.status);
  const [joiningCode, setJoiningCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const memberCount = members.length;

  const memberRows = useMemo(
    () =>
      members.map((member) =>
        member.user_id === DEMO_USER_ID && member.profile
          ? { ...member, profile: me }
          : member,
      ),
    [members, me],
  );

  const activeDm = dmChannels.find((d) => d.id === activeDmId) ?? null;

  return (
    <AppearanceProvider
      initial={{
        theme_id: me.theme_id,
        message_density: me.message_density,
        reduce_motion: me.reduce_motion,
        reduced_saturation: me.reduced_saturation,
        font_scale: me.font_scale,
      }}
    >
      <div className="flex h-dvh w-full flex-col overflow-hidden">
        {bannerVisible && (
          <div className="flex shrink-0 items-center gap-2 border-b border-amber/25 bg-amber/10 px-3 py-1.5 text-[11.5px] text-amber">
            <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-amber" />
            <p className="min-w-0 flex-1 truncate">
              <span className="font-semibold">Demo mode</span> —{" "}
              {reason === "requested"
                ? "you're exploring an in-memory snapshot of the workspace."
                : reason === "offline"
                  ? "Supabase isn't reachable from this browser, so you're exploring an in-memory snapshot."
                  : "No Supabase project configured yet."}{" "}
              Messages are not persisted.
            </p>
            <a
              href="/signup"
              className="shrink-0 rounded bg-amber/20 px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase hover:bg-amber/30"
            >
              Sign up
            </a>
            <button
              onClick={() => setBannerVisible(false)}
              aria-label="Dismiss demo notice"
              className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase hover:bg-amber/15"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <ServerRail
            servers={demoStore.servers}
            activeServerId={view === "home" ? null : activeServerId}
            homeActive={view === "home"}
            homeUnread={demoDms.reduce((sum, d) => sum + d.unread, 0)}
            onHome={openHome}
            onAddServer={() => {
              setFormError(null);
              setDialog("server");
            }}
            onExplore={() => setDialog("explore")}
            onSelect={switchServer}
          />

          {view === "home" ? (
            <>
              <HomeSidebar
                profile={me}
                dms={dmChannels}
                activeDmId={activeDmId}
                tab={homeTab}
                onChangeTab={(tab) => {
                  setHomeTab(tab);
                  setActiveDmId(null);
                }}
                onSelectDm={(id) => setActiveDmId(id)}
                onOpenDm={() => setDialog("newdm")}
                onOpenSettings={() => setSettingsOpen(true)}
                onOpenAddFriend={() => {
                  setHomeTab("friends");
                  setActiveDmId(null);
                }}
                onlineFriends={onlineFriends.length}
                pendingCount={incoming.length}
                filter={homeFilter}
                onFilterChange={setHomeFilter}
              />

              {homeTab === "friends" && !activeDm && (
                <>
                  <FriendsView
                    friends={friends}
                    incoming={incoming}
                    outgoing={outgoing}
                    activities={activities}
                    onOpenDm={(userId) => {
                      const dmId = demoSocial.ensureDm(userId);
                      if (dmId) openDm(dmId);
                    }}
                    onAddFriend={async (username) => demoSocial.addFriend(username)}
                    onRespond={async (id, accept) => {
                      demoSocial.respond(id, accept);
                      flash(accept ? "Friend added" : "Request removed");
                    }}
                    onRemove={async (userId) => {
                      demoSocial.remove(userId);
                      flash("Friend removed");
                    }}
                  />
                  <ActiveNowPanel
                    entries={activeNow}
                    onOpenDm={(userId) => {
                      const dmId = demoSocial.ensureDm(userId);
                      if (dmId) openDm(dmId);
                    }}
                  />
                </>
              )}

              {homeTab === "friends" && activeDm && (
                <DmView
                  channel={activeDm}
                  messages={dmMessages}
                  profile={me}
                  onSend={(content) => {
                    demoSocial.addDmMessage(activeDm.id, content);
                  }}
                  onDelete={(id) => demoSocial.deleteDmMessage(id)}
                />
              )}

              {homeTab === "store" && <SimpleView title="Store" heading="Perks & cosmetics" body="Everything here is included with BT Pro. Open Settings → BT Pro to compare plans." />}
              {homeTab === "discover" && (
                <SimpleView
                  title="Discover"
                  heading="Find your community"
                  body="From gaming to design, there's a place for you. Try the Explore button at the bottom of the server rail."
                />
              )}
            </>
          ) : (
            <>
              <div className={`${showMembers ? "hidden" : "flex"} sm:flex`}>
                <ChannelSidebar
                  server={server}
                  channels={channels}
                  activeChannelId={activeChannel?.id ?? ""}
                  voiceStates={voiceStates}
                  profile={me}
                  canManage={canManage}
                  onSelectChannel={selectChannel}
                  onSelectVoice={(id) => {
                    setActiveChannelId(id);
                  }}
                  onOpenSettings={() => setSettingsOpen(true)}
                  onJoinVoice={(id) => {
                    demoStore.joinVoice(id);
                    flash(`Joined ${channels.find((c) => c.id === id)?.name ?? "voice"}`);
                  }}
                  onLeaveVoice={() => {
                    demoStore.leaveVoice();
                    flash("Left voice");
                  }}
                  onAddChannel={(kind) => {
                    setChannelKind(kind);
                    setFormError(null);
                    setDialog("channel");
                  }}
                  onCopyInvite={() => void copyInvite()}
                />
              </div>

              {activeChannel && (
                <DemoMessageFeed
                  key={activeChannel.id}
                  server={server}
                  channel={activeChannel}
                  messages={messages}
                  members={memberRows}
                  profile={me}
                  memberCount={memberCount}
                  canManage={canManage}
                  onToggleMembers={() => setShowMembers((v) => !v)}
                  onSend={(content) => {
                    demoStore.addMessage(activeChannel.id, content);
                  }}
                  onDelete={(id) => demoStore.deleteMessage(id)}
                />
              )}

              <div className={`${showMembers ? "block" : "hidden"} md:block`}>
                <MemberList
                  members={memberRows}
                  voiceStates={voiceStates}
                  viewerId={DEMO_USER_ID}
                  onClose={() => setShowMembers(false)}
                />
              </div>
            </>
          )}
        </div>

        {settingsOpen && (
          <DemoSettings
            onClose={() => setSettingsOpen(false)}
            onSaved={(message) => {
              setSettingsOpen(false);
              flash(message);
            }}
          />
        )}

        {/* New DM */}
        <Modal
          open={dialog === "newdm"}
          title="Start a conversation"
          description="Demo mode — pick a friend."
          onClose={() => setDialog(null)}
        >
          <ul className="max-h-72 space-y-1 overflow-y-auto scroll-thin">
            {friends.map((friend) => {
              const name = friend.profile.display_name || friend.profile.username;
              return (
                <li key={friend.friendshipId}>
                  <button
                    onClick={() => {
                      setDialog(null);
                      const dmId = demoSocial.ensureDm(friend.profile.id);
                      if (dmId) openDm(dmId);
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-hover/60"
                  >
                    <Avatar
                      name={name}
                      src={friend.profile.avatar_url}
                      accent={friend.profile.accent_color}
                      size={34}
                      status={(friend.profile.status as Presence) ?? "offline"}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-semibold text-bright">{name}</span>
                      <span className="block truncate text-[11.5px] text-dim">@{friend.profile.username}</span>
                    </span>
                  </button>
                </li>
              );
            })}
            {friends.length === 0 && (
              <li className="py-6 text-center text-[12.5px] text-dim">Add a friend first to start a DM.</li>
            )}
          </ul>
        </Modal>

        {/* Create server */}
        <Modal
          open={dialog === "server"}
          title="Create a server"
          description="Demo mode — the server lives in memory until you reload."
          onClose={() => setDialog(null)}
          footer={
            <>
              <button
                onClick={() => setDialog(null)}
                className="rounded-lg px-3 py-1.5 text-[12.5px] text-muted transition hover:text-bright"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!serverName.trim()) return;
                  const created = demoStore.addServer(serverName.trim(), serverIcon);
                  setServerName("");
                  setDialog(null);
                  switchServer(created.id);
                  flash(`Created ${created.name}`);
                }}
                disabled={!serverName.trim()}
                className="rounded-lg bg-blurple px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-blurple-soft disabled:opacity-50"
              >
                Create server
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-[11px] font-semibold tracking-widest text-muted uppercase">
                Pick an icon
              </p>
              <div className="flex flex-wrap gap-1.5">
                {["🚀", "🎨", "🎮", "🎧", "⚡", "🛠️", "📚", "🌊", "🔥", "🧠"].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setServerIcon(emoji)}
                    aria-pressed={serverIcon === emoji}
                    className={`grid h-10 w-10 place-items-center rounded-xl text-lg transition ${
                      serverIcon === emoji
                        ? "bg-blurple/25 ring-2 ring-blurple"
                        : "bg-raised hover:bg-hover"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold tracking-widest text-muted uppercase">
                Server name
              </span>
              <input
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
                maxLength={60}
                placeholder="Design Guild"
                className="w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-blurple/60"
              />
            </label>
          </div>
        </Modal>

        {/* Create channel */}
        <Modal
          open={dialog === "channel"}
          title={`Create a ${channelKind} channel`}
          description={`In ${server.name}`}
          onClose={() => setDialog(null)}
          footer={
            <>
              <button
                onClick={() => setDialog(null)}
                className="rounded-lg px-3 py-1.5 text-[12.5px] text-muted transition hover:text-bright"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const name = channelName.trim().toLowerCase().replace(/\s+/g, "-");
                  if (!name) return;
                  const result = demoStore.addChannel(
                    activeServerId,
                    name,
                    channelKind,
                    channelTopic.trim() || null,
                  );
                  if (!result.ok) {
                    setFormError(result.message);
                    return;
                  }
                  setChannelName("");
                  setChannelTopic("");
                  setDialog(null);
                  if (result.channel.kind === "text") setActiveChannelId(result.channel.id);
                  flash(`Created #${result.channel.name}`);
                }}
                disabled={!channelName.trim()}
                className="rounded-lg bg-blurple px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-blurple-soft disabled:opacity-50"
              >
                Create channel
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="flex gap-1.5">
              {(["text", "voice"] as const).map((kind) => (
                <button
                  key={kind}
                  onClick={() => setChannelKind(kind)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-[12.5px] font-medium transition ${
                    channelKind === kind
                      ? "border-blurple/60 bg-blurple/15 text-bright"
                      : "border-line bg-ink text-muted hover:bg-hover/60"
                  }`}
                >
                  {kind === "text" ? <HashIcon width={14} height={14} /> : <SpeakerIcon width={14} height={14} />}
                  {kind === "text" ? "Text" : "Voice"}
                </button>
              ))}
            </div>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold tracking-widest text-muted uppercase">
                Channel name
              </span>
              <input
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                maxLength={40}
                placeholder={channelKind === "text" ? "design-review" : "Design Voice"}
                className="w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-blurple/60"
              />
            </label>
            {channelKind === "text" && (
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold tracking-widest text-muted uppercase">
                  Topic <span className="text-dim normal-case">(optional)</span>
                </span>
                <input
                  value={channelTopic}
                  onChange={(e) => setChannelTopic(e.target.value)}
                  maxLength={120}
                  placeholder="What is this channel about?"
                  className="w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-blurple/60"
                />
              </label>
            )}
            {formError && <p className="text-[12px] text-rose">{formError}</p>}
          </div>
        </Modal>

        {/* Invite */}
        <Modal
          open={dialog === "invite"}
          title={`Invite people to ${server.name}`}
          description="Demo mode — invite codes resolve against the in-memory servers."
          onClose={() => setDialog(null)}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg border border-line bg-ink px-2.5 py-1.5">
              <code className="min-w-0 flex-1 truncate font-mono text-[12px] text-muted">
                btcomms.gg/channels?invite={server.invite_code}
              </code>
              <button
                onClick={() => void copyInvite()}
                className="flex shrink-0 items-center gap-1 rounded-md bg-blurple px-2.5 py-1 text-[11.5px] font-semibold text-white transition hover:bg-blurple-soft"
              >
                {copied ? <CheckIcon width={12} height={12} /> : <CopyIcon width={12} height={12} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-line" />
              <span className="text-[10px] tracking-widest text-dim uppercase">or</span>
              <span className="h-px flex-1 bg-line" />
            </div>
            <div>
              <span className="mb-1.5 block text-[11px] font-semibold tracking-widest text-muted uppercase">
                Join with a code
              </span>
              <div className="flex gap-2">
                <input
                  value={joiningCode}
                  onChange={(e) => setJoiningCode(e.target.value)}
                  placeholder="design-guild"
                  className="w-full rounded-lg border border-line bg-ink px-3 py-2 font-mono text-[12.5px] outline-none focus:border-blurple/60"
                />
                <button
                  onClick={() => {
                    const result = demoStore.joinByCode(joiningCode);
                    if (!result.ok) {
                      setFormError(result.message);
                      return;
                    }
                    setFormError(null);
                    setJoiningCode("");
                    setDialog(null);
                    switchServer(result.server.id);
                    flash(`Joined ${result.server.name}`);
                  }}
                  disabled={!joiningCode.trim()}
                  className="shrink-0 rounded-lg border border-line bg-raised px-3 py-2 text-[12px] font-semibold transition hover:bg-hover disabled:opacity-50"
                >
                  Join
                </button>
              </div>
              {formError && <p className="mt-1.5 text-[12px] text-rose">{formError}</p>}
            </div>
          </div>
        </Modal>

        {/* Explore */}
        <Modal
          open={dialog === "explore"}
          title="Explore servers"
          description="Public servers available in this demo."
          onClose={() => setDialog(null)}
        >
          <ul className="space-y-2">
            {demoStore.servers.map((candidate) => (
              <li
                key={candidate.id}
                className="flex items-center gap-3 rounded-xl border border-line bg-ink/60 p-3"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-raised text-lg">
                  {candidate.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold">{candidate.name}</p>
                  <p className="truncate text-[11.5px] text-dim">{candidate.description}</p>
                </div>
                <button
                  onClick={() => {
                    switchServer(candidate.id);
                    setDialog(null);
                    flash(`Switched to ${candidate.name}`);
                  }}
                  className="shrink-0 rounded-lg bg-blurple px-2.5 py-1.5 text-[11.5px] font-semibold text-white transition hover:bg-blurple-soft"
                >
                  Open
                </button>
              </li>
            ))}
          </ul>
        </Modal>

        {toast && (
          <div
            role="status"
            className="animate-rise fixed bottom-5 left-1/2 z-[80] -translate-x-1/2 rounded-full border border-line bg-raised px-4 py-2 text-[12.5px] font-medium text-bright shadow-2xl shadow-black/60"
          >
            {toast}
          </div>
        )}
      </div>
    </AppearanceProvider>
  );

  async function copyInvite() {
    const url = `${window.location.origin}/channels?invite=${server.invite_code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      flash("Invite link copied");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      flash(server.invite_code);
    }
  }
}

/* ------------------------------ sub views ------------------------------- */

function SimpleView({
  title,
  heading,
  body,
}: {
  title: string;
  heading: string;
  body: string;
}) {
  return (
    <section className="flex min-w-0 flex-1 flex-col bg-panel/25">
      <header className="flex h-12 shrink-0 items-center border-b border-line/60 px-4">
        <h2 className="text-[15px] font-bold tracking-tight text-bright">{title}</h2>
      </header>
      <div className="scroll-thin flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl">
          <h3 className="text-xl font-bold tracking-tight text-bright">{heading}</h3>
          <p className="mt-1 text-[13px] text-muted">{body}</p>
        </div>
      </div>
    </section>
  );
}

/**
 * Demo settings shell: real Appearance/Edit Profiles panels (they only touch
 * local state + localStorage), and a plain explainer for server-only sections.
 */
function DemoSettings({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [section, setSection] = useState<SettingsSectionId | "edit-profiles">("appearance");
  const [query, setQuery] = useState("");
  const [displayName, setDisplayName] = useState(demoStore.profile.display_name);
  const [bio, setBio] = useState(demoStore.profile.bio ?? "");
  const [customStatus, setCustomStatus] = useState(demoStore.profile.custom_status ?? "");
  const [statusEmoji, setStatusEmoji] = useState(demoStore.profile.custom_status_emoji ?? "");
  const [accentColor, setAccentColor] = useState(demoStore.profile.accent_color);
  const [bannerColor, setBannerColor] = useState(demoStore.profile.banner_color ?? null);

  const appearanceProps = {
    accentColor,
    onAccentChange: (color: string) => {
      setAccentColor(color);
      demoStore.updateProfile({ accent_color: color });
    },
    bannerColor,
    onBannerChange: (color: string) => {
      setBannerColor(color);
      demoStore.updateProfile({ banner_color: color });
    },
  };

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const me = demoStore.profile;

  return (
    <div
      className="fixed inset-0 z-[70] flex bg-void/90 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="User settings"
    >
      <div className="animate-rise flex h-full w-full overflow-hidden bg-panel shadow-2xl shadow-black/60">
        <SettingsNav
          profile={me}
          active={section === "edit-profiles" ? "account" : section}
          onSelect={(id) => setSection(id)}
          query={query}
          onQueryChange={setQuery}
          onEditProfiles={() => setSection("edit-profiles")}
          onLogout={onClose}
          pendingRequests={0}
        />

        <main className="relative flex min-w-0 flex-1 flex-col bg-panel">
          <header className="flex shrink-0 items-center justify-between gap-4 border-b border-line/50 px-8 py-5">
            <h1 className="truncate text-[19px] font-bold tracking-tight text-bright">
              {section === "edit-profiles"
                ? "Edit Profiles"
                : section === "appearance"
                  ? "Appearance"
                  : "Demo settings"}
            </h1>
            <button
              onClick={onClose}
              title="Close settings"
              aria-label="Close settings"
              className="flex items-center gap-2 rounded-full border border-line bg-void/60 px-3 py-1.5 text-[11.5px] font-semibold text-muted transition hover:border-rose/50 hover:text-rose"
            >
              <span className="rounded bg-raised px-1.5 py-0.5 font-mono text-[10px]">ESC</span>
              <CloseIcon width={14} height={14} />
            </button>
          </header>

          <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-8 py-6">
            <div className="mx-auto max-w-3xl">
              {section === "appearance" && <AppearancePanel {...appearanceProps} />}

              {section === "edit-profiles" && (
                <EditProfilesPanel
                  displayName={displayName}
                  onDisplayNameChange={setDisplayName}
                  username={me.username}
                  bio={bio}
                  onBioChange={setBio}
                  customStatus={customStatus}
                  onCustomStatusChange={setCustomStatus}
                  statusEmoji={statusEmoji}
                  onStatusEmojiChange={setStatusEmoji}
                  avatarUrl={me.avatar_url}
                  onAvatarFile={() => undefined}
                  onSave={() => {
                    demoStore.updateProfile({
                      display_name: displayName.trim() || me.username,
                      bio: bio.trim() || null,
                      custom_status: customStatus.trim() || null,
                      custom_status_emoji: statusEmoji.trim() || null,
                    });
                    onSaved("Profile saved");
                  }}
                  saving={false}
                  note={null}
                />
              )}

              {section !== "appearance" && section !== "edit-profiles" && (
                <SettingsCard>
                  <p className="text-[13px] text-muted">
                    <span className="font-semibold text-bright">You&apos;re in demo mode.</span>{" "}
                    Account, billing, voice and privacy settings need a signed-in account —
                    they persist to your Supabase profile in the real app.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <SettingsButton tone="primary" onClick={() => setSection("appearance")}>
                      Try Appearance
                    </SettingsButton>
                    <SettingsButton tone="secondary" onClick={() => setSection("edit-profiles")}>
                      Edit profile
                    </SettingsButton>
                  </div>
                </SettingsCard>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export type DemoChannel = Channel;
