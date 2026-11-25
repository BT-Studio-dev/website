import type { ActiveActivity } from "@/lib/types";

/**
 * The activity Discord shows on a profile card ("Playing a Game", "Listening
 * to…"), derived from the free-text status a user set.
 *
 * The app stores presence as one string in `profiles.custom_status`, so this
 * is the single place that turns it back into a structured activity. Keeping it
 * here (rather than inline in a panel) means the DM card, the friends list and
 * the member list can never drift apart, and it is plain data — no JSX, so the
 * demo suite can assert on it.
 */

const PATTERNS: { kind: ActiveActivity["kind"]; label: string; re: RegExp }[] = [
  // "Playing BT Comms Arena" / "Playing: Arena"
  { kind: "game", label: "Playing a Game", re: /^playing\b[:\s]*/i },
  // "Listening to Lo-fi Beats" / "Spotify · playlist"
  { kind: "music", label: "Listening to Spotify", re: /^(?:listening to|spotify\b)[:\s]*/i },
  // "Editing bt-comms/app in VS Code"
  { kind: "code", label: "Editing Code", re: /^(?:editing|working on|in)\b[:\s]*/i },
  // "Watching …"
  { kind: "custom", label: "Watching Something", re: /^watching\b[:\s]*/i },
];

/**
 * Builds the activity card content from a raw status string.
 *
 * Returns `null` when there's nothing to show, so callers render no card at all
 * instead of filling the panel with filler text.
 */
export function activityFromStatus(
  customStatus: string | null | undefined,
): { activity: ActiveActivity; label: string } | null {
  const raw = (customStatus ?? "").trim();
  if (!raw) return null;

  for (const pattern of PATTERNS) {
    const match = pattern.re.exec(raw);
    if (!match) continue;
    const rest = raw.slice(match[0].length).trim();
    // "Playing" with nothing after it is a status, not an activity.
    if (!rest) return null;
    return {
      activity: { kind: pattern.kind, title: rest },
      label: pattern.label,
    };
  }

  // A plain custom status ("Working from home") has no activity to report.
  return null;
}

/** Title for the activity card, matching Discord's section headings. */
export function activityLabel(kind: ActiveActivity["kind"] | undefined): string {
  switch (kind) {
    case "game":
      return "Playing a Game";
    case "music":
      return "Listening to Spotify";
    case "code":
      return "Editing Code";
    case "voice":
      return "In Voice";
    case "custom":
      return "Watching Something";
    default:
      return "Activity";
  }
}
