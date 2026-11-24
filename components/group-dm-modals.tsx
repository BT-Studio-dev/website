"use client";

import { useMemo, useState } from "react";
import { Avatar } from "@/components/avatar";
import { CloseIcon, SearchIcon, UploadIcon } from "@/components/icons";
import { Modal } from "@/components/modal";
import { autoGroupName } from "@/lib/groups";
import type { MessageAuthor, Presence, Profile } from "@/lib/types";

/**
 * New Message modal — 1:1 DM or group DM with up to 10 members. Friends and
 * server members are searchable in one list; selected people become removable
 * pills, and the group name previews live from those names.
 */
export function NewMessageModal({
  open,
  onClose,
  profile,
  friends,
  serverMembers,
  onStartDm,
  onCreateGroup,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  profile: Profile;
  friends: MessageAuthor[];
  serverMembers: MessageAuthor[];
  onStartDm: (userId: string) => void;
  onCreateGroup: (memberIds: string[], name: string) => void;
  busy?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<MessageAuthor[]>([]);

  const rows = useMemo(() => {
    const seen = new Set<string>();
    const pool = [...friends, ...serverMembers].filter((person) => {
      if (person.id === profile.id || seen.has(person.id)) return false;
      seen.add(person.id);
      return true;
    });
    const needle = query.trim().toLowerCase();
    if (!needle) return pool.slice(0, 30);
    return pool.filter(
      (person) =>
        person.username.toLowerCase().includes(needle) ||
        (person.display_name ?? "").toLowerCase().includes(needle),
    );
  }, [friends, serverMembers, query, profile.id]);

  const selectedIds = new Set(selected.map((s) => s.id));
  const groupName = autoGroupName(
    [{ id: profile.id, display_name: profile.display_name, username: profile.username }, ...selected],
    profile.id,
  );
  const isGroup = selected.length > 1;

  function toggle(person: MessageAuthor) {
    setSelected((prev) =>
      prev.some((p) => p.id === person.id)
        ? prev.filter((p) => p.id !== person.id)
        : prev.length >= 9
          ? prev
          : [...prev, person],
    );
  }

  function reset() {
    setSelected([]);
    setQuery("");
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Select Friends"
      description={`You can add up to 9 friends — ${selected.length}/9 selected.`}
      size="lg"
      footer={
        <>
          {isGroup ? (
            <button
              onClick={() => {
                onCreateGroup(selected.map((s) => s.id), groupName);
                reset();
              }}
              disabled={busy || selected.length < 2}
              className="rounded-md bg-blurple px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-blurple-soft disabled:opacity-50"
            >
              {busy ? "Creating…" : "Create Group Message"}
            </button>
          ) : (
            <button
              onClick={() => {
                if (selected[0]) {
                  onStartDm(selected[0].id);
                  reset();
                }
              }}
              disabled={busy || selected.length === 0}
              className="rounded-md bg-blurple px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-blurple-soft disabled:opacity-50"
            >
              Start Conversation
            </button>
          )}
        </>
      }
    >
      <div className="flex items-center gap-2 rounded-lg border border-line bg-void/70 px-2.5 py-1.5 focus-within:border-blurple/50">
        <span className="shrink-0 text-[12px] font-semibold text-dim">To:</span>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          {selected.map((person) => (
            <span
              key={person.id}
              className="flex items-center gap-1 rounded bg-blurple/25 px-1.5 py-0.5 text-[11.5px] font-medium text-bright"
            >
              {person.display_name || person.username}
              <button
                onClick={() => toggle(person)}
                aria-label={`Remove ${person.username}`}
                className="text-blurple-soft hover:text-white"
              >
                <CloseIcon width={9} height={9} />
              </button>
            </span>
          ))}
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !query && selected.length > 0) {
                setSelected((prev) => prev.slice(0, -1));
              }
            }}
            placeholder={selected.length === 0 ? "Search friends and server members" : ""}
            aria-label="Search people"
            className="min-w-[120px] flex-1 bg-transparent py-0.5 text-[13px] outline-none placeholder:text-dim"
          />
        </div>
        <SearchIcon width={13} height={13} className="shrink-0 text-dim" />
      </div>

      {isGroup && (
        <p className="mt-2 text-[11.5px] text-dim">
          Group name preview: <span className="font-semibold text-bright">{groupName}</span>
        </p>
      )}

      <div className="scroll-auto mt-3 max-h-72 space-y-0.5 overflow-y-auto">
        {rows.map((person) => {
          const name = person.display_name || person.username;
          const checked = selectedIds.has(person.id);
          return (
            <button
              key={person.id}
              onClick={() => toggle(person)}
              aria-pressed={checked}
              className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition hover:bg-hover/60"
            >
              <span
                className={`grid h-4 w-4 shrink-0 place-items-center rounded-[4px] border-2 transition ${
                  checked ? "border-blurple bg-blurple" : "border-line"
                }`}
              >
                {checked && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                    <path d="m5 13 4 4L19 7" stroke="white" strokeWidth="3.6" strokeLinecap="round" />
                  </svg>
                )}
              </span>
              <Avatar
                name={name}
                src={person.avatar_url}
                accent={person.accent_color}
                size={30}
                status={((person as MessageAuthor & { status?: Presence }).status ?? "offline") as Presence}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-semibold text-bright">{name}</span>
                <span className="block truncate text-[11.5px] text-dim">@{person.username}</span>
              </span>
            </button>
          );
        })}
        {rows.length === 0 && (
          <p className="py-8 text-center text-[12.5px] text-dim">
            No friends match that search. Try a server member or add a friend first.
          </p>
        )}
      </div>
    </Modal>
  );
}

/** Curated GIF grid used by Change Icon. */
const GROUP_GIFS = [
  { id: "gradient-wave", label: "Wave", css: "linear-gradient(135deg,#8b5cf6,#f59e0b)" },
  { id: "neon-city", label: "Neon", css: "linear-gradient(135deg,#06b6d4,#a855f7)" },
  { id: "sunset", label: "Sunset", css: "linear-gradient(135deg,#f97316,#ec4899)" },
  { id: "forest", label: "Forest", css: "linear-gradient(135deg,#22c55e,#0ea5e9)" },
  { id: "mono", label: "Mono", css: "linear-gradient(135deg,#64748b,#0f172a)" },
  { id: "candy", label: "Candy", css: "linear-gradient(135deg,#f472b6,#fbbf24)" },
  { id: "ocean", label: "Ocean", css: "linear-gradient(135deg,#2563eb,#22d3ee)" },
  { id: "ember", label: "Ember", css: "linear-gradient(135deg,#ef4444,#f59e0b)" },
];

export function ChangeIconModal({
  open,
  onClose,
  currentIcon,
  onSave,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  currentIcon?: string | null;
  onSave: (iconUrl: string | null) => void;
  busy?: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(currentIcon ?? null);
  const [name, setName] = useState("");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Change Icon"
      description="Pick a GIF or upload an image to make your group stand out."
      size="md"
      footer={
        <>
          <button
            onClick={() => {
              setPreview(null);
              onSave(null);
            }}
            className="mr-auto rounded-md px-3 py-1.5 text-[12.5px] text-muted transition hover:text-bright"
          >
            Remove Icon
          </button>
          <button
            onClick={() => {
              if (preview) onSave(preview);
            }}
            disabled={busy || !preview}
            className="rounded-md bg-blurple px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-blurple-soft disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save Changes"}
          </button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-2">
        <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full border border-line bg-raised">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Group icon preview" className="h-full w-full object-cover" />
          ) : (
            <span className="text-2xl">🖼️</span>
          )}
        </div>
        <label className="cursor-pointer rounded-md border border-line bg-input px-3 py-1.5 text-[12px] font-semibold text-bright transition hover:bg-hover">
          <span className="flex items-center gap-1.5">
            <UploadIcon width={13} height={13} /> Upload Image
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setPreview(URL.createObjectURL(file));
              e.target.value = "";
            }}
          />
        </label>
      </div>

      <div className="mt-4">
        <p className="mb-1.5 text-[11px] font-bold tracking-[0.12em] text-dim uppercase">Choose GIF</p>
        <div className="grid grid-cols-4 gap-1.5">
          {GROUP_GIFS.map((gif) => (
            <button
              key={gif.id}
              onClick={() => setPreview(cssToDataUrl(gif.css))}
              title={gif.label}
              className="group relative h-16 rounded-lg ring-1 ring-subtle transition hover:ring-blurple"
              style={{ backgroundImage: gif.css }}
            >
              <span className="absolute inset-x-0 bottom-0 rounded-b-lg bg-black/45 py-0.5 text-[9.5px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                {gif.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <label className="mt-4 block">
        <span className="mb-1 block text-[11px] font-bold tracking-[0.12em] text-dim uppercase">
          Group Name
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 100))}
          placeholder="Leave blank to use member names"
          className="w-full rounded-md border border-line bg-void/70 px-3 py-2 text-[13px] outline-none focus:border-blurple/60"
        />
      </label>
    </Modal>
  );
}

/** Encodes a CSS gradient as an SVG data URL so it can persist as an icon. */
export function cssToDataUrl(css: string): string {
  const angle = Number(/(\d+)deg/.exec(css)?.[1] ?? 135);
  const stops = Array.from(css.matchAll(/#[0-9a-f]{6}/gi)).map((m) => m[0]);
  const gradient = stops.length >= 2 ? stops.slice(0, 2) : ["#8b5cf6", "#f59e0b"];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><defs><linearGradient id="g" gradientTransform="rotate(${angle - 90})"><stop offset="0" stop-color="${gradient[0]}"/><stop offset="1" stop-color="${gradient[1]}"/></linearGradient></defs><rect width="160" height="160" rx="80" fill="url(#g)"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
