"use client";

import { useMemo, useState } from "react";
import { Avatar, presenceLabel } from "@/components/avatar";
import {
  CheckCircleIcon,
  CheckIcon,
  CloseIcon,
  CompassIcon,
  FriendsIcon,
  MessageBubbleIcon,
  MoreIcon,
  SearchIcon,
  XCircleIcon,
} from "@/components/icons";
import { pluralize } from "@/lib/format";
import type { FriendEntry, FriendRequest } from "@/lib/social";
import type { ActiveActivity, Presence } from "@/lib/types";

export type FriendFilter = "online" | "all" | "pending" | "add";

const FILTERS: { id: FriendFilter; label: string }[] = [
  { id: "online", label: "Online" },
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
];

export function FriendsView({
  friends,
  incoming,
  outgoing,
  activities,
  onOpenDm,
  onAddFriend,
  onRespond,
  onRemove,
  onExploreServers = () => undefined,
  initialFilter = "online",
}: {
  friends: FriendEntry[];
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
  activities: Record<string, ActiveActivity>;
  onOpenDm: (userId: string) => void;
  onAddFriend: (username: string, note?: string) => Promise<{ ok: boolean; message: string }>;
  onRespond: (id: string, accept: boolean) => Promise<void>;
  onRemove: (userId: string) => Promise<void>;
  onExploreServers?: () => void;
  initialFilter?: FriendFilter;
}) {
  const [filter, setFilter] = useState<FriendFilter>(initialFilter);
  const [query, setQuery] = useState("");
  const [addValue, setAddValue] = useState("");
  const [addResult, setAddResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [adding, setAdding] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [addNote, setAddNote] = useState("");

  const online = useMemo(
    () => friends.filter((f) => (f.profile.status ?? "offline") !== "offline"),
    [friends],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const pool =
      filter === "online" ? online : filter === "all" ? friends : friends;
    if (!needle) return pool;
    return pool.filter(
      (f) =>
        (f.profile.display_name ?? "").toLowerCase().includes(needle) ||
        f.profile.username.toLowerCase().includes(needle),
    );
  }, [filter, friends, online, query]);

  const sorted = useMemo(() => {
    const rank = (p: string) => (p === "online" ? 0 : p === "idle" ? 1 : p === "dnd" ? 2 : 3);
    return [...visible].sort(
      (a, b) =>
        rank(a.profile.status ?? "offline") - rank(b.profile.status ?? "offline") ||
        (a.profile.display_name ?? "").localeCompare(b.profile.display_name ?? ""),
    );
  }, [visible]);

  async function submitAdd(event: React.FormEvent) {
    event.preventDefault();
    if (!addValue.trim()) return;
    setAdding(true);
    const result = await onAddFriend(addValue);
    setAddResult(result);
    setAdding(false);
    if (result.ok) {
      setAddValue("");
      setAddNote("");
    }
  }

  const pendingTotal = incoming.length + outgoing.length;

  return (
    <section className="ambient-stage flex min-w-0 flex-1 flex-col">
      {/*
        Single flex row: title on the left, tabs + search grouped on the right.
        `flex-wrap` + `min-w-0` everywhere means the tabs scroll inside their
        own box below `sm` and never widen the header into the chat pane.
      */}
      <header className="glass-bar flex h-12 shrink-0 flex-nowrap items-center justify-between gap-2 overflow-hidden border-b px-3 sm:gap-3 sm:px-4">
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <FriendsIcon width={20} height={20} className="hidden shrink-0 text-muted sm:block" />
          <h2 className="truncate text-[15px] font-bold tracking-tight text-bright">Friends</h2>
          <span className="mx-0.5 hidden h-4 w-px shrink-0 bg-line sm:block" />
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <nav
            role="tablist"
            aria-label="Friend filters"
            className="scrollbar-none -mx-1 flex min-w-0 items-center gap-0.5 overflow-x-auto px-1"
          >
            {FILTERS.map((item) => (
              <button
                key={item.id}
                role="tab"
                aria-selected={filter === item.id}
                onClick={() => setFilter(item.id)}
                className={`shrink-0 rounded-md px-2 py-1 text-[13px] font-medium whitespace-nowrap transition sm:px-2.5 ${
                  filter === item.id
                    ? "bg-hover text-bright"
                    : "text-muted hover:bg-hover/50 hover:text-bright"
                }`}
              >
                {item.label}
                {item.id === "pending" && pendingTotal > 0 && (
                  <span className="ml-1.5 rounded-full bg-rose px-1.5 text-[10px] font-bold text-white">
                    {pendingTotal}
                  </span>
                )}
              </button>
            ))}
            <button
              onClick={() => setFilter("add")}
              aria-selected={filter === "add"}
              role="tab"
              className={`ml-0.5 shrink-0 rounded-md px-2 py-1 text-[13px] font-semibold whitespace-nowrap transition sm:px-2.5 ${
                filter === "add"
                  ? "bg-mint text-white"
                  : "bg-mint/15 text-mint hover:bg-mint/25"
              }`}
            >
              Add Friend
            </button>
          </nav>

          <div className="flex w-[92px] shrink-0 items-center gap-1.5 rounded-md bg-void/60 px-2 py-1.5 ring-1 ring-line/70 focus-within:ring-blurple/50 sm:w-[140px] sm:px-2.5 lg:w-[200px]">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              aria-label="Search friends"
              className="w-full min-w-0 bg-transparent text-[12.5px] outline-none placeholder:text-dim"
            />
            <SearchIcon width={13} height={13} className="shrink-0 text-dim" />
          </div>
        </div>
      </header>

      <div className="scroll-auto min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4">
        {filter === "add" ? (
          <div className="max-w-lg">
            <h3 className="text-[15px] font-bold tracking-tight text-bright">ADD FRIEND</h3>
            <p className="mt-1 text-[13px] text-muted">
              You can add friends with their BT Comms username.
            </p>
            <form onSubmit={submitAdd} className="mt-3">
              <div className="flex items-center gap-2 rounded-lg bg-void/70 px-3 py-1 ring-1 ring-line focus-within:ring-blurple/60">
                <input
                  value={addValue}
                  onChange={(e) => {
                    setAddValue(e.target.value);
                    setAddResult(null);
                  }}
                  placeholder="Enter a username — e.g. ada"
                  aria-label="Friend username"
                  className="w-full bg-transparent py-2 text-[13.5px] outline-none placeholder:text-dim"
                />
                <button
                  type="submit"
                  disabled={adding || !addValue.trim()}
                  className="shrink-0 rounded-md bg-blurple px-3 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-blurple-soft disabled:opacity-50"
                >
                  {adding ? "Sending…" : "Send Friend Request"}
                </button>
              </div>
              <div className="mt-3">
                <label
                  htmlFor="add-friend-note"
                  className="mb-1 block text-[11.5px] font-semibold text-muted"
                >
                  Personalize your request{" "}
                  <span className="font-normal text-dim">(Optional)</span>
                </label>
                <div className="rounded-lg bg-void/70 ring-1 ring-line focus-within:ring-blurple/60">
                  <textarea
                    id="add-friend-note"
                    value={addNote}
                    onChange={(e) => setAddNote(e.target.value.slice(0, 120))}
                    rows={2}
                    maxLength={120}
                    placeholder="Say hi! Let them know who you are."
                    className="scroll-auto w-full resize-none bg-transparent px-3 pt-2 text-[13px] leading-relaxed outline-none placeholder:text-dim"
                  />
                  <p className="px-3 pb-1.5 text-right text-[10.5px] tabular-nums text-dim">
                    {addNote.length}/120
                  </p>
                </div>
              </div>
            </form>
            {addResult && (
              <p
                role="status"
                className={`mt-2 rounded-lg border px-3 py-2 text-[12.5px] ${
                  addResult.ok
                    ? "border-mint/30 bg-mint/10 text-mint"
                    : "border-rose/30 bg-rose/10 text-rose"
                }`}
              >
                {addResult.message}
              </p>
            )}

            <section className="mt-8">
              <h4 className="text-[11px] font-bold tracking-[0.14em] text-dim uppercase">
                Other Places to Make Friends
              </h4>
              <button
                type="button"
                onClick={onExploreServers}
                className="mt-2 flex w-full items-center gap-3 rounded-xl border border-line/70 bg-input/50 p-3 text-left transition hover:border-blurple/50 hover:bg-hover/40"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blurple/70 to-blurple-soft/60 text-white">
                  <CompassIcon width={20} height={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold text-bright">
                    Explore Discoverable Servers
                  </span>
                  <span className="block text-[12px] text-muted">
                    Find a community based on your hobbies or interests.
                  </span>
                </span>
                <span className="shrink-0 text-[11px] font-semibold text-mint">Browse →</span>
              </button>
            </section>
          </div>
        ) : filter === "pending" ? (
          <div className="space-y-6">
            <PendingGroup
              title={`Incoming — ${incoming.length}`}
              empty="No incoming requests."
              items={incoming.map((request) => ({
                id: request.id,
                profile: request.profile,
                actions: (
                  <>
                    <IconAction
                      label="Accept"
                      onClick={() => void onRespond(request.id, true)}
                      className="text-mint hover:bg-mint/15"
                    >
                      <CheckIcon width={16} height={16} />
                    </IconAction>
                    <IconAction
                      label="Ignore"
                      onClick={() => void onRespond(request.id, false)}
                      className="text-rose hover:bg-rose/15"
                    >
                      <XCircleIcon width={16} height={16} />
                    </IconAction>
                  </>
                ),
              }))}
            />
            <PendingGroup
              title={`Sent — ${outgoing.length}`}
              empty="You haven't sent any requests."
              items={outgoing.map((request) => ({
                id: request.id,
                profile: request.profile,
                actions: (
                  <IconAction
                    label="Cancel"
                    onClick={() => void onRespond(request.id, false)}
                    className="text-rose hover:bg-rose/15"
                  >
                    <XCircleIcon width={16} height={16} />
                  </IconAction>
                ),
                note: "Outgoing request",
              }))}
            />
          </div>
        ) : (
          <>
            <h3 className="mb-3 text-[11px] font-semibold tracking-widest text-dim uppercase">
              {filter === "online" ? `Online — ${sorted.length}` : `All Friends — ${sorted.length}`}
            </h3>

            {sorted.length === 0 ? (
              <EmptyFriends
                filter={filter}
                onAdd={() => setFilter("add")}
              />
            ) : (
              <ul className="space-y-0.5">
                {sorted.map((friend) => {
                  const status = (friend.profile.status as Presence) ?? "offline";
                  const name = friend.profile.display_name || friend.profile.username;
                  const activity = activities[friend.profile.id];
                  const custom = activity
                    ? `${activity.title}${activity.detail ? ` · ${activity.detail}` : ""}`
                    : friend.profile.custom_status || presenceLabel(status);

                  return (
                    <li
                      key={friend.friendshipId}
                      className="group relative flex items-center gap-3 rounded-lg px-2.5 py-2 transition hover:bg-hover/40"
                    >
                      <span className="relative shrink-0">
                        <Avatar
                          name={name}
                          src={friend.profile.avatar_url}
                          accent={friend.profile.accent_color}
                          size={38}
                          status={status}
                        />
                        {activity && (
                          <span className="absolute -right-1 -bottom-1 grid h-4 w-4 place-items-center rounded-full border-2 border-panel bg-blurple text-[8px] text-white">
                            {activity.kind === "music" ? "♪" : activity.kind === "code" ? "</>" : "▶"}
                          </span>
                        )}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="flex items-baseline gap-1.5">
                          <span className="truncate text-[14px] font-semibold text-bright">
                            {name}
                          </span>
                          <span className="hidden truncate text-[11px] text-dim sm:inline">
                            @{friend.profile.username}
                          </span>
                        </p>
                        <p className="truncate text-[12px] text-muted">{custom}</p>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <IconAction
                          label={`Message ${name}`}
                          onClick={() => onOpenDm(friend.profile.id)}
                          className="text-muted hover:bg-hover hover:text-bright"
                          round
                        >
                          <MessageBubbleIcon width={17} height={17} />
                        </IconAction>
                        <IconAction
                          label="More options"
                          onClick={() => setMenuFor(menuFor === friend.profile.id ? null : friend.profile.id)}
                          className="text-muted hover:bg-hover hover:text-bright"
                          round
                        >
                          <MoreIcon width={17} height={17} />
                        </IconAction>
                      </div>

                      {menuFor === friend.profile.id && (
                        <div className="absolute top-12 right-2 z-20 w-44 overflow-hidden rounded-lg border border-line bg-raised py-1 shadow-2xl shadow-black/50">
                          <button
                            onClick={() => {
                              setMenuFor(null);
                              onOpenDm(friend.profile.id);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] text-muted transition hover:bg-blurple hover:text-white"
                          >
                            <MessageBubbleIcon width={14} height={14} /> Message
                          </button>
                          <button
                            onClick={() => {
                              setMenuFor(null);
                              void onRemove(friend.profile.id);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] text-rose transition hover:bg-rose hover:text-white"
                          >
                            <CloseIcon width={14} height={14} /> Remove Friend
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function PendingGroup({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: {
    id: string;
    profile: FriendRequest["profile"];
    actions: React.ReactNode;
    note?: string;
  }[];
}) {
  return (
    <section>
      <h3 className="mb-2 text-[11px] font-semibold tracking-widest text-dim uppercase">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-[12.5px] text-dim">{empty}</p>
      ) : (
        <ul className="space-y-0.5">
          {items.map((item) => {
            const name = item.profile.display_name || item.profile.username;
            return (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-lg px-2.5 py-2 transition hover:bg-hover/40"
              >
                <Avatar
                  name={name}
                  src={item.profile.avatar_url}
                  accent={item.profile.accent_color}
                  size={38}
                  status={((item.profile as { status?: string }).status as Presence) ?? "offline"}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-bright">
                    {name} <span className="text-[11px] font-normal text-dim">@{item.profile.username}</span>
                  </p>
                  <p className="truncate text-[12px] text-muted">
                    {item.note ?? (item.profile as { custom_status?: string }).custom_status ?? "Wants to be friends"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">{item.actions}</div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function EmptyFriends({ filter, onAdd }: { filter: FriendFilter; onAdd: () => void }) {
  return (
    <div className="mt-10 flex flex-col items-center text-center">
      <span className="mb-3 grid h-14 w-14 place-items-center rounded-full bg-raised text-dim">
        <FriendsIcon width={26} height={26} />
      </span>
      <p className="text-[14px] font-semibold text-bright">
        {filter === "online" ? "No one's around to play with Wumpus" : "No friends yet"}
      </p>
      <p className="mt-1 max-w-xs text-[12.5px] text-muted">
        {filter === "online"
          ? "When your friends come online, they'll show up here."
          : "Add a friend by username to start a conversation."}
      </p>
      <button
        onClick={onAdd}
        className="mt-4 rounded-md bg-blurple px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-blurple-soft"
      >
        Add Friend
      </button>
    </div>
  );
}

function IconAction({
  children,
  label,
  onClick,
  className = "",
  round,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
  round?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`grid shrink-0 place-items-center transition ${
        round ? "h-9 w-9 rounded-full bg-raised" : "h-8 w-8 rounded-full bg-raised"
      } ${className}`}
    >
      {children}
    </button>
  );
}

/* ------------------------------ Active Now ------------------------------ */

export function ActiveNowPanel({
  entries,
  onOpenDm,
}: {
  entries: { friend: FriendEntry; activity: ActiveActivity }[];
  onOpenDm: (userId: string) => void;
}) {
  return (
    <aside className="hidden w-[340px] shrink-0 flex-col border-l border-line/60 bg-surface/20 xl:flex">
      <header className="flex h-12 shrink-0 items-center border-b border-line/60 px-4">
        <h3 className="text-[15px] font-bold tracking-tight text-bright">Active Now</h3>
      </header>

      <div className="scroll-auto min-h-0 flex-1 overflow-y-auto p-3">
        {entries.length === 0 ? (
          <div className="mt-8 px-4 text-center">
            <p className="text-[14px] font-semibold text-bright">It&apos;s quiet for now…</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
              When a friend starts an activity — like playing a game or listening to
              music — we&apos;ll show it here!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="px-1 pb-1 text-[11px] font-semibold tracking-widest text-dim uppercase">
              {pluralize(entries.length, "Activity", "Activities")}
            </p>
            {entries.map(({ friend, activity }) => {
              const name = friend.profile.display_name || friend.profile.username;
              return (
                <button
                  key={friend.friendshipId}
                  onClick={() => onOpenDm(friend.profile.id)}
                  className="group flex w-full flex-col gap-2 rounded-lg bg-raised/60 p-3 text-left transition hover:bg-raised"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar
                      name={name}
                      src={friend.profile.avatar_url}
                      accent={friend.profile.accent_color}
                      size={40}
                      status={(friend.profile.status as Presence) ?? "online"}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-semibold text-bright">{name}</p>
                      <p className="truncate text-[11px] text-dim">@{friend.profile.username}</p>
                    </div>
                  </div>

                  <div className="rounded-md bg-void/50 p-2.5">
                    <p className="text-[10px] font-semibold tracking-widest text-dim uppercase">
                      {activity.kind === "music"
                        ? "Listening to"
                        : activity.kind === "code"
                          ? "Editing"
                          : activity.kind === "voice"
                            ? "In voice"
                            : "Playing"}
                    </p>
                    <p className="mt-0.5 truncate text-[12.5px] font-semibold text-bright">
                      {activity.title}
                    </p>
                    {activity.detail && (
                      <p className="truncate text-[11.5px] text-muted">{activity.detail}</p>
                    )}
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-line">
                      <div className="h-full w-2/3 rounded-full accent-gradient" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
