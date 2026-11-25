"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Avatar } from "@/components/avatar";
import { CloseIcon, HashIcon, SearchIcon, SpeakerIcon, FriendsIcon, ClockIcon } from "@/components/icons";
import type { Presence } from "@/lib/types";
import { scoreMatch } from "@/lib/search";

/**
 * Global Quick Switcher.
 *
 * One list, four kinds of result — channels, voice channels, direct messages and
 * server members — ranked so that an exact prefix always wins over a fuzzy hit.
 * Recent searches are remembered per browser and shown before you type.
 *
 * Keyboard: ↑/↓ move, Enter opens, Esc and the X button clear-then-close.
 */

export type QuickSwitcherItem = {
  id: string;
  kind: "channel" | "voice" | "dm" | "member";
  label: string;
  /** Secondary line, e.g. the server name or @handle. */
  hint?: string;
  avatarUrl?: string | null;
  accent?: string | null;
  status?: Presence;
};

const RECENT_KEY = "btcomms.recentSearches.v1";
const MAX_RECENT = 6;

function readRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function writeRecent(value: string) {
  if (typeof window === "undefined") return;
  try {
    const next = [value, ...readRecent().filter((item) => item !== value)].slice(0, MAX_RECENT);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* storage blocked — the in-memory list still works this session */
  }
}

export function QuickSwitcher({
  open,
  onClose,
  items,
  placeholder = "Search",
  onOpenItem,
}: {
  open: boolean;
  onClose: () => void;
  items: QuickSwitcherItem[];
  placeholder?: string;
  onOpenItem: (item: QuickSwitcherItem) => void;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setRecent(readRecent());
    setQuery("");
    setActive(0);
    // Focus after the portal paints.
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  const results = useMemo(() => {
    const needle = query.trim();
    if (!needle) return [];
    return items
      .map((item) => {
        const byLabel = scoreMatch(item.label, needle);
        const byHint = item.hint ? scoreMatch(item.hint, needle) - 20 : -1;
        return { item, score: Math.max(byLabel, byHint) };
      })
      .filter((entry) => entry.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 40)
      .map((entry) => entry.item);
  }, [items, query]);

  const visible = query.trim() ? results : [];

  useEffect(() => {
    setActive(0);
  }, [query]);

  // Keep the highlighted row inside the scroll viewport.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const row = list.querySelector<HTMLElement>(`[data-row="${active}"]`);
    row?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function choose(item: QuickSwitcherItem, remember = true) {
    if (remember && query.trim()) writeRecent(query.trim());
    onOpenItem(item);
    onClose();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (visible.length === 0 ? 0 : (index + 1) % visible.length));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) =>
        visible.length === 0 ? 0 : (index - 1 + visible.length) % visible.length,
      );
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const item = visible[active];
      if (item) choose(item);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      // First Esc clears the query, a second closes — matches Discord.
      if (query) setQuery("");
      else onClose();
    }
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[150] flex items-start justify-center bg-black/60 px-3 pt-[10vh] backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search BT Comms"
        className="animate-rise w-full max-w-[640px] overflow-hidden rounded-xl border border-line bg-[color-mix(in_oklab,var(--c-elevated)_96%,transparent)] shadow-2xl shadow-black/70"
      >
        <div className="border-b border-line/70 p-3">
          <div className="flex items-center gap-2 rounded-lg bg-void/70 px-3 py-2 ring-1 ring-line/70 focus-within:ring-blurple/60">
            <SearchIcon width={16} height={16} className="shrink-0 text-dim" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder={placeholder}
              aria-label="Search"
              role="combobox"
              aria-expanded={visible.length > 0}
              aria-controls="quickswitcher-results"
              className="min-w-0 flex-1 bg-transparent text-[13.5px] text-bright outline-none placeholder:text-dim"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                title="Clear search"
                aria-label="Clear search"
                className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-hover/70 text-muted transition hover:bg-hover hover:text-bright"
              >
                <CloseIcon width={11} height={11} />
              </button>
            )}
            <span className="shrink-0 rounded bg-hover/55 px-1.5 py-0.5 text-[10px] font-semibold text-dim">
              ESC
            </span>
          </div>
        </div>

        <div ref={listRef} id="quickswitcher-results" className="scroll-auto max-h-[52vh] overflow-y-auto p-2">
          {!query.trim() ? (
            <>
              <p className="px-2 pt-1 pb-1.5 text-[10.5px] font-bold tracking-[0.14em] text-dim uppercase">
                Recent searches
              </p>
              {recent.length === 0 ? (
                <p className="px-2 pb-2 text-[12px] text-dim">
                  Nothing yet — start typing to search channels, DMs and members.
                </p>
              ) : (
                <ul>
                  {recent.map((term) => (
                    <li key={term}>
                      <button
                        type="button"
                        onClick={() => {
                          setQuery(term);
                          inputRef.current?.focus();
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] text-muted transition hover:bg-hover/60 hover:text-bright"
                      >
                        <ClockIcon width={14} height={14} className="shrink-0 text-dim" />
                        <span className="min-w-0 flex-1 truncate">{term}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : visible.length === 0 ? (
            <p className="px-2 py-6 text-center text-[12.5px] text-dim">
              No results for “{query.trim()}”.
            </p>
          ) : (
            <ul role="listbox">
              {visible.map((item, index) => (
                <li key={`${item.kind}:${item.id}`}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === active}
                    data-row={index}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => choose(item)}
                    className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition ${
                      index === active ? "bg-blurple text-[color:var(--c-on-accent)]" : "text-muted hover:bg-hover/60"
                    }`}
                  >
                    <ItemIcon item={item} highlighted={index === active} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-semibold">{item.label}</span>
                      {item.hint && (
                        <span
                          className={`block truncate text-[10.5px] ${
                            index === active ? "text-white/70" : "text-dim"
                          }`}
                        >
                          {item.hint}
                        </span>
                      )}
                    </span>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[9.5px] font-bold tracking-wide uppercase ${
                        index === active ? "bg-white/20 text-white" : "bg-hover/60 text-dim"
                      }`}
                    >
                      {item.kind === "dm" ? "DM" : item.kind === "member" ? "Member" : item.kind}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-line/70 px-3 py-1.5 text-[10.5px] text-dim">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc clear</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ItemIcon({ item, highlighted }: { item: QuickSwitcherItem; highlighted: boolean }) {
  if (item.kind === "member" || item.kind === "dm") {
    return (
      <Avatar
        name={item.label}
        src={item.avatarUrl ?? undefined}
        accent={item.accent ?? undefined}
        size={22}
        status={item.status}
      />
    );
  }
  const Icon = item.kind === "voice" ? SpeakerIcon : item.kind === "channel" ? HashIcon : FriendsIcon;
  return (
    <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded bg-void/50 text-[11px]">
      <Icon width={13} height={13} className={highlighted ? "text-white" : "text-muted"} />
    </span>
  );
}
