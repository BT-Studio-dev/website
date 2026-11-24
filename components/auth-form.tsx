"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BoltIcon } from "@/components/icons";

type Mode = "login" | "signup";

const ACCENTS = ["#5865f2", "#eb459e", "#3ba55d", "#faa61a", "#00a8fc", "#9b59b6"];

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [accent, setAccent] = useState(ACCENTS[0]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const nextPath = params.get("next") || "/channels";

  const usernameError = useMemo(() => {
    if (mode !== "signup" || !username) return null;
    if (username.length < 2) return "At least 2 characters";
    if (!/^[a-z0-9_.]+$/.test(username))
      return "Lowercase letters, numbers, dots and underscores only";
    return null;
  }, [mode, username]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        if (usernameError) {
          setError(usernameError);
          return;
        }
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              username: username.toLowerCase(),
              display_name: displayName.trim() || username,
              accent_color: accent,
            },
          },
        });

        if (signUpError) throw signUpError;

        if (!data.session) {
          setNotice(
            "Check your inbox — we sent a confirmation link to finish creating your account.",
          );
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
      }

      router.replace(nextPath);
      router.refresh();
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="shell-gradient relative flex min-h-dvh items-center justify-center overflow-x-hidden bg-void px-6 py-12">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="grid-bg absolute inset-0 opacity-45 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div className="ambient-glow absolute -top-24 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 blur-[140px]" />
        <div className="absolute right-0 bottom-0 h-[22rem] w-[22rem] rounded-full bg-amber/8 blur-[130px]" />
      </div>

      <div className="relative w-full max-w-[420px]">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-blurple-soft to-blurple text-white shadow-lg shadow-blurple/30">
            <BoltIcon width={20} height={20} strokeWidth={2.2} />
          </span>
          <span className="text-lg font-semibold tracking-tight">BT Comms</span>
        </Link>

        <div className="glass-panel rounded-2xl border border-subtle p-7 shadow-2xl shadow-black/50">
          <h1 className="text-center text-xl font-bold tracking-tight">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1.5 text-center text-[13px] text-muted">
            {mode === "login"
              ? "We're glad you're here. Let's pick up where you left off."
              : "Pick a handle, and we'll drop you into the BT Comms server."}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <>
                <Field label="Username">
                  <div className="flex items-center gap-2 rounded-lg border border-subtle bg-input px-3 focus-within:border-blurple/60">
                    <span className="text-muted">@</span>
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase())}
                      required
                      minLength={2}
                      maxLength={24}
                      autoComplete="username"
                      placeholder="ada"
                      className="w-full bg-transparent py-2.5 text-sm text-bright outline-none placeholder:text-dim"
                    />
                  </div>
                  {usernameError ? (
                    <p className="mt-1 text-[11px] text-rose">{usernameError}</p>
                  ) : (
                    <p className="mt-1 text-[11px] text-dim">
                      Lowercase letters, numbers, dots and underscores.
                    </p>
                  )}
                </Field>

                <Field label="Display name" hint="optional">
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={40}
                    autoComplete="name"
                    placeholder="Ada Lovelace"
                    className="w-full rounded-lg border border-subtle bg-input px-3 py-2.5 text-sm text-bright outline-none placeholder:text-dim focus:border-blurple/60"
                  />
                </Field>

                <Field label="Accent color" hint="shows on your avatar ring">
                  <div className="flex items-center gap-2">
                    {ACCENTS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setAccent(color)}
                        aria-label={`Accent ${color}`}
                        aria-pressed={accent === color}
                        className={`h-7 w-7 rounded-full transition ${
                          accent === color
                            ? "ring-2 ring-white ring-offset-2 ring-offset-panel"
                            : "opacity-70 hover:opacity-100"
                        }`}
                        style={{ background: color }}
                      />
                    ))}
                  </div>
                </Field>
              </>
            )}

            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@studio.dev"
                className="w-full rounded-lg border border-subtle bg-input px-3 py-2.5 text-sm text-bright outline-none placeholder:text-dim focus:border-blurple/60"
              />
            </Field>

            <Field
              label="Password"
              hint={mode === "signup" ? "at least 6 characters" : undefined}
            >
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder="••••••••"
                className="w-full rounded-lg border border-subtle bg-input px-3 py-2.5 text-sm text-bright outline-none placeholder:text-dim focus:border-blurple/60"
              />
            </Field>

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-rose/30 bg-rose/10 px-3 py-2 text-[12px] text-rose"
              >
                {error}
              </p>
            )}

            {notice && (
              <p
                role="status"
                className="rounded-lg border border-mint/30 bg-mint/10 px-3 py-2 text-[12px] text-mint"
              >
                {notice}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blurple py-2.5 text-sm font-semibold text-white shadow-lg shadow-blurple/25 transition hover:bg-blurple-soft disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Spinner />
                  {mode === "login" ? "Signing in…" : "Creating account…"}
                </>
              ) : mode === "login" ? (
                "Log in"
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-[13px] text-muted">
            {mode === "login" ? (
              <>
                Need an account?{" "}
                <Link href="/signup" className="font-medium text-blurple-soft hover:underline">
                  Sign up
                </Link>
              </>
            ) : (
              <>
                Already have one?{" "}
                <Link href="/login" className="font-medium text-blurple-soft hover:underline">
                  Log in
                </Link>
              </>
            )}
          </p>
        </div>

        <p className="mt-6 text-center text-[11px] text-dim">
          By continuing you agree to keep it friendly. ©{" "}
          {new Date().getFullYear()} BT Studio
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[11px] font-semibold tracking-widest text-muted uppercase">
          {label}
        </span>
        {hint && <span className="text-[10px] text-dim">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function Spinner() {
  return (
    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-subtle border-t-white" />
  );
}

function messageFor(err: unknown) {
  const raw = err instanceof Error ? err.message : String(err);
  const map: [RegExp, string][] = [
    [/invalid login credentials/i, "That email and password don't match. Try again."],
    [/email not confirmed/i, "Please confirm your email before logging in."],
    [/user already registered/i, "An account with that email already exists. Try logging in."],
    [/password should be at least/i, "Passwords need to be at least 6 characters."],
    [/rate limit|too many/i, "Too many attempts. Give it a minute and retry."],
    [/fetch|network/i, "Couldn't reach the server. Check your connection."],
  ];
  for (const [pattern, message] of map) if (pattern.test(raw)) return message;
  return raw || "Something went wrong. Please try again.";
}
