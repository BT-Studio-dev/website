"use client";

import { useEffect, useMemo, useState } from "react";
import { BoltIcon } from "@/components/icons";

/**
 * The centered loading screen.
 *
 * Rotating tips keep it feeling alive, and a hard timeout (`TIMEOUT_MS`)
 * guarantees the user never gets stuck on "Connecting to BT Comms" — after
 * that it offers to retry or drop into the demo workspace.
 */

const TIPS = [
  "Did you know: Characters like @, #, ! and * will narrow Quick Switcher results.",
  "Hold Ctrl / ⌘ and press K to jump to any channel or DM.",
  "You can right-click a server icon to copy its ID or leave the server.",
  "Type @game to share what you're playing right now.",
  "Type @time to drop a timestamp that renders in the reader's timezone.",
  "Drag and drop a file straight onto the composer to upload it.",
  "Timed statuses revert to Online on their own — set Idle for 15 minutes and forget it.",
  "Mentions of your name glow purple in the feed.",
  "Press Shift + Enter for a new line without sending.",
  "You can group up to 10 people into a single group message.",
  "Streamer Mode hides your email and invite links while you're live.",
  "Custom gradients live in User Settings → Appearance → Ambient Gradient.",
];

const TIMEOUT_MS = 9000;

export function LoadingScreen({
  onFallback,
  onRetry,
  onCancel,
  label = "Connecting to BT Comms",
}: {
  onFallback: () => void;
  onRetry?: () => void;
  /** Stops waiting and leaves the spinner immediately. */
  onCancel?: () => void;
  label?: string;
}) {
  const [timedOut, setTimedOut] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [tip, setTip] = useState(0);

  // Random start so repeat visits don't always open on the same tip.
  const start = useMemo(() => Math.floor(Math.random() * TIPS.length), []);

  useEffect(() => {
    setTip(start);
    const rotate = setInterval(() => setTip((i) => (i + 1) % TIPS.length), 5200);
    const timeout = setTimeout(() => setTimedOut(true), TIMEOUT_MS);
    return () => {
      clearInterval(rotate);
      clearTimeout(timeout);
    };
  }, [start]);

  // Only auto-fall-back while the user is still waiting. Cancelling or hitting
  // Retry must not be undone a moment later by this timer.
  useEffect(() => {
    if (timedOut && !cancelled) onFallback();
  }, [timedOut, cancelled, onFallback]);

  return (
    <div className="ambient-stage grid h-dvh place-items-center px-6">
      <div className="flex w-full max-w-lg flex-col items-center text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-blurple-soft to-blurple text-white shadow-xl shadow-blurple/40">
          <BoltIcon width={26} height={26} strokeWidth={2.2} />
        </span>

        <div className="mt-4 h-6 w-6 animate-spin rounded-full border-2 border-subtle border-t-blurple" />

        <p className="mt-3 text-[10.5px] font-semibold tracking-[0.18em] text-dim uppercase">
          {label}
        </p>

        <div className="mt-8 min-h-[72px] w-full rounded-xl border border-subtle bg-hover/45 px-4 py-3 backdrop-blur-sm">
          <p className="text-[10px] font-bold tracking-[0.16em] text-dim uppercase">Tip</p>
          <p
            key={tip}
            className="animate-fade mt-1 text-[12.5px] leading-relaxed text-muted"
            aria-live="polite"
          >
            {TIPS[tip]}
          </p>
        </div>

        <div className="mt-3 flex gap-1">
          {TIPS.map((_, index) => (
            <span
              key={index}
              className={`h-1 rounded-full transition-all ${
                index === tip ? "w-4 bg-blurple" : "w-1 bg-hover/55"
              }`}
            />
          ))}
        </div>

        {!timedOut && (onCancel || onRetry) && (
          <div className="mt-5 flex gap-2">
            {onRetry && (
              <button
                type="button"
                onClick={() => {
                  setTimedOut(false);
                  onRetry();
                }}
                className="rounded-md bg-raised px-3 py-1.5 text-[12px] font-semibold text-bright ring-1 ring-line transition hover:bg-hover"
              >
                Restart
              </button>
            )}
            {onCancel && (
              <button
                type="button"
                onClick={() => {
                  setCancelled(true);
                  onCancel();
                }}
                className="rounded-md px-3 py-1.5 text-[12px] font-semibold text-muted transition hover:text-bright"
              >
                Stop loading
              </button>
            )}
          </div>
        )}

        {timedOut && (
          <div className="mt-5 w-full rounded-xl border border-amber/30 bg-amber/10 p-3">
            <p className="text-[12px] font-semibold text-amber">Taking longer than usual…</p>
            <p className="mt-0.5 text-[11.5px] text-muted">
              We couldn&apos;t reach the server. Retry, or explore the demo workspace.
            </p>
            <div className="mt-2 flex justify-center gap-2">
              {onRetry && (
                <button
                  type="button"
                  onClick={() => {
                    setTimedOut(false);
                    onRetry();
                  }}
                  className="rounded-md bg-raised px-3 py-1.5 text-[12px] font-semibold text-bright ring-1 ring-line transition hover:bg-hover"
                >
                  Retry
                </button>
              )}
              <button
                onClick={onFallback}
                className="rounded-md bg-blurple px-3 py-1.5 text-[12px] font-semibold text-[color:var(--c-on-accent)] transition hover:bg-blurple-soft"
              >
                Open demo workspace
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
