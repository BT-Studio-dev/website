"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  fetchMembers,
  fetchProfile,
  fetchServerBundle,
  fetchServers,
  joinServerByCode,
  type CommsSnapshot,
} from "@/lib/queries";
import { CommsApp } from "@/components/comms-app";
import { BoltIcon } from "@/components/icons";
import { DemoApp } from "@/components/demo/demo-app";
import { isSupabaseReachable } from "@/lib/probe";

type State =
  | { phase: "loading" }
  | { phase: "joined"; data: CommsSnapshot }
  | { phase: "empty"; profileId: string }
  | { phase: "error"; message: string };

/**
 * Client-side entry point for the workspace.
 *
 * All Supabase traffic happens in the browser so the app works behind any
 * proxy/CDN and gets realtime subscriptions for free.
 */
export function CommsLoader({
  serverId,
  channelId,
  dmId,
}: {
  serverId?: string;
  channelId?: string;
  /** When present, /channels/@me/<dmId> opens that conversation directly. */
  dmId?: string;
}) {
  const supabase = useMemo<SupabaseClient>(() => createClient(), []);
  const router = useRouter();
  const [state, setState] = useState<State>({ phase: "loading" });
  const [inviteNotice, setInviteNotice] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const [demoReason, setDemoReason] = useState<string>("");
  const loadedFor = useRef<string>("");

  const load = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      // 0. Explicit demo link (`?demo=1`) always wins — handy for reviews.
      if (new URLSearchParams(window.location.search).has("demo")) {
        setDemoReason("requested");
        setDemo(true);
        return;
      }

      // 1. Can this browser talk to Supabase at all?
      const reachable = await isSupabaseReachable(
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      );
      if (!reachable) {
        setDemoReason("offline");
        setDemo(true);
        return;
      }

      // 2. Is anyone signed in?
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        const next = serverId ? `/channels/${serverId}` : "/channels";
        router.replace(`/login?next=${encodeURIComponent(next)}`);
        return;
      }

      const userId = session.user.id;
      const profile = await fetchProfile(supabase, userId);
      if (!profile) {
        setState({ phase: "error", message: "Could not load your profile." });
        return;
      }

      // Claim a pending invite from the URL, if any.
      const inviteParam = new URLSearchParams(window.location.search).get("invite");
      if (inviteParam) {
        const result = await joinServerByCode(supabase, userId, inviteParam);
        setInviteNotice(
          result.ok ? `Joined ${result.server.name}` : result.message,
        );
        window.history.replaceState({}, "", window.location.pathname);
      }

      const { servers, roles } = await fetchServers(supabase, userId);

      if (servers.length === 0) {
        setState({ phase: "empty", profileId: userId });
        return;
      }

      const server =
        (serverId && serverId !== "@me"
          ? servers.find((s) => s.id === serverId)
          : undefined) ??
        servers.find((s) => s.is_default) ??
        servers[0];

      const isHome = serverId === "@me";

      if (isHome) {
        // Home / DMs view — no server context required.
        setState({
          phase: "joined",
          data: {
            profile,
            servers,
            server: null,
            channels: [],
            members: [],
            messages: [],
            voiceStates: [],
            viewerRole: "member",
            email: session.user.email ?? "",
            startView: "home",
            startDmId: dmId ?? null,
          },
        });
        return;
      }

      const bundle = await fetchServerBundle(
        supabase,
        server,
        roles[server.id] ?? "member",
        channelId,
        session.user.email ?? "",
      );

      if (!bundle) {
        setState({ phase: "error", message: "You don't have access to that server." });
        return;
      }

      if (!opts.silent) {
        // Keep the rail honest even when the URL points at another server.
        bundle.servers = servers;
      }
      bundle.servers = servers;

      const activeText = bundle.channels.find((c) => c.kind === "text") ?? bundle.channels[0];
      const targetPath = `/channels/${server.id}/${channelId ?? activeText?.id ?? ""}`;

      if (!opts.silent && !channelId && activeText) {
        router.replace(targetPath);
      }

      setState({ phase: "joined", data: bundle });
    },
    [supabase, router, serverId, channelId, dmId],
  );

  useEffect(() => {
    const key = `${serverId ?? "root"}:${channelId ?? ""}:${dmId ?? ""}`;
    if (loadedFor.current === key) return;
    loadedFor.current = key;
    setState({ phase: "loading" });
    void load();
  }, [load, serverId, channelId, dmId]);

  const refreshMembers = useCallback(async () => {
    if (state.phase !== "joined") return;
    const serverIdForMembers = state.data.server?.id;
    if (!serverIdForMembers) return;
    const members = await fetchMembers(supabase, serverIdForMembers);
    setState((prev) =>
      prev.phase === "joined" ? { ...prev, data: { ...prev.data, members } } : prev,
    );
  }, [supabase, state]);

  const reloadServers = useCallback(() => {
    loadedFor.current = "";
    void load({ silent: true });
  }, [load]);

  if (demo) {
    return <DemoApp serverId={serverId} channelId={channelId} reason={demoReason} />;
  }

  if (state.phase === "loading") {
    return (
      <div className="grid h-dvh place-items-center bg-void">
        <div className="flex flex-col items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-blurple-soft to-blurple text-white shadow-lg shadow-blurple/30">
            <BoltIcon width={20} height={20} strokeWidth={2.2} />
          </span>
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-blurple" />
          <p className="text-[10px] tracking-[0.18em] text-dim uppercase">
            Connecting to BT Comms
          </p>
        </div>
      </div>
    );
  }

  if (state.phase === "error") {
    return (
      <div className="grid h-dvh place-items-center bg-void px-6 text-center">
        <div>
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{state.message}</p>
          <button
            onClick={() => {
              loadedFor.current = "";
              void load();
            }}
            className="mt-5 rounded-lg bg-blurple px-4 py-2 text-sm font-semibold text-white transition hover:bg-blurple-soft"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (state.phase === "empty") {
    return <EmptyWorkspace supabase={supabase} userId={state.profileId} onJoined={reloadServers} />;
  }

  return (
    <>
      <CommsApp
        initial={state.data}
        onMembersChanged={() => void refreshMembers()}
      />
      {inviteNotice && (
        <div
          role="status"
          className="animate-rise fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full border border-line bg-raised px-4 py-2 text-[12.5px] font-medium text-bright shadow-2xl shadow-black/60"
        >
          {inviteNotice}
        </div>
      )}
    </>
  );
}

function EmptyWorkspace({
  supabase,
  userId,
  onJoined,
}: {
  supabase: SupabaseClient;
  userId: string;
  onJoined: () => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function createServer() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);

    const { data: server, error: createError } = await supabase
      .from("servers")
      .insert({ name: name.trim(), icon: "⚡", owner_id: userId })
      .select("id, name")
      .single<{ id: string; name: string }>();

    if (createError || !server) {
      setError(createError?.message ?? "Could not create the server.");
      setBusy(false);
      return;
    }

    await supabase.from("server_members").insert({
      server_id: server.id,
      user_id: userId,
      role: "owner",
    });
    await supabase.from("channels").insert([
      { server_id: server.id, name: "general", kind: "text", position: 0 },
      { server_id: server.id, name: "voice", kind: "voice", position: 1 },
    ]);

    setBusy(false);
    onJoined();
  }

  async function join() {
    setBusy(true);
    setError(null);
    const result = await joinServerByCode(supabase, userId, code);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    await supabase
      .from("server_members")
      .insert({ server_id: result.server.id, user_id: userId })
      .then(() => undefined);
    onJoined();
  }

  return (
    <div className="grid h-dvh place-items-center bg-void px-6">
      <div className="w-full max-w-md rounded-2xl border border-line bg-panel/90 p-7 shadow-2xl shadow-black/50">
        <h1 className="text-lg font-bold tracking-tight">You&apos;re not in a server yet</h1>
        <p className="mt-1.5 text-[13px] text-muted">
          Join with an invite code, or spin up your own server in one click.
        </p>

        <div className="mt-5 space-y-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Invite code — e.g. bt-comms"
            className="w-full rounded-lg border border-line bg-ink px-3 py-2 font-mono text-[13px] outline-none focus:border-blurple/60"
          />
          <button
            onClick={() => void join()}
            disabled={busy || !code.trim()}
            className="w-full rounded-lg bg-blurple py-2 text-[13px] font-semibold text-white transition hover:bg-blurple-soft disabled:opacity-50"
          >
            Join server
          </button>
        </div>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-line" />
          <span className="text-[10px] tracking-widest text-dim uppercase">or create</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <div className="space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your server's name"
            className="w-full rounded-lg border border-line bg-ink px-3 py-2 text-[13px] outline-none focus:border-blurple/60"
          />
          <button
            onClick={() => void createServer()}
            disabled={busy || !name.trim()}
            className="w-full rounded-lg border border-line bg-raised py-2 text-[13px] font-semibold transition hover:bg-hover disabled:opacity-50"
          >
            Create server
          </button>
        </div>

        {error && <p className="mt-3 text-[12px] text-rose">{error}</p>}

        <form action="/auth/signout" method="post" className="mt-5 text-center">
          <button type="submit" className="text-[11.5px] text-dim underline hover:text-muted">
            Log out
          </button>
        </form>
      </div>
    </div>
  );
}
