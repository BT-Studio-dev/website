"use client";

import { useEffect } from "react";
import { INPUT_SAFE, KEYBIND_ACTIONS, matchShortcut } from "@/lib/keybinds";

export type KeybindHandlers = Partial<Record<string, () => void>>;

/** True when focus is inside a field where a bare letter means "type it". */
function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

/**
 * One document-level listener for every shortcut the web app implements.
 *
 * Kept as a hook (rather than per-component listeners) so:
 *   - a shortcut can never fire twice because two components registered it,
 *   - typing in a field is never hijacked unless the action is input-safe,
 *   - the cheat-sheet and the settings page can both read the same table.
 */
export function useGlobalKeybinds(handlers: KeybindHandlers, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(event: KeyboardEvent) {
      // Never shadow the browser's own reload/devtools combo.
      if (event.key === "F5" || (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "r")) {
        return;
      }

      const typing = isTyping(event.target);
      for (const action of KEYBIND_ACTIONS) {
        if (!matchShortcut(event, action.combo)) continue;
        const handler = handlers[action.id];
        if (!handler) continue;
        if (typing && !INPUT_SAFE.has(action.id)) continue;

        event.preventDefault();
        event.stopPropagation();
        handler();
        return;
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [handlers, enabled]);
}
