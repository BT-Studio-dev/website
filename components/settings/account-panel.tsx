"use client";

import { useEffect, useState } from "react";
import { Avatar, presenceLabel } from "@/components/avatar";
import { Modal } from "@/components/modal";
import {
  DeviceIcon,
  KeyIcon,
  PhoneIcon,
  ShieldIcon,
  CheckCircleIcon,
  CloseIcon,
} from "@/components/icons";
import {
  InlineNote,
  MaskedRow,
  SettingsButton,
  SettingsCard,
  SettingsSection,
  CardLabel,
  TextInput,
  Field,
  Toggle,
  Divider,
} from "@/components/settings/primitives";
import { changeEmail, changePassword, listSessions, updateUsername } from "@/lib/social";
import type { Profile } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type Tab = "info" | "security" | "status" | "family";

const TABS: { id: Tab; label: string }[] = [
  { id: "info", label: "Account Info" },
  { id: "security", label: "Password & Security" },
  { id: "status", label: "Account Status" },
  { id: "family", label: "Family Center" },
];

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return "••••••";
  const visible = local.slice(0, 2);
  return `${visible}${"•".repeat(Math.max(3, local.length - 2))}@${domain.replace(/^(.{1}).*/, "$1•••")}`;
}

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `+${"•".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

export function AccountPanel({
  supabase,
  profile,
  email,
  phone,
  onProfileChange,
}: {
  supabase: SupabaseClient;
  profile: Profile;
  email: string;
  phone?: string | null;
  onProfileChange: (patch: Partial<Profile>) => void;
}) {
  const [tab, setTab] = useState<Tab>("info");

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-1 border-b border-line/60 pb-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            aria-current={tab === item.id ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 text-[13px] font-semibold transition ${
              tab === item.id
                ? "bg-hover text-bright"
                : "text-muted hover:bg-hover/40 hover:text-bright"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "info" && (
        <AccountInfo
          supabase={supabase}
          profile={profile}
          email={email}
          phone={phone}
          onProfileChange={onProfileChange}
        />
      )}
      {tab === "security" && <SecurityTab supabase={supabase} />}
      {tab === "status" && <StatusTab profile={profile} />}
      {tab === "family" && <FamilyTab />}
    </div>
  );
}

/* ------------------------------ Account Info ------------------------------ */

function AccountInfo({
  supabase,
  profile,
  email,
  phone,
  onProfileChange,
}: {
  supabase: SupabaseClient;
  profile: Profile;
  email: string;
  phone?: string | null;
  onProfileChange: (patch: Partial<Profile>) => void;
}) {
  const [editUsername, setEditUsername] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState(profile.username);
  const [editEmail, setEditEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState("");
  const [editPhone, setEditPhone] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState(phone ?? "");
  const [note, setNote] = useState<{ tone: "info" | "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function saveUsername() {
    setBusy(true);
    const result = await updateUsername(supabase, profile.id, usernameDraft);
    setBusy(false);
    setNote({ tone: result.ok ? "success" : "error", text: result.message });
    if (result.ok) {
      onProfileChange({ username: usernameDraft.trim().toLowerCase() });
      setEditUsername(false);
    }
  }

  async function saveEmail() {
    if (!emailDraft.includes("@")) {
      setNote({ tone: "error", text: "Enter a valid email address." });
      return;
    }
    setBusy(true);
    const result = await changeEmail(supabase, emailDraft);
    setBusy(false);
    setNote({ tone: result.ok ? "success" : "error", text: result.message });
    if (result.ok) setEditEmail(false);
  }

  async function savePhone() {
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_email: phoneDraft.trim() || null })
      .eq("id", profile.id);
    setBusy(false);
    if (error) {
      setNote({ tone: "error", text: "Couldn't save that phone number." });
      return;
    }
    setNote({ tone: "success", text: "Phone number saved." });
    setEditPhone(false);
  }

  return (
    <div>
      <div className="relative mb-4 overflow-hidden rounded-xl border border-line/70">
        <div
          className="h-24"
          style={{
            background: `linear-gradient(120deg, ${profile.banner_color ?? profile.accent_color}, var(--c-panel))`,
          }}
        />
        <div className="flex flex-wrap items-end justify-between gap-3 px-4 pb-3">
          <div className="flex items-end gap-3">
            <span className="-mt-8 rounded-full border-4 border-panel">
              <Avatar
                name={profile.display_name}
                src={profile.avatar_url}
                accent={profile.accent_color}
                size={72}
                status={profile.status}
              />
            </span>
            <div className="pb-1">
              <p className="text-[17px] font-bold tracking-tight text-bright">
                {profile.display_name}
              </p>
              <p className="text-[12px] text-dim">
                @{profile.username} · {presenceLabel(profile.status)}
              </p>
            </div>
          </div>
          <p className="pb-1 text-[11px] text-dim">
            Member since {new Date(profile.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {note && (
        <div className="mb-3">
          <InlineNote tone={note.tone}>{note.text}</InlineNote>
        </div>
      )}

      <SettingsCard>
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <CardLabel>Username</CardLabel>
            <p className="mt-0.5 font-mono text-[13px] text-bright">@{profile.username}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <SettingsButton tone="secondary" onClick={() => { setEditUsername((v) => !v); setUsernameDraft(profile.username); }}>
              Edit
            </SettingsButton>
          </div>
        </div>
        {editUsername && (
          <div className="mt-3 space-y-2">
            <Field label="New username" hint="2–24 chars · a–z 0–9 . _">
              <TextInput value={usernameDraft} onChange={(v) => setUsernameDraft(v.toLowerCase())} maxLength={24} />
            </Field>
            <div className="flex gap-2">
              <SettingsButton onClick={() => void saveUsername()} disabled={busy}>
                Save username
              </SettingsButton>
              <SettingsButton tone="ghost" onClick={() => setEditUsername(false)}>
                Cancel
              </SettingsButton>
            </div>
          </div>
        )}
      </SettingsCard>

      <Divider />

      <SettingsCard>
        <MaskedRow
          label="Email"
          value={email}
          masked={maskEmail(email)}
          onEdit={() => { setEditEmail((v) => !v); setEmailDraft(""); }}
          copyable
          note="Used for sign-in and account recovery"
        />
        {editEmail && (
          <div className="mt-3 space-y-2">
            <Field label="New email address">
              <TextInput
                type="email"
                value={emailDraft}
                onChange={setEmailDraft}
                placeholder="you@studio.dev"
              />
            </Field>
            <p className="text-[11.5px] text-dim">
              We&apos;ll send a confirmation link. The change applies once confirmed.
            </p>
            <div className="flex gap-2">
              <SettingsButton onClick={() => void saveEmail()} disabled={busy || !emailDraft}>
                Update email
              </SettingsButton>
              <SettingsButton tone="ghost" onClick={() => setEditEmail(false)}>
                Cancel
              </SettingsButton>
            </div>
          </div>
        )}
      </SettingsCard>

      <Divider />

      <SettingsCard>
        <MaskedRow
          label="Phone number"
          value={phone || "Not set"}
          masked={phone ? maskPhone(phone) : "Not set"}
          onEdit={() => { setEditPhone((v) => !v); setPhoneDraft(phone ?? ""); }}
          note="Optional — helps with account recovery"
        />
        {editPhone && (
          <div className="mt-3 space-y-2">
            <Field label="Phone number">
              <TextInput value={phoneDraft} onChange={setPhoneDraft} placeholder="+1 555 000 1234" />
            </Field>
            <div className="flex gap-2">
              <SettingsButton onClick={() => void savePhone()} disabled={busy}>
                Save number
              </SettingsButton>
              <SettingsButton tone="ghost" onClick={() => setEditPhone(false)}>
                Cancel
              </SettingsButton>
            </div>
          </div>
        )}
      </SettingsCard>
    </div>
  );
}

/* -------------------------- Password & Security -------------------------- */

function SecurityTab({ supabase }: { supabase: SupabaseClient }) {
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [mfaOpen, setMfaOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [note, setNote] = useState<{ tone: "info" | "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [sessions, setSessions] = useState<
    { id: string; user_agent: string; last_seen: string; current: boolean }[]
  >([]);

  useEffect(() => {
    void listSessions(supabase).then((rows) =>
      setSessions(rows.map((r) => ({ ...r, user_agent: r.user_agent }))),
    );
  }, [supabase]);

  async function submitPassword() {
    if (next !== confirm) {
      setNote({ tone: "error", text: "Those passwords don't match." });
      return;
    }
    setBusy(true);
    const result = await changePassword(supabase, next);
    setBusy(false);
    setNote({ tone: result.ok ? "success" : "error", text: result.message });
    if (result.ok) {
      setCurrent("");
      setNext("");
      setConfirm("");
      setTimeout(() => setPasswordOpen(false), 900);
    }
  }

  return (
    <div>
      <SettingsSection
        title="Password & Security"
        description="Keep your account safe. Change your password, set up two-factor authentication, and review where you're signed in."
      >
        <SettingsCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-[13.5px] font-semibold text-bright">
                <KeyIcon width={15} height={15} className="text-muted" /> Password
              </p>
              <p className="mt-0.5 text-[12px] text-muted">
                Last changed when you created your account.
              </p>
            </div>
            <SettingsButton onClick={() => { setNote(null); setPasswordOpen(true); }}>
              Change Password
            </SettingsButton>
          </div>
        </SettingsCard>

        <SettingsCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-[13.5px] font-semibold text-bright">
                <ShieldIcon width={15} height={15} className="text-muted" />
                Two-Factor Authentication
              </p>
              <p className="mt-0.5 max-w-md text-[12px] leading-relaxed text-muted">
                Add an authenticator app as a second step. Even if someone learns your
                password, they can&apos;t sign in.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {mfaEnabled && (
                <span className="flex items-center gap-1 rounded-full bg-mint/15 px-2 py-1 text-[11px] font-semibold text-mint">
                  <CheckCircleIcon width={12} height={12} /> Enabled
                </span>
              )}
              <SettingsButton
                tone={mfaEnabled ? "secondary" : "primary"}
                onClick={() => setMfaOpen(true)}
              >
                {mfaEnabled ? "Manage MFA" : "Enable MFA"}
              </SettingsButton>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard>
          <CardLabel>
            <span className="flex items-center gap-1.5">
              <DeviceIcon width={13} height={13} /> Logged-in Devices
            </span>
          </CardLabel>
          <ul className="mt-2 divide-y divide-line/60">
            {sessions.map((session) => (
              <li key={session.id} className="flex items-center gap-3 py-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-void/60 text-muted">
                  <DeviceIcon width={15} height={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium text-bright">
                    {describeDevice(session.user_agent)}
                  </p>
                  <p className="text-[11px] text-dim">
                    {session.current ? "This device · " : ""}Active now
                  </p>
                </div>
                {session.current ? (
                  <span className="shrink-0 rounded-full bg-mint/15 px-2 py-0.5 text-[10px] font-semibold text-mint">
                    Current
                  </span>
                ) : (
                  <SettingsButton tone="danger">Log out</SettingsButton>
                )}
              </li>
            ))}
            {sessions.length === 0 && (
              <li className="py-2 text-[12px] text-dim">No other devices found.</li>
            )}
          </ul>
        </SettingsCard>

        <SettingsCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[13.5px] font-semibold text-bright">Sign out everywhere</p>
              <p className="mt-0.5 text-[12px] text-muted">
                Ends all other sessions. You&apos;ll stay signed in here.
              </p>
            </div>
            <SettingsButton
              tone="danger"
              onClick={async () => {
                await supabase.auth.signOut({ scope: "others" });
                setNote({ tone: "success", text: "Signed out of all other sessions." });
              }}
            >
              Sign out everywhere
            </SettingsButton>
          </div>
        </SettingsCard>

        {note && !passwordOpen && <InlineNote tone={note.tone}>{note.text}</InlineNote>}
      </SettingsSection>

      {/* Change password modal */}
      <Modal
        open={passwordOpen}
        title="Change your password"
        description="Use at least 8 characters — longer is stronger."
        onClose={() => setPasswordOpen(false)}
        footer={
          <>
            <SettingsButton tone="ghost" onClick={() => setPasswordOpen(false)}>
              Cancel
            </SettingsButton>
            <SettingsButton onClick={() => void submitPassword()} disabled={busy || next.length < 8}>
              {busy ? "Updating…" : "Update password"}
            </SettingsButton>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Current password">
            <TextInput type="password" value={current} onChange={setCurrent} placeholder="••••••••" />
          </Field>
          <Field label="New password" hint="min 8 characters">
            <TextInput type="password" value={next} onChange={setNext} placeholder="••••••••" />
          </Field>
          <Field label="Confirm new password">
            <TextInput type="password" value={confirm} onChange={setConfirm} placeholder="••••••••" />
          </Field>
          {note && <InlineNote tone={note.tone}>{note.text}</InlineNote>}
        </div>
      </Modal>

      {/* MFA modal */}
      <Modal
        open={mfaOpen}
        title={mfaEnabled ? "Manage two-factor" : "Enable two-factor authentication"}
        description="Scan the key below with an authenticator app, then enter the 6-digit code."
        onClose={() => setMfaOpen(false)}
        footer={
          <>
            <SettingsButton tone="ghost" onClick={() => setMfaOpen(false)}>
              Cancel
            </SettingsButton>
            <SettingsButton
              tone={mfaEnabled ? "danger" : "success"}
              onClick={() => {
                setMfaEnabled((v) => !v);
                setMfaOpen(false);
                setNote({
                  tone: "success",
                  text: mfaEnabled ? "Two-factor authentication disabled." : "Two-factor authentication enabled.",
                });
              }}
            >
              {mfaEnabled ? "Disable MFA" : "Verify & enable"}
            </SettingsButton>
          </>
        }
      >
        <div className="space-y-3">
          <SettingsCard className="text-center">
            <div className="mx-auto grid h-32 w-32 grid-cols-8 gap-0.5 rounded-md bg-white p-2">
              {Array.from({ length: 64 }).map((_, i) => (
                <span
                  key={i}
                  className="block rounded-[1px]"
                  style={{ background: (i * 7 + (i % 5) * 3) % 3 === 0 ? "#111" : "transparent" }}
                />
              ))}
            </div>
            <p className="mt-2 font-mono text-[11.5px] tracking-wider text-muted">
              JBSW Y3DP EHPK 3PXP
            </p>
          </SettingsCard>
          <Field label="6-digit code">
            <TextInput value="" onChange={() => undefined} placeholder="123 456" maxLength={7} />
          </Field>
          <p className="text-[11.5px] text-dim">
            Demo flow: enabling MFA here records the preference locally. Wire
            <span className="font-mono"> supabase.auth.mfa.enroll() </span>
            to complete the real handshake.
          </p>
        </div>
      </Modal>
    </div>
  );
}

function describeDevice(ua: string) {
  if (/iPhone|iPad|iPod/.test(ua)) return "Safari on iOS";
  if (/Android/.test(ua)) return "Chrome on Android";
  if (/Macintosh/.test(ua)) return "Browser on macOS";
  if (/Windows/.test(ua)) return "Browser on Windows";
  if (/Linux/.test(ua)) return "Browser on Linux";
  return "Unknown browser";
}

/* ------------------------------ Account Status ---------------------------- */

function StatusTab({ profile }: { profile: Profile }) {
  const ageDays = Math.max(
    0,
    Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86_400_000),
  );

  return (
    <div>
      <SettingsSection
        title="Account Status"
        description="Everything looks good. Your account is in standing and has no active restrictions."
      >
        <SettingsCard>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-mint/15 text-mint">
              <CheckCircleIcon width={20} height={20} />
            </span>
            <div>
              <p className="text-[13.5px] font-semibold text-bright">All good</p>
              <p className="text-[12px] text-muted">
                No warnings, no restrictions. Thanks for keeping it friendly.
              </p>
            </div>
          </div>
        </SettingsCard>

        <div className="grid gap-3 sm:grid-cols-3">
          <SettingsCard>
            <CardLabel>Account age</CardLabel>
            <p className="mt-1 text-[20px] font-bold text-bright">{ageDays}</p>
            <p className="text-[11.5px] text-dim">days since signup</p>
          </SettingsCard>
          <SettingsCard>
            <CardLabel>Standing</CardLabel>
            <p className="mt-1 text-[20px] font-bold text-mint">Good</p>
            <p className="text-[11.5px] text-dim">0 violations</p>
          </SettingsCard>
          <SettingsCard>
            <CardLabel>Safety</CardLabel>
            <p className="mt-1 text-[20px] font-bold text-bright">Standard</p>
            <p className="text-[11.5px] text-dim">filters enabled</p>
          </SettingsCard>
        </div>

        <SettingsCard>
          <CardLabel>Age-restricted content</CardLabel>
          <div className="mt-2">
            <Toggle
              checked={false}
              onChange={() => undefined}
              label="Show age-restricted channels"
              description="Servers flagged 18+ will appear in Discover and search."
            />
          </div>
        </SettingsCard>
      </SettingsSection>
    </div>
  );
}

function FamilyTab() {
  return (
    <SettingsSection
      title="Family Center"
      description="A shared space for guardians and teens to manage safety settings together."
    >
      <SettingsCard>
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blurple/15 text-blurple-soft">
            <ShieldIcon width={18} height={18} />
          </span>
          <div>
            <p className="text-[13.5px] font-semibold text-bright">No family linked yet</p>
            <p className="mt-0.5 max-w-md text-[12px] leading-relaxed text-muted">
              Invite a guardian to see activity summaries and approve friend requests.
              You can unlink at any time.
            </p>
            <div className="mt-3 flex gap-2">
              <SettingsButton>Invite guardian</SettingsButton>
              <SettingsButton tone="secondary">Learn more</SettingsButton>
            </div>
          </div>
        </div>
      </SettingsCard>
      <div className="grid gap-3 sm:grid-cols-2">
        <SettingsCard>
          <CardLabel>Safe DMs</CardLabel>
          <p className="mt-1 text-[12.5px] text-muted">
            Only friends can message you by default.
          </p>
        </SettingsCard>
        <SettingsCard>
          <CardLabel>Weekly report</CardLabel>
          <p className="mt-1 text-[12.5px] text-muted">
            Guardians receive a summary of server joins and friend activity.
          </p>
        </SettingsCard>
      </div>
    </SettingsSection>
  );
}

