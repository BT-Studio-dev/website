import type { Presence, StatusDuration } from "./types.ts";
import { STATUS_DURATIONS } from "./types.ts";

/**
 * Timed presence helpers.
 *
 * `profiles.status` holds the value the user picked and
 * `profiles.status_expires_at` holds the moment it lapses. Everything that
 * renders a dot runs through `effectiveStatus()` so an expired timer reads as
 * Online without waiting for a write.
 */

export function durationToExpiry(
  duration: StatusDuration,
  from: Date = new Date(),
): string | null {
  const entry = STATUS_DURATIONS.find((d) => d.id === duration);
  if (!entry) return null;
  if (entry.ms === null) return null; // Forever
  return new Date(from.getTime() + entry.ms).toISOString();
}

export function effectiveStatus(
  status: string | null | undefined,
  expiresAt: string | null | undefined,
): Presence {
  const value = (status ?? "offline") as Presence;
  if (!expiresAt) return value;
  if (value === "online" || value === "offline") return value;
  // A lapsed timer reverts to Online before the sweeper runs.
  return new Date(expiresAt).getTime() <= Date.now() ? "online" : value;
}

/** "Online for 43 minutes" / "Idle for 2 hours" style caption. */
export function statusCaption(
  status: Presence,
  expiresAt?: string | null,
): string | null {
  if (!expiresAt) return null;
  const remaining = new Date(expiresAt).getTime() - Date.now();
  if (remaining <= 0) return null;
  const minutes = Math.round(remaining / 60_000);
  if (minutes < 60) return `${minutes} min left`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} hr left`;
  return `${Math.round(hours / 24)} days left`;
}

/** What other people should see — invisible renders as offline. */
export function publicStatus(status: Presence): Presence {
  return status === "invisible" ? "offline" : status;
}

export const STATUS_OPTIONS: {
  id: Presence;
  label: string;
  description: string;
  /** Idle / DND / Invisible offer the duration flyout. */
  timed: boolean;
}[] = [
  { id: "online", label: "Online", description: "", timed: false },
  { id: "idle", label: "Idle", description: "", timed: true },
  {
    id: "dnd",
    label: "Do Not Disturb",
    description: "You will not receive any desktop notifications.",
    timed: true,
  },
  {
    id: "invisible",
    label: "Invisible",
    description: "You will appear offline to everyone.",
    timed: true,
  },
];
