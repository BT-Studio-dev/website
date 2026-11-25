"use client";

import { SearchIcon } from "@/components/icons";

/**
 * The top-right search affordance.
 *
 * It is a button, not an input: clicking (or Ctrl+K) opens the Quick Switcher,
 * which is where the real field, the recents and the keyboard navigation live.
 * A second inline input in every header would only compete with the feed's own
 * message search.
 */
export function GlobalSearchButton({
  label,
  onOpen,
  className = "",
}: {
  label: string;
  onOpen: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      title={`Search — Ctrl+K`}
      aria-label={`Search ${label}`}
      className={`flex h-8 min-w-0 items-center gap-1.5 rounded-md border border-line/70 bg-void/50 px-2 text-left text-[12px] text-dim transition hover:border-line hover:bg-hover/40 hover:text-muted ${className}`}
    >
      <span className="min-w-0 max-w-[140px] flex-1 truncate">Search {label}</span>
      <SearchIcon width={13} height={13} className="shrink-0" />
    </button>
  );
}
