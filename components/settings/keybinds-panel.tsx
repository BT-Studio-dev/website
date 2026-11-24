"use client";

import { useMemo, useState } from "react";
import {
  KEYBIND_GROUPS,
  REGISTERED_SHORTCUTS,
  prettyCombo,
  type KeybindEntry,
} from "@/lib/keybinds";
import { CardLabel, SettingsCard, SettingsSection } from "@/components/settings/primitives";
import { DownloadIcon, KeybindIcon, SearchIcon } from "@/components/icons";

/**
 * User Settings → System → Keybinds.
 *
 * Renders the full reference list and marks which shortcuts the browser build
 * actually implements (`REGISTERED_SHORTCUTS`), because a settings page that
 * claims a shortcut works when it doesn't is worse than no page at all.
 */
export function KeybindsPanel() {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return KEYBIND_GROUPS;
    return KEYBIND_GROUPS.map((group) => ({
      ...group,
      entries: group.entries.filter(
        (entry) =>
          entry.label.toLowerCase().includes(needle) ||
          entry.combos.some((combo) => combo.join(" ").toLowerCase().includes(needle)),
      ),
    })).filter((group) => group.entries.length > 0);
  }, [query]);

  const live = KEYBIND_GROUPS.flatMap((g) => g.entries).filter((e) =>
    REGISTERED_SHORTCUTS.has(e.id),
  ).length;
  const total = KEYBIND_GROUPS.flatMap((g) => g.entries).length;

  return (
    <SettingsSection
      title="Keybinds"
      description="Every keyboard shortcut in BT Comms, and which ones are wired up in the browser."
    >
      {/* Custom keybinds banner */}
      <div className="rounded-xl border border-blurple/40 bg-blurple/10 p-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blurple/20 text-blurple-soft">
            <KeybindIcon width={18} height={18} />
          </span>
          <div className="min-w-0">
            <p className="text-[13.5px] font-bold text-bright">Custom Keybinds</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
              Keybinds are custom keyboard shortcuts that let you perform specific actions in
              Discord without needing to click through menus.
            </p>
            <a
              href="https://btcomms.gg/download"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-blurple/50 bg-blurple/20 px-2.5 py-1 text-[11.5px] font-semibold text-bright transition hover:bg-blurple/30"
            >
              <DownloadIcon width={12} height={12} />
              Desktop app
              <span className="font-normal text-muted">
                Custom keybinds are not currently supported in the browser. Download the desktop
                application to use custom keybinds.
              </span>
            </a>
          </div>
        </div>
      </div>

      {/* Filter + count */}
      <SettingsCard>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-void/60 px-2.5 py-1.5">
            <SearchIcon width={14} height={14} className="shrink-0 text-dim" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search keybinds…"
              aria-label="Search keybinds"
              className="w-full bg-transparent text-[12.5px] outline-none placeholder:text-dim"
            />
          </label>
          <span className="shrink-0 rounded-full border border-line bg-hover/40 px-2 py-0.5 text-[11px] font-semibold text-muted">
            {live} of {total} active in browser
          </span>
        </div>
        <p className="mt-2 text-[11.5px] text-dim">
          Rows marked <span className="font-semibold text-mint">Active</span> trigger real actions
          (modals, navigation, pickers). <span className="font-semibold">Desktop only</span> rows are
          listed for parity and ship with the native app.
        </p>
      </SettingsCard>

      {groups.length === 0 && (
        <p className="py-6 text-center text-[13px] text-dim">No shortcuts match “{query}”.</p>
      )}

      {groups.map((group) => (
        <SettingsCard key={group.title}>
          <CardLabel>{group.title}</CardLabel>
          <div className="mt-2 divide-y divide-line/50">
            {group.entries.map((entry) => (
              <KeybindRow key={entry.id} entry={entry} />
            ))}
          </div>
        </SettingsCard>
      ))}
    </SettingsSection>
  );
}

function KeybindRow({ entry }: { entry: KeybindEntry }) {
  const active = REGISTERED_SHORTCUTS.has(entry.id);
  return (
    <div className="ui-density-row flex flex-wrap items-center justify-between gap-2 py-1.5">
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate text-[12.5px] text-muted">{entry.label}</span>
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[9.5px] font-bold tracking-wide uppercase ${
            active ? "bg-mint/15 text-mint" : "bg-hover/50 text-dim"
          }`}
        >
          {active ? "Active" : "Desktop only"}
        </span>
      </span>
      <span className="flex shrink-0 flex-wrap items-center gap-1">
        {entry.combos.map((combo) => (
          <kbd
            key={combo.join("+")}
            title={prettyCombo(combo)}
            className="rounded-md border border-line bg-void/70 px-1.5 py-0.5 font-sans text-[10.5px] font-semibold tracking-wide text-bright shadow-sm"
          >
            {combo.join(" + ")}
          </kbd>
        ))}
      </span>
    </div>
  );
}
