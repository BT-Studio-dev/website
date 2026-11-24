"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CloseIcon } from "@/components/icons";
import { SettingsNav, ALL_NAV_ITEMS, type SettingsSectionId } from "@/components/settings/settings-nav";
import { AccountPanel } from "@/components/settings/account-panel";
import { AppearancePanel } from "@/components/settings/appearance-panel";
import {
  AccessibilityPanel,
  AppsPanel,
  BillingPanel,
  BoostPanel,
  GiftsPanel,
  ProPanel,
  SubscriptionsPanel,
  VoicePanel,
} from "@/components/settings/other-panels";
import {
  DataPrivacyPanel,
  MessagingPermissionsPanel,
  NotificationsPanel,
} from "@/components/settings/privacy-panels";
import {
  updateProfile,
  saveUserSettings,
  type ProfilePatch,
} from "@/lib/social";
import type { Profile, UserSettings } from "@/lib/types";

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
  onEditProfile,
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
  /** Opens the full Edit Profile studio (guests/demo get a no-op). */
  onEditProfile?: () => void;
}) {
  const [section, setSection] = useState<SettingsSectionId | "edit-profiles">("account");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<{ tone: "info" | "success" | "error"; text: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Appearance accents
  const [accentColor, setAccentColor] = useState(profile.accent_color);
  const [bannerColor, setBannerColor] = useState(profile.banner_color ?? profile.accent_color);

  // Data & Privacy / Messaging Permissions / Notifications live in one JSONB blob.
  const [settings, setSettings] = useState<UserSettings>(profile.user_settings ?? {});

  // Reset drafts when the panel is (re)opened.
  useEffect(() => {
    if (!open) return;
    setAccentColor(profile.accent_color);
    setBannerColor(profile.banner_color ?? profile.accent_color);
    setSettings(profile.user_settings ?? {});
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

  /**
   * Toggles/radios save the moment they change, and the blob is merged so
   * concurrent panels never clobber each other.
   */
  const patchSettings = useCallback(
    (patch: Partial<UserSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        void saveUserSettings(supabase, profile.id, next).then(({ error }) => {
          if (error) setNote({ tone: "error", text: error });
          else onProfileSaved({ ...profile, user_settings: next });
        });
        return next;
      });
    },
    [supabase, profile, onProfileSaved],
  );

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
            setNote(null);
            onEditProfile?.();
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
                <div className="rounded-xl border border-line/80 bg-raised/60 p-5 text-center">
                  <p className="text-[14px] font-semibold text-bright">
                    The profile studio opens in a moment…
                  </p>
                  <p className="mt-1 text-[12.5px] text-muted">
                    If it didn&apos;t, use the button below.
                  </p>
                  <button
                    onClick={() => onEditProfile?.()}
                    className="mt-3 rounded-lg bg-blurple px-4 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-blurple-soft"
                  >
                    Open Edit Profile
                  </button>
                </div>
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

              {section === "data" && (
                <DataPrivacyPanel settings={settings} onChange={patchSettings} supabase={supabase} />
              )}

              {section === "privacy" && (
                <MessagingPermissionsPanel
                  settings={settings}
                  onChange={patchSettings}
                  supabase={supabase}
                />
              )}

              {section === "notifications" && (
                <NotificationsPanel settings={settings} onChange={patchSettings} />
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
