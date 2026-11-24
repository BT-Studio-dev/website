/**
 * The keybind catalogue.
 *
 * Two things live here:
 *   1. `KEYBIND_GROUPS` — the reference list rendered by User Settings →
 *      Keybinds. It is data, not markup, so the docs and the panel never drift.
 *   2. `matchShortcut` / `KEYBIND_ACTIONS` — the subset we actually implement in
 *      the browser. `REGISTERED_SHORTCUTS` marks which rows are live; the panel
 *      renders a "Not in browser" chip for the rest instead of pretending.
 */

export type KeybindCombo = string[];

export type KeybindEntry = {
  id: string;
  label: string;
  combos: KeybindCombo[];
};

export type KeybindGroup = {
  title: string;
  entries: KeybindEntry[];
};

const k = (...keys: string[]) => keys;

export const KEYBIND_GROUPS: KeybindGroup[] = [
  {
    title: "General",
    entries: [{ id: "show-shortcuts", label: "Show Keyboard Shortcuts List", combos: [k("CTRL", "/")] }],
  },
  {
    title: "Messages",
    entries: [
      { id: "edit-message", label: "Edit Message", combos: [k("E")] },
      { id: "delete-message", label: "Delete Message", combos: [k("BACKSPACE")] },
      { id: "pin-message", label: "Pin Message", combos: [k("P")] },
      { id: "add-reaction", label: "Add Reaction", combos: [k("+")] },
      { id: "reply", label: "Reply", combos: [k("R")] },
      { id: "forward", label: "Forward Message", combos: [k("F")] },
      { id: "speak", label: "Speak Message", combos: [k("S")] },
      { id: "copy-text", label: "Copy Text", combos: [k("CTRL", "C")] },
      { id: "mark-unread", label: "Mark Unread", combos: [k("ALT", "ENTER")] },
      { id: "focus-textarea", label: "Focus text area", combos: [k("ESC")] },
    ],
  },
  {
    title: "Navigation",
    entries: [
      {
        id: "nav-servers",
        label: "Navigate between servers",
        combos: [k("CTRL", "ALT", "UP"), k("CTRL", "ALT", "DOWN")],
      },
      {
        id: "nav-channels",
        label: "Navigate between channels",
        combos: [k("ALT", "UP"), k("ALT", "DOWN")],
      },
      {
        id: "nav-history",
        label: "Navigate forward and backward in page history",
        combos: [k("ALT", "LEFT"), k("ALT", "RIGHT")],
      },
      {
        id: "nav-unread",
        label: "Navigate between unread channels",
        combos: [k("ALT", "SHIFT", "UP"), k("ALT", "SHIFT", "DOWN")],
      },
      {
        id: "nav-unread-mentions",
        label: "Navigate between unread channels with mentions",
        combos: [k("CTRL", "SHIFT", "ALT", "UP"), k("CTRL", "SHIFT", "ALT", "DOWN")],
      },
      { id: "nav-call", label: "Navigate to current call", combos: [k("CTRL", "SHIFT", "ALT", "V")] },
      {
        id: "toggle-last-server",
        label: "Toggle between last server and DMs",
        combos: [k("CTRL", "ALT", "RIGHT")],
      },
      { id: "quickswitcher", label: "Toggle QuickSwitcher", combos: [k("CTRL", "K")] },
      { id: "create-server", label: "Create or join a server", combos: [k("CTRL", "SHIFT", "N")] },
    ],
  },
  {
    title: "Drag and Drop",
    entries: [
      { id: "start-drag", label: "Start Drag and Drop", combos: [k("CTRL", "D")] },
      { id: "drag-move", label: "Move", combos: [k("UP"), k("DOWN")] },
      { id: "drag-drop", label: "Drop item", combos: [k("SPACEBAR"), k("ENTER")] },
      { id: "drag-cancel", label: "Cancel", combos: [k("ESC")] },
    ],
  },
  {
    title: "Chat",
    entries: [
      { id: "mark-server-read", label: "Mark server read", combos: [k("SHIFT", "ESC")] },
      { id: "mark-channel-read", label: "Mark channel as read", combos: [k("ESC")] },
      { id: "new-group", label: "Create a private group", combos: [k("CTRL", "SHIFT", "T")] },
      { id: "new-thread", label: "Create a thread", combos: [k("CTRL", "SHIFT", "ALT", "N")] },
      { id: "toggle-pins", label: "Toggle pins popout", combos: [k("CTRL", "P")] },
      { id: "toggle-inbox", label: "Toggle inbox popout", combos: [k("CTRL", "I")] },
      { id: "mark-top-inbox-read", label: "Mark top inbox channel read", combos: [k("CTRL", "SHIFT", "E")] },
      {
        id: "toggle-members",
        label: "Toggle channel member list or voice text chat",
        combos: [k("CTRL", "U")],
      },
      { id: "toggle-emoji", label: "Toggle emoji picker", combos: [k("CTRL", "E")] },
      { id: "toggle-gif", label: "Toggle GIF picker", combos: [k("CTRL", "G")] },
      { id: "toggle-sticker", label: "Toggle sticker picker", combos: [k("CTRL", "S")] },
      {
        id: "scroll-chat",
        label: "Scroll chat up or down",
        combos: [k("PAGE UP"), k("PAGE DOWN")],
      },
      { id: "jump-oldest-unread", label: "Jump to oldest unread message", combos: [k("SHIFT", "PAGE UP")] },
      { id: "upload-file", label: "Upload a file", combos: [k("CTRL", "SHIFT", "U")] },
      { id: "copy-channel-link", label: "Copy channel link", combos: [k("CTRL", "SHIFT", "L")] },
    ],
  },
  {
    title: "Voice and Video",
    entries: [
      { id: "toggle-mute", label: "Toggle mute", combos: [k("CTRL", "SHIFT", "M")] },
      { id: "toggle-deafen", label: "Toggle deafen", combos: [k("CTRL", "SHIFT", "D")] },
      { id: "answer-call", label: "Answer incoming call", combos: [k("CTRL", "ENTER")] },
      { id: "decline-call", label: "Decline incoming call", combos: [k("ESC")] },
      { id: "start-call", label: "Start call in private message or group", combos: [k("CTRL", "'")] },
      { id: "toggle-soundboard", label: "Toggle soundboard", combos: [k("CTRL", "SHIFT", "B")] },
    ],
  },
  {
    title: "Miscellaneous",
    entries: [
      { id: "get-help", label: "Get help", combos: [k("CTRL", "SHIFT", "H")] },
      { id: "search", label: "Search", combos: [k("CTRL", "F")] },
      { id: "context-menu", label: "Open context menu", combos: [k("SHIFT", "F10")] },
      {
        id: "lofi",
        label: "Listen to Lofi Beats with Wumpus",
        combos: [k("CTRL", "ALT", "SHIFT", "W")],
      },
    ],
  },
];

/** Keybind ids the web app actually wires to a handler. */
export const REGISTERED_SHORTCUTS = new Set<string>([
  "show-shortcuts",
  "focus-textarea",
  "nav-servers",
  "nav-channels",
  "quickswitcher",
  "create-server",
  "new-group",
  "toggle-pins",
  "toggle-inbox",
  "toggle-members",
  "toggle-emoji",
  "toggle-gif",
  "toggle-sticker",
  "upload-file",
  "copy-channel-link",
  "toggle-mute",
  "toggle-deafen",
  "start-call",
  "get-help",
  "search",
  "lofi",
  "focus-textarea",
]);

export type KeybindAction = {
  id: string;
  /** Stable ordering for the "Keyboard Shortcuts" cheat-sheet. */
  label: string;
  combo: KeybindCombo;
};

/**
 * The subset wired by `useGlobalKeybinds`. One handler table instead of a
 * tangle of ad-hoc listeners means every shortcut resolves the same way, and a
 * shortcut can never fire while the user is typing in an input — unless it is
 * explicitly input-safe (the pickers, upload, and Escape-to-blur are).
 */
export const KEYBIND_ACTIONS: KeybindAction[] = [
  { id: "quickswitcher", label: "Toggle QuickSwitcher", combo: k("CTRL", "K") },
  { id: "focus-textarea", label: "Focus text area", combo: k("ESC") },
  { id: "search", label: "Search", combo: k("CTRL", "F") },
  { id: "show-shortcuts", label: "Show Keyboard Shortcuts List", combo: k("CTRL", "/") },
  { id: "create-server", label: "Create or join a server", combo: k("CTRL", "SHIFT", "N") },
  { id: "new-group", label: "Create a private group", combo: k("CTRL", "SHIFT", "T") },
  { id: "toggle-pins", label: "Toggle pins popout", combo: k("CTRL", "P") },
  { id: "toggle-inbox", label: "Toggle inbox popout", combo: k("CTRL", "I") },
  { id: "toggle-members", label: "Toggle member list", combo: k("CTRL", "U") },
  { id: "toggle-emoji", label: "Toggle emoji picker", combo: k("CTRL", "E") },
  { id: "toggle-gif", label: "Toggle GIF picker", combo: k("CTRL", "G") },
  { id: "toggle-sticker", label: "Toggle sticker picker", combo: k("CTRL", "S") },
  { id: "upload-file", label: "Upload a file", combo: k("CTRL", "SHIFT", "U") },
  { id: "copy-channel-link", label: "Copy channel link", combo: k("CTRL", "SHIFT", "L") },
  { id: "toggle-mute", label: "Toggle mute", combo: k("CTRL", "SHIFT", "M") },
  { id: "toggle-deafen", label: "Toggle deafen", combo: k("CTRL", "SHIFT", "D") },
  { id: "start-call", label: "Start call", combo: k("CTRL", "'") },
  { id: "get-help", label: "Get help", combo: k("CTRL", "SHIFT", "H") },
  { id: "nav-servers", label: "Navigate between servers", combo: k("CTRL", "ALT", "UP"), },
  { id: "nav-channels", label: "Navigate between channels", combo: k("ALT", "UP") },
  { id: "lofi", label: "Listen to Lofi Beats with Wumpus", combo: k("CTRL", "ALT", "SHIFT", "W") },
];

/** Actions that must also work while a text field has focus. */
export const INPUT_SAFE = new Set([
  "quickswitcher",
  "search",
  "show-shortcuts",
  "toggle-emoji",
  "toggle-gif",
  "toggle-sticker",
  "upload-file",
  "nav-servers",
  "nav-channels",
  "lofi",
  "focus-textarea",
]);

const MODIFIER_ALIASES: Record<string, string> = {
  ctrl: "CTRL",
  control: "CTRL",
  meta: "META",
  cmd: "META",
  command: "META",
  alt: "ALT",
  option: "ALT",
  shift: "SHIFT",
};

const KEY_ALIASES: Record<string, string> = {
  esc: "ESC",
  escape: "ESC",
  arrowup: "UP",
  arrowdown: "DOWN",
  arrowleft: "LEFT",
  arrowright: "RIGHT",
  pageup: "PAGE UP",
  pagedown: "PAGE DOWN",
  " ": "SPACEBAR",
  space: "SPACEBAR",
  enter: "ENTER",
  backspace: "BACKSPACE",
  tab: "TAB",
  "/": "/",
};

/**
 * Turn a keyboard event into the canonical combo string used above, e.g.
 * `"CTRL SHIFT K"`. Returns `null` for a bare modifier press. On macOS the
 * Command key is reported as CTRL so the Ctrl shortcuts work natively.
 */
export function comboFromEvent(event: {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}): string | null {
  const raw = event.key;
  if (["Control", "Meta", "Alt", "Shift", "OS"].includes(raw)) return null;

  const lower = raw.toLowerCase();
  const key = KEY_ALIASES[lower] ?? (raw.length === 1 ? raw.toUpperCase() : raw.toUpperCase());

  const parts: string[] = [];
  if (event.ctrlKey || event.metaKey) parts.push("CTRL");
  if (event.altKey) parts.push("ALT");
  if (event.shiftKey) parts.push("SHIFT");
  parts.push(key);
  return parts.join(" ");
}

/** The combo string for a declared action, e.g. `"CTRL K"`. */
export function comboString(combo: KeybindCombo): string {
  return combo.join(" ");
}

/**
 * Match an event against a declared combo. Accepts either modifier order and
 * treats ⌘ as Ctrl, matching `comboFromEvent`.
 */
export function matchShortcut(
  event: {
    key: string;
    ctrlKey: boolean;
    metaKey: boolean;
    altKey: boolean;
    shiftKey: boolean;
  },
  combo: KeybindCombo,
): boolean {
  const actual = comboFromEvent(event);
  if (!actual) return false;
  return actual === comboString(combo);
}

/** Human label for a combo, e.g. `Ctrl + Shift + K`. */
export function prettyCombo(combo: KeybindCombo): string {
  return combo
    .map((part) =>
      part
        .split(" ")
        .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
        .join(" "),
    )
    .join(" + ");
}

export { MODIFIER_ALIASES };
