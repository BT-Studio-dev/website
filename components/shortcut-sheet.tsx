"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/components/icons";
import { KEYBIND_ACTIONS, prettyCombo } from "@/lib/keybinds";

/**
 * The `Ctrl + /` cheat sheet: a compact overlay listing the shortcuts that are
 * live in the browser (the full reference, including desktop-only rows, lives in
 * User Settings → Keybinds).
 */
export function ShortcutSheet({
  open,
  onClose,
  onOpenSettings,
}: {
  open: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={onClose}
      className="animate-fade fixed inset-0 z-[130] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-subtle bg-elevated shadow-2xl"
      >
        <header className="flex items-center justify-between gap-3 border-b border-subtle px-4 py-3">
          <div>
            <h2 className="text-[14px] font-bold tracking-tight text-bright">Keyboard Shortcuts</h2>
            <p className="text-[11.5px] text-dim">Press Ctrl + / any time to reopen this list.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-md text-muted transition hover:bg-hover/60 hover:text-bright"
          >
            <CloseIcon width={15} height={15} />
          </button>
        </header>

        <div className="scroll-auto max-h-[60vh] overflow-y-auto px-4 py-2">
          <ul className="divide-y divide-line/50">
            {KEYBIND_ACTIONS.map((action) => (
              <li key={action.id} className="flex items-center justify-between gap-3 py-1.5">
                <span className="truncate text-[12.5px] text-muted">{action.label}</span>
                <kbd className="shrink-0 rounded-md border border-line bg-void/70 px-1.5 py-0.5 text-[10.5px] font-semibold tracking-wide text-bright">
                  {prettyCombo(action.combo)}
                </kbd>
              </li>
            ))}
          </ul>
        </div>

        {onOpenSettings && (
          <footer className="border-t border-subtle px-4 py-2.5">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSettings();
              }}
              className="text-[12px] font-semibold text-blurple-soft transition hover:text-bright"
            >
              See the full list in User Settings → Keybinds →
            </button>
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
