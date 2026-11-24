"use client";

import { useMemo, useState } from "react";
import { PlusIcon, SearchIcon, CloseIcon } from "@/components/icons";
import { WidgetTile } from "@/components/profile/profile-card";
import {
  GAME_CATALOGUE,
  coverGradient,
  searchGames,
} from "@/lib/profile-cosmetics";
import type { ProfileWidget, WidgetKind, WidgetGame } from "@/lib/types";

const TABS: { id: "board" | "activity" | "wishlist"; label: string; kinds: WidgetKind[] }[] = [
  { id: "board", label: "Board", kinds: ["favorite"] },
  { id: "activity", label: "Activity", kinds: ["like"] },
  { id: "wishlist", label: "Wishlist", kinds: ["want"] },
];

const KIND_LABEL: Record<WidgetKind, string> = {
  favorite: "Favorite Game",
  like: "Games I Like",
  want: "Want to Play",
};

/**
 * Right-hand widget editor: Board / Activity / Wishlist tabs, each of which
 * owns one widget kind. Search adds a game card; hovering removes it.
 */
export function WidgetPanel({
  widgets,
  onAdd,
  onRemove,
}: {
  widgets: ProfileWidget[];
  onAdd: (kind: WidgetKind, game: WidgetGame) => void;
  onRemove: (id: string) => void;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("board");
  const [adding, setAdding] = useState<WidgetKind | null>(null);
  const [query, setQuery] = useState("");
  const [customName, setCustomName] = useState("");

  const activeTab = TABS.find((t) => t.id === tab) ?? TABS[0];
  const results = useMemo(() => searchGames(query), [query]);

  const usedIds = new Set(widgets.map((w) => w.game.id));

  function add(kind: WidgetKind, game: WidgetGame) {
    onAdd(kind, game);
    setAdding(null);
    setQuery("");
  }

  function addCustom(kind: WidgetKind) {
    const name = customName.trim();
    if (!name) return;
    add(kind, {
      id: `custom-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
      name,
      cover: null,
      genre: "Custom",
    });
    setCustomName("");
  }

  return (
    <aside className="flex w-full shrink-0 flex-col rounded-2xl border border-line/80 bg-panel/70 xl:w-[336px]">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-line/60 px-3 py-2.5">
        <div className="flex items-center gap-1">
          {TABS.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setTab(item.id);
                setAdding(null);
              }}
              aria-pressed={tab === item.id}
              className={`rounded-md px-2.5 py-1 text-[12.5px] font-semibold transition ${
                tab === item.id
                  ? "bg-hover text-bright"
                  : "text-muted hover:bg-hover/50 hover:text-bright"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setAdding(adding ? null : activeTab.kinds[0])}
          title="Add widget"
          className="flex shrink-0 items-center gap-1 rounded-md bg-blurple px-2 py-1 text-[11.5px] font-semibold text-white transition hover:bg-blurple-soft"
        >
          <PlusIcon width={12} height={12} />
          Add Widget
        </button>
      </header>

      <div className="scroll-thin min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
        {activeTab.kinds.map((kind) => {
          const owned = widgets.filter((w) => w.kind === kind);
          return (
            <section key={kind}>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-[11px] font-semibold tracking-widest text-dim uppercase">
                  {KIND_LABEL[kind]}
                </h4>
                <button
                  onClick={() => setAdding(adding === kind ? null : kind)}
                  className="text-[11px] font-semibold text-blurple-soft hover:underline"
                >
                  {owned.length ? "Edit" : "Add"}
                </button>
              </div>

              {owned.length === 0 ? (
                <button
                  onClick={() => setAdding(kind)}
                  className="grid w-full place-items-center gap-1 rounded-lg border border-dashed border-line/80 px-3 py-4 text-[11.5px] text-dim transition hover:border-blurple/50 hover:text-muted"
                >
                  <PlusIcon width={14} height={14} />
                  {adding === kind ? "Pick a game below" : "Add a card"}
                </button>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {owned.map((widget) => (
                    <WidgetTile
                      key={widget.id}
                      widget={widget}
                      onRemove={() => onRemove(widget.id)}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}

        {/* Game picker */}
        {adding && (
          <section className="animate-rise rounded-xl border border-line/80 bg-void/50 p-2.5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11.5px] font-semibold text-bright">
                Add to {KIND_LABEL[adding]}
              </p>
              <button
                onClick={() => setAdding(null)}
                aria-label="Close game picker"
                className="text-dim transition hover:text-bright"
              >
                <CloseIcon width={13} height={13} />
              </button>
            </div>

            <div className="mb-2 flex items-center gap-1.5 rounded-md border border-line bg-void px-2 py-1">
              <SearchIcon width={12} height={12} className="shrink-0 text-dim" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search games…"
                aria-label="Search games"
                className="w-full bg-transparent text-[12px] outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {results.map((game) => {
                const used = usedIds.has(game.id);
                return (
                  <button
                    key={game.id}
                    onClick={() => add(adding, game)}
                    disabled={used}
                    className="group relative overflow-hidden rounded-md border border-line/70 text-left transition hover:border-blurple/60 disabled:opacity-40"
                  >
                    <span
                      className="block h-16 w-full"
                      style={{ background: coverGradient(game.name) }}
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-1 pt-2 pb-1">
                      <span className="line-clamp-2 block text-[9.5px] leading-tight font-bold text-white">
                        {game.name}
                      </span>
                    </span>
                  </button>
                );
              })}
              {results.length === 0 && (
                <p className="col-span-3 py-3 text-center text-[11.5px] text-dim">
                  No match — add it manually below.
                </p>
              )}
            </div>

            <div className="mt-2 flex items-center gap-1.5">
              <input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addCustom(adding);
                }}
                placeholder="Custom game name"
                className="min-w-0 flex-1 rounded-md border border-line bg-void px-2 py-1 text-[12px] outline-none focus:border-blurple/60"
              />
              <button
                onClick={() => addCustom(adding)}
                disabled={!customName.trim()}
                className="shrink-0 rounded-md bg-raised px-2 py-1 text-[11.5px] font-semibold text-bright transition hover:bg-hover disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </section>
        )}

        {/* Suggestion rail */}
        <section>
          <h4 className="mb-2 text-[11px] font-semibold tracking-widest text-dim uppercase">
            Popular right now
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {GAME_CATALOGUE.slice(0, 6).map((game) => (
              <button
                key={game.id}
                onClick={() => add(activeTab.kinds[0], game)}
                disabled={usedIds.has(game.id)}
                className="group relative overflow-hidden rounded-lg border border-line/70 transition hover:border-blurple/60 disabled:opacity-40"
                title={`Add ${game.name}`}
              >
                <span className="block h-20 w-full" style={{ background: coverGradient(game.name) }} />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-1.5 pt-3 pb-1">
                  <span className="line-clamp-2 block text-[10px] leading-tight font-bold text-white">
                    {game.name}
                  </span>
                </span>
                <span className="absolute top-1 right-1 grid h-4 w-4 place-items-center rounded-full bg-black/70 text-[10px] text-white opacity-0 transition group-hover:opacity-100">
                  +
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}
