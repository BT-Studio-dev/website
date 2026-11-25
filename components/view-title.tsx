"use client";

import { useEffect } from "react";

/**
 * Keeps `<title>` in sync with the active view.
 *
 * - Friends view        → "BT Comms | Friends"
 * - Channel in a server → "BT Comms | #general | Design Guild"
 * - Unread DMs          → "(1) BT Comms"
 */
export function ViewTitle({
  view,
  channelName,
  serverName,
  unread = 0,
  custom,
}: {
  view?: "friends" | "dm" | "server" | "store" | "discover" | "onboarding";
  channelName?: string | null;
  serverName?: string | null;
  unread?: number;
  custom?: string;
}) {
  useEffect(() => {
    let next: string;

    if (custom) {
      next = custom;
    } else if (view === "server" && channelName) {
      next = serverName
        ? `BT Comms | #${channelName} | ${serverName}`
        : `BT Comms | #${channelName}`;
    } else if (view === "friends") {
      next = "BT Comms | Friends";
    } else if (view === "store") {
      next = "BT Comms | Store";
    } else if (view === "discover") {
      next = "BT Comms | Discover";
    } else if (view === "onboarding" && serverName) {
      next = `BT Comms | ${serverName}`;
    } else if (view === "dm" && channelName) {
      next = `BT Comms | ${channelName}`;
    } else {
      next = "BT Comms";
    }

    if (unread > 0) next = `(${unread}) ${next}`;
    document.title = next;
  }, [view, channelName, serverName, unread, custom]);

  return null;
}
