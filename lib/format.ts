import { formatClock, readLanguagePreference } from "./accessibility.ts";

/**
 * Clock time for a message.
 *
 * Honours User Settings → Language & Time: the locale comes from the saved
 * language and the hour cycle from the saved time format (Auto follows the
 * device). Both live in localStorage so this stays a pure function with no
 * React context dependency — it is called from dozens of render paths.
 */
export function formatTime(iso: string) {
  const { language, timeFormat } = readLanguagePreference();
  return formatClock(iso, language, timeFormat);
}

/** Discord-style timestamp: "Today at 9:41 AM", "Yesterday at …", or a date. */
export function formatTimestamp(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round(
    (startOfDay(now) - startOfDay(date)) / 86_400_000,
  );

  if (dayDiff === 0) return `Today at ${formatTime(iso)}`;
  if (dayDiff === 1) return `Yesterday at ${formatTime(iso)}`;
  if (dayDiff < 7)
    return `${date.toLocaleDateString(undefined, { weekday: "long" })} at ${formatTime(iso)}`;
  return `${date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  })} at ${formatTime(iso)}`;
}

export function formatDayLabel(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round(
    (startOfDay(now) - startOfDay(date)) / 86_400_000,
  );
  if (dayDiff === 0) return "Today";
  if (dayDiff === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

export function sameDay(a: string, b: string) {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

/** Groups consecutive messages from the same author within 7 minutes. */
export function shouldGroup(prevIso: string, currentIso: string) {
  return new Date(currentIso).getTime() - new Date(prevIso).getTime() < 7 * 60_000;
}

/**
 * Minimal inline markdown: **bold**, *italic*, `code`, ~~strike~~, and bare links.
 * Returns React-free tokens so it can be rendered by any component.
 */
export type Token = { type: "text" | "bold" | "italic" | "code" | "strike" | "link"; value: string };

export function tokenizeMarkdown(input: string): Token[] {
  const pattern =
    /(\*\*[^*]+\*\*)|(\*[^*]+\*)|(`[^`]+`)|(~~[^~]+~~)|(https?:\/\/[^\s<]+)/g;
  const tokens: Token[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(input)) !== null) {
    if (match.index > last) {
      tokens.push({ type: "text", value: input.slice(last, match.index) });
    }
    const raw = match[0];
    if (raw.startsWith("**")) tokens.push({ type: "bold", value: raw.slice(2, -2) });
    else if (raw.startsWith("`")) tokens.push({ type: "code", value: raw.slice(1, -1) });
    else if (raw.startsWith("~~")) tokens.push({ type: "strike", value: raw.slice(2, -2) });
    else if (raw.startsWith("http")) tokens.push({ type: "link", value: raw });
    else tokens.push({ type: "italic", value: raw.slice(1, -1) });
    last = match.index + raw.length;
  }

  if (last < input.length) tokens.push({ type: "text", value: input.slice(last) });
  return tokens;
}

export function pluralize(count: number, singular: string, plural?: string) {
  return `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
}
