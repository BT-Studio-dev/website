import Link from "next/link";
import { LandingCta } from "@/components/landing-cta";
import {
  BoltIcon,
  HashIcon,
  SpeakerIcon,
  UsersIcon,
  SendIcon,
  LockIcon,
} from "@/components/icons";

const features = [
  {
    icon: HashIcon,
    title: "Channels that stay focused",
    body: "Split the noise into text and voice channels. Topics, positions, and a sidebar that never gets in the way.",
  },
  {
    icon: BoltIcon,
    title: "Realtime by default",
    body: "Messages stream in over Supabase Realtime with zero polling. Type in one tab, watch it land in the other instantly.",
  },
  {
    icon: UsersIcon,
    title: "Presence you can trust",
    body: "See who's online, idle, or in Do Not Disturb at a glance — grouped by role in the member list.",
  },
  {
    icon: SpeakerIcon,
    title: "Voice rooms built in",
    body: "Drop into a voice channel, mute yourself, and hop out. Everyone in the room is visible to the whole server.",
  },
  {
    icon: SendIcon,
    title: "Fast where it counts",
    body: "Server-rendered shell, optimistic sends, and virtualized-friendly message lists. Feels instant on bad wifi.",
  },
  {
    icon: LockIcon,
    title: "Row-level security",
    body: "Every table is guarded by Postgres RLS. You can only read the channels you've actually joined.",
  },
];

const stats = [
  { label: "Realtime latency", value: "< 120ms" },
  { label: "Message history", value: "Unlimited" },
  { label: "Data residency", value: "EU West" },
  { label: "Powered by", value: "Supabase" },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-void">
      {/* ambient background */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="grid-bg absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_top,black,transparent_72%)]" />
        <div className="absolute -top-40 left-1/2 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-blurple/25 blur-[140px]" />
        <div className="absolute top-1/3 -left-40 h-[26rem] w-[26rem] rounded-full bg-[#eb459e]/12 blur-[130px]" />
        <div className="absolute right-0 bottom-0 h-[26rem] w-[26rem] rounded-full bg-[#00a8fc]/10 blur-[130px]" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blurple-soft to-blurple text-white shadow-lg shadow-blurple/30">
            <BoltIcon width={18} height={18} strokeWidth={2.2} />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">
            BT Comms
            <span className="ml-2 hidden rounded-full border border-line bg-panel/70 px-2 py-0.5 text-[10px] font-medium tracking-wider text-muted uppercase sm:inline">
              by BT Studio
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/login"
            className="rounded-lg px-3.5 py-2 text-muted transition hover:bg-hover/60 hover:text-bright"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-blurple px-3.5 py-2 font-semibold text-white shadow-lg shadow-blurple/25 transition hover:bg-blurple-soft"
          >
            Get started
          </Link>
        </nav>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-6">
        <section className="pt-16 pb-20 text-center sm:pt-24">
          <p className="animate-fade mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-panel/70 px-3.5 py-1.5 text-xs font-medium text-muted">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-mint" />
            </span>
            Live on btcomms.gg · v1.0
          </p>

          <h1 className="text-balance mx-auto max-w-3xl text-5xl leading-[1.05] font-bold tracking-tight sm:text-6xl md:text-7xl">
            Your team&apos;s place to{" "}
            <span className="bg-gradient-to-r from-blurple-soft via-[#a78bfa] to-[#00a8fc] bg-clip-text text-transparent">
              talk, hang out, and ship
            </span>
          </h1>

          <p className="text-balance mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-muted sm:text-base">
            BT Comms is a fast, dark-mode chat workspace with servers, text and voice
            channels, a live message feed, and presence. No clutter — just the
            conversation.
          </p>

          <LandingCta />

          <dl className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line/60 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-abyss/80 px-4 py-5">
                <dd className="text-lg font-semibold tracking-tight text-bright">
                  {stat.value}
                </dd>
                <dt className="mt-1 text-[11px] tracking-wide text-dim uppercase">
                  {stat.label}
                </dt>
              </div>
            ))}
          </dl>
        </section>

        {/* App preview */}
        <section aria-label="Product preview" className="pb-24">
          <div className="animate-rise overflow-hidden rounded-2xl border border-line bg-abyss shadow-2xl shadow-black/60">
            <div className="flex items-center gap-2 border-b border-line bg-panel px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              <span className="ml-3 rounded-md bg-ink px-2.5 py-1 text-[11px] text-dim">
                btcomms.gg/channels
              </span>
            </div>

            <div className="grid grid-cols-[56px_1fr] sm:grid-cols-[64px_190px_1fr] md:grid-cols-[64px_200px_1fr_180px]">
              {/* server rail */}
              <div className="flex flex-col items-center gap-3 border-r border-line bg-void py-4">
                <div className="grid h-9 w-9 place-items-center rounded-2xl bg-blurple text-xs font-bold text-white">
                  BT
                </div>
                {["🚀", "🎨", "🎮"].map((emoji) => (
                  <div
                    key={emoji}
                    className="grid h-9 w-9 place-items-center rounded-2xl bg-raised text-sm transition hover:rounded-xl hover:bg-hover"
                  >
                    {emoji}
                  </div>
                ))}
                <div className="grid h-9 w-9 place-items-center rounded-2xl border border-dashed border-line text-mint">
                  +
                </div>
              </div>

              {/* channels */}
              <div className="hidden flex-col border-r border-line bg-ink py-3 sm:flex">
                <div className="px-3 pb-3 text-[11px] font-semibold tracking-widest text-dim uppercase">
                  Text Channels
                </div>
                {["welcome", "general", "development", "design"].map((c, i) => (
                  <div
                    key={c}
                    className={`mx-2 mb-0.5 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] ${
                      i === 1 ? "bg-hover text-bright" : "text-muted"
                    }`}
                  >
                    <HashIcon width={14} height={14} className="opacity-70" />
                    {c}
                  </div>
                ))}
                <div className="mt-4 px-3 pb-3 text-[11px] font-semibold tracking-widest text-dim uppercase">
                  Voice
                </div>
                {["General Voice", "Focus Room"].map((c) => (
                  <div
                    key={c}
                    className="mx-2 mb-0.5 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] text-muted"
                  >
                    <SpeakerIcon width={14} height={14} className="opacity-70" />
                    {c}
                  </div>
                ))}
              </div>

              {/* messages */}
              <div className="flex min-h-[300px] flex-col justify-end gap-4 bg-panel/40 p-4">
                <div className="flex gap-2.5">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#5865f2] to-[#8b5cf6] text-[11px] font-bold">
                    BT
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[13px] font-semibold text-blurple-soft">
                        BT Comms
                      </span>
                      <span className="rounded bg-blurple/20 px-1 text-[9px] font-bold tracking-wide text-blurple-soft uppercase">
                        bot
                      </span>
                      <span className="text-[10px] text-dim">Today at 09:14</span>
                    </div>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
                      Morning everyone ☀️ What are you shipping today?
                    </p>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#eb459e] to-[#f97316] text-[11px] font-bold">
                    AL
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[13px] font-semibold text-[#f9a8d4]">
                        ada
                      </span>
                      <span className="text-[10px] text-dim">Today at 09:16</span>
                    </div>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
                      Shipping the new member list. Presence dots are finally
                      <span className="text-bright"> realtime</span> 🎉
                    </p>
                  </div>
                </div>

                <div className="mt-1 flex items-center gap-2 rounded-lg border border-line bg-ink px-3 py-2">
                  <PlusIconMock />
                  <span className="text-[13px] text-dim">
                    Message #general
                  </span>
                  <span className="ml-auto grid h-6 w-6 place-items-center rounded-md bg-blurple/80 text-white">
                    <SendIcon width={12} height={12} />
                  </span>
                </div>
              </div>

              {/* members */}
              <div className="hidden flex-col border-l border-line bg-ink px-3 py-4 md:flex">
                <div className="mb-3 text-[11px] font-semibold tracking-widest text-dim uppercase">
                  Online — 3
                </div>
                {[
                  ["Ada Lovelace", "auto", "#eb459e"],
                  ["Linus T.", "online", "#3ba55d"],
                  ["Grace H.", "idle", "#faa61a"],
                ].map(([name, status, color]) => (
                  <div key={name} className="mb-2.5 flex items-center gap-2">
                    <span className="relative">
                      <span
                        className="grid h-6 w-6 place-items-center rounded-full text-[9px] font-bold text-white"
                        style={{ background: color }}
                      >
                        {name.slice(0, 2).toUpperCase()}
                      </span>
                      <span
                        className="absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full border-2 border-ink"
                        style={{ background: color }}
                      />
                    </span>
                    <span className="truncate text-[12px] text-muted">{name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="pb-24">
          <div className="mb-10 max-w-lg">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need. Nothing you don&apos;t.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              Built on Next.js, Tailwind CSS, and Supabase — deployed on Vercel.
              Small surface area, sharp edges smoothed out.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="group rounded-xl border border-line bg-panel/60 p-5 transition hover:-translate-y-0.5 hover:border-blurple/40 hover:bg-panel"
              >
                <span className="mb-4 grid h-9 w-9 place-items-center rounded-lg bg-blurple/15 text-blurple-soft transition group-hover:bg-blurple/25">
                  <Icon width={18} height={18} />
                </span>
                <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="pb-24">
          <div className="relative overflow-hidden rounded-2xl border border-blurple/30 bg-gradient-to-br from-blurple/20 via-panel to-panel p-10 text-center sm:p-14">
            <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-blurple/30 blur-[90px]" />
            <h2 className="relative text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to say hello?
            </h2>
            <p className="relative mx-auto mt-3 max-w-md text-[15px] text-muted">
              Create an account and you&apos;ll land straight in the BT Comms server.
              Invite your team after that.
            </p>
            <Link
              href="/signup"
              className="relative mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-void transition hover:-translate-y-0.5 hover:bg-bright"
            >
              Join BT Comms
              <span>→</span>
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-line/70">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-dim sm:flex-row">
          <p>
            © {new Date().getFullYear()} BT Studio ·{" "}
            <span className="text-muted">btcomms.gg</span>
          </p>
          <div className="flex items-center gap-4">
            <Link href="/login" className="transition hover:text-muted">
              Log in
            </Link>
            <Link href="/signup" className="transition hover:text-muted">
              Sign up
            </Link>
            <a href="https://bt-studio.dev" className="transition hover:text-muted">
              BT Studio
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PlusIconMock() {
  return (
    <span className="grid h-5 w-5 place-items-center rounded-full bg-hover text-[13px] leading-none text-muted">
      +
    </span>
  );
}
