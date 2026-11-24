"use client";

import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Avatar } from "@/components/avatar";
import {
  BellIcon,
  CheckIcon,
  DataIcon,
  EyeOffIcon,
  SearchIcon,
  ShieldIcon,
  SpeakerIcon,
  TrashIcon,
} from "@/components/icons";
import {
  CardLabel,
  Field,
  InlineNote,
  RadioRow,
  Select,
  SettingsButton,
  SettingsCard,
  SettingsSection,
  Toggle,
} from "@/components/settings/primitives";
import { playSound } from "@/lib/sounds";
import {
  exportAccountData,
  fetchBlockedUsers,
  unblockUser,
} from "@/lib/social";
import type {
  FriendRequestPolicy,
  ProfileShareScope,
  ReactionNotify,
  SensitiveFilter,
  SpamFilter,
  UserSettings,
} from "@/lib/types";
import type { BlockedUser } from "@/lib/types";

type Patch = Partial<UserSettings>;

/* ------------------------------------------------------------------ */
/* Data & Privacy                                                      */
/* ------------------------------------------------------------------ */

export function DataPrivacyPanel({
  settings,
  onChange,
  supabase,
}: {
  settings: UserSettings;
  onChange: (patch: Patch) => void;
  supabase?: SupabaseClient;
}) {
  const [exporting, setExporting] = useState(false);
  const [exportNote, setExportNote] = useState<string | null>(null);
  // The parent owns the persisted copy; every discrete change saves immediately.
  const persist = onChange;

  async function requestData() {
    if (!supabase) {
      setExportNote("Sign in to export your archive.");
      return;
    }
    setExporting(true);
    setExportNote(null);
    try {
      const data = await exportAccountData(supabase);
      if (!data) {
        setExportNote("We couldn't build your archive — try again.");
        return;
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `bt-comms-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setExportNote(
        `Archive ready — ${data.messages.length} server messages and ${data.direct_messages.length} DMs.`,
      );
    } catch {
      setExportNote("Export failed. Check your connection and try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <SettingsSection
      title="Data & Privacy"
      description="Decide how BT Comms uses your data, who sees your profile, and take a copy of everything we store."
    >
      <SettingsCard>
        <CardLabel>
          <span className="flex items-center gap-1.5">
            <DataIcon width={13} height={13} /> How BT Comms Uses My Data
          </span>
        </CardLabel>
        <div className="mt-3 space-y-3">
          <Toggle
            checked={settings.dataImprove ?? true}
            onChange={(value) => persist({ dataImprove: value })}
            label="Use data to improve BT Comms"
            description="Share anonymised usage and crash reports so we can fix what's broken."
          />
          <Toggle
            checked={settings.dataPersonalize ?? false}
            onChange={(value) => persist({ dataPersonalize: value })}
            label="Use data to personalize my experience"
            description="Suggest servers, friends, and content based on how you use BT Comms."
          />
          <Toggle
            checked={settings.voiceInClips ?? false}
            onChange={(value) => persist({ voiceInClips: value })}
            label="Allow my voice to be recorded in Clips"
            description="Lets people you're in voice with capture audio clips of the room."
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line/60 pt-3">
          <SettingsButton tone="secondary" onClick={() => void requestData()} disabled={exporting}>
            {exporting ? "Preparing…" : "Request Data"}
          </SettingsButton>
          <p className="text-[11.5px] text-dim">
            Downloads a JSON archive of your profile, messages, DMs, friends and blocks.
          </p>
        </div>
        {exportNote && (
          <div className="mt-2">
            <InlineNote tone={exportNote.startsWith("Archive") ? "success" : "info"}>
              {exportNote}
            </InlineNote>
          </div>
        )}
      </SettingsCard>

      <SettingsCard>
        <CardLabel>Profile Privacy</CardLabel>
        <p className="mt-1 mb-2 text-[12px] text-muted">Share my full profile with</p>
        <RadioRow<ProfileShareScope>
          value={settings.profileShareScope ?? "friends_servers"}
          onChange={(value) => persist({ profileShareScope: value })}
          options={[
            {
              value: "friends_servers",
              label: "Friends & All Servers",
              description: "Anyone in a server with you can see your full profile card.",
            },
            {
              value: "friends_small_servers",
              label: "Friends & Small Servers Only",
              description: "Only friends and servers under 200 members.",
            },
            {
              value: "friends",
              label: "Friends Only",
              description: "Your profile card is visible to friends only.",
            },
          ]}
        />
        <div className="mt-3 border-t border-line/60 pt-3">
          <Toggle
            checked={settings.profileShareUpdates ?? true}
            onChange={(value) => persist({ profileShareUpdates: value })}
            label="Share when I update my profile"
            description="Post a subtle activity note when you change your avatar, banner or bio."
          />
        </div>
      </SettingsCard>
    </SettingsSection>
  );
}

/* ------------------------------------------------------------------ */
/* Messaging Permissions                                               */
/* ------------------------------------------------------------------ */

const SENSITIVE_OPTIONS = [
  { value: "show", label: "Show media" },
  { value: "blur", label: "Blur media" },
  { value: "block", label: "Block media" },
];

export function MessagingPermissionsPanel({
  settings,
  onChange,
  supabase,
}: {
  settings: UserSettings;
  onChange: (patch: Patch) => void;
  supabase?: SupabaseClient;
}) {
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void fetchBlockedUsers(supabase).then((rows) => {
      if (cancelled) return;
      setBlocked(rows);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return blocked;
    return blocked.filter((row) => {
      const name = row.profile?.display_name ?? "";
      const username = row.profile?.username ?? "";
      return (
        name.toLowerCase().includes(needle) || username.toLowerCase().includes(needle)
      );
    });
  }, [blocked, query]);

  async function unblock(row: BlockedUser) {
    setBusyId(row.blocked_id);
    if (supabase) await unblockUser(supabase, row.blocked_id);
    setBlocked((prev) => prev.filter((item) => item.blocked_id !== row.blocked_id));
    setBusyId(null);
  }

  return (
    <SettingsSection
      title="Messaging Permissions"
      description="Control who can reach you, how much gets filtered, and who you've blocked."
    >
      <SettingsCard>
        <CardLabel>
          <span className="flex items-center gap-1.5">
            <ShieldIcon width={13} height={13} /> Content & Spam Filters
          </span>
        </CardLabel>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Sensitive media — DMs from friends">
            <Select
              value={settings.sensitiveDmFriends ?? "show"}
              onChange={(value) => onChange({ sensitiveDmFriends: value as SensitiveFilter })}
              options={SENSITIVE_OPTIONS}
            />
          </Field>
          <Field label="Sensitive media — DMs from others">
            <Select
              value={settings.sensitiveDmOthers ?? "blur"}
              onChange={(value) => onChange({ sensitiveDmOthers: value as SensitiveFilter })}
              options={SENSITIVE_OPTIONS}
            />
          </Field>
          <Field label="Sensitive media — server channels">
            <Select
              value={settings.sensitiveServer ?? "blur"}
              onChange={(value) => onChange({ sensitiveServer: value as SensitiveFilter })}
              options={SENSITIVE_OPTIONS}
            />
          </Field>
        </div>

        <div className="mt-4 border-t border-line/60 pt-3">
          <p className="mb-2 text-[11px] font-semibold tracking-widest text-muted uppercase">
            Spam Filters
          </p>
          <RadioRow<SpamFilter>
            value={settings.spamFilter ?? "non_friends"}
            onChange={(value) => onChange({ spamFilter: value })}
            options={[
              {
                value: "all",
                label: "Filter all spam",
                description: "Most aggressive — hides anything our models flag, including from friends.",
              },
              {
                value: "non_friends",
                label: "Filter messages from non-friends",
                description: "Recommended. Friends always get through.",
              },
              {
                value: "off",
                label: "Don't filter spam",
                description: "Show everything. You may see unwanted messages.",
              },
            ]}
          />
        </div>
      </SettingsCard>

      <SettingsCard>
        <CardLabel>Direct Messages & Friend Requests</CardLabel>
        <div className="mt-3 space-y-3">
          <Toggle
            checked={settings.dmAllowServerMembers ?? true}
            onChange={(value) => onChange({ dmAllowServerMembers: value })}
            label="Allow DMs from server members"
            description="People who share a server can start a conversation with you."
          />
          <Toggle
            checked={settings.dmRequests ?? true}
            onChange={(value) => onChange({ dmRequests: value })}
            label="Message requests"
            description="Route DMs from strangers into a separate, muted request inbox."
          />
          <Toggle
            checked={settings.friendRequestsEnabled ?? true}
            onChange={(value) => onChange({ friendRequestsEnabled: value })}
            label="Allow friend requests"
            description="Turn this off to stop new requests entirely."
          />
          <Toggle
            checked={settings.friendRequestNotes ?? true}
            onChange={(value) => onChange({ friendRequestNotes: value })}
            label="Show personalized messages on requests"
            description="Let people include a short note explaining why they're adding you."
          />
        </div>

        <div className="mt-3 border-t border-line/60 pt-3">
          <p className="mb-1 text-[11px] font-semibold tracking-widest text-muted uppercase">
            Allow Friend Requests From
          </p>
          <p className="mb-2 text-[12px] text-muted">
            Enforced server-side — requests outside this scope are rejected automatically.
          </p>
          <RadioRow<FriendRequestPolicy>
            value={settings.friendRequestsFrom ?? "everyone"}
            onChange={(value) => onChange({ friendRequestsFrom: value })}
            options={[
              { value: "everyone", label: "Everyone", description: "Any BT Comms account can add you." },
              {
                value: "friends_of_friends",
                label: "Friend of friends",
                description: "People who share at least one mutual friend.",
              },
              {
                value: "server_members",
                label: "Server members",
                description: "Only people in a server with you.",
              },
              {
                value: "nobody",
                label: "Nobody",
                description: "Close all incoming requests.",
              },
            ]}
          />
        </div>
      </SettingsCard>

      <SettingsCard>
        <CardLabel>
          <span className="flex items-center gap-1.5">
            <EyeOffIcon width={13} height={13} /> Ignore & Block
          </span>
        </CardLabel>
        <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-line bg-void/70 px-2.5 py-1.5">
          <SearchIcon width={13} height={13} className="shrink-0 text-dim" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search blocked accounts"
            aria-label="Search blocked accounts"
            className="w-full bg-transparent text-[12.5px] outline-none"
          />
        </div>

        <ul className="mt-2 space-y-1.5">
          {loading && <li className="py-3 text-center text-[12px] text-dim">Loading…</li>}
          {!loading && blocked.length === 0 && (
            <li className="rounded-lg border border-dashed border-line/70 px-3 py-4 text-center text-[12px] text-dim">
              You haven&apos;t blocked anyone. Blocked people can&apos;t DM you, see your
              status, or add you.
            </li>
          )}
          {!loading && blocked.length > 0 && filtered.length === 0 && (
            <li className="py-3 text-center text-[12px] text-dim">No blocked account matches that.</li>
          )}
          {filtered.map((row) => {
            const name = row.profile?.display_name || row.profile?.username || "Unknown";
            return (
              <li
                key={row.blocked_id}
                className="flex items-center gap-2.5 rounded-lg border border-line/70 bg-void/40 p-2"
              >
                <Avatar
                  name={name}
                  src={row.profile?.avatar_url}
                  accent={row.profile?.accent_color}
                  size={32}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-semibold text-bright">{name}</p>
                  <p className="truncate text-[11px] text-dim">@{row.profile?.username}</p>
                </div>
                <SettingsButton
                  tone="secondary"
                  onClick={() => void unblock(row)}
                  disabled={busyId === row.blocked_id}
                >
                  {busyId === row.blocked_id ? "…" : "Unblock"}
                </SettingsButton>
              </li>
            );
          })}
        </ul>
      </SettingsCard>
    </SettingsSection>
  );
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

export function NotificationsPanel({
  settings,
  onChange,
}: {
  settings: UserSettings;
  onChange: (patch: Patch) => void;
}) {
  const soundsDisabled = settings.soundDisabled ?? false;
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [emailNote, setEmailNote] = useState<string | null>(null);

  const EMAIL_KEYS: { key: keyof UserSettings; label: string; description: string }[] = [
    { key: "emailCommunication", label: "Communication", description: "Account and product updates." },
    { key: "emailSocial", label: "Social", description: "Friend requests and friend activity." },
    { key: "emailAnnouncements", label: "Announcements", description: "New features and changelogs." },
    { key: "emailTips", label: "Tips", description: "Occasional how-tos to get more out of BT Comms." },
    { key: "emailRecommendations", label: "Recommendations", description: "Suggested servers and people." },
  ];

  function unsubscribeAll() {
    onChange({
      emailCommunication: false,
      emailSocial: false,
      emailAnnouncements: false,
      emailTips: false,
      emailRecommendations: false,
    });
    setEmailNote("Unsubscribed from every email category.");
  }

  return (
    <SettingsSection
      title="Notifications"
      description="Pick what pings you, which chimes play, and what lands in your inbox."
    >
      <SettingsCard>
        <CardLabel>
          <span className="flex items-center gap-1.5">
            <BellIcon width={13} height={13} /> Overview & Activity Alerts
          </span>
        </CardLabel>
        <div className="mt-3 space-y-3">
          <Toggle
            checked={settings.notifyDesktop ?? true}
            onChange={(value) => onChange({ notifyDesktop: value })}
            label="Enable Desktop Notifications"
            description="Show OS notifications when BT Comms isn't focused."
          />
          <Toggle
            checked={settings.notifyStreaming ?? true}
            onChange={(value) => onChange({ notifyStreaming: value })}
            label="People I know start streaming"
            description="Get a ping when a friend goes live."
          />
          <Toggle
            checked={settings.notifyFriendsOnline ?? false}
            onChange={(value) => onChange({ notifyFriendsOnline: value })}
            label="Friends come online"
            description="Ping me when a friend comes online."
          />
          <Toggle
            checked={settings.notifyEvents ?? true}
            onChange={(value) => onChange({ notifyEvents: value })}
            label="A server has an upcoming event"
            description="Reminders before events in servers you're in."
          />
          <Toggle
            checked={settings.notifyProfileUpdates ?? false}
            onChange={(value) => onChange({ notifyProfileUpdates: value })}
            label="Friends update their profile"
            description="Know when a friend swaps their avatar or banner."
          />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-3">
            <p className="text-[13px] font-semibold text-bright">Someone reacts to my messages</p>
            <div className="w-52">
              <Select
                value={settings.notifyReactions ?? "all"}
                onChange={(value) => onChange({ notifyReactions: value as ReactionNotify })}
                options={[
                  { value: "all", label: "All messages" },
                  { value: "dm", label: "Direct messages only" },
                  { value: "off", label: "Off" },
                ]}
              />
            </div>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard>
        <CardLabel>
          <span className="flex items-center gap-1.5">
            <SpeakerIcon width={13} height={13} /> Sounds
          </span>
        </CardLabel>
        <div className="mt-3 space-y-3">
          <SoundRow
            label="New Message"
            checked={settings.soundMessage ?? true}
            disabled={soundsDisabled}
            onChange={(value) => onChange({ soundMessage: value })}
            onPreview={() => playSound("message")}
          />
          <SoundRow
            label="New Message in current channel"
            checked={settings.soundCurrentChannel ?? true}
            disabled={soundsDisabled}
            onChange={(value) => onChange({ soundCurrentChannel: value })}
            onPreview={() => playSound("channel")}
          />
          <SoundRow
            label="Incoming Ring"
            checked={settings.soundRing ?? true}
            disabled={soundsDisabled}
            onChange={(value) => onChange({ soundRing: value })}
            onPreview={() => playSound("ring")}
          />
          <div className="border-t border-line/60 pt-3">
            <Toggle
              checked={soundsDisabled}
              onChange={(value) => onChange({ soundDisabled: value })}
              label="Disable All Notification Sounds"
              description="Mutes every in-app chime, including calls."
            />
          </div>
        </div>
      </SettingsCard>

      <SettingsCard>
        <CardLabel>Badges & Email</CardLabel>
        <div className="mt-3">
          <Toggle
            checked={settings.unreadBadge ?? true}
            onChange={(value) => onChange({ unreadBadge: value })}
            label="Enable Unread Message Badge"
            description="Show a red count on the Home icon and unread channels."
          />
        </div>
        <div className="mt-3 space-y-2.5 border-t border-line/60 pt-3">
          <p className="text-[11px] font-semibold tracking-widest text-muted uppercase">Email me about</p>
          {EMAIL_KEYS.map((item) => (
            <Toggle
              key={String(item.key)}
              checked={Boolean(settings[item.key] ?? item.key === "emailCommunication")}
              onChange={(value) => onChange({ [item.key]: value } as Patch)}
              label={item.label}
              description={item.description}
            />
          ))}
          <SettingsButton tone="secondary" onClick={unsubscribeAll}>
            <TrashIcon width={12} height={12} />
            Unsubscribe from all
          </SettingsButton>
          {emailNote && (
            <div className="pt-1">
              <InlineNote tone="success">{emailNote}</InlineNote>
            </div>
          )}
        </div>
      </SettingsCard>

      <SettingsCard>
        <button
          onClick={() => setAdvancedOpen((v) => !v)}
          aria-expanded={advancedOpen}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <span>
            <span className="block text-[13.5px] font-semibold text-bright">Advanced</span>
            <span className="mt-0.5 block text-[12px] text-muted">
              Text-to-speech, playback speed and diagnostics.
            </span>
          </span>
          <span
            className={`text-[11px] font-semibold text-muted transition ${advancedOpen ? "rotate-180" : ""}`}
          >
            ▾
          </span>
        </button>

        {advancedOpen && (
          <div className="animate-rise mt-3 space-y-3 border-t border-line/60 pt-3">
            <Toggle
              checked={settings.ttsEnabled ?? false}
              onChange={(value) => onChange({ ttsEnabled: value })}
              label="Play /tts messages"
              description="Read messages sent with the /tts prefix out loud."
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[13px] font-semibold text-bright">Text-to-speech speed</p>
              <div className="w-52">
                <Select
                  value={String(settings.ttsRate ?? 1)}
                  onChange={(value) => onChange({ ttsRate: Number(value) })}
                  options={[
                    { value: "0.75", label: "Slow" },
                    { value: "1", label: "Normal" },
                    { value: "1.25", label: "Fast" },
                    { value: "1.5", label: "Very fast" },
                  ]}
                />
              </div>
            </div>
            <Toggle
              checked={settings.advancedTelemetry ?? false}
              onChange={(value) => onChange({ advancedTelemetry: value })}
              label="Send diagnostic data"
              description="Detailed performance traces to help us debug slowdowns."
            />
            <p className="flex items-center gap-1.5 text-[11.5px] text-dim">
              <CheckIcon width={12} height={12} />
              Sounds are synthesised locally — nothing is uploaded.
            </p>
          </div>
        )}
      </SettingsCard>
    </SettingsSection>
  );
}

function SoundRow({
  label,
  checked,
  disabled,
  onChange,
  onPreview,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
  onPreview: () => void;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 ${disabled ? "opacity-50" : ""}`}>
      <p className="text-[13px] font-semibold text-bright">{label}</p>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={onPreview}
          disabled={disabled}
          className="rounded-md border border-line bg-void/60 px-2 py-1 text-[11.5px] font-semibold text-muted transition hover:text-bright disabled:cursor-not-allowed"
        >
          Preview Sound
        </button>
        <button
          role="switch"
          aria-checked={checked}
          aria-label={`${label} sound`}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:cursor-not-allowed ${
            checked && !disabled ? "bg-mint" : "bg-line"
          }`}
        >
          <span
            className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all ${
              checked && !disabled ? "left-6" : "left-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
