"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ServerRail } from "@/components/server-rail";
import { ChannelSidebar } from "@/components/channel-sidebar";
import { DemoMessageFeed } from "@/components/demo/demo-message-feed";
import { MemberList } from "@/components/member-list";
import { Modal } from "@/components/modal";
import { Avatar } from "@/components/avatar";
import { CheckIcon, CopyIcon, HashIcon, SpeakerIcon } from "@/components/icons";
import { demoStore, DEMO_USER_ID } from "@/lib/demo";
import type { Channel, Message, Presence, ServerMember, VoiceState } from "@/lib/types";

type Dialog = "server" | "invite" | "profile" | "channel" | "explore" | null;

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

  const me = demoStore.profile;
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
    if (serverId) return;
    const first = channels.find((c) => c.kind === "text");
    if (first && !channelId) setActiveChannelId(first.id);
  }, [channels, serverId, channelId]);

  const selectChannel = (id: string) => setActiveChannelId(id);

  const switchServer = (id: string) => {
    setActiveServerId(id);
    const list = demoStore.channelsOf(id);
    setActiveChannelId(list.find((c) => c.kind === "text")?.id ?? list[0]?.id ?? "");
  };

  // form state
  const [serverName, setServerName] = useState("");
  const [serverIcon, setServerIcon] = useState("🚀");
  const [channelName, setChannelName] = useState("");
  const [channelTopic, setChannelTopic] = useState("");
  const [channelKind, setChannelKind] = useState<"text" | "voice">("text");
  const [displayName, setDisplayName] = useState(me.display_name);
  const [bio, setBio] = useState(me.bio ?? "");
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

  return (
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
          activeServerId={activeServerId}
          onAddServer={() => {
            setFormError(null);
            setDialog("server");
          }}
          onExplore={() => setDialog("explore")}
          onSelect={switchServer}
        />

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
            onOpenSettings={() => {
              setFormError(null);
              setDialog("profile");
            }}
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
      </div>

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
                flash(`Created ${channelKind === "text" ? "#" : ""}${result.channel.name}`);
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

      {/* Profile */}
      <Modal
        open={dialog === "profile"}
        title="Your profile"
        description="Demo mode — changes stay in memory."
        onClose={() => setDialog(null)}
        footer={
          <button
            onClick={() => {
              demoStore.updateProfile({
                display_name: displayName.trim() || me.username,
                bio: bio.trim() || null,
                status,
              });
              setDialog(null);
              flash("Profile updated");
            }}
            className="rounded-lg bg-blurple px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-blurple-soft"
          >
            Save changes
          </button>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-line bg-ink/60 p-3">
            <Avatar
              name={displayName || me.username}
              accent={me.accent_color}
              size={52}
              status={status}
            />
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold">{displayName || me.username}</p>
              <p className="truncate text-[12px] text-dim">@{me.username}</p>
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
          className="animate-rise fixed bottom-5 left-1/2 z-60 -translate-x-1/2 rounded-full border border-line bg-raised px-4 py-2 text-[12.5px] font-medium text-bright shadow-2xl shadow-black/60"
        >
          {toast}
        </div>
      )}
    </div>
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

export type DemoChannel = Channel;
