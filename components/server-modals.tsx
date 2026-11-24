"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/modal";
import { CloseIcon, PlusIcon, UploadIcon } from "@/components/icons";
import {
  INVITE_EXAMPLES,
  SERVER_INTENTS,
  SERVER_TEMPLATES,
  type ServerIntent,
  type ServerTemplate,
} from "@/lib/server-templates";

/* ------------------------------------------------------------------ */
/* 1. Create Your Server — "Create My Own" vs a template               */
/* ------------------------------------------------------------------ */

export function CreateServerModal({
  open,
  onClose,
  onStart,
  onJoinInstead,
}: {
  open: boolean;
  onClose: () => void;
  onStart: (template: ServerTemplate | null) => void;
  onJoinInstead: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      tone="brand"
      title="Create Your Server"
      description="Your server is where you and your friends hang out. Make yours and start talking."
    >
      <button
        onClick={() => onStart(null)}
        className="group flex w-full items-center gap-3 rounded-xl border border-line/70 bg-white/[0.04] p-3 text-left transition hover:border-blurple/50 hover:bg-white/[0.08]"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blurple to-blurple-soft text-white">
          <PlusIcon width={20} height={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold text-bright">Create My Own</span>
          <span className="block text-[12px] text-muted">
            Start from scratch with your own name and icon.
          </span>
        </span>
        <span className="shrink-0 text-[11px] font-semibold text-mint">Start →</span>
      </button>

      <p className="mt-5 mb-2 text-[11px] font-bold tracking-[0.14em] text-dim uppercase">
        Start from a template
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {SERVER_TEMPLATES.map((template) => (
          <button
            key={template.id}
            onClick={() => onStart(template)}
            className="group flex items-center gap-2.5 rounded-xl border border-line/70 bg-white/[0.03] p-2.5 text-left transition hover:border-mint/50 hover:bg-white/[0.07]"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-raised text-lg">
              {template.emoji}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-bright">
                {template.name}
              </span>
              <span className="block truncate text-[11px] text-dim">{template.blurb}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 rounded-lg border border-line/60 bg-void/40 px-3 py-2.5">
        <div>
          <p className="text-[12.5px] font-semibold text-bright">Have an invite already?</p>
          <p className="text-[11.5px] text-dim">Join a friend&apos;s server in one click.</p>
        </div>
        <button
          onClick={onJoinInstead}
          className="shrink-0 rounded-md bg-raised px-3 py-1.5 text-[12px] font-semibold text-bright ring-1 ring-line transition hover:bg-hover"
        >
          Join a Server
        </button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Two-step wizard                                                  */
/* ------------------------------------------------------------------ */

export function ServerWizardModal({
  open,
  step,
  onClose,
  onBack,
  onNext,
  onFinish,
  onSkip,
  defaultName,
  template,
  busy,
  error,
}: {
  open: boolean;
  step: 1 | 2;
  onClose: () => void;
  onBack: () => void;
  onNext: (intent: ServerIntent) => void;
  onFinish: (name: string, icon: string | null) => void;
  onSkip: () => void;
  defaultName: string;
  template: ServerTemplate | null;
  busy?: boolean;
  error?: string | null;
}) {
  const [intent, setIntent] = useState<ServerIntent>("friends");
  const [name, setName] = useState(defaultName);
  const [icon, setIcon] = useState<string | null>(null);

  // Re-seed the name whenever the wizard opens with a different account.
  useEffect(() => {
    if (open) setName(defaultName);
  }, [open, defaultName]);

  if (step === 1) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        size="xl"
        tone="brand"
        title="Tell Us More About Your Server"
        description="In order to help you with your server, I will ask you some questions!"
        footer={
          <>
            <button
              onClick={onBack}
              className="mr-auto rounded-md px-3 py-1.5 text-[12.5px] text-muted transition hover:text-bright"
            >
              Back
            </button>
            <button
              onClick={() => onNext(intent)}
              className="rounded-md bg-blurple px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-blurple-soft"
            >
              Next
            </button>
          </>
        }
      >
        <p className="text-[13.5px] font-semibold text-bright">
          Is your new server for just a few friends or a larger community?
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {SERVER_INTENTS.map((option) => {
            const active = intent === option.id;
            return (
              <button
                key={option.id}
                onClick={() => setIntent(option.id)}
                aria-pressed={active}
                className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                  active
                    ? "border-blurple bg-blurple/12"
                    : "border-line/70 bg-white/[0.03] hover:bg-white/[0.07]"
                }`}
              >
                <span className="text-xl">{option.emoji}</span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-bright">
                    {option.title}
                  </span>
                  <span className="block text-[11.5px] leading-snug text-muted">
                    {option.blurb}
                  </span>
                  {template && (
                    <span className="mt-1 inline-block rounded bg-mint/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-mint uppercase">
                      {template.name} template
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
        <button
          onClick={onSkip}
          className="mt-4 text-[12px] font-semibold text-muted underline decoration-dotted transition hover:text-bright"
        >
          Skip this question
        </button>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      tone="brand"
      title="Customize Your Server"
      description="Give your new server a personality with a name and an icon. You can always change it later."
      footer={
        <>
          <button
            onClick={onBack}
            className="mr-auto rounded-md px-3 py-1.5 text-[12.5px] text-muted transition hover:text-bright"
          >
            Back
          </button>
          <button
            onClick={() => onFinish(name.trim() || defaultName, icon)}
            disabled={busy || !(name.trim() || defaultName)}
            className="rounded-md bg-blurple px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-blurple-soft disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create"}
          </button>
        </>
      }
    >
      <div className="flex justify-center">
        <label className="group relative cursor-pointer">
          <span className="grid h-20 w-20 place-items-center overflow-hidden rounded-full border-2 border-dashed border-line text-dim transition group-hover:border-blurple group-hover:text-bright">
            {icon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={icon} alt="Server icon preview" className="h-full w-full object-cover" />
            ) : (
              <UploadIcon width={22} height={22} />
            )}
          </span>
          <span className="absolute -right-1 -bottom-1 grid h-6 w-6 place-items-center rounded-full border-2 border-panel bg-blurple text-white">
            <PlusIcon width={12} height={12} />
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setIcon(URL.createObjectURL(file));
              e.target.value = "";
            }}
          />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="mb-1 block text-[11px] font-bold tracking-[0.12em] text-dim uppercase">
          Server Name <span className="text-rose">*</span>
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 60))}
          maxLength={60}
          placeholder={defaultName}
          className="w-full rounded-md border border-line bg-void/70 px-3 py-2 text-[13.5px] outline-none focus:border-blurple/60"
        />
      </label>

      <p className="mt-4 rounded-lg border border-line/60 bg-void/40 p-2.5 text-[11px] leading-relaxed text-dim">
        By creating a server you agree to the <strong className="text-muted">BT Comms Community
        Guidelines</strong>. Be excellent to each other — harassment, hate speech and doxxing get
        servers removed.
      </p>

      {template && (
        <p className="mt-2 text-[11px] text-dim">
          Pre-loaded channels:{" "}
          <span className="text-muted">
            {template.channels.map((c) => (c.kind === "text" ? `#${c.name}` : c.name)).join(", ")}
          </span>
        </p>
      )}
      {error && <p className="mt-2 text-[12px] text-rose">{error}</p>}
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Join a Server                                                    */
/* ------------------------------------------------------------------ */

export function JoinServerModal({
  open,
  onClose,
  onJoin,
  busy,
  error,
  onDiscover,
}: {
  open: boolean;
  onClose: () => void;
  onJoin: (code: string) => void;
  busy?: boolean;
  error?: string | null;
  onDiscover?: () => void;
}) {
  const [code, setCode] = useState("");

  useEffect(() => {
    if (open) setCode("");
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      tone="brand"
      title="Join a Server"
      description="Enter an invite below to join an existing server."
      footer={
        <>
          <button
            onClick={onClose}
            className="mr-auto rounded-md px-3 py-1.5 text-[12.5px] text-muted transition hover:text-bright"
          >
            Back
          </button>
          <button
            onClick={() => onJoin(code)}
            disabled={busy || !code.trim()}
            className="rounded-md bg-blurple px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-blurple-soft disabled:opacity-50"
          >
            {busy ? "Joining…" : "Join Server"}
          </button>
        </>
      }
    >
      <label className="block">
        <span className="mb-1 block text-[11px] font-bold tracking-[0.12em] text-dim uppercase">
          Invite link <span className="text-rose">*</span>
        </span>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && code.trim()) onJoin(code);
          }}
          placeholder="hTKzmak or https://btcomms.gg/invite-code"
          className="w-full rounded-md border border-line bg-void/70 px-3 py-2 font-mono text-[13px] outline-none focus:border-blurple/60"
        />
      </label>

      <div className="mt-3">
        <p className="mb-1.5 text-[11px] font-bold tracking-[0.12em] text-dim uppercase">
          Invites should look like
        </p>
        <div className="flex flex-wrap gap-1.5">
          {INVITE_EXAMPLES.map((example) => (
            <button
              key={example}
              onClick={() => setCode(example)}
              className="rounded-full border border-line bg-ink px-2.5 py-0.5 font-mono text-[11px] text-muted transition hover:border-blurple/50 hover:text-bright"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-line/60 bg-white/[0.04] px-3 py-2.5">
        <div>
          <p className="text-[12.5px] font-semibold text-bright">Don&apos;t have an invite?</p>
          <p className="text-[11.5px] text-dim">Explore public servers instead.</p>
        </div>
        <button
          onClick={onDiscover}
          className="shrink-0 rounded-md bg-raised px-3 py-1.5 text-[12px] font-semibold text-bright ring-1 ring-line transition hover:bg-hover"
        >
          Server Discovery
        </button>
      </div>

      {error && <p className="mt-2 text-[12px] text-rose">{error}</p>}
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* 4. New-server onboarding                                            */
/* ------------------------------------------------------------------ */

export function OnboardingView({
  serverName,
  initials,
  isOwner,
  onAction,
  onDismiss,
  template,
}: {
  serverName: string;
  initials: string;
  isOwner: boolean;
  onAction: (id: string) => void;
  onDismiss: () => void;
  template?: ServerTemplate | null;
}) {
  const cards = [
    { id: "invite", title: "Invite your friends", blurb: "Share a link and start talking.", emoji: "💌" },
    { id: "icon", title: "Personalize your server with an icon", blurb: "Give it a face.", emoji: "🖼️" },
    { id: "message", title: "Send your first message", blurb: "Break the ice in #general.", emoji: "💬" },
    { id: "download", title: "Download the BT Comms App", blurb: "Chat on desktop and mobile.", emoji: "⬇️" },
    { id: "app", title: "Add your first app", blurb: "Bots, music, and more.", emoji: "🧩" },
    { id: "boost", title: "Unlock perks for everyone with Boosts", blurb: "Higher quality voice + more.", emoji: "🚀" },
  ];

  return (
    <section className="ambient-stage flex min-w-0 flex-1 flex-col">
      <header className="glass-bar flex h-12 shrink-0 items-center justify-between border-b px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-raised text-[11px] font-bold text-white">
            {initials}
          </span>
          <p className="truncate text-[14px] font-semibold text-bright">{serverName}</p>
        </div>
        <button
          onClick={onDismiss}
          aria-label="Dismiss onboarding"
          className="grid h-7 w-7 place-items-center rounded-md text-muted transition hover:bg-white/10 hover:text-bright"
        >
          <CloseIcon width={14} height={14} />
        </button>
      </header>

      <div className="scroll-thin flex-1 overflow-y-auto px-6 py-10">
        <div className="mx-auto max-w-3xl text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-blurple to-blurple-soft text-2xl text-white shadow-xl shadow-blurple/30">
            {initials}
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-bright">
            Welcome to {serverName}
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            {template
              ? `Your ${template.name.toLowerCase()} template is ready — here are a few things to get you started.`
              : "Here are a few things to get you started."}
          </p>

          <div className="mt-7 grid gap-2.5 text-left sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <button
                key={card.id}
                onClick={() => onAction(card.id)}
                className="group rounded-xl border border-white/10 bg-white/[0.04] p-3.5 text-left backdrop-blur-sm transition hover:border-blurple/50 hover:bg-white/[0.08]"
              >
                <span className="text-xl">{card.emoji}</span>
                <p className="mt-1.5 text-[13px] font-semibold text-bright">{card.title}</p>
                <p className="mt-0.5 text-[11.5px] leading-snug text-muted">{card.blurb}</p>
              </button>
            ))}
          </div>

          <p className="mt-6 text-[11.5px] text-dim">
            {isOwner
              ? "You're the owner of this server — you have every permission."
              : "Waiting for the owner to finish setting things up."}
          </p>
        </div>
      </div>
    </section>
  );
}
