"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CloseIcon } from "@/components/icons";
import { SettingsNav, ALL_NAV_ITEMS, type SettingsSectionId } from "@/components/settings/settings-nav";
import { AccountPanel } from "@/components/settings/account-panel";
import { AppearancePanel, EditProfilesPanel } from "@/components/settings/appearance-panel";
import {
  AccessibilityPanel,
  AppsPanel,
  BillingPanel,
  BoostPanel,
  DataPanel,
  GiftsPanel,
  NotificationsPanel,
  PrivacyPanel,
  ProPanel,
  SubscriptionsPanel,
  VoicePanel,
} from "@/components/settings/other-panels";
import { updateProfile, uploadAvatar, type ProfilePatch } from "@/lib/social";
import type { Profile } from "@/lib/types";

const TITLES: Record<SettingsSectionId | "edit-profiles", string> = {
  account: "My Account",
  data: "Data & Privacy",
  privacy: "Messaging Permissions",
  notifications: "Notifications",
  "bt-pro": "BT Pro",
  boost: "Server Boost",
  subscriptions: "Subscriptions",
  gifts: "Gift Inventory",
  billing: "Billing",
  appearance: "Appearance",
  voice: "Voice & Video",
  accessibility: "Accessibility",
  apps: "Authorized Apps",
  "edit-profiles": "Edit Profiles",
};

const SUBTITLES: Partial<Record<SettingsSectionId | "edit-profiles", string>> = {
  account: "Manage your account information, security and status.",
  appearance: "Theme, density and colour — applied instantly.",
  "edit-profiles": "Avatar, name and status shown across BT Comms.",
};

export function SettingsModal({
  open,
  onClose,
  supabase,
  profile,
  email,
  phone,
  onProfileSaved,
  pendingRequests,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  supabase: SupabaseClient;
  profile: Profile;
  email: string;
  phone?: string | null;
  onProfileSaved: (profile: Profile) => void;
  pendingRequests: number;
  onLogout: () => void;
}) {
  const [section, setSection] = useState<SettingsSectionId | "edit-profiles">("account");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<{ tone: "info" | "success" | "error"; text: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Editable profile drafts (Edit Profiles + Appearance accents share these)
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [customStatus, setCustomStatus] = useState(profile.custom_status ?? "");
  const [statusEmoji, setStatusEmoji] = useState(profile.custom_status_emoji ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [accentColor, setAccentColor] = useState(profile.accent_color);
  const [bannerColor, setBannerColor] = useState(profile.banner_color ?? profile.accent_color);

  // Persisted preference mirrors
  const [dmPrivacy, setDmPrivacy] = useState(profile.dm_privacy ?? "friends");
  const [messageFilter, setMessageFilter] = useState(profile.message_filter ?? "standard");
  const [notifyDm, setNotifyDm] = useState(profile.notify_direct_messages ?? true);
  const [notifyServer, setNotifyServer] = useState(profile.notify_server_messages ?? true);
  const [notifyFriends, setNotifyFriends] = useState(profile.notify_friend_requests ?? true);

  // Reset drafts when the panel is (re)opened.
  useEffect(() => {
    if (!open) return;
    setDisplayName(profile.display_name);
    setBio(profile.bio ?? "");
    setCustomStatus(profile.custom_status ?? "");
    setStatusEmoji(profile.custom_status_emoji ?? "");
    setAvatarUrl(profile.avatar_url);
    setAccentColor(profile.accent_color);
    setBannerColor(profile.banner_color ?? profile.accent_color);
    setDmPrivacy(profile.dm_privacy ?? "friends");
    setMessageFilter(profile.message_filter ?? "standard");
    setNotifyDm(profile.notify_direct_messages ?? true);
    setNotifyServer(profile.notify_server_messages ?? true);
    setNotifyFriends(profile.notify_friend_requests ?? true);
    setNote(null);
  }, [open, profile]);

  // Esc closes.
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [section]);

  const persist = useCallback(
    async (patch: ProfilePatch, successMessage?: string) => {
      setSaving(true);
      const { profile: updated, error } = await updateProfile(supabase, profile.id, patch);
      setSaving(false);
      if (error) {
        setNote({ tone: "error", text: error });
        return false;
      }
      if (updated) onProfileSaved(updated);
      if (successMessage) setNote({ tone: "success", text: successMessage });
      return true;
    },
    [supabase, profile.id, onProfileSaved],
  );

  async function saveProfile() {
    const ok = await persist(
      {
        display_name: displayName.trim() || profile.username,
        bio: bio.trim() || null,
        custom_status: customStatus.trim() || null,
        custom_status_emoji: statusEmoji.trim() || null,
        avatar_url: avatarUrl,
        accent_color: accentColor,
        banner_color: bannerColor,
      },
      "Profile saved.",
    );
    if (ok) setSection("account");
  }

  async function handleAvatar(file: File) {
    if (file.size > 4 * 1024 * 1024) {
      setNote({ tone: "error", text: "That image is larger than 4 MB." });
      return;
    }
    setNote({ tone: "info", text: "Uploading avatar…" });
    const { url, error } = await uploadAvatar(supabase, profile.id, file);
    if (error || !url) {
      setNote({ tone: "error", text: error ?? "Upload failed." });
      return;
    }
    setAvatarUrl(url);
    await persist({ avatar_url: url }, "Avatar updated.");
  }

  const filteredEmpty = useMemo(
    () =>
      query.trim().length > 0 &&
      ALL_NAV_ITEMS.every(
        (item) =>
          !item.label.toLowerCase().includes(query.trim().toLowerCase()) &&
          !item.keywords.some((k) => k.includes(query.trim().toLowerCase())),
      ),
    [query],
  );

  if (!open) return null;

  const title = TITLES[section];
  const subtitle = SUBTITLES[section];

  return (
    <div className="fixed inset-0 z-[70] flex bg-void/90 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="User settings">
      <div className="animate-rise flex h-full w-full overflow-hidden bg-panel shadow-2xl shadow-black/60">
        <SettingsNav
          profile={profile}
          active={section === "edit-profiles" ? "account" : section}
          onSelect={(id) => {
            setSection(id);
            setNote(null);
          }}
          query={query}
          onQueryChange={setQuery}
          onEditProfiles={() => {
            setSection("edit-profiles");
            setNote(null);
          }}
          onLogout={onLogout}
          pendingRequests={pendingRequests}
        />

        <main className="relative flex min-w-0 flex-1 flex-col bg-panel">
          {/* Header */}
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line/50 px-8 py-5">
            <div className="min-w-0">
              <h1 className="truncate text-[19px] font-bold tracking-tight text-bright">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-0.5 truncate text-[12.5px] text-muted">{subtitle}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={onClose}
                title="Close settings"
                aria-label="Close settings"
                className="flex items-center gap-2 rounded-full border border-line bg-void/60 px-3 py-1.5 text-[11.5px] font-semibold text-muted transition hover:border-rose/50 hover:text-rose"
              >
                <span className="rounded bg-raised px-1.5 py-0.5 font-mono text-[10px]">ESC</span>
                <CloseIcon width={14} height={14} />
              </button>
            </div>
          </header>

          <div ref={scrollRef} className="scroll-thin min-h-0 flex-1 overflow-y-auto px-8 py-6">
            <div className="mx-auto max-w-3xl">
              {note && (
                <p
                  role="status"
                  className={`mb-4 rounded-lg border px-3 py-2 text-[12.5px] ${
                    note.tone === "error"
                      ? "border-rose/30 bg-rose/10 text-rose"
                      : note.tone === "success"
                        ? "border-mint/30 bg-mint/10 text-mint"
                        : "border-line bg-void/50 text-muted"
                  }`}
                >
                  {note.text}
                </p>
              )}

              {filteredEmpty && (
                <p className="mb-4 rounded-lg border border-line bg-void/40 px-3 py-2 text-[12.5px] text-dim">
                  Search filtered the sidebar — clear it to browse all settings.
                </p>
              )}

              {section === "edit-profiles" && (
                <EditProfilesPanel
                  displayName={displayName}
                  onDisplayNameChange={setDisplayName}
                  username={profile.username}
                  bio={bio}
                  onBioChange={setBio}
                  customStatus={customStatus}
                  onCustomStatusChange={setCustomStatus}
                  statusEmoji={statusEmoji}
                  onStatusEmojiChange={setStatusEmoji}
                  avatarUrl={avatarUrl}
                  onAvatarFile={(file) => void handleAvatar(file)}
                  onSave={() => void saveProfile()}
                  saving={saving}
                  note={note}
                />
              )}

              {section === "account" && (
                <AccountPanel
                  supabase={supabase}
                  profile={profile}
                  email={email}
                  phone={phone}
                  onProfileChange={(patch) => onProfileSaved({ ...profile, ...patch })}
                />
              )}

              {section === "data" && <DataPanel />}

              {section === "privacy" && (
                <PrivacyPanel
                  dmPrivacy={dmPrivacy}
                  onDmPrivacyChange={(value) => {
                    setDmPrivacy(value);
                    void persist({ dm_privacy: value }, "Messaging permissions updated.");
                  }}
                  messageFilter={messageFilter}
                  onMessageFilterChange={(value) => {
                    setMessageFilter(value);
                    void persist({ message_filter: value }, "Message filter updated.");
                  }}
                  notifyFriendRequests={notifyFriends}
                  onNotifyFriendRequestsChange={(value) => {
                    setNotifyFriends(value);
                    void persist({ notify_friend_requests: value });
                  }}
                />
              )}

              {section === "notifications" && (
                <NotificationsPanel
                  dm={notifyDm}
                  server={notifyServer}
                  friends={notifyFriends}
                  onChange={(patch) => {
                    if (patch.dm !== undefined) {
                      setNotifyDm(patch.dm);
                      void persist({ notify_direct_messages: patch.dm });
                    }
                    if (patch.server !== undefined) {
                      setNotifyServer(patch.server);
                      void persist({ notify_server_messages: patch.server });
                    }
                    if (patch.friends !== undefined) {
                      setNotifyFriends(patch.friends);
                      void persist({ notify_friend_requests: patch.friends });
                    }
                  }}
                />
              )}

              {section === "bt-pro" && <ProPanel />}
              {section === "boost" && <BoostPanel />}
              {section === "subscriptions" && <SubscriptionsPanel />}
              {section === "gifts" && <GiftsPanel />}
              {section === "billing" && <BillingPanel />}

              {section === "appearance" && (
                <AppearancePanel
                  accentColor={accentColor}
                  onAccentChange={(color) => {
                    setAccentColor(color);
                    void persist({ accent_color: color });
                  }}
                  bannerColor={bannerColor}
                  onBannerChange={(color) => {
                    setBannerColor(color);
                    void persist({ banner_color: color });
                  }}
                />
              )}

              {section === "accessibility" && <AccessibilityPanel />}

              {section === "voice" && (
                <VoicePanel
                  micMuted={false}
                  onMicMutedChange={() => undefined}
                  deafened={false}
                />
              )}

              {section === "apps" && <AppsPanel />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
