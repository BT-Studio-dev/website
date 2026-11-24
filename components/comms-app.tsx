"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { AppearanceProvider, useAppearance } from "@/lib/appearance";
import { ServerRail } from "@/components/server-rail";
import { ChannelSidebar } from "@/components/channel-sidebar";
import { MessageFeed } from "@/components/message-feed";
import { MemberList } from "@/components/member-list";
import { Modal } from "@/components/modal";
import { Avatar } from "@/components/avatar";
import { HomeSidebar, type HomeTab } from "@/components/home-sidebar";
import { FriendsView, ActiveNowPanel } from "@/components/friends-view";
import { DmView } from "@/components/dm-view";
import { SettingsModal } from "@/components/settings/settings-modal";
import { CheckIcon, CopyIcon, HashIcon, SpeakerIcon } from "@/components/icons";
import {
  ensureDmChannel,
  fetchDirectMessages,
  fetchDmChannels,
  fetchFriends,
  markDmRead,
  removeFriend,
  respondToRequest,
  sendDirectMessage,
  sendFriendRequest,
  updateProfile,
  type FriendEntry,
  type FriendRequest,
} from "@/lib/social";
import type {
  Channel,
  DirectMessage,
  DmChannel,
  Message,
  Presence,
  Profile,
  Server,
  ServerMember,
  VoiceState,
} from "@/lib/types";

type Dialog = "server" | "invite" | "profile" | "channel" | "explore" | "newdm" | null;

export type CommsInitial = {
  profile: Profile;
  servers: Server[];
  server: Server | null;
  channels: Channel[];
  members: ServerMember[];
  messages: Message[];
  voiceStates: VoiceState[];
  viewerRole: "owner" | "admin" | "member";
  email: string;
  startView?: "home" | "server";
  startDmId?: string | null;
};

export function CommsApp({ initial, onMembersChanged }: { initial: CommsInitial; onMembersChanged?: () => void }) {
  return (
    <AppearanceProvider
      initial={{
        theme_id: initial.profile.theme_id,
        message_density: initial.profile.message_density,
        reduce_motion: initial.profile.reduce_motion,
        reduced_saturation: initial.profile.reduced_saturation,
        font_scale: initial.profile.font_scale,
      }}
    >
      <CommsShell initial={initial} onMembersChanged={onMembersChanged} />
    </AppearanceProvider>
  );
}

function CommsShell({ initial, onMembersChanged }: { initial: CommsInitial; onMembersChanged?: () => void }) {
  const supabase = useMemo<SupabaseClient>(() => createClient(), []);
  const router = useRouter();
  const { appearance } = useAppearance();
  const persistedAppearance = useRef<string>("");

  const [profile, setProfile] = useState(initial.profile);
  const [members, setMembers] = useState(initial.members);
  const [servers, setServers] = useState(initial.servers);
  const [channels, setChannels] = useState(initial.channels);
  const [messages, setMessages] = useState(initial.messages);
  const [voiceStates, setVoiceStates] = useState(initial.voiceStates);

  const [view, setView] = useState<"server" | "home">(
    initial.startView ?? (initial.server ? "server" : "home"),
  );
  const [activeServerId, setActiveServerId] = useState<string | null>(initial.server?.id ?? null);
  const [activeChannelId, setActiveChannelId] = useState(
    initial.channels.find((c) => c.kind === "text")?.id ?? initial.channels[0]?.id ?? "",
  );

  // Home / DMs state
  const [homeTab, setHomeTab] = useState<HomeTab>("friends");
  const [dmChannels, setDmChannels] = useState<DmChannel[]>([]);
  const [activeDmId, setActiveDmId] = useState<string | null>(initial.startDmId ?? null);
  const [dmMessages, setDmMessages] = useState<DirectMessage[]>([]);
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [homeFilter, setHomeFilter] = useState("");
  const [socialLoading, setSocialLoading] = useState(true);

  const [dialog, setDialog] = useState<Dialog>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showMembers, setShowMembers] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // form state
  const [serverName, setServerName] = useState("");
  const [serverIcon, setServerIcon] = useState("🚀");
  const [channelName, setChannelName] = useState("");
  const [channelTopic, setChannelTopic] = useState("");
  const [channelKind, setChannelKind] = useState<"text" | "voice">("text");
  const [status, setStatus] = useState<Presence>(profile.status);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [joiningCode, setJoiningCode] = useState("");
  const [discover, setDiscover] = useState<Server[]>([]);
  const [newDmSearch, setNewDmSearch] = useState("");

  const canManage = initial.viewerRole === "owner" || initial.viewerRole === "admin";
  const activeChannel = channels.find((c) => c.id === activeChannelId) ?? channels[0];
  const activeDm = dmChannels.find((d) => d.id === activeDmId) ?? null;
  const server = servers.find((s) => s.id === activeServerId) ?? initial.server;

  const flash = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast((current) => (current === message ? null : current)), 2600);
  }, []);

  /* ------------------------- appearance persistence ------------------------ */
  // Skip the mount render (that value came from the server), then debounce
  // every user-driven change into `profiles` so prefs survive a reload.
  const appearancePrimed = useRef(false);
  useEffect(() => {
    const key = JSON.stringify(appearance);
    if (!appearancePrimed.current) {
      appearancePrimed.current = true;
      persistedAppearance.current = key;
      return;
    }
    if (persistedAppearance.current === key) return;
    persistedAppearance.current = key;
    const timeout = setTimeout(() => {
      void updateProfile(supabase, profile.id, {
        theme_id: appearance.theme_id,
        message_density: appearance.message_density,
        reduce_motion: appearance.reduce_motion,
        reduced_saturation: appearance.reduced_saturation,
        font_scale: appearance.font_scale,
      });
    }, 600);
    return () => clearTimeout(timeout);
  }, [appearance, supabase, profile.id]);

  /* ----------------------------- social data ------------------------------ */
  const loadSocial = useCallback(async () => {
    const [friendData, dms] = await Promise.all([
      fetchFriends(supabase),
      fetchDmChannels(supabase),
    ]);
    setFriends(friendData.friends);
    setIncoming(friendData.incoming);
    setOutgoing(friendData.outgoing);
    setDmChannels(dms);
    setSocialLoading(false);
    return dms;
  }, [supabase]);

  useEffect(() => {
    void loadSocial();
  }, [loadSocial]);

  // Realtime: friendships, DMs, dm_channel list, presence changes
  useEffect(() => {
    const channel = supabase
      .channel("social")
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () => {
        void loadSocial();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "dm_channels" }, () => {
        void loadSocial();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, (payload) => {
        const updated = payload.new as Profile;
        if (updated.id === profile.id) setProfile((prev) => ({ ...prev, ...updated }));
        setFriends((prev) =>
          prev.map((f) =>
            f.profile.id === updated.id
              ? {
                  ...f,
                  profile: {
                    ...f.profile,
                    display_name: updated.display_name,
                    avatar_url: updated.avatar_url,
                    accent_color: updated.accent_color,
                    status: updated.status,
                    custom_status: updated.custom_status,
                  },
                }
              : f,
          ),
        );
        setDmChannels((prev) =>
          prev.map((d) =>
            d.peer?.id === updated.id
              ? {
                  ...d,
                  peer: {
                    ...d.peer,
                    display_name: updated.display_name,
                    avatar_url: updated.avatar_url,
                    status: updated.status,
                    custom_status: updated.custom_status,
                  },
                }
              : d,
          ),
        );
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, loadSocial, profile.id]);

  // Realtime: DMs for the open conversation
  useEffect(() => {
    if (!activeDmId) return;
    const channel = supabase
      .channel(`dm:${activeDmId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `dm_channel_id=eq.${activeDmId}`,
        },
        (payload) => {
          const incomingMsg = payload.new as DirectMessage;
          setDmMessages((prev) =>
            prev.some((m) => m.id === incomingMsg.id) ? prev : [...prev, incomingMsg],
          );
          if (incomingMsg.author_id !== profile.id) {
            void markDmRead(supabase, activeDmId, profile.id);
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, activeDmId, profile.id]);

  // Load messages when the DM changes
  useEffect(() => {
    if (!activeDmId) {
      setDmMessages([]);
      return;
    }
    void (async () => {
      const rows = await fetchDirectMessages(supabase, activeDmId);
      setDmMessages(rows);
      await markDmRead(supabase, activeDmId, profile.id);
      setDmChannels((prev) =>
        prev.map((d) => (d.id === activeDmId ? { ...d, unread_count: 0 } : d)),
      );
    })();
  }, [supabase, activeDmId, profile.id]);

  /* ------------------------------ presence -------------------------------- */
  useEffect(() => {
    let cancelled = false;
    async function mark(statusToSet: Presence) {
      if (cancelled) return;
      await supabase.from("profiles").update({ status: statusToSet }).eq("id", profile.id);
    }
    void mark("online");
    function onVisibility() {
      void mark(document.visibilityState === "visible" ? "online" : "idle");
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [supabase, profile.id]);

  /* --------------------------- server realtime ---------------------------- */
  useEffect(() => {
    if (!activeServerId) return;
    const channel = supabase
      .channel(`server:${activeServerId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "server_members", filter: `server_id=eq.${activeServerId}` },
        () => onMembersChanged?.(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "voice_states" }, async () => {
        const voiceChannelIds = channels.filter((c) => c.kind === "voice").map((c) => c.id);
        if (voiceChannelIds.length === 0) return;
        const { data } = await supabase
          .from("voice_states")
          .select(
            `channel_id, user_id, muted, joined_at,
             profile:profiles(id, username, display_name, avatar_url, accent_color)`,
          )
          .in("channel_id", voiceChannelIds);
        if (data) setVoiceStates(data as unknown as VoiceState[]);
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, activeServerId, channels, onMembersChanged]);

  /* ------------------------------ navigation ------------------------------ */
  const openServer = useCallback(
    async (serverId: string) => {
      setView("server");
      setActiveServerId(serverId);
      setActiveDmId(null);
      const { data } = await supabase
        .from("channels")
        .select("id, server_id, name, kind, topic, position")
        .eq("server_id", serverId)
        .order("position", { ascending: true });
      const list = (data ?? []) as Channel[];
      setChannels(list);
      const first = list.find((c) => c.kind === "text") ?? list[0];
      if (first) {
        setActiveChannelId(first.id);
        if (first.kind === "text") {
          const { data: msgs } = await supabase
            .from("messages")
            .select(
              `id, channel_id, author_id, system_author, content, created_at, edited_at,
               author:profiles(id, username, display_name, avatar_url, accent_color)`,
            )
            .eq("channel_id", first.id)
            .order("created_at", { ascending: false })
            .limit(80);
          setMessages(((msgs ?? []) as unknown as Message[]).reverse());
        }
      }
      router.replace(`/channels/${serverId}/${first?.id ?? ""}`);
    },
    [supabase, router],
  );

  const openHome = useCallback(() => {
    setView("home");
    setActiveServerId(null);
    setActiveDmId(null);
    setHomeTab("friends");
    router.replace("/channels/home");
  }, [router]);

  const openDm = useCallback(
    async (userId: string) => {
      const channelId = await ensureDmChannel(supabase, userId);
      if (!channelId) {
        flash("Couldn't open that conversation.");
        return;
      }
      const dms = await loadSocial();
      const found = dms.find((d) => d.id === channelId);
      setView("home");
      setActiveServerId(null);
      setActiveDmId(channelId);
      setHomeTab("friends");
      if (found) flash(`Conversation with ${found.peer?.display_name ?? "friend"}`);
    },
    [supabase, loadSocial, flash],
  );

  const loadChannel = useCallback(
    async (channelId: string) => {
      if (channelId === activeChannelId) return;
      setActiveChannelId(channelId);
      setMessages([]);
      const { data } = await supabase
        .from("messages")
        .select(
          `id, channel_id, author_id, system_author, content, created_at, edited_at,
           author:profiles(id, username, display_name, avatar_url, accent_color)`,
        )
        .eq("channel_id", channelId)
        .order("created_at", { ascending: false })
        .limit(80);
      setMessages(((data ?? []) as unknown as Message[]).reverse());
    },
    [supabase, activeChannelId],
  );

  /* -------------------------------- voice --------------------------------- */
  const joinVoice = useCallback(
    async (channelId: string) => {
      await supabase.from("voice_states").delete().eq("user_id", profile.id);
      const { error } = await supabase
        .from("voice_states")
        .insert({ channel_id: channelId, user_id: profile.id });
      if (error) {
        flash("Couldn't join that voice channel.");
        return;
      }
      flash(`Joined ${channels.find((c) => c.id === channelId)?.name ?? "voice"}`);
    },
    [supabase, profile.id, channels, flash],
  );

  const leaveVoice = useCallback(async () => {
    await supabase.from("voice_states").delete().eq("user_id", profile.id);
    flash("Left voice");
  }, [supabase, profile.id, flash]);

  /* ------------------------------- actions -------------------------------- */
  async function createServer() {
    const name = serverName.trim();
    if (!name) return;
    setBusy(true);
    setFormError(null);

    const { data: created, error } = await supabase
      .from("servers")
      .insert({ name, icon: serverIcon, owner_id: profile.id })
      .select("id, name, icon, description, invite_code, is_default, owner_id")
      .single<Server>();

    if (error || !created) {
      setFormError(error?.message ?? "Could not create the server.");
      setBusy(false);
      return;
    }

    await supabase.from("server_members").insert({ server_id: created.id, user_id: profile.id, role: "owner" });
    await supabase.from("channels").insert([
      { server_id: created.id, name: "general", kind: "text", position: 0, topic: `Say hi in ${name}.` },
      { server_id: created.id, name: "voice", kind: "voice", position: 1 },
    ]);

    setServers((prev) => [...prev, created]);
    setBusy(false);
    setDialog(null);
    setServerName("");
    flash(`Created ${name}`);
    await openServer(created.id);
  }

  async function createChannel() {
    const name = channelName.trim().toLowerCase().replace(/\s+/g, "-");
    if (!name || !activeServerId) return;
    setBusy(true);
    setFormError(null);

    const { data, error } = await supabase
      .from("channels")
      .insert({
        server_id: activeServerId,
        name,
        kind: channelKind,
        topic: channelTopic.trim() || null,
        position: channels.length,
      })
      .select("id, server_id, name, kind, topic, position")
      .single<Channel>();

    setBusy(false);
    if (error || !data) {
      setFormError(error?.code === "23505" ? "A channel with that name already exists." : (error?.message ?? "Could not create the channel."));
      return;
    }

    setChannels((prev) => [...prev, data]);
    setDialog(null);
    setChannelName("");
    setChannelTopic("");
    if (data.kind === "text") setActiveChannelId(data.id);
    flash(`Created #${data.name}`);
  }

  async function joinByInvite(code: string) {
    const cleaned = code.trim().toLowerCase().replace(/^.*[?&]invite=/, "").replace(/\/+$/, "");
    if (!cleaned) return;
    setBusy(true);
    setFormError(null);

    const { data: found, error } = await supabase
      .from("servers")
      .select("id, name, icon, description, invite_code, is_default, owner_id")
      .eq("invite_code", cleaned)
      .maybeSingle<Server>();

    if (error || !found) {
      setBusy(false);
      setFormError("That invite code doesn't match a server.");
      return;
    }

    const { error: joinError } = await supabase
      .from("server_members")
      .insert({ server_id: found.id, user_id: profile.id });

    setBusy(false);
    if (joinError && joinError.code !== "23505") {
      setFormError("Couldn't join that server.");
      return;
    }

    setDialog(null);
    setJoiningCode("");
    flash(`Joined ${found.name}`);
    if (!servers.some((s) => s.id === found.id)) setServers((prev) => [...prev, found]);
    await openServer(found.id);
  }

  async function openExplore() {
    setDialog("explore");
    const { data } = await supabase
      .from("public_servers")
      .select("id, name, icon, description, invite_code, is_default, created_at")
      .order("created_at", { ascending: true })
      .limit(20);
    setDiscover((data ?? []) as unknown as Server[]);
  }

  async function addFriend(username: string) {
    const result = await sendFriendRequest(supabase, username);
    if (result.ok) await loadSocial();
    return result;
  }

  async function copyInvite() {
    if (!server) return;
    const url = `${window.location.origin}/channels?invite=${server.invite_code}`;
    try {
      await navigator.clipboard.writeText(url);
      setInviteCopied(true);
      flash("Invite link copied");
      setTimeout(() => setInviteCopied(false), 1600);
    } catch {
      flash(server.invite_code);
    }
  }

  async function sendDm(content: string) {
    if (!activeDmId) return;
    const optimistic: DirectMessage = {
      id: `tmp-${crypto.randomUUID()}`,
      dm_channel_id: activeDmId,
      author_id: profile.id,
      content,
      created_at: new Date().toISOString(),
      edited_at: null,
      read_at: null,
      author: {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        accent_color: profile.accent_color,
      },
    };
    setDmMessages((prev) => [...prev, optimistic]);
    const saved = await sendDirectMessage(supabase, activeDmId, profile.id, content);
    if (!saved) {
      setDmMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      flash("Message failed to send.");
      return;
    }
    setDmMessages((prev) => prev.map((m) => (m.id === optimistic.id ? saved : m)));
    void loadSocial();
  }

  async function deleteDm(id: string) {
    const snapshot = dmMessages;
    setDmMessages((prev) => prev.filter((m) => m.id !== id));
    const { error } = await supabase.from("direct_messages").delete().eq("id", id);
    if (error) setDmMessages(snapshot);
  }

  const pendingCount = incoming.length;
  const onlineFriends = friends.filter((f) => (f.profile.status ?? "offline") !== "offline");

  // Synthetic "Active Now" activities derived from friends' status.
  const activities = useMemo(() => {
    const map: Record<string, { kind: "game" | "music" | "code" | "custom" | "voice"; title: string; detail?: string }> = {};
    const titles = [
      { kind: "game" as const, title: "BT Comms Arena", detail: "Ranked · 2 of 5" },
      { kind: "music" as const, title: "Lo-fi Beats to Ship To", detail: "Spotify · playlist" },
      { kind: "code" as const, title: "bt-comms/app", detail: "Editing components/settings" },
      { kind: "voice" as const, title: "General Voice", detail: "In a voice channel" },
    ];
    onlineFriends.forEach((friend, index) => {
      if (index < 3) map[friend.profile.id] = titles[index % titles.length];
    });
    return map;
  }, [onlineFriends]);

  const activeNow = useMemo(
    () =>
      onlineFriends
        .filter((f) => activities[f.profile.id])
        .map((f) => ({ friend: f, activity: activities[f.profile.id] })),
    [onlineFriends, activities],
  );

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-void" data-theme-surface>
      <ServerRail
        servers={servers}
        activeServerId={view === "home" ? null : activeServerId}
        onAddServer={() => {
          setFormError(null);
          setDialog("server");
        }}
        onExplore={() => void openExplore()}
        onSelect={(id) => void openServer(id)}
        onHome={openHome}
        homeUnread={dmChannels.reduce((sum, d) => sum + (d.unread_count ?? 0), 0)}
      />

      {view === "home" ? (
        <>
          <HomeSidebar
            profile={profile}
            dms={dmChannels}
            activeDmId={activeDmId}
            tab={homeTab}
            onChangeTab={(tab) => {
              setHomeTab(tab);
              setActiveDmId(null);
            }}
            onSelectDm={(id) => setActiveDmId(id)}
            onOpenDm={() => {
              setNewDmSearch("");
              setDialog("newdm");
            }}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenAddFriend={() => {
              setHomeTab("friends");
              setActiveDmId(null);
            }}
            onlineFriends={onlineFriends.length}
            pendingCount={pendingCount}
            filter={homeFilter}
            onFilterChange={setHomeFilter}
          />

          {homeTab === "friends" && !activeDmId && (
            <>
              <FriendsView
                friends={friends}
                incoming={incoming}
                outgoing={outgoing}
                activities={activities}
                onOpenDm={(userId) => void openDm(userId)}
                onAddFriend={addFriend}
                onRespond={async (id, accept) => {
                  await respondToRequest(supabase, id, accept);
                  await loadSocial();
                  flash(accept ? "Friend added" : "Request removed");
                }}
                onRemove={async (userId) => {
                  await removeFriend(supabase, userId);
                  await loadSocial();
                  flash("Friend removed");
                }}
              />
              <ActiveNowPanel entries={activeNow} onOpenDm={(userId) => void openDm(userId)} />
            </>
          )}

          {homeTab === "friends" && activeDm && (
            <DmView
              channel={activeDm}
              messages={dmMessages}
              profile={profile}
              onSend={(content) => void sendDm(content)}
              onDelete={(id) => void deleteDm(id)}
            />
          )}

          {homeTab === "store" && <StoreView />}
          {homeTab === "discover" && (
            <DiscoverView
              servers={servers}
              onJoin={(code) => void joinByInvite(code)}
              onOpen={(id) => void openServer(id)}
            />
          )}
        </>
      ) : (
        <>
          {server && (
            <ChannelSidebar
              server={server}
              channels={channels}
              activeChannelId={activeChannelId}
              voiceStates={voiceStates}
              profile={profile}
              canManage={canManage}
              onSelectChannel={(id) => void loadChannel(id)}
              onSelectVoice={() => setDialog("invite")}
              onOpenSettings={() => setSettingsOpen(true)}
              onJoinVoice={(id) => void joinVoice(id)}
              onLeaveVoice={() => void leaveVoice()}
              onAddChannel={(kind) => {
                setChannelKind(kind);
                setFormError(null);
                setDialog("channel");
              }}
              onCopyInvite={() => void copyInvite()}
            />
          )}

          {activeChannel && server && (
            <MessageFeed
              key={`${activeServerId}:${activeChannelId}`}
              supabase={supabase}
              server={server}
              channel={activeChannel}
              initialMessages={messages}
              profile={profile}
              memberCount={members.length}
              members={members}
              canManage={canManage}
              onToggleMembers={() => setShowMembers((v) => !v)}
              onOpenMemberList={() => setShowMembers((v) => !v)}
            />
          )}

          <div className={`${showMembers ? "block" : "hidden"} md:block`}>
            <MemberList
              members={members}
              voiceStates={voiceStates}
              viewerId={profile.id}
              onClose={() => setShowMembers(false)}
            />
          </div>
        </>
      )}

      {/* Settings */}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        supabase={supabase}
        profile={profile}
        email={initial.email}
        phone={null}
        onProfileSaved={(next) => {
          setProfile(next);
          setStatus(next.status);
        }}
        pendingRequests={pendingCount}
        onLogout={() => {
          void supabase.auth.signOut().then(() => router.replace("/login"));
        }}
      />

      {/* New DM picker */}
      <Modal
        open={dialog === "newdm"}
        title="Start a conversation"
        description="Pick a friend to open a direct message."
        onClose={() => setDialog(null)}
      >
        <div className="space-y-3">
          <input
            value={newDmSearch}
            onChange={(e) => setNewDmSearch(e.target.value)}
            placeholder="Search friends…"
            className="w-full rounded-lg border border-line bg-ink px-3 py-2 text-[13px] outline-none focus:border-blurple/60"
          />
          <ul className="max-h-72 space-y-1 overflow-y-auto scroll-thin">
            {friends
              .filter(
                (f) =>
                  !newDmSearch.trim() ||
                  (f.profile.display_name ?? "").toLowerCase().includes(newDmSearch.toLowerCase()) ||
                  f.profile.username.toLowerCase().includes(newDmSearch.toLowerCase()),
              )
              .map((friend) => {
                const name = friend.profile.display_name || friend.profile.username;
                return (
                  <li key={friend.friendshipId}>
                    <button
                      onClick={() => {
                        setDialog(null);
                        void openDm(friend.profile.id);
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
              <li className="py-6 text-center text-[12.5px] text-dim">
                {socialLoading ? "Loading friends…" : "Add a friend first to start a DM."}
              </li>
            )}
          </ul>
        </div>
      </Modal>

      {/* Create server */}
      <Modal
        open={dialog === "server"}
        title="Create a server"
        description="Your server is a place for you and your friends to hang out."
        onClose={() => setDialog(null)}
        footer={
          <>
            <button onClick={() => setDialog(null)} className="rounded-lg px-3 py-1.5 text-[12.5px] text-muted transition hover:text-bright">
              Cancel
            </button>
            <button
              onClick={() => void createServer()}
              disabled={busy || !serverName.trim()}
              className="rounded-lg bg-blurple px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-blurple-soft disabled:opacity-50"
            >
              {busy ? "Creating…" : "Create server"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-[11px] font-semibold tracking-widest text-muted uppercase">Pick an icon</p>
            <div className="flex flex-wrap gap-1.5">
              {["🚀", "🎨", "🎮", "🎧", "⚡", "🛠️", "📚", "🌊", "🔥", "🧠"].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setServerIcon(emoji)}
                  aria-pressed={serverIcon === emoji}
                  className={`grid h-10 w-10 place-items-center rounded-xl text-lg transition ${
                    serverIcon === emoji ? "bg-blurple/25 ring-2 ring-blurple" : "bg-raised hover:bg-hover"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold tracking-widest text-muted uppercase">Server name</span>
            <input
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
              maxLength={60}
              placeholder="Design Guild"
              className="w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-blurple/60"
            />
          </label>
          {formError && <p className="text-[12px] text-rose">{formError}</p>}
        </div>
      </Modal>

      {/* Create channel */}
      <Modal
        open={dialog === "channel"}
        title={`Create a ${channelKind} channel`}
        description={`In ${server?.name ?? "this server"}`}
        onClose={() => setDialog(null)}
        footer={
          <>
            <button onClick={() => setDialog(null)} className="rounded-lg px-3 py-1.5 text-[12.5px] text-muted transition hover:text-bright">
              Cancel
            </button>
            <button
              onClick={() => void createChannel()}
              disabled={busy || !channelName.trim()}
              className="rounded-lg bg-blurple px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-blurple-soft disabled:opacity-50"
            >
              {busy ? "Creating…" : "Create channel"}
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
            <span className="mb-1.5 block text-[11px] font-semibold tracking-widest text-muted uppercase">Channel name</span>
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
        title={`Invite people to ${server?.name ?? "this server"}`}
        description="Share this link, or join a server with a code."
        onClose={() => setDialog(null)}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-line bg-ink px-2.5 py-1.5">
            <code className="min-w-0 flex-1 truncate font-mono text-[12px] text-muted">
              btcomms.gg/channels?invite={server?.invite_code}
            </code>
            <button
              onClick={() => void copyInvite()}
              className="flex shrink-0 items-center gap-1 rounded-md bg-blurple px-2.5 py-1 text-[11.5px] font-semibold text-white transition hover:bg-blurple-soft"
            >
              {inviteCopied ? <CheckIcon width={12} height={12} /> : <CopyIcon width={12} height={12} />}
              {inviteCopied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-[10px] tracking-widest text-dim uppercase">or</span>
            <span className="h-px flex-1 bg-line" />
          </div>
          <div>
            <span className="mb-1.5 block text-[11px] font-semibold tracking-widest text-muted uppercase">Join with a code</span>
            <div className="flex gap-2">
              <input
                value={joiningCode}
                onChange={(e) => setJoiningCode(e.target.value)}
                placeholder="bt-comms"
                className="w-full rounded-lg border border-line bg-ink px-3 py-2 font-mono text-[12.5px] outline-none focus:border-blurple/60"
              />
              <button
                onClick={() => void joinByInvite(joiningCode)}
                disabled={busy || !joiningCode.trim()}
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
        description="Public servers you can join right now."
        onClose={() => setDialog(null)}
      >
        <ul className="space-y-2">
          {discover.map((candidate) => {
            const already = servers.some((s) => s.id === candidate.id);
            return (
              <li key={candidate.id} className="flex items-center gap-3 rounded-xl border border-line bg-ink/60 p-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-raised text-lg">{candidate.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold">{candidate.name}</p>
                  <p className="truncate text-[11.5px] text-dim">{candidate.description}</p>
                </div>
                <button
                  onClick={() => void joinByInvite(candidate.invite_code)}
                  disabled={already || busy}
                  className="shrink-0 rounded-lg bg-blurple px-2.5 py-1.5 text-[11.5px] font-semibold text-white transition hover:bg-blurple-soft disabled:bg-raised disabled:text-dim"
                >
                  {already ? "Joined" : "Join"}
                </button>
              </li>
            );
          })}
          {discover.length === 0 && (
            <li className="py-6 text-center text-[12.5px] text-dim">No public servers yet.</li>
          )}
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
  );
}

/* ------------------------------ sub views ------------------------------- */

function StoreView() {
  return (
    <section className="flex min-w-0 flex-1 flex-col bg-panel/25">
      <header className="flex h-12 shrink-0 items-center border-b border-line/60 px-4">
        <h2 className="text-[15px] font-bold tracking-tight text-bright">Store</h2>
      </header>
      <div className="scroll-thin flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl">
          <h3 className="text-xl font-bold tracking-tight text-bright">Perks & cosmetics</h3>
          <p className="mt-1 text-[13px] text-muted">
            Everything here is included with BT Pro. Open User Settings → BT Pro to see plans.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ["Animated avatars", "GIF avatars everywhere"],
              ["Custom themes", "Ship your own gradient"],
              ["HD streaming", "1080p60 with stereo"],
              ["Bigger uploads", "100 MB per file"],
            ].map(([title, body]) => (
              <div key={title} className="rounded-xl border border-line bg-raised/60 p-4">
                <p className="text-[13.5px] font-semibold text-bright">{title}</p>
                <p className="mt-0.5 text-[12px] text-muted">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function DiscoverView({
  servers,
  onJoin,
  onOpen,
}: {
  servers: Server[];
  onJoin: (code: string) => void;
  onOpen: (id: string) => void;
}) {
  return (
    <section className="flex min-w-0 flex-1 flex-col bg-panel/25">
      <header className="flex h-12 shrink-0 items-center border-b border-line/60 px-4">
        <h2 className="text-[15px] font-bold tracking-tight text-bright">Discover</h2>
      </header>
      <div className="scroll-thin flex-1 overflow-y-auto p-6">
        <h3 className="text-xl font-bold tracking-tight text-bright">Find your community</h3>
        <p className="mt-1 text-[13px] text-muted">
          From gaming to design, there&apos;s a place for you.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {servers.map((s) => (
            <div key={s.id} className="rounded-xl border border-line bg-raised/60 p-4">
              <div className="flex items-center gap-2.5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-void/60 text-lg">{s.icon}</span>
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-semibold text-bright">{s.name}</p>
                  <p className="truncate text-[11px] text-dim">@{s.invite_code}</p>
                </div>
              </div>
              <p className="mt-2 line-clamp-2 text-[12px] text-muted">{s.description}</p>
              <button
                onClick={() => onOpen(s.id)}
                className="mt-3 w-full rounded-md bg-raised py-1.5 text-[12px] font-semibold text-bright ring-1 ring-line transition hover:bg-hover"
              >
                Open
              </button>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-xl border border-line/70 bg-void/40 p-4">
          <p className="text-[13px] font-semibold text-bright">Have an invite?</p>
          <p className="mt-0.5 text-[12px] text-muted">
            Joining with a link is instant — open it and you&apos;re in.
          </p>
          <button
            onClick={() => onJoin("bt-comms")}
            className="mt-2 rounded-md bg-blurple px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-blurple-soft"
          >
            Join the official BT Comms server
          </button>
        </div>
      </div>
    </section>
  );
}
