"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Swaps the landing page CTA when the visitor already has a session.
 * Uses the local session only (no network round-trip), so it stays instant.
 */
export function LandingCta() {
  const supabase = useMemo(() => createClient(), []);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setSignedIn(Boolean(data.session));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  if (signedIn) {
    return (
      <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href="/channels"
          className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blurple px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-blurple/30 transition hover:-translate-y-0.5 hover:bg-blurple-soft sm:w-auto"
        >
          Open BT Comms
          <span className="transition group-hover:translate-x-0.5">→</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
      <Link
        href="/signup"
        className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blurple px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-blurple/30 transition hover:-translate-y-0.5 hover:bg-blurple-soft sm:w-auto"
      >
        Create your account
        <span className="transition group-hover:translate-x-0.5">→</span>
      </Link>
      <Link
        href="/login"
        className="inline-flex w-full items-center justify-center rounded-xl border border-line bg-panel/70 px-6 py-3 text-sm font-semibold text-bright transition hover:border-muted/40 hover:bg-hover/70 sm:w-auto"
      >
        I already have one
      </Link>
    </div>
  );
}
