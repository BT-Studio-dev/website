/**
 * Chat-input features shared by the server composer and the DM composer:
 * @mention autocomplete (including the built-in `@game` / `@time` tags),
 * slash commands, and the emoji picker data.
 */

export type MentionOption = {
  id: string;
  label: string;
  /** Shown as the secondary line in the autocomplete list. */
  description?: string;
  avatar_url?: string | null;
  accent_color?: string | null;
  builtin?: boolean;
  /** Inserted into the composer; `{}` is replaced by the query. */
  insert: string;
  insertFor?: (query: string) => string;
};

export const BUILTIN_MENTIONS: MentionOption[] = [
  {
    id: "game",
    label: "@game",
    description: "Show what you're playing right now",
    builtin: true,
    insert: "@game",
  },
  {
    id: "time",
    label: "@time",
    description: "Insert a live timestamp in the reader's timezone",
    builtin: true,
    insert: "@time",
  },
];

export type SlashCommand = {
  name: string;
  description: string;
  insert?: string;
  hint?: string;
};

export const SLASH_COMMANDS: SlashCommand[] = [
  { name: "/shrug", description: "Append ¯\\_(ツ)_/¯", insert: "¯\\_(ツ)_/¯", hint: "text" },
  { name: "/tableflip", description: "Append (╯°□°)╯︵ ┻━┻", insert: "(╯°□°)╯︵ ┻━┻" },
  { name: "/me", description: "Send an action in italics", hint: "action" },
  { name: "/gif", description: "Search GIFs", hint: "query" },
  { name: "/nick", description: "Change your nickname on this server", hint: "name" },
  { name: "/status", description: "Set a custom status", hint: "status" },
  { name: "/invite", description: "Create an invite link to this channel" },
  { name: "/spoiler", description: "Mark text as a spoiler", hint: "text" },
  { name: "/tts", description: "Send a text-to-speech message", hint: "text" },
];

export const EMOJI_PALETTE: { group: string; emoji: string[] }[] = [
  {
    group: "Frequently used",
    emoji: ["😂", "🩷", "🔥", "✨", "👀", "💯", "🙌", "🎉"],
  },
  {
    group: "Smileys",
    emoji: ["😀", "😅", "🥹", "😎", "🤔", "😴", "🤯", "🥳", "😭", "🤝", "🫡", "😤"],
  },
  {
    group: "Objects & symbols",
    emoji: ["🚀", "🎮", "🎧", "💜", "🧠", "⚡", "🎨", "📌", "🛠️", "🌊", "☕", "🍕"],
  },
];

/** `:shortcode:` → emoji, per Discord's conventions. */
export const SHORTCODES: Record<string, string> = {
  smile: "😄",
  joy: "😂",
  heart: "❤️",
  purple_heart: "💜",
  fire: "🔥",
  sparkles: "✨",
  eyes: "👀",
  tada: "🎉",
  rocket: "🚀",
  sob: "😭",
  thinking: "🤔",
  wave: "👋",
  thumbsup: "👍",
  "+1": "👍",
};

/** Discord's emoticon auto-conversion, used by the Appearance toggle. */
export const EMOTICONS: [RegExp, string][] = [
  [/(^|\s):\)(\s|$)/g, "$1🙂$2"],
  [/(^|\s):-\)(\s|$)/g, "$1🙂$2"],
  [/(^|\s):D(\s|$)/g, "$1😄$2"],
  [/(^|\s):-D(\s|$)/g, "$1😄$2"],
  [/(^|\s);\)(\s|$)/g, "$1😉$2"],
  [/(^|\s):P(\s|$)/gi, "$1😛$2"],
  [/(^|\s):-P(\s|$)/gi, "$1😛$2"],
  [/(^|\s):\((\s|$)/g, "$1🙁$2"],
  [/(^|\s):-\((\s|$)/g, "$1🙁$2"],
  [/(^|\s)<3(\s|$)/g, "$1❤️$2"],
];

export function applyEmoticons(text: string): string {
  return EMOTICONS.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), text);
}

/** Applies `:shortcode:` replacements when previews are enabled. */
export function applyShortcodes(text: string): string {
  return text.replace(/:([a-z0-9_+-]+):/gi, (match, code: string) => {
    const hit = SHORTCODES[code.toLowerCase()];
    return hit ?? match;
  });
}

export type MentionToken = { type: "text"; value: string } | { type: "mention"; value: string; id?: string };

/**
 * Splits a message body into plain text and @mention tokens.
 * Mentions are `<@uuid>` internally; `@game` / `@time` stay literal.
 */
export function tokenizeMentions(content: string): MentionToken[] {
  const pattern = /<@([0-9a-fA-F-]{36})>|@(game|time|everyone|here)\b/g;
  const out: MentionToken[] = [];
  let cursor = 0;

  for (const match of content.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) out.push({ type: "text", value: content.slice(cursor, index) });
    if (match[1]) out.push({ type: "mention", id: match[1], value: match[1].slice(0, 8) });
    else out.push({ type: "mention", value: match[2] });
    cursor = index + match[0].length;
  }

  if (cursor < content.length) out.push({ type: "text", value: content.slice(cursor) });
  return out.length > 0 ? out : [{ type: "text", value: content }];
}

/** Converts a display name into the `<@id>` form the renderer understands. */
export function toMentionToken(userId: string, displayName: string) {
  return { token: `<@${userId}>`, label: `@${displayName}` };
}

/** Resolves the active @-query at the caret, for autocomplete. */
export function activeMentionQuery(value: string, caret: number): string | null {
  const upto = value.slice(0, caret);
  const match = /(?:^|\s)@([\w.-]*)$/.exec(upto);
  return match ? match[1] : null;
}

export function activeSlashQuery(value: string, caret: number): string | null {
  const upto = value.slice(0, caret);
  const match = /^\/([\w-]*)$/.exec(upto);
  return match ? match[1] : null;
}

/**
 * The `@time` tag renders as a timestamp in the reader's own timezone —
 * exactly like Discord's dynamic timestamps.
 */
export function renderTimeTag(now: Date = new Date()): string {
  return now.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const IMAGE_RE = /https?:\/\/[^\s)]+\.(?:png|jpe?g|gif|webp|avif)(?:\?[^\s)]*)?/gi;
const MD_IMAGE_RE = /!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g;

/** Pulls image URLs out of a message body for inline previews. */
export function extractMedia(content: string): { text: string; images: string[] } {
  const images: string[] = [];
  let text = content.replace(MD_IMAGE_RE, (_match, url: string) => {
    images.push(url);
    return "";
  });
  text = text.replace(IMAGE_RE, (match) => {
    images.push(match);
    return "";
  });
  return { text: text.trim(), images: images.slice(0, 4) };
}
