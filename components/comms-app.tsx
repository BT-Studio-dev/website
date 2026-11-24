"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { ServerRail } from "@/components/server-rail";
import { ChannelSidebar } from "@/components/channel-sidebar";
import { MessageFeed } from "@/components/message-feed";
import { MemberList } from "@/components/member-list";
import { Modal } from "@/components/modal";
import { Avatar } from "@/components/avatar";
import { CheckIcon, CopyIcon, HashIcon, SpeakerIcon } from "@/components/icons";
import type {
  Channel,
  Message,
  Presence,
  Profile,
  Server,
  ServerMember,
  VoiceState,
} from "@/lib/types";

type Dialog = "server" | "invite" | "profile" | "channel" | "explore" | null;

export function CommsApp({ initial, onMembersChanged }: { initial: {
  profile: Profile;
  servers: Server[];
  server: Server;
  channels: Channel[];
  members: ServerMember[];
  messages: Message[];
  voiceStates: VoiceState[];
  viewerRole: "owner" | "admin" | "member";
}; onMembersChanged?: () => void }) {
  const supabase = useMemo<SupabaseClient>(() => createClient(), []);
  const router = useRouter();

  const [profile, setProfile] = useState(initial.profile);
  const [members, setMembers] = useState(initial.members);
  const [servers, setServers] = useState(initial.servers);
  const [channels, setChannels] = useState(initial.channels);
  useEffect(() => setMembers(initial.members), [initial.members]);
  useEffect(() => setServers(initial.servers), [initial.servers]);
  useEffect(() => setChannels(initial.channels), [initial.channels]);
  useEffect(() => setProfile(initial.profile), [initial.profile]);
  const [messages, setMessages] = useState(initial.messages);
  const [voiceStates, setVoiceStates] = useState(initial.voiceStates);
  const [activeChannelId, setActiveChannelId] = useState(
    initial.channels.find((c) => c.kind === "text")?.id ?? initial.channels[0]?.id ?? "",
  );
  const [dialog, setDialog] = useState<Dialog>(null);
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
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [status, setStatus] = useState<Presence>(profile.status);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [joiningCode, setJoiningCode] = useState("");
  const [discover, setDiscover] = useState<Server[]>([]);

  const canManage =
    initial.viewerRole === "owner" || initial.viewerRole === "admin";

  const activeChannel =
    channels.find((c) => c.id === activeChannelId) ?? channels[0];

  const flash = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast((current) => (current === message ? null : current)), 2600);
  }, []);

  // ---- Presence heartbeat ------------------------------------------------
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
    function onUnload() {
      void supabase
        .from("profiles")
        .update({ status: "offline" })
        .eq("id", profile.id);
    }

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onUnload);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [supabase, profile.id]);

  // ---- Realtime: members, profiles, voice --------------------------------
  useEffect(() => {
    const channel = supabase
      .channel(`server:${initial.server.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "server_members", filter: `server_id=eq.${initial.server.id}` },
        () => onMembersChanged?.(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          const updated = payload.new as Profile;
          if (updated.id === profile.id) {
            setProfile((prev) => ({ ...prev, ...updated }));
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "voice_states" },
        async () => {
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
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, router, initial.server.id, profile.id, channels]);

  // ---- Channel switching -------------------------------------------------
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

  // ---- Voice -------------------------------------------------------------
  const joinVoice = useCallback(
    async (channelId: string) => {
      await supabase
        .from("voice_states")
        .delete()
        .eq("user_id", profile.id);
      const { error } = await supabase
        .from("voice_states")
        .insert({ channel_id: channelId, user_id: profile.id });
      if (error) {
        flash("Couldn't join that voice channel.");
        return;
      }
      const channel = channels.find((c) => c.id === channelId);
      flash(`Joined ${channel?.name ?? "voice"}`);
    },
    [supabase, profile.id, channels, flash],
  );

  const leaveVoice = useCallback(async () => {
    await supabase.from("voice_states").delete().eq("user_id", profile.id);
    flash("Left voice");
  }, [supabase, profile.id, flash]);

  useEffect(() => {
    const mine = voiceStates.find((v) => v.user_id === profile.id);
    if (!mine) return;
    const beforeUnload = () => {
      void supabase.from("voice_states").delete().eq("user_id", profile.id);
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [voiceStates, profile.id, supabase]);

  // ---- Server actions ----------------------------------------------------
  async function createServer() {
    const name = serverName.trim();
    if (!name) return;
    setBusy(true);
    setFormError(null);

    const { data: server, error } = await supabase
      .from("servers")
      .insert({ name, icon: serverIcon, owner_id: profile.id })
      .select("id, name, icon, description, invite_code, is_default, owner_id")
      .single<Server>();

    if (error || !server) {
      setFormError(error?.message ?? "Could not create the server.");
      setBusy(false);
      return;
    }

    await supabase.from("server_members").insert({
      server_id: server.id,
      user_id: profile.id,
      role: "owner",
    });

    await supabase.from("channels").insert([
      { server_id: server.id, name: "general", kind: "text", position: 0, topic: `Say hi in ${name}.` },
      { server_id: server.id, name: "voice", kind: "voice", position: 1 },
    ]);

    setBusy(false);
    setDialog(null);
    setServerName("");
    flash(`Created ${name}`);
    router.push(`/channels/${server.id}`);
    router.refresh();
  }

  async function createChannel() {
    const name = channelName.trim().toLowerCase().replace(/\s+/g, "-");
    if (!name) return;
    setBusy(true);
    setFormError(null);

    const { data, error } = await supabase
      .from("channels")
      .insert({
        server_id: initial.server.id,
        name,
        kind: channelKind,
        topic: channelTopic.trim() || null,
        position: channels.length,
      })
      .select("id, server_id, name, kind, topic, position")
      .single<Channel>();

    setBusy(false);

    if (error || !data) {
      setFormError(
        error?.code === "23505"
          ? "A channel with that name already exists."
          : (error?.message ?? "Could not create the channel."),
      );
      return;
    }

    setChannels((prev) => [...prev, data]);
    setDialog(null);
    setChannelName("");
    setChannelTopic("");
    if (data.kind === "text") setActiveChannelId(data.id);
    flash(`Created #${data.name}`);
    router.refresh();
  }

  async function saveProfile() {
    setBusy(true);
    setFormError(null);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || profile.username,
        bio: bio.trim() || null,
        status,
      })
      .eq("id", profile.id);

    setBusy(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    setProfile((prev) => ({
      ...prev,
      display_name: displayName.trim() || profile.username,
      bio: bio.trim() || null,
      status,
    }));
    setDialog(null);
    flash("Profile updated");
    router.refresh();
  }

  async function joinByInvite(code: string) {
    const cleaned = code.trim().toLowerCase().replace(/^.*\//, "");
    if (!cleaned) return;
    setBusy(true);
    setFormError(null);

    const { data: found, error } = await supabase
      .from("servers")
      .select("id, name")
      .eq("invite_code", cleaned)
      .maybeSingle<{ id: string; name: string }>();

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
    router.push(`/channels/${found.id}`);
    router.refresh();
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

  async function copyInvite() {
    const url = `${window.location.origin}/channels?invite=${initial.server.invite_code}`;
    try {
      await navigator.clipboard.writeText(url);
      setInviteCopied(true);
      flash("Invite link copied");
      setTimeout(() => setInviteCopied(false), 1600);
    } catch {
      flash(initial.server.invite_code);
    }
  }

  const memberCount = members.length;
  const me = useMemo(
    () => members.find((m) => m.user_id === profile.id),
    [members, profile.id],
  );

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <ServerRail
        servers={servers}
        activeServerId={initial.server.id}
        onAddServer={() => {
          setFormError(null);
          setDialog("server");
        }}
        onExplore={() => void openExplore()}
      />

      <div
        className={`${showMembers ? "hidden" : "flex"} sm:flex`}
      >
        <ChannelSidebar
          server={initial.server}
          channels={channels}
          activeChannelId={activeChannelId}
          voiceStates={voiceStates}
          profile={profile}
          canManage={canManage}
          onSelectChannel={(id) => void loadChannel(id)}
          onSelectVoice={() => setDialog("invite")}
          onOpenSettings={() => {
            setFormError(null);
            setDialog("profile");
          }}
          onJoinVoice={(id) => void joinVoice(id)}
          onLeaveVoice={() => void leaveVoice()}
          onAddChannel={(kind) => {
            setChannelKind(kind);
            setFormError(null);
            setDialog("channel");
          }}
          onCopyInvite={() => void copyInvite()}
        />
      </div>

      {activeChannel && (
        <MessageFeed
          key={`${initial.server.id}:${activeChannelId}`}
          supabase={supabase}
          server={initial.server}
          channel={activeChannel}
          initialMessages={messages}
          profile={profile}
          memberCount={memberCount}
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

      {/* Create server */}
      <Modal
        open={dialog === "server"}
        title="Create a server"
        description="Your server is a place for you and your friends to hang out."
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
          {formError && <p className="text-[12px] text-rose">{formError}</p>}
        </div>
      </Modal>

      {/* Create channel */}
      <Modal
        open={dialog === "channel"}
        title={`Create a ${channelKind} channel`}
        description={`In ${initial.server.name}`}
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

      {/* Profile settings */}
      <Modal
        open={dialog === "profile"}
        title="Your profile"
        description="This is how you show up across BT Comms."
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
              onClick={() => void saveProfile()}
              disabled={busy}
              className="rounded-lg bg-blurple px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-blurple-soft disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save changes"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-line bg-ink/60 p-3">
            <Avatar
              name={displayName || profile.username}
              src={profile.avatar_url}
              accent={profile.accent_color}
              size={52}
              status={status}
            />
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold">{displayName || profile.username}</p>
              <p className="truncate text-[12px] text-dim">@{profile.username}</p>
              <p className="mt-0.5 text-[11px] text-dim">
                Joined {new Date(profile.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold tracking-widest text-muted uppercase">
              Display name
            </span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={40}
              className="w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-blurple/60"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold tracking-widest text-muted uppercase">
              About me
            </span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={190}
              rows={2}
              className="w-full resize-none rounded-lg border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-blurple/60"
            />
          </label>

          <div>
            <span className="mb-1.5 block text-[11px] font-semibold tracking-widest text-muted uppercase">
              Status
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {(["online", "idle", "dnd", "offline"] as Presence[]).map((presence) => (
                <button
                  key={presence}
                  onClick={() => setStatus(presence)}
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[12px] transition ${
                    status === presence
                      ? "border-blurple/60 bg-blurple/15 text-bright"
                      : "border-line bg-ink text-muted hover:bg-hover/60"
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      background:
                        presence === "online"
                          ? "#3ba55d"
                          : presence === "idle"
                            ? "#faa61a"
                            : presence === "dnd"
                              ? "#ed4245"
                              : "#6b7280",
                    }}
                  />
                  {presence === "dnd" ? "Do Not Disturb" : presence[0].toUpperCase() + presence.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-line bg-ink/60 px-3 py-2 text-[11px] text-dim">
            Role in this server:{" "}
            <span className="font-semibold text-muted">
              {me?.role === "owner" ? "Owner" : me?.role === "admin" ? "Admin" : "Member"}
            </span>
          </div>
          {formError && <p className="text-[12px] text-rose">{formError}</p>}
        </div>
      </Modal>

      {/* Invite */}
      <Modal
        open={dialog === "invite"}
        title={`Invite people to ${initial.server.name}`}
        description="Share this link, or join a server with a code."
        onClose={() => setDialog(null)}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-line bg-ink px-2.5 py-1.5">
            <code className="min-w-0 flex-1 truncate font-mono text-[12px] text-muted">
              btcomms.gg/channels?invite={initial.server.invite_code}
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
            <span className="mb-1.5 block text-[11px] font-semibold tracking-widest text-muted uppercase">
              Join with a code
            </span>
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
          {discover.map((server) => {
            const already = servers.some((s) => s.id === server.id);
            return (
              <li
                key={server.id}
                className="flex items-center gap-3 rounded-xl border border-line bg-ink/60 p-3"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-raised text-lg">
                  {server.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold">{server.name}</p>
                  <p className="truncate text-[11.5px] text-dim">{server.description}</p>
                </div>
                <button
                  onClick={() => void joinByInvite(server.invite_code)}
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
        {formError && <p className="mt-2 text-[12px] text-rose">{formError}</p>}
      </Modal>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className="animate-rise fixed bottom-5 left-1/2 z-60 -translate-x-1/2 rounded-full border border-line bg-raised px-4 py-2 text-[12.5px] font-medium text-bright shadow-2xl shadow-black/60"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
