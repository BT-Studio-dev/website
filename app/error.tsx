"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-dvh place-items-center bg-void px-6 text-center">
      <div>
        <h1 className="text-xl font-semibold">Something broke</h1>
        <p className="mt-2 max-w-sm text-sm text-muted">
          We hit an unexpected error loading BT Comms. Try again — if it keeps
          happening, refresh the page.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={reset}
            className="rounded-lg bg-blurple px-4 py-2 text-sm font-semibold text-white transition hover:bg-blurple-soft"
          >
            Try again
          </button>
          <a
            href="/channels"
            className="rounded-lg border border-line bg-panel px-4 py-2 text-sm font-semibold transition hover:bg-hover"
          >
            Back to channels
          </a>
        </div>
      </div>
    </div>
  );
}
