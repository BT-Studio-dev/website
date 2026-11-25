"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useGlobalKeybinds } from "@/lib/use-keybinds";
import { ShortcutSheet } from "@/components/shortcut-sheet";
import { normalizeAttachments } from "@/lib/attachments";
import { AppearanceProvider, useAppearance } from "@/lib/appearance";
import { ServerRail } from "@/components/server-rail";
import { initialsFor } from "@/lib/naming";
import { ChannelSidebar } from "@/components/channel-sidebar";
import { MessageFeed } from "@/components/message-feed";
import { MemberList } from "@/components/member-list";
import { Modal } from "@/components/modal";
import { Avatar } from "@/components/avatar";
import { HomeSidebar, type HomeTab } from "@/components/home-sidebar";
import { FriendsView, ActiveNowPanel } from "@/components/friends-view";
import { VoiceRoomPanel } from "@/components/voice-room";
import { QuickSwitcher, type QuickSwitcherItem } from "@/components/quick-switcher";
import { UserActionMenu, type UserMenuTarget } from "@/components/user-action-menu";
import { useVoiceRoom } from "@/lib/use-voice-room";
import { playSound as playSoundboardEffect } from "@/lib/soundboard";
import { DmView } from "@/components/dm-view";
import { SettingsModal } from "@/components/settings/settings-modal";
import {
  EditProfileModal,
  type ProfileDraft,
  type ServerProfile,
} from "@/components/profile/edit-profile-modal";
import { ProfileCard } from "@/components/profile/profile-card";
import { ViewTitle } from "@/components/view-title";
import {
  CreateServerModal,
  JoinServerModal,
  OnboardingView,
  ServerWizardModal,
} from "@/components/server-modals";
import { NewMessageModal, ChangeIconModal } from "@/components/group-dm-modals";
import { ManageAccountsModal } from "@/components/manage-accounts";
import { defaultGroupName } from "@/components/home-sidebar";
import {
  addGroupMembers,
  createGroupDm,
  fetchGroupDms,
  fetchGroupMessages,
  markGroupRead,
  sendGroupMessage,
  updateGroupDm,
} from "@/lib/groups";
import { durationToExpiry, effectiveStatus } from "@/lib/presence";
import { playSound } from "@/lib/sounds";
import type { Dialog as NewDialog } from "@/components/comms-types";
import { CheckIcon, CopyIcon, HashIcon, MoreIcon, SpeakerIcon } from "@/components/icons";
import {
  ensureDmChannel,
  fetchDirectMessages,
  fetchDmChannels,
  fetchFriends,
  markDmRead,
  removeFriend,
  respondToRequest,
  sendDirectMessage,
  sendFriendRequest,
  saveProfileCard,
  fetchProfileCard,
  updateProfile,
  saveUserSettings,
  uploadAvatar,
  uploadBanner,
  type FriendEntry,
  type FriendRequest,
} from "@/lib/social";
import type {
  Appearance,
  Attachment,
  Channel,
  DirectMessage,
  DmChannel,
  GroupDm,
  LinkedAccount,
  Message,
  Presence,
  Profile,
  Server,
  ServerMember,
  StatusDuration,
  UserSettings,
  VoiceSettings,
  VoiceState,
} from "@/lib/types";
import type { ServerIntent, ServerTemplate } from "@/lib/server-templates";
import type { SettingsSectionId } from "@/components/settings/settings-nav";

type LegacyDialog = Extract<NewDialog, "invite" | "profile" | "channel" | "explore">;
type Dialog = NewDialog | LegacyDialog;

export type CommsInitial = {
  profile: Profile;
  servers: Server[];
  server: Server | null;
  channels: Channel[];
  members: ServerMember[];
  messages: Message[];
  voiceStates: VoiceState[];
  viewerRole: "owner" | "admin" | "member";
  email: string;
  startView?: "home" | "server";
  startDmId?: string | null;
  /** A *peer user id* from `/channels/@me/<userId>`, resolved to a dm_channel on mount. */
  startDmPeerId?: string | null;
};

export function CommsApp({ initial, onMembersChanged }: { initial: CommsInitial; onMembersChanged?: () => void }) {
  return (
    <AppearanceProvider
      initial={{
        // The stored blob wins; the flat legacy columns are the fallback for
        // rows that predate migration 0007.
        ...(initial.profile.appearance ?? {}),
        ...(initial.profile.theme_id ? { theme_id: initial.profile.theme_id } : {}),
        ...(initial.profile.message_density ? { message_density: initial.profile.message_density } : {}),
        ...(initial.profile.reduce_motion !== undefined ? { reduce_motion: initial.profile.reduce_motion } : {}),
        ...(initial.profile.reduced_saturation !== undefined
          ? { reduced_saturation: initial.profile.reduced_saturation }
          : {}),
        ...(initial.profile.font_scale ? { font_scale: initial.profile.font_scale } : {}),
        // Accessibility + language are mirrored in `profiles.user_settings`; they
        // win over the localStorage cache so a second device picks them up.
        ...accessibilityInitial(initial.profile.user_settings),
      }}
    >
      <CommsShell initial={initial} onMembersChanged={onMembersChanged} />
    </AppearanceProvider>
  );
}

/**
 * Map `profiles.user_settings.accessibility` (+ language / timeFormat) onto the
 * flat Appearance keys the provider understands. Anything absent stays
 * undefined so the local cache and the defaults still apply.
 */
function accessibilityInitial(settings: UserSettings | undefined): Partial<Appearance> {
  const a11y = settings?.accessibility;
  const out: Partial<Appearance> = {};
  if (a11y) {
    if (a11y.chatFontSize !== undefined) out.chat_font_size = a11y.chatFontSize;
    if (a11y.underlineLinks !== undefined) out.underline_links = a11y.underlineLinks;
    if (a11y.displayNameStyles !== undefined) out.display_name_styles = a11y.displayNameStyles;
    if (a11y.uiDensity !== undefined) out.ui_density = a11y.uiDensity;
    if (a11y.chatDisplay !== undefined) out.chat_display = a11y.chatDisplay;
    if (a11y.groupSpacing !== undefined) out.message_group_spacing = a11y.groupSpacing;
    if (a11y.saturation !== undefined) out.saturation = a11y.saturation;
    if (a11y.saturationCustomColors !== undefined)
      out.saturation_custom_colors = a11y.saturationCustomColors;
    if (a11y.highContrast !== undefined) out.high_contrast = a11y.highContrast;
    if (a11y.syncContrast !== undefined) out.sync_contrast = a11y.syncContrast;
    if (a11y.roleColors !== undefined) out.role_colors = a11y.roleColors;
    if (a11y.officialMessages !== undefined) out.official_messages = a11y.officialMessages;
    if (a11y.showOnOff !== undefined) out.show_on_off = a11y.showOnOff;
    if (a11y.reduceMotion !== undefined) out.reduce_motion = a11y.reduceMotion;
    if (a11y.reduceMotionSystem !== undefined) out.reduce_motion_system = a11y.reduceMotionSystem;
    if (a11y.notificationDuration !== undefined)
      out.notification_duration = a11y.notificationDuration;
    if (a11y.playGifsFocused !== undefined) out.play_gifs_focused = a11y.playGifsFocused;
    if (a11y.playAnimatedEmoji !== undefined) out.play_animated_emoji = a11y.playAnimatedEmoji;
    if (a11y.stickerAnimations !== undefined) out.sticker_animations = a11y.stickerAnimations;
    if (a11y.ttsRate !== undefined) out.tts_rate = a11y.ttsRate;
    if (a11y.showImageDescriptions !== undefined)
      out.show_image_descriptions = a11y.showImageDescriptions;
    if (a11y.legacyChatInput !== undefined) out.legacy_chat_input = a11y.legacyChatInput;
  }
  if (settings?.language) out.language = settings.language;
  if (settings?.timeFormat) out.time_format = settings.timeFormat;
  return out;
}

function CommsShell({ initial, onMembersChanged }: { initial: CommsInitial; onMembersChanged?: () => void }) {
  const supabase = useMemo<SupabaseClient>(() => createClient(), []);
  const router = useRouter();
  const { appearance } = useAppearance();
  const persistedAppearance = useRef<string>("");
  // Mirror of the latest `profiles.user_settings`; the appearance debounce merges
  // into it so saving a theme never wipes a Notifications toggle.
  const settingsRef = useRef<Record<string, unknown>>(
    (initial.profile.user_settings ?? {}) as Record<string, unknown>,
  );

  const [profile, setProfile] = useState(initial.profile);
  const [members, setMembers] = useState(initial.members);
  const [servers, setServers] = useState(initial.servers);
  const [channels, setChannels] = useState(initial.channels);
  const [messages, setMessages] = useState(initial.messages);
  const [voiceStates, setVoiceStates] = useState(initial.voiceStates);

  const [view, setView] = useState<"server" | "home">(
    initial.startView ?? (initial.server ? "server" : "home"),
  );
  const [activeServerId, setActiveServerId] = useState<string | null>(initial.server?.id ?? null);
  const [activeChannelId, setActiveChannelId] = useState(
    initial.channels.find((c) => c.kind === "text")?.id ?? initial.channels[0]?.id ?? "",
  );

  // Home / DMs state
  const [homeTab, setHomeTab] = useState<HomeTab>("friends");
  const [dmChannels, setDmChannels] = useState<DmChannel[]>([]);
  const [activeDmId, setActiveDmId] = useState<string | null>(initial.startDmId ?? null);
  const pendingDmPeer = useRef<string | null>(initial.startDmPeerId ?? null);
  const [dmMessages, setDmMessages] = useState<DirectMessage[]>([]);
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [homeFilter, setHomeFilter] = useState("");
  const [socialLoading, setSocialLoading] = useState(true);

  const [dialog, setDialog] = useState<Dialog>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [viewedCard, setViewedCard] = useState<Profile | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileNote, setProfileNote] = useState<
    { tone: "info" | "success" | "error"; text: string } | null
  >(null);
  const [serverProfiles, setServerProfiles] = useState<Record<string, ServerProfile>>({});
  const [showMembers, setShowMembers] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // form state
  const [serverName, setServerName] = useState("");
  const [serverIcon, setServerIcon] = useState("🚀");
  const [channelName, setChannelName] = useState("");
  const [channelTopic, setChannelTopic] = useState("");
  const [channelKind, setChannelKind] = useState<"text" | "voice">("text");
  const [status, setStatus] = useState<Presence>(profile.status);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [joiningCode, setJoiningCode] = useState("");
  const [discover, setDiscover] = useState<Server[]>([]);
  const [newDmSearch, setNewDmSearch] = useState("");

  /* ------------------------------ v4 state ------------------------------ */
  const pathname = usePathname();
  const [groups, setGroups] = useState<GroupDm[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [groupMessages, setGroupMessages] = useState<DirectMessage[]>([]);
  const [groupIconTarget, setGroupIconTarget] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [wizardTemplate, setWizardTemplate] = useState<ServerTemplate | null>(null);
  const [wizardIntent, setWizardIntent] = useState<ServerIntent>("friends");
  const [onboardingServerId, setOnboardingServerId] = useState<string | null>(null);
  const [statusExpiresAt, setStatusExpiresAt] = useState<string | null>(
    initial.profile.status_expires_at ?? null,
  );
  const [showAllChannels, setShowAllChannels] = useState(true);
  const [hideMutedChannels, setHideMutedChannels] = useState(false);
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  // The voice channel whose room view is open (null = not in a voice room).
  const [voiceRoomId, setVoiceRoomId] = useState<string | null>(null);
  const [boardSignal, setBoardSignal] = useState(0);
  // Global search / Quick Switcher.
  const [switcherOpen, setSwitcherOpen] = useState(false);
  // The `…` menu is rendered once at the shell level and fed the user it targets.
  const [actionTarget, setActionTarget] = useState<{
    user: UserMenuTarget;
    anchor: HTMLElement;
  } | null>(null);
  // Users this viewer has ignored / blocked locally.
  const [ignored, setIgnored] = useState<Record<string, boolean>>({});
  const [blocked, setBlocked] = useState<Record<string, boolean>>({});
  const [settingsSection, setSettingsSection] = useState<SettingsSectionId | undefined>(undefined);
  const [shortcutSheetOpen, setShortcutSheetOpen] = useState(false);
  // Conversations the viewer muted; toggled from the DM composer's bell.
  const [mutedConversations, setMutedConversations] = useState<Record<string, boolean>>({});
  const [categoryTarget, setCategoryTarget] = useState<string | null>(null);

  const canManage = initial.viewerRole === "owner" || initial.viewerRole === "admin";
  const activeChannel = channels.find((c) => c.id === activeChannelId) ?? channels[0];
  const activeDm = dmChannels.find((d) => d.id === activeDmId) ?? null;
  const server = servers.find((s) => s.id === activeServerId) ?? initial.server;

  const flash = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast((current) => (current === message ? null : current)), 2600);
  }, []);

  /* ---------------------------- global keybinds ---------------------------- */

  // `flash` is defined above; the handlers below read live state through refs so
  // the listener table never has to be rebuilt as conversations change.
  const openSettingsSection = useCallback((section: SettingsSectionId) => {
    setSettingsSection(section);
    setSettingsOpen(true);
  }, []);

  const keybindState = useRef({
    serverIds: [] as string[],
    channelIds: [] as string[],
    activeServerId: null as string | null,
    activeChannelId: "",
    home: false,
  });
  keybindState.current = {
    serverIds: servers.map((s) => s.id),
    channelIds: channels.filter((c) => c.kind === "text").map((c) => c.id),
    activeServerId,
    activeChannelId,
    home: view === "home",
  };

  const keybindHandlers = useMemo<Record<string, () => void>>(
    () => ({
      quickswitcher: () => setSwitcherOpen((open) => !open),
      search: () => {
        // Focus the feed's own search field when a channel is open, else open
        // the DM finder — the same field Discord's Ctrl+F lands in.
        const field = document.querySelector<HTMLInputElement>("[data-feed-search]");
        if (field) {
          field.focus();
          field.select();
          return;
        }
        setNewDmSearch("");
        setDialog("newdm");
      },
      "show-shortcuts": () => setShortcutSheetOpen((open) => !open),
      // Escape parks focus in the composer — the keybind the settings page
      // documents as "Focus text area".
      "focus-textarea": () => {
        const composer = document.querySelector<HTMLTextAreaElement>(
          "[data-composer-input] textarea, textarea[data-composer-input]",
        );
        composer?.focus();
      },
      "create-server": () => {
        setFormError(null);
        setDialog("server");
      },
      "new-group": () => {
        setNewDmSearch("");
        setDialog("newmessage");
      },
      "toggle-pins": () => flash("Pinned messages are coming soon."),
      "toggle-inbox": () => flash("The inbox is coming soon."),
      "toggle-members": () => flash("Member list toggle is available from the channel header."),
      "toggle-emoji": () => flash("Open the emoji picker from the composer."),
      "toggle-gif": () => flash("Open the GIF picker from the composer."),
      "toggle-sticker": () => flash("Open the sticker picker from the composer."),
      "upload-file": () => {
        const input = document.querySelector<HTMLInputElement>("[data-composer-file]");
        input?.click();
      },
      "copy-channel-link": () => {
        const state = keybindState.current;
        const path = state.home
          ? "/channels/@me"
          : `/channels/${state.activeServerId}/${state.activeChannelId}`;
        const url = `${window.location.origin}${path}`;
        void navigator.clipboard?.writeText(url).catch(() => undefined);
        flash("Channel link copied");
      },
      "toggle-mute": () => {
        setMuted((prev) => {
          if (prev) return false;
          setDeafened(false);
          return true;
        });
      },
      "toggle-deafen": () => {
        setDeafened((prev) => {
          const next = !prev;
          if (next) setMuted(true);
          return next;
        });
      },
      "start-call": () => {
        const voice = channels.find((c) => c.kind === "voice");
        if (voice && server) {
          void joinVoice(voice.id);
          return;
        }
        flash("Open a server with a voice channel to start a call.");
      },
      "toggle-soundboard": () => {
        if (!voiceRoomId) {
          flash("Join a voice channel to use the soundboard.");
          return;
        }
        setBoardSignal((n) => n + 1);
      },
      "get-help": () => openSettingsSection("keybinds"),
      lofi: () => {
        // The ambient bed in the soundboard catalogue is our lo-fi loop.
        playSoundboardEffect("npc", { volume: voiceSettings.soundboardVolume });
      },
      "nav-servers": () => {
        const { serverIds, activeServerId: current } = keybindState.current;
        if (serverIds.length === 0) return;
        const at = current ? serverIds.indexOf(current) : -1;
        const next = at <= 0 ? serverIds[0] : serverIds[at - 1];
        void openServer(next);
      },
      "nav-channels": () => {
        const { channelIds, activeChannelId: current } = keybindState.current;
        if (channelIds.length === 0) return;
        const at = channelIds.indexOf(current);
        const next = channelIds[(at + 1 + channelIds.length) % channelIds.length];
        void loadChannel(next);
      },
    }),
    // Handlers close over stable setters and the keybindState ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flash, openSettingsSection],
  );

  useGlobalKeybinds(keybindHandlers, !shortcutSheetOpen);


  /* ------------------------- appearance persistence ------------------------ */
  // Skip the mount render (that value came from the server), then debounce
  // every user-driven change into `profiles` so prefs survive a reload.
  const appearancePrimed = useRef(false);
  useEffect(() => {
    const key = JSON.stringify(appearance);
    if (!appearancePrimed.current) {
      appearancePrimed.current = true;
      persistedAppearance.current = key;
      return;
    }
    if (persistedAppearance.current === key) return;
    persistedAppearance.current = key;
    const timeout = setTimeout(() => {
      void updateProfile(supabase, profile.id, {
        // Flat columns stay in sync for anything that reads them directly…
        theme_id: appearance.theme_id,
        message_density: appearance.message_density,
        reduce_motion: appearance.reduce_motion,
        reduced_saturation: appearance.reduced_saturation,
        font_scale: appearance.font_scale,
        // …and the full blob carries the gradient + icon pack + streamer flags
        // so switching devices doesn't reset them.
        appearance,
      });

      // Accessibility + language also live in `profiles.user_settings` so the
      // User Settings panels (which read that JSONB) agree with the theme blob.
      void saveUserSettings(supabase, profile.id, {
        ...(settingsRef.current ?? {}),
        accessibility: {
          chatFontSize: appearance.chat_font_size,
          underlineLinks: appearance.underline_links,
          displayNameStyles: appearance.display_name_styles,
          uiDensity: appearance.ui_density,
          chatDisplay: appearance.chat_display,
          groupSpacing: appearance.message_group_spacing,
          saturation: appearance.saturation,
          saturationCustomColors: appearance.saturation_custom_colors,
          highContrast: appearance.high_contrast,
          syncContrast: appearance.sync_contrast,
          roleColors: appearance.role_colors,
          officialMessages: appearance.official_messages,
          showOnOff: appearance.show_on_off,
          reduceMotion: appearance.reduce_motion,
          reduceMotionSystem: appearance.reduce_motion_system,
          notificationDuration: appearance.notification_duration,
          playGifsFocused: appearance.play_gifs_focused,
          playAnimatedEmoji: appearance.play_animated_emoji,
          stickerAnimations: appearance.sticker_animations,
          ttsRate: appearance.tts_rate,
          showImageDescriptions: appearance.show_image_descriptions,
          legacyChatInput: appearance.legacy_chat_input,
        },
        language: appearance.language,
        timeFormat: appearance.time_format,
      });
    }, 600);
    return () => clearTimeout(timeout);
  }, [appearance, supabase, profile.id]);

  /* ----------------------------- social data ------------------------------ */
  const loadSocial = useCallback(async () => {
    const [friendData, dms] = await Promise.all([
      fetchFriends(supabase),
      fetchDmChannels(supabase),
    ]);
    setFriends(friendData.friends);
    setIncoming(friendData.incoming);
    setOutgoing(friendData.outgoing);
    setDmChannels(dms);
    setSocialLoading(false);
    return dms;
  }, [supabase]);

  useEffect(() => {
    void loadSocial();
  }, [loadSocial]);

  // /channels/@me/<peerId> carries a *user* id. Resolve it to (or create) the
  // matching dm_channel so a deep link — or a brand-new conversation that has no
  // channel row yet — never lands on a blank pane.
  useEffect(() => {
    const peerId = pendingDmPeer.current;
    if (!peerId || activeDmId) return;
    pendingDmPeer.current = null;
    void (async () => {
      const channelId = await ensureDmChannel(supabase, peerId);
      if (!channelId) {
        flash("Couldn't open that conversation.");
        return;
      }
      const dms = await loadSocial();
      setView("home");
      setHomeTab("friends");
      setActiveDmId(channelId);
      if (!dms.some((d) => d.id === channelId)) void loadSocial();
    })();
  }, [supabase, activeDmId, loadSocial, flash]);

  // Realtime: friendships, DMs, dm_channel list, presence changes
  useEffect(() => {
    const channel = supabase
      .channel("social")
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () => {
        void loadSocial();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "dm_channels" }, () => {
        void loadSocial();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, (payload) => {
        const updated = payload.new as Profile;
        if (updated.id === profile.id) setProfile((prev) => ({ ...prev, ...updated }));
        setFriends((prev) =>
          prev.map((f) =>
            f.profile.id === updated.id
              ? {
                  ...f,
                  profile: {
                    ...f.profile,
                    display_name: updated.display_name,
                    avatar_url: updated.avatar_url,
                    accent_color: updated.accent_color,
                    status: updated.status,
                    custom_status: updated.custom_status,
                  },
                }
              : f,
          ),
        );
        setDmChannels((prev) =>
          prev.map((d) =>
            d.peer?.id === updated.id
              ? {
                  ...d,
                  peer: {
                    ...d.peer,
                    display_name: updated.display_name,
                    avatar_url: updated.avatar_url,
                    status: updated.status,
                    custom_status: updated.custom_status,
                  },
                }
              : d,
          ),
        );
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, loadSocial, profile.id]);

  // Realtime: DMs for the open conversation
  useEffect(() => {
    if (!activeDmId) return;
    const channel = supabase
      .channel(`dm:${activeDmId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `dm_channel_id=eq.${activeDmId}`,
        },
        (payload) => {
          // Realtime payloads are raw table rows: `attachments` is jsonb and the
          // joined `author` is absent, so normalize both before rendering.
          const row = payload.new as DirectMessage;
          const incomingMsg: DirectMessage = {
            ...row,
            attachments: normalizeAttachments(row.attachments),
            author: row.author ?? null,
          };
          setDmMessages((prev) =>
            prev.some((m) => m.id === incomingMsg.id) ? prev : [...prev, incomingMsg],
          );
          if (incomingMsg.author_id !== profile.id) {
            void markDmRead(supabase, activeDmId, profile.id);
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, activeDmId, profile.id]);

  // Load messages when the DM changes
  useEffect(() => {
    if (!activeDmId) {
      setDmMessages([]);
      return;
    }
    void (async () => {
      const rows = await fetchDirectMessages(supabase, activeDmId);
      setDmMessages(rows);
      await markDmRead(supabase, activeDmId, profile.id);
      setDmChannels((prev) =>
        prev.map((d) => (d.id === activeDmId ? { ...d, unread_count: 0 } : d)),
      );
    })();
  }, [supabase, activeDmId, profile.id]);

  /* ------------------------------ presence -------------------------------- */
  useEffect(() => {
    let cancelled = false;
    async function mark(statusToSet: Presence) {
      if (cancelled) return;
      await supabase.from("profiles").update({ status: statusToSet }).eq("id", profile.id);
    }
    void mark("online");
    function onVisibility() {
      void mark(document.visibilityState === "visible" ? "online" : "idle");
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [supabase, profile.id]);

  /* --------------------------- server realtime ---------------------------- */
  useEffect(() => {
    if (!activeServerId) return;
    const channel = supabase
      .channel(`server:${activeServerId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "server_members", filter: `server_id=eq.${activeServerId}` },
        () => onMembersChanged?.(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "voice_states" }, async () => {
        const voiceChannelIds = channels.filter((c) => c.kind === "voice").map((c) => c.id);
        if (voiceChannelIds.length === 0) return;
        const { data } = await supabase
          .from("voice_states")
          .select(
            `channel_id, user_id, muted, joined_at,
             profile:profiles(id, username, display_name, avatar_url, accent_color)`,
          )
          .in("channel_id", voiceChannelIds);
        if (data) setVoiceStates(data as unknown as VoiceState[]);
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, activeServerId, channels, onMembersChanged]);

  /* ------------------------------ navigation ------------------------------ */
  const openServer = useCallback(
    async (serverId: string) => {
      setView("server");
      setActiveServerId(serverId);
      setActiveDmId(null);
      const { data } = await supabase
        .from("channels")
        .select("id, server_id, name, kind, topic, position")
        .eq("server_id", serverId)
        .order("position", { ascending: true });
      const list = (data ?? []) as Channel[];
      setChannels(list);
      const first = list.find((c) => c.kind === "text") ?? list[0];
      if (first) {
        setActiveChannelId(first.id);
        if (first.kind === "text") {
          const { data: msgs } = await supabase
            .from("messages")
            .select(
              `id, channel_id, author_id, system_author, content, created_at, edited_at,
               author:profiles(id, username, display_name, avatar_url, accent_color)`,
            )
            .eq("channel_id", first.id)
            .order("created_at", { ascending: false })
            .limit(80);
          setMessages(((msgs ?? []) as unknown as Message[]).reverse());
        }
      }
      router.push(`/channels/${serverId}/${first?.id ?? ""}`);
    },
    [supabase, router],
  );

  const openHome = useCallback(() => {
    setView("home");
    setActiveServerId(null);
    setActiveDmId(null);
    setActiveGroupId(null);
    setHomeTab("friends");
    router.push("/channels/@me");
  }, [router]);

  /** Clicking an avatar opens either the editor (you) or a read-only card. */
  const openProfile = useCallback(
    async (userId: string) => {
      if (userId === profile.id) {
        setEditingProfileId(profile.id);
        setProfileEditorOpen(true);
        return;
      }
      const member = members.find((m) => m.user_id === userId)?.profile ?? null;
      const friend = friends.find((f) => f.profile.id === userId)?.profile ?? null;
      const dmPeer = dmChannels.find((d) => d.peer?.id === userId)?.peer ?? null;
      const fallback = member ?? friend ?? dmPeer;
      if (fallback) {
        setViewedCard({
          ...fallback,
          created_at: new Date().toISOString(),
        } as Profile);
      }
      const fresh = await fetchProfileCard(supabase, userId);
      if (fresh) setViewedCard(fresh);
    },
    [profile.id, members, friends, dmChannels, supabase],
  );

  const openDm = useCallback(
    async (userId: string) => {
      const channelId = await ensureDmChannel(supabase, userId);
      if (!channelId) {
        flash("Couldn't open that conversation.");
        return;
      }
      const dms = await loadSocial();
      const found = dms.find((d) => d.id === channelId);
      setView("home");
      setActiveServerId(null);
      setActiveGroupId(null);
      setActiveDmId(channelId);
      setHomeTab("friends");
      // Discord's canonical DM URL: /channels/@me/<peer id>
      router.push(`/channels/@me/${userId}`);
      if (found) flash(`Conversation with ${found.peer?.display_name ?? "friend"}`);
    },
    [supabase, loadSocial, flash],
  );

  const loadChannel = useCallback(
    async (channelId: string, opts: { push?: boolean } = {}) => {
      if (channelId === activeChannelId) return;
      setActiveChannelId(channelId);
      setMessages([]);
      const { data } = await supabase
        .from("messages")
        .select(
          `id, channel_id, author_id, system_author, content, created_at, edited_at,
           author:profiles(id, username, display_name, avatar_url, accent_color)`,
        )
        .eq("channel_id", channelId)
        .order("created_at", { ascending: false })
        .limit(80);
      setMessages(((data ?? []) as unknown as Message[]).reverse());
      if (opts.push !== false && activeServerId) {
        router.push(`/channels/${activeServerId}/${channelId}`);
      }
    },
    [supabase, activeChannelId, activeServerId, router],
  );

  /* -------------------------------- voice --------------------------------- */
  const joinVoice = useCallback(
    async (channelId: string) => {
      const target = channels.find((c) => c.id === channelId);
      await supabase.from("voice_states").delete().eq("user_id", profile.id);
      const { error } = await supabase
        .from("voice_states")
        .insert({ channel_id: channelId, user_id: profile.id });
      if (error) {
        flash("Couldn't join that voice channel.");
        return;
      }
      // Opening the room view is what starts microphone capture and signalling.
      setVoiceRoomId(channelId);
      flash(`Joined ${target?.name ?? "voice"}`);
    },
    [supabase, profile.id, channels, flash],
  );

  const leaveVoice = useCallback(async () => {
    setVoiceRoomId(null);
    await supabase.from("voice_states").delete().eq("user_id", profile.id);
    flash("Left voice");
  }, [supabase, profile.id, flash]);

  const voiceRoom = useVoiceRoom({
    supabase,
    channelId: voiceRoomId,
    selfId: profile.id,
  });

  // Keep the published mute flag truthful and the mic track in sync.
  useEffect(() => {
    voiceRoom.setMuted(muted || deafened);
  }, [muted, deafened, voiceRoom.setMuted]);

  useEffect(() => {
    if (!voiceRoomId) return;
    const timer = setTimeout(() => {
      void supabase
        .from("voice_states")
        .update({ muted })
        .eq("channel_id", voiceRoomId)
        .eq("user_id", profile.id);
    }, 300);
    return () => clearTimeout(timer);
  }, [muted, voiceRoomId, supabase, profile.id]);

  /* ------------------------------- actions -------------------------------- */
  /** Look up the server we just created (newest owned row with this name). */
  async function findOwnedServer(name: string): Promise<Server | null> {
    const { data } = await supabase
      .from("servers")
      .select("id, name, icon, description, invite_code, is_default, owner_id")
      .eq("owner_id", profile.id)
      .eq("name", name)
      .order("created_at", { ascending: false })
      .limit(1);
    const rows = (data ?? []) as Server[];
    return rows[0] ?? null;
  }

  async function createServer() {
    const name = serverName.trim();
    if (!name) return;
    setBusy(true);
    setFormError(null);

    const { error } = await supabase
      .from("servers")
      .insert({ name, icon: serverIcon, owner_id: profile.id });

    const created = error ? null : await findOwnedServer(name);
    if (error || !created) {
      setFormError(error?.message ?? "Could not create the server. Try a different name.");
      setBusy(false);
      return;
    }

    // `on_server_created` (migration 0009) already inserted the owner membership
    // and the default `#general` + General Voice channels; these upserts are the
    // idempotent fallback for a database without the trigger.
    await supabase
      .from("server_members")
      .upsert(
        { server_id: created.id, user_id: profile.id, role: "owner" },
        { onConflict: "server_id,user_id", ignoreDuplicates: true },
      );
    await supabase
      .from("channels")
      .upsert(
        [
          { server_id: created.id, name: "general", kind: "text", position: 0, topic: `Say hi in ${name}.` },
          { server_id: created.id, name: "General", kind: "voice", position: 1 },
        ],
        { onConflict: "server_id,name,kind", ignoreDuplicates: true },
      );

    setServers((prev) => [...prev, created]);
    setBusy(false);
    setDialog(null);
    setServerName("");
    flash(`Created ${name}`);
    await openServer(created.id);
  }

  async function createChannel() {
    const name = channelName.trim().toLowerCase().replace(/\s+/g, "-");
    if (!name || !activeServerId) return;
    setBusy(true);
    setFormError(null);

    const { data, error } = await supabase
      .from("channels")
      .insert({
        server_id: activeServerId,
        name,
        kind: channelKind,
        topic: channelTopic.trim() || null,
        position: channels.length,
      })
      .select("id, server_id, name, kind, topic, position")
      .single<Channel>();

    setBusy(false);
    if (error || !data) {
      setFormError(error?.code === "23505" ? "A channel with that name already exists." : (error?.message ?? "Could not create the channel."));
      return;
    }

    setChannels((prev) => [...prev, data]);
    setDialog(null);
    setChannelName("");
    setChannelTopic("");
    if (data.kind === "text") setActiveChannelId(data.id);
    flash(`Created #${data.name}`);
  }

  async function joinByInvite(code: string) {
    const cleaned = code.trim().toLowerCase().replace(/^.*[?&]invite=/, "").replace(/\/+$/, "");
    if (!cleaned) return;
    setBusy(true);
    setFormError(null);

    const { data: found, error } = await supabase
      .from("servers")
      .select("id, name, icon, description, invite_code, is_default, owner_id")
      .eq("invite_code", cleaned)
      .maybeSingle<Server>();

    if (error || !found) {
      setBusy(false);
      setFormError("That invite code doesn't match a server.");
      return;
    }

    const { error: joinError } = await supabase
      .from("server_members")
      .insert({ server_id: found.id, user_id: profile.id });

    setBusy(false);
    if (joinError && joinError.code !== "23505") {
      setFormError("Couldn't join that server.");
      return;
    }

    setDialog(null);
    setJoiningCode("");
    flash(`Joined ${found.name}`);
    if (!servers.some((s) => s.id === found.id)) setServers((prev) => [...prev, found]);
    await openServer(found.id);
  }

  async function leaveServer() {
    if (!activeServerId) return;
    const target = servers.find((s) => s.id === activeServerId);
    await supabase
      .from("server_members")
      .delete()
      .eq("server_id", activeServerId)
      .eq("user_id", profile.id);

    const remaining = servers.filter((s) => s.id !== activeServerId);
    setServers(remaining);
    flash(target ? `Left ${target.name}` : "Left server");

    if (remaining.length > 0) {
      await openServer(remaining[0].id);
    } else {
      openHome();
    }
  }

  async function openExplore() {
    setDialog("explore");
    const { data } = await supabase
      .from("public_servers")
      .select("id, name, icon, description, invite_code, is_default, created_at")
      .order("created_at", { ascending: true })
      .limit(20);
    setDiscover((data ?? []) as unknown as Server[]);
  }

  async function addFriend(username: string, note?: string) {
    const result = await sendFriendRequest(supabase, username, note);
    if (result.ok) await loadSocial();
    return result;
  }

  async function copyInvite() {
    if (!server) return;
    const url = `${window.location.origin}/channels/@me?invite=${server.invite_code}`;
    try {
      await navigator.clipboard.writeText(url);
      setInviteCopied(true);
      flash("Invite link copied");
      setTimeout(() => setInviteCopied(false), 1600);
    } catch {
      flash(server.invite_code);
    }
  }

  /**
   * Start a call from a DM header.
   *
   * There is no peer-to-peer signalling yet, so this routes to the first voice
   * channel of the server you have open — the same place a real call would land
   * — and says so rather than pretending a call was placed.
   */
  function startDmCall(label: string) {
    // Direct calls are not hosted peer-to-peer — voice lives in a server channel.
    // Say exactly that rather than pretending a call was placed.
    flash(`Direct calls need a server voice channel — open a server to call ${label}.`);
  }

  function toggleConversationMute(id: string, label: string) {
    setMutedConversations((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      flash(next[id] ? `Muted ${label}` : `Unmuted ${label}`);
      return next;
    });
  }

  async function sendDm(content: string, attachments: Attachment[] = []) {
    if (!activeDmId) return;
    if (!content.trim() && attachments.length === 0) return;
    const optimistic: DirectMessage = {
      id: `tmp-${crypto.randomUUID()}`,
      dm_channel_id: activeDmId,
      author_id: profile.id,
      content,
      created_at: new Date().toISOString(),
      edited_at: null,
      read_at: null,
      attachments,
      author: {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        accent_color: profile.accent_color,
      },
    };
    setDmMessages((prev) => [...prev, optimistic]);
    const saved = await sendDirectMessage(supabase, activeDmId, profile.id, content, attachments);
    if (!saved) {
      setDmMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      flash("Message failed to send.");
      return;
    }
    setDmMessages((prev) => prev.map((m) => (m.id === optimistic.id ? saved : m)));
    void loadSocial();
  }

  async function deleteDm(id: string) {
    const snapshot = dmMessages;
    setDmMessages((prev) => prev.filter((m) => m.id !== id));
    const { error } = await supabase.from("direct_messages").delete().eq("id", id);
    if (error) setDmMessages(snapshot);
  }

  /* --------------------------- v4: group DMs ---------------------------- */
  const loadGroups = useCallback(async () => {
    const list = await fetchGroupDms(supabase, profile.id);
    setGroups(list);
    return list;
  }, [supabase, profile.id]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  const openGroup = useCallback(
    async (groupId: string) => {
      setView("home");
      setActiveServerId(null);
      setActiveDmId(null);
      setActiveGroupId(groupId);
      setHomeTab("friends");
      const rows = await fetchGroupMessages(supabase, groupId);
      setGroupMessages(rows);
      await markGroupRead(supabase, groupId, profile.id);
      router.push("/channels/@me");
    },
    [supabase, profile.id, router],
  );

  async function createGroup(memberIds: string[], name: string) {
    setBusy(true);
    const { group, error } = await createGroupDm(supabase, profile.id, memberIds, name);
    setBusy(false);
    if (!group) {
      flash(error ?? "Couldn't create that group.");
      return;
    }
    setDialog(null);
    await loadGroups();
    await openGroup(group.id);
    flash(`Created ${group.name ?? "group"}`);
  }

  async function sendGroupMsg(content: string, attachments: Attachment[] = []) {
    if (!activeGroupId) return;
    if (!content.trim() && attachments.length === 0) return;
    const optimistic: DirectMessage = {
      id: `tmp-${crypto.randomUUID()}`,
      dm_channel_id: activeGroupId,
      author_id: profile.id,
      content,
      created_at: new Date().toISOString(),
      edited_at: null,
      read_at: null,
      attachments,
      author: {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        accent_color: profile.accent_color,
      },
    };
    setGroupMessages((prev) => [...prev, optimistic]);
    const saved = await sendGroupMessage(supabase, activeGroupId, profile.id, content, attachments);
    if (saved) {
      setGroupMessages((prev) => prev.map((m) => (m.id === optimistic.id ? saved : m)));
    } else {
      setGroupMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      flash("Message failed to send.");
    }
    void loadGroups();
  }

  async function saveGroupIcon(iconUrl: string | null) {
    const target = groupIconTarget ?? activeGroupId;
    if (!target) return;
    setBusy(true);
    const { error } = await updateGroupDm(supabase, target, {
      icon_url: iconUrl,
      name: groups.find((g) => g.id === target)?.name ?? null,
    });
    setBusy(false);
    if (error) {
      flash("Couldn't update the group icon.");
      return;
    }
    setGroupIconTarget(null);
    await loadGroups();
    flash("Group icon updated");
  }

  /* ------------------------- v4: timed presence ------------------------- */
  const setPresence = useCallback(
    async (nextStatus: Presence, duration: StatusDuration) => {
      const expiry = durationToExpiry(duration);
      const previous = { status, expiresAt: statusExpiresAt };
      setStatus(nextStatus);
      setStatusExpiresAt(expiry);
      setProfile((prev) => ({ ...prev, status: nextStatus, status_expires_at: expiry }));
      const { error } = await supabase
        .from("profiles")
        .update({ status: nextStatus, status_expires_at: expiry })
        .eq("id", profile.id);
      if (error) {
        setStatus(previous.status);
        setStatusExpiresAt(previous.expiresAt);
        flash("Couldn't update your status.");
        return;
      }
      flash(`${nextStatus === "dnd" ? "Do Not Disturb" : nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}${expiry ? " · timed" : ""}`);
    },
    [supabase, profile.id, status, statusExpiresAt, flash],
  );

  // Auto-revert when a timer lapses while the app is open.
  useEffect(() => {
    if (!statusExpiresAt) return;
    const delay = new Date(statusExpiresAt).getTime() - Date.now();
    if (delay <= 0) {
      void setPresence("online", "forever");
      return;
    }
    const id = setTimeout(() => void setPresence("online", "forever"), delay + 250);
    return () => clearTimeout(id);
  }, [statusExpiresAt, setPresence]);

  /* --------------------------- v4: accounts ---------------------------- */
  useEffect(() => {
    setAccounts([
      {
        id: profile.id,
        email: initial.email,
        username: profile.username,
        display_name: profile.display_name || profile.username,
        avatar_url: profile.avatar_url,
        accent_color: profile.accent_color,
        active: true,
      },
      {
        id: "secondary-sol",
        email: "sol@btcomms.test",
        username: "sol",
        display_name: "Sol",
        avatar_url: null,
        accent_color: "#22c55e",
        active: false,
      },
    ]);
  }, [profile, initial.email]);

  async function switchAccount(accountId: string) {
    const account = accounts.find((a) => a.id === accountId);
    if (!account || account.active) return;
    await supabase.auth.signOut();
    router.push(`/login?next=${encodeURIComponent(pathname || "/channels/@me")}&email=${encodeURIComponent(account.email)}`);
  }

  /* ------------------------ v4: voice preferences ---------------------- */
  const voiceSettings: VoiceSettings = {
    inputDevice: profile.voice_settings?.inputDevice,
    outputDevice: profile.voice_settings?.outputDevice,
    inputVolume: profile.voice_settings?.inputVolume,
    outputVolume: profile.voice_settings?.outputVolume,
    ...(profile.user_settings
      ? {
          inputDevice: profile.user_settings.voiceInputDevice,
          outputDevice: profile.user_settings.voiceOutputDevice,
          inputVolume: profile.user_settings.voiceInputVolume,
          outputVolume: profile.user_settings.voiceOutputVolume,
        }
      : {}),
  };

  const patchVoice = useCallback(
    (patch: Partial<VoiceSettings>) => {
      // Voice prefs persist in the same user_settings blob as the panels.
      const nextSettings = {
        ...(profile.user_settings ?? {}),
        ...(patch.inputDevice !== undefined ? { voiceInputDevice: patch.inputDevice } : {}),
        ...(patch.outputDevice !== undefined ? { voiceOutputDevice: patch.outputDevice } : {}),
        ...(patch.inputVolume !== undefined ? { voiceInputVolume: patch.inputVolume } : {}),
        ...(patch.outputVolume !== undefined ? { voiceOutputVolume: patch.outputVolume } : {}),
      };
      setProfile((prev) => ({ ...prev, user_settings: nextSettings }));
      void updateProfile(supabase, profile.id, { user_settings: nextSettings });
    },
    [profile, supabase],
  );

  function previewSound(id: string) {
    const sounds: Record<string, string> = {
      deafen: "deafen",
      undeafen: "undeafen",
      mute: "mute",
      unmute: "unmute",
      camera: "camera",
    };
    const mapped = sounds[id] ?? "message";
    playSound(mapped as Parameters<typeof playSound>[0], 0.8);
  }

  /* ------------------------ v4: server lifecycle ----------------------- */
  function startServerWizard(template: ServerTemplate | null) {
    setWizardTemplate(template);
    setWizardStep(1);
    setServerName(template ? `${profile.display_name || profile.username}'s ${template.name.toLowerCase()}` : `${profile.display_name || profile.username}'s server`);
    setServerIcon(template?.emoji ?? "🚀");
    setFormError(null);
    setDialog("wizard");
  }

  async function createServerFromWizard(name: string, _icon: string | null, template: ServerTemplate | null) {
    setBusy(true);
    setFormError(null);

    // Insert without RETURNING: the SELECT policy on `servers` checks membership,
    // which doesn't exist yet at that instant. The RLS fix (0006) allows owners to
    // read their own servers, but we still look the row up explicitly afterwards
    // so the flow works against an un-migrated database too.
    const { error } = await supabase
      .from("servers")
      .insert({ name, icon: serverIcon, owner_id: profile.id });

    const created = error ? null : await findOwnedServer(name);
    if (error || !created) {
      setFormError(error?.message ?? "Could not create the server. Try a different name.");
      setBusy(false);
      return;
    }

    await supabase
      .from("server_members")
      .insert({ server_id: created.id, user_id: profile.id, role: "owner" });

    // The `on_server_created` trigger (migration 0009) already provisioned
    // `#general` + General Voice, so only add the template's extra channels and
    // never fight the `unique (server_id, name, kind)` constraint.
    const seed = template?.channels ?? [];
    if (seed.length > 0) {
      const { data: existing } = await supabase
        .from("channels")
        .select("name, kind")
        .eq("server_id", created.id);
      const taken = new Set(
        ((existing ?? []) as { name: string; kind: string }[]).map(
          (c) => `${c.kind}:${c.name.toLowerCase()}`,
        ),
      );
      const rows = seed
        .map((channel, index) => ({
          server_id: created.id,
          name: channel.name.toLowerCase().replace(/\s+/g, "-"),
          kind: channel.kind,
          topic: channel.topic ?? null,
          position: index + 2,
        }))
        .filter((row) => !taken.has(`${row.kind}:${row.name}`));
      if (rows.length > 0) {
        await supabase
          .from("channels")
          .upsert(rows, { onConflict: "server_id,name,kind", ignoreDuplicates: true });
      }
    }

    // Mint the first shareable invite so "Invite to Server" always works.
    await supabase.rpc("create_server_invite", { p_server: created.id });

    setServers((prev) => [...prev, created]);
    setBusy(false);
    setDialog(null);
    setOnboardingServerId(created.id);
    flash(`Created ${name}`);
    await openServer(created.id);
  }

  async function joinWithInvite(code: string) {
    setBusy(true);
    setFormError(null);
    const { data, error } = await supabase.rpc("redeem_server_invite", { p_code: code });
    const row = Array.isArray(data) ? data[0] : null;
    const serverId: string | null = row?.server_id ?? null;

    if (error || !serverId) {
      setBusy(false);
      setFormError("That invite code doesn't match a server.");
      return;
    }

    const { data: found } = await supabase
      .from("servers")
      .select("id, name, icon, description, invite_code, is_default, owner_id")
      .eq("id", serverId)
      .maybeSingle<Server>();

    setBusy(false);
    setDialog(null);
    setJoiningCode("");
    if (found && !servers.some((s) => s.id === found.id)) {
      setServers((prev) => [...prev, found]);
      flash(`Joined ${found.name}`);
    } else {
      flash("You're already in that server.");
    }
    await openServer(serverId);
  }

  const pendingCount = incoming.length;
  const onlineFriends = friends.filter((f) => (f.profile.status ?? "offline") !== "offline");

  // Synthetic "Active Now" activities derived from friends' status.
  const activities = useMemo(() => {
    const map: Record<string, { kind: "game" | "music" | "code" | "custom" | "voice"; title: string; detail?: string }> = {};
    const titles = [
      { kind: "game" as const, title: "BT Comms Arena", detail: "Ranked · 2 of 5" },
      { kind: "music" as const, title: "Lo-fi Beats to Ship To", detail: "Spotify · playlist" },
      { kind: "code" as const, title: "bt-comms/app", detail: "Editing components/settings" },
      { kind: "voice" as const, title: "General Voice", detail: "In a voice channel" },
    ];
    onlineFriends.forEach((friend, index) => {
      if (index < 3) map[friend.profile.id] = titles[index % titles.length];
    });
    return map;
  }, [onlineFriends]);

  const activeNow = useMemo(
    () =>
      onlineFriends
        .filter((f) => activities[f.profile.id])
        .map((f) => ({ friend: f, activity: activities[f.profile.id] })),
    [onlineFriends, activities],
  );

  const liveStatus = effectiveStatus(status, statusExpiresAt);
  const titleUnread = dmChannels.reduce((sum, d) => sum + (d.unread_count ?? 0), 0) +
    groups.reduce((sum, g) => sum + (g.unread_count ?? 0), 0);
  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? null;
  /* --------------------------- global search index ------------------------ */
  const switcherItems = useMemo<QuickSwitcherItem[]>(() => {
    const items: QuickSwitcherItem[] = [];

    // Channels of the open server.
    for (const channel of channels) {
      items.push({
        id: channel.id,
        kind: channel.kind === "voice" ? "voice" : "channel",
        label: channel.name,
        hint: server ? `${server.name}` : undefined,
      });
    }

    // Servers themselves, so "design" finds the server too.
    for (const entry of servers) {
      items.push({ id: entry.id, kind: "channel", label: entry.name, hint: "Server" });
    }

    // Direct messages.
    for (const dm of dmChannels) {
      const peer = dm.peer;
      if (!peer) continue;
      items.push({
        id: peer.id,
        kind: "dm",
        label: peer.display_name || peer.username,
        hint: `@${peer.username}`,
        avatarUrl: peer.avatar_url,
        accent: peer.accent_color,
        status: (peer.status as Presence) ?? "offline",
      });
    }

    // Server members.
    for (const member of members) {
      if (!member.profile) continue;
      if (member.profile.id === profile.id) continue;
      items.push({
        id: member.profile.id,
        kind: "member",
        label: member.profile.display_name || member.profile.username,
        hint: `@${member.profile.username}`,
        avatarUrl: member.profile.avatar_url,
        accent: member.profile.accent_color,
        status: (member.profile.status as Presence) ?? "offline",
      });
    }

    // De-duplicate by kind+id — a friend who is also a member shows once.
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = `${item.kind}:${item.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [channels, servers, dmChannels, members, profile.id, server]);

  function openSwitcherItem(item: QuickSwitcherItem) {
    if (item.kind === "dm") {
      void openDm(item.id);
      return;
    }
    if (item.kind === "member") {
      void openProfile(item.id);
      return;
    }
    if (item.kind === "voice") {
      void joinVoice(item.id);
      return;
    }
    // A channel id could be a server id (the "Server" hint above).
    if (servers.some((entry) => entry.id === item.id)) {
      void openServer(item.id);
      return;
    }
    void loadChannel(item.id);
  }

  const activeChannelsForTitle = activeGroup
    ? activeGroup.name ?? defaultGroupName(activeGroup.members, profile.id)
    : activeDm?.peer?.display_name ?? activeDm?.peer?.username ?? null;

  return (
    <div
      className="shell-gradient flex h-dvh w-screen overflow-hidden overflow-x-hidden bg-void"
      data-theme-surface
    >
      <ViewTitle
        view={
          onboardingServerId && onboardingServerId === activeServerId
            ? "onboarding"
            : view === "home"
              ? activeDm || activeGroup
                ? "dm"
                : homeTab === "friends"
                  ? "friends"
                  : homeTab === "store"
                    ? "store"
                    : "discover"
              : "server"
        }
        channelName={view === "home" ? activeChannelsForTitle : activeChannel?.name}
        serverName={view === "home" ? null : server?.name}
        unread={titleUnread}
      />
      <ServerRail
        servers={servers}
        activeServerId={view === "home" ? null : activeServerId}
        onAddServer={() => {
          setFormError(null);
          setDialog("server");
        }}
        onExplore={() => void openExplore()}
        onJoinServer={() => setDialog("join")}
        onSelect={(id) => void openServer(id)}
        onHome={openHome}
        homeUnread={dmChannels.reduce((sum, d) => sum + (d.unread_count ?? 0), 0)}
      />

      {view === "home" ? (
        <>
          <HomeSidebar
            profile={profile}
            dms={dmChannels}
            activeDmId={activeDmId}
            tab={homeTab}
            onChangeTab={(tab) => {
              setHomeTab(tab);
              setActiveDmId(null);
            }}
            onSelectDm={(id) => {
              setActiveGroupId(null);
              setActiveDmId(id);
              const peerId = dmChannels.find((d) => d.id === id)?.peer?.id;
              if (peerId) router.push(`/channels/@me/${peerId}`);
            }}
            groups={groups}
            activeGroupId={activeGroupId}
            onSelectGroup={(id) => void openGroup(id)}
            onOpenNewMessage={() => {
              setNewDmSearch("");
              setDialog("newmessage");
            }}
            status={liveStatus}
            statusExpiresAt={statusExpiresAt}
            onSetStatus={(next, duration) => void setPresence(next, duration)}
            voice={voiceSettings}
            onVoiceChange={patchVoice}
            onOpenVoiceSettings={() => {
              setSettingsSection("voice");
              setSettingsOpen(true);
            }}
            onOpenProfile={() => {
              setEditingProfileId(profile.id);
              setProfileEditorOpen(true);
            }}
            onSwitchAccounts={() => setDialog("accounts")}
            onCopyUserId={() => {
              void navigator.clipboard?.writeText(profile.id).catch(() => undefined);
              flash("User ID copied");
            }}
            muted={muted}
            deafened={deafened}
            onToggleMute={() => {
              const next = !muted;
              setMuted(next);
              if (!next) setDeafened(false);
              previewSound(next ? "mute" : "unmute");
            }}
            onToggleDeafen={() => {
              const next = !deafened;
              setDeafened(next);
              if (next) setMuted(true);
              previewSound(next ? "deafen" : "undeafen");
            }}
            onPreviewSound={previewSound}
            onOpenDm={() => {
              setNewDmSearch("");
              setDialog("newdm");
            }}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenAddFriend={() => {
              setHomeTab("friends");
              setActiveDmId(null);
            }}
            onlineFriends={onlineFriends.length}
            pendingCount={pendingCount}
            filter={homeFilter}
            onFilterChange={setHomeFilter}
          />

          {homeTab === "friends" && !activeDmId && (
            <>
              <FriendsView
                friends={friends}
                incoming={incoming}
                outgoing={outgoing}
                activities={activities}
                onOpenDm={(userId) => void openDm(userId)}
                onAddFriend={(username, note) => addFriend(username, note)}
                onExploreServers={() => {
                  setHomeTab("discover");
                  setActiveDmId(null);
                }}
                onRespond={async (id, accept) => {
                  const ok = await respondToRequest(supabase, id, accept);
                  await loadSocial();
                  if (!ok) {
                    flash("That request couldn't be updated — try again.");
                    return;
                  }
                  flash(accept ? "Friend added" : "Request removed");
                }}
                onRemove={async (userId) => {
                  await removeFriend(supabase, userId);
                  await loadSocial();
                  flash("Friend removed");
                }}
              />
              <ActiveNowPanel entries={activeNow} onOpenDm={(userId) => void openDm(userId)} />
            </>
          )}

          {homeTab === "friends" && activeDm && (
            <DmView
              channel={activeDm}
              messages={dmMessages}
              profile={profile}
              onSend={(content, attachments) => void sendDm(content, attachments)}
              onDelete={(id) => void deleteDm(id)}
              onOpenProfile={(userId) => void openProfile(userId)}
              supabase={supabase}
              onStartCall={() =>
                startDmCall(activeDm?.peer?.display_name ?? activeDm?.peer?.username ?? "your friend")
              }
              muted={Boolean(mutedConversations[activeDm.id])}
              onToggleMute={() =>
                toggleConversationMute(
                  activeDm.id,
                  activeDm?.peer?.display_name ?? activeDm?.peer?.username ?? "conversation",
                )
              }
              onOpenSearch={() => setSwitcherOpen(true)}
              onOpenUserMenu={(anchor) => {
                if (!activeDm?.peer) return;
                setActionTarget({
                  user: {
                    id: activeDm.peer.id,
                    username: activeDm.peer.username,
                    display_name: activeDm.peer.display_name,
                    avatar_url: activeDm.peer.avatar_url,
                  },
                  anchor,
                });
              }}
            />
          )}

          {homeTab === "friends" && activeGroup && (
            <DmView
              channel={
                {
                  id: activeGroup.id,
                  peer: null,
                  created_at: activeGroup.created_at,
                  last_message: activeGroup.last_message ?? null,
                  unread_count: 0,
                } as unknown as DmChannel
              }
              messages={groupMessages}
              profile={profile}
              onSend={(content, attachments) => void sendGroupMsg(content, attachments)}
              onDelete={(id) => setGroupMessages((prev) => prev.filter((m) => m.id !== id))}
              onOpenProfile={(userId) => void openProfile(userId)}
              group={{
                id: activeGroup.id,
                name: activeGroup.name,
                icon_url: activeGroup.icon_url,
                members: activeGroup.members,
                owner_id: activeGroup.owner_id,
              }}
              onInviteToGroup={() => setDialog("newmessage")}
              onEditGroup={() => setDialog("group-icon")}
              supabase={supabase}
              onStartCall={() => startDmCall(activeGroup.name ?? "the group")}
              muted={Boolean(mutedConversations[activeGroup.id])}
              onToggleMute={() =>
                toggleConversationMute(activeGroup.id, activeGroup.name ?? "group")
              }
              onOpenSearch={() => setSwitcherOpen(true)}
            />
          )}

          {homeTab === "store" && <StoreView />}
          {homeTab === "discover" && (
            <DiscoverView
              servers={servers}
              onJoin={(code) => void joinByInvite(code)}
              onOpen={(id) => void openServer(id)}
            />
          )}
        </>
      ) : (
        <>
          {server && (
            <ChannelSidebar
              server={server}
              channels={channels}
              activeChannelId={activeChannelId}
              voiceStates={voiceStates}
              profile={profile}
              canManage={canManage}
              onSelectChannel={(id) => void loadChannel(id)}
              isNewServer={onboardingServerId === server.id}
              showAllChannels={showAllChannels}
              hideMutedChannels={hideMutedChannels}
              onToggleShowAll={setShowAllChannels}
              onToggleHideMuted={setHideMutedChannels}
              onQuickCreate={(category, kind) => {
                setCategoryTarget(category);
                setChannelKind(kind);
                setChannelName("");
                setFormError(null);
                setDialog("channel");
              }}
              // The Information group's `server-guide` row used to be a dead
              // click. Point it at the server header instead of nothing.
              onOpenGuide={() =>
                flash("Server guide: check the header menu for invite, channels and settings.")
              }
              onServerAction={(action) => {
                switch (action) {
                  case "invite":
                    setDialog("invite");
                    break;
                  case "apps":
                    flash("App Directory is coming soon.");
                    break;
                  case "notifications":
                  case "privacy":
                    setSettingsSection("notifications");
                    setSettingsOpen(true);
                    break;
                  case "edit-profile":
                    setEditingProfileId(profile.id);
                    setProfileEditorOpen(true);
                    break;
                  case "leave":
                    void leaveServer();
                    break;
                  case "copy-info":
                    void navigator.clipboard?.writeText(server.id).catch(() => undefined);
                    flash("Server ID copied");
                    break;
                  case "settings":
                    flash("Server Settings open in the admin panel.");
                    break;
                  case "insights":
                    flash("Server Insights is warming up.");
                    break;
                  case "create-channel":
                    setChannelKind("text");
                    setChannelName("");
                    setDialog("channel");
                    break;
                  case "create-category":
                    setCategoryTarget("New Category");
                    setDialog("channel");
                    break;
                  case "create-event":
                    flash("Event creation is coming soon.");
                    break;
                  case "security":
                    flash("Security Actions opened.");
                    break;
                  case "report-raid":
                    flash("Raid reported to trust & safety.");
                    break;
                  default:
                    break;
                }
              }}
              status={liveStatus}
              statusExpiresAt={statusExpiresAt}
              onSetStatus={(next, duration) => void setPresence(next, duration)}
              voice={voiceSettings}
              onVoiceChange={patchVoice}
              onOpenVoiceSettings={() => {
                setSettingsSection("voice");
                setSettingsOpen(true);
              }}
              onOpenProfile={() => {
                setEditingProfileId(profile.id);
                setProfileEditorOpen(true);
              }}
              onSwitchAccounts={() => setDialog("accounts")}
              onCopyUserId={() => {
                void navigator.clipboard?.writeText(profile.id).catch(() => undefined);
                flash("User ID copied");
              }}
              muted={muted}
              deafened={deafened}
              onToggleMute={() => {
                const next = !muted;
                setMuted(next);
                if (!next) setDeafened(false);
                previewSound(next ? "mute" : "unmute");
              }}
              onToggleDeafen={() => {
                const next = !deafened;
                setDeafened(next);
                if (next) setMuted(true);
                previewSound(next ? "deafen" : "undeafen");
              }}
              onPreviewSound={previewSound}
              onSelectVoice={(id) => void joinVoice(id)}
              onOpenSettings={() => setSettingsOpen(true)}
              onJoinVoice={(id) => void joinVoice(id)}
              onLeaveVoice={() => void leaveVoice()}
              onAddChannel={(kind) => {
                setChannelKind(kind);
                setFormError(null);
                setDialog("channel");
              }}
              onCopyInvite={() => void copyInvite()}
            />
          )}

          {server && onboardingServerId === server.id && (
            <OnboardingView
              serverName={server.name}
              initials={initialsFor(server.name)}
              isOwner={canManage}
              template={wizardTemplate}
              onDismiss={() => {
                setOnboardingServerId(null);
                void loadChannel(activeChannelId);
              }}
              onAction={(id) => {
                switch (id) {
                  case "invite":
                    setDialog("invite");
                    break;
                  case "icon":
                    setDialog("server");
                    break;
                  case "message":
                    setOnboardingServerId(null);
                    void loadChannel(activeChannelId);
                    break;
                  case "download":
                    window.open("https://btcomms.gg/download", "_blank", "noopener");
                    break;
                  case "app":
                    flash("Browse apps in the App Directory.");
                    break;
                  case "boost":
                    setSettingsSection("boost");
                    setSettingsOpen(true);
                    break;
                  default:
                    break;
                }
              }}
            />
          )}

          {/*
            A joined voice channel takes over the whole content column: this is
            where the call grid, screen share, soundboard and control bar live.
            The text feed stays mounted for the channel route so switching back
            keeps scroll position.
          */}
          {voiceRoomId && server && (
            <VoiceRoomPanel
              channelName={
                channels.find((c) => c.id === voiceRoomId)?.name ?? "Voice channel"
              }
              occupants={voiceStates.filter((v) => v.channel_id === voiceRoomId)}
              viewerId={profile.id}
              muted={muted}
              deafened={deafened}
              onToggleMute={() => {
                const next = !muted;
                setMuted(next);
                if (!next) setDeafened(false);
                previewSound(next ? "mute" : "unmute");
              }}
              onToggleDeafen={() => {
                const next = !deafened;
                setDeafened(next);
                if (next) setMuted(true);
                previewSound(next ? "deafen" : "undeafen");
              }}
              onLeave={() => void leaveVoice()}
              onOpenSettings={() => {
                setSettingsSection("voice");
                setSettingsOpen(true);
              }}
              onFlash={flash}
              soundboardVolume={voiceSettings.soundboardVolume}
              isPro={Boolean(profile.bt_pro)}
              localScreen={voiceRoom.screenStream}
              screenOwnerId={voiceRoom.screenOwnerId}
              screenHint={voiceRoom.screenHint}
              onStartScreen={async () => {
                const result = await voiceRoom.startScreen();
                if (!result.ok) flash(result.message);
              }}
              onStopScreen={voiceRoom.stopScreen}
              remoteVideo={voiceRoom.remoteVideo}
              cameraOn={Boolean(voiceRoom.cameraStream)}
              onToggleCamera={async () => {
                const result = await voiceRoom.toggleCamera();
                if (!result.ok) flash(result.message);
              }}
              onOpenMembers={() => setShowMembers((v) => !v)}
              openBoardSignal={boardSignal}
            />
          )}

          {activeChannel && server && !voiceRoomId && onboardingServerId !== server.id && (
            <MessageFeed
              key={`${activeServerId}:${activeChannelId}`}
              supabase={supabase}
              server={server}
              channel={activeChannel}
              initialMessages={messages}
              profile={profile}
              memberCount={members.length}
              members={members}
              canManage={canManage}
              onToggleMembers={() => setShowMembers((v) => !v)}
              onOpenMemberList={() => setShowMembers((v) => !v)}
              onOpenSearch={() => setSwitcherOpen(true)}
            />
          )}

          <div className={`${showMembers ? "block" : "hidden"} md:block`}>
            <MemberList
              members={members}
              voiceStates={voiceStates}
              viewerId={profile.id}
              onClose={() => setShowMembers(false)}
              onOpenProfile={(userId) => void openProfile(userId)}
              onOpenUserMenu={(userId, anchor) => {
                const member = members.find((entry) => entry.profile?.id === userId);
                if (!member?.profile) return;
                setActionTarget({
                  user: {
                    id: member.profile.id,
                    username: member.profile.username,
                    display_name: member.profile.display_name,
                    avatar_url: member.profile.avatar_url,
                  },
                  anchor,
                });
              }}
            />
          </div>
        </>
      )}

      {/* Settings */}
      {/* Global search / Quick Switcher (Ctrl+K or the header search box). */}
      <QuickSwitcher
        open={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
        items={switcherItems}
        placeholder={
          server && view === "server"
            ? `Search ${server.name}`
            : `Search ${profile.display_name || profile.username}`
        }
        onOpenItem={openSwitcherItem}
      />

      {actionTarget && (
        <UserActionMenu
          user={actionTarget.user}
          anchor={actionTarget.anchor}
          onClose={() => setActionTarget(null)}
          servers={servers.map((entry) => ({ id: entry.id, name: entry.name }))}
          ignored={Boolean(ignored[actionTarget.user.id])}
          blocked={Boolean(blocked[actionTarget.user.id])}
          onShareProfile={() => {
            const url = `${window.location.origin}/users/${actionTarget.user.id}`;
            void navigator.clipboard
              ?.writeText(url)
              .then(() => flash("Profile link copied"))
              .catch(() => flash(url));
            setActionTarget(null);
          }}
          onShopLook={() => {
            setActionTarget(null);
            flash("Shop This Look opens the outfit store — no items listed yet.");
          }}
          onInviteToServer={(serverId) => {
            const target = servers.find((entry) => entry.id === serverId);
            setActionTarget(null);
            if (!target) return;
            const code = target.invite_code ?? "unknown";
            void navigator.clipboard
              ?.writeText(`${window.location.origin}/channels/@me?invite=${code}`)
              .then(() => flash(`Invite to ${target.name} copied`))
              .catch(() => flash(`Invite code: ${code}`));
          }}
          onIgnore={() => {
            const id = actionTarget.user.id;
            setIgnored((prev) => ({ ...prev, [id]: !prev[id] }));
            flash(ignored[id] ? "User unignored" : "User ignored");
            setActionTarget(null);
          }}
          onBlock={() => {
            const id = actionTarget.user.id;
            setBlocked((prev) => ({ ...prev, [id]: !prev[id] }));
            flash(blocked[id] ? "User unblocked" : "User blocked");
            setActionTarget(null);
          }}
          onReport={() => {
            setActionTarget(null);
            flash("Report submitted — our moderation team will take a look.");
          }}
        />
      )}

      <ShortcutSheet
        open={shortcutSheetOpen}
        onClose={() => setShortcutSheetOpen(false)}
        onOpenSettings={() => openSettingsSection("keybinds")}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        supabase={supabase}
        profile={profile}
        email={initial.email}
        phone={null}
        onProfileSaved={(next) => {
          setProfile(next);
          setStatus(next.status);
          settingsRef.current = (next.user_settings ?? {}) as Record<string, unknown>;
        }}
        pendingRequests={pendingCount}
        initialSection={settingsSection}
        onPreviewSound={previewSound}
        onEditProfile={() => {
          setSettingsOpen(false);
          setEditingProfileId(profile.id);
          setProfileEditorOpen(true);
        }}
        onLogout={() => {
          void supabase.auth.signOut().then(() => router.replace("/login"));
        }}
      />

      {/* Edit Profile studio */}
      <EditProfileModal
        open={profileEditorOpen}
        onClose={() => {
          setProfileEditorOpen(false);
          setProfileNote(null);
        }}
        profile={editingProfileId === profile.id ? profile : (viewedCard ?? profile)}
        servers={servers.map((s) => ({ id: s.id, name: s.name, icon: s.icon }))}
        serverProfiles={serverProfiles}
        saving={profileSaving}
        note={profileNote}
        onUploadAvatar={async (file) => {
          const { url } = await uploadAvatar(supabase, profile.id, file);
          return url;
        }}
        onUploadBanner={async (file) => {
          const { url } = await uploadBanner(supabase, profile.id, file);
          return url;
        }}
        onSave={async (draft: ProfileDraft, nextServerProfiles: Record<string, ServerProfile>) => {
          if (editingProfileId !== profile.id) {
            setProfileNote({ tone: "error", text: "You can only edit your own profile." });
            return;
          }
          setProfileSaving(true);
          const { profile: updated, error } = await saveProfileCard(supabase, profile.id, {
            display_name: draft.display_name.trim() || profile.username,
            bio: draft.bio.trim() || null,
            pronouns: draft.pronouns.trim() || null,
            server_tag: draft.server_tag.trim() || null,
            avatar_url: draft.avatar_url,
            banner_color: draft.banner_color,
            banner_url: draft.banner_url,
            theme_primary: draft.theme_primary,
            theme_secondary: draft.theme_secondary,
            avatar_decoration: draft.avatar_decoration,
            profile_effect: draft.profile_effect,
            name_style: draft.name_style,
            nameplate: draft.nameplate,
            connections: draft.connections,
            widgets: draft.widgets,
            custom_status: draft.custom_status.trim() || null,
            custom_status_emoji: draft.custom_status_emoji.trim() || null,
          });
          setProfileSaving(false);
          if (error) {
            setProfileNote({ tone: "error", text: error });
            return;
          }
          if (updated) {
            setProfile(updated);
            setStatus(updated.status);
          }
          setServerProfiles(nextServerProfiles);
          setProfileNote({ tone: "success", text: "Profile saved." });
          flash("Profile updated");
          setTimeout(() => setProfileEditorOpen(false), 700);
        }}
      />

      {/* Read-only profile card for someone else */}
      <Modal
        open={Boolean(viewedCard) && !profileEditorOpen}
        title={viewedCard ? `${viewedCard.display_name || viewedCard.username}'s profile` : "Profile"}
        description="Click Message to open a DM, or close to carry on."
        onClose={() => setViewedCard(null)}
      >
        {viewedCard && (
          <ProfileCard
            profile={viewedCard}
            memberSince={new Date(viewedCard.created_at).toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            })}
            compact
            actionSlot={
              <div className="mb-1 flex items-center gap-1.5">
                <button
                  onClick={() => {
                    const id = viewedCard.id;
                    setViewedCard(null);
                    void openDm(id);
                  }}
                  className="rounded-md bg-blurple px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-blurple-soft"
                >
                  Message
                </button>
                <button
                  type="button"
                  onClick={(event) =>
                    setActionTarget({
                      user: {
                        id: viewedCard.id,
                        username: viewedCard.username,
                        display_name: viewedCard.display_name,
                        avatar_url: viewedCard.avatar_url,
                      },
                      anchor: event.currentTarget,
                    })
                  }
                  title="More options"
                  aria-label={`More options for ${viewedCard.display_name || viewedCard.username}`}
                  aria-haspopup="menu"
                  className="grid h-8 w-8 place-items-center rounded-md bg-hover/55 text-muted transition hover:bg-hover hover:text-bright"
                >
                  <MoreIcon width={16} height={16} />
                </button>
              </div>
            }
          />
        )}
      </Modal>

      {/* New Message — 1:1 or group DM */}
      <NewMessageModal
        open={dialog === "newmessage"}
        onClose={() => setDialog(null)}
        profile={profile}
        friends={friends.map((f) => f.profile)}
        serverMembers={members.map((m) => m.profile).filter(Boolean) as Profile[]}
        busy={busy}
        onStartDm={(userId) => {
          setDialog(null);
          void openDm(userId);
        }}
        onCreateGroup={(memberIds, name) => void createGroup(memberIds, name)}
      />

      {/* Create Your Server */}
      <CreateServerModal
        open={dialog === "server"}
        onClose={() => setDialog(null)}
        onStart={(template) => startServerWizard(template)}
        onJoinInstead={() => setDialog("join")}
      />

      {/* Two-step creation wizard */}
      <ServerWizardModal
        open={dialog === "wizard"}
        step={wizardStep}
        onClose={() => setDialog(null)}
        onBack={() => {
          if (wizardStep === 2) setWizardStep(1);
          else setDialog("server");
        }}
        onNext={(intent) => {
          setWizardIntent(intent);
          setWizardStep(2);
        }}
        onSkip={() => setWizardStep(2)}
        onFinish={(name, icon) => void createServerFromWizard(name, icon, wizardTemplate)}
        defaultName={serverName}
        template={wizardTemplate}
        busy={busy}
        error={formError}
      />

      {/* Join a Server */}
      <JoinServerModal
        open={dialog === "join"}
        onClose={() => setDialog(null)}
        onJoin={(code) => void joinWithInvite(code)}
        busy={busy}
        error={formError}
        onDiscover={() => {
          setDialog(null);
          void openExplore();
        }}
      />

      {/* Manage Accounts */}
      <ManageAccountsModal
        open={dialog === "accounts"}
        onClose={() => setDialog(null)}
        accounts={accounts}
        onSwitch={(id) => void switchAccount(id)}
        onAddAccount={() => {
          setDialog(null);
          router.push("/login?next=/channels/@me");
        }}
        busy={busy}
      />

      {/* Change group icon */}
      <ChangeIconModal
        open={dialog === "group-icon"}
        onClose={() => setDialog(null)}
        currentIcon={activeGroup?.icon_url ?? null}
        onSave={(iconUrl) => void saveGroupIcon(iconUrl)}
        busy={busy}
      />

      {/* Create channel */}
      <Modal
        open={dialog === "channel"}
        title={`Create a ${channelKind} channel`}
        description={`In ${server?.name ?? "this server"}`}
        onClose={() => setDialog(null)}
        footer={
          <>
            <button onClick={() => setDialog(null)} className="rounded-lg px-3 py-1.5 text-[12.5px] text-muted transition hover:text-bright">
              Cancel
            </button>
            <button
              onClick={() => void createChannel()}
              disabled={busy || !channelName.trim()}
              className="rounded-lg bg-blurple px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-blurple-soft disabled:opacity-50"
            >
              {busy ? "Creating…" : "Create channel"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex gap-1.5">
            {(["text", "voice"] as const).map((kind) => (
              <button
                key={kind}
                onClick={() => setChannelKind(kind)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-[12.5px] font-medium transition ${
                  channelKind === kind
                    ? "border-blurple/60 bg-blurple/15 text-bright"
                    : "border-line bg-input text-muted hover:bg-hover/60"
                }`}
              >
                {kind === "text" ? <HashIcon width={14} height={14} /> : <SpeakerIcon width={14} height={14} />}
                {kind === "text" ? "Text" : "Voice"}
              </button>
            ))}
          </div>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold tracking-widest text-muted uppercase">Channel name</span>
            <input
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              maxLength={40}
              placeholder={channelKind === "text" ? "design-review" : "Design Voice"}
              className="w-full rounded-lg border border-line bg-input px-3 py-2 text-sm text-bright outline-none focus:border-blurple/60"
            />
          </label>
          {channelKind === "text" && (
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold tracking-widest text-muted uppercase">
                Topic <span className="text-dim normal-case">(optional)</span>
              </span>
              <input
                value={channelTopic}
                onChange={(e) => setChannelTopic(e.target.value)}
                maxLength={120}
                placeholder="What is this channel about?"
                className="w-full rounded-lg border border-line bg-input px-3 py-2 text-sm text-bright outline-none focus:border-blurple/60"
              />
            </label>
          )}
          {formError && <p className="text-[12px] text-rose">{formError}</p>}
        </div>
      </Modal>

      {/* Invite */}
      <Modal
        open={dialog === "invite"}
        title={`Invite people to ${server?.name ?? "this server"}`}
        description="Share this link, or join a server with a code."
        onClose={() => setDialog(null)}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-line bg-input px-2.5 py-1.5">
            <code className="min-w-0 flex-1 truncate font-mono text-[12px] text-muted">
              btcomms.gg/invite/{server?.invite_code}
            </code>
            <button
              onClick={() => void copyInvite()}
              className="flex shrink-0 items-center gap-1 rounded-md bg-blurple px-2.5 py-1 text-[11.5px] font-semibold text-white transition hover:bg-blurple-soft"
            >
              {inviteCopied ? <CheckIcon width={12} height={12} /> : <CopyIcon width={12} height={12} />}
              {inviteCopied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-[10px] tracking-widest text-dim uppercase">or</span>
            <span className="h-px flex-1 bg-line" />
          </div>
          <div>
            <span className="mb-1.5 block text-[11px] font-semibold tracking-widest text-muted uppercase">Join with a code</span>
            <div className="flex gap-2">
              <input
                value={joiningCode}
                onChange={(e) => setJoiningCode(e.target.value)}
                placeholder="bt-comms"
                className="w-full rounded-lg border border-line bg-input px-3 py-2 font-mono text-[12.5px] text-bright outline-none focus:border-blurple/60"
              />
              <button
                onClick={() => void joinWithInvite(joiningCode)}
                disabled={busy || !joiningCode.trim()}
                className="shrink-0 rounded-lg border border-line bg-raised px-3 py-2 text-[12px] font-semibold transition hover:bg-hover disabled:opacity-50"
              >
                Join
              </button>
            </div>
            {formError && <p className="mt-1.5 text-[12px] text-rose">{formError}</p>}
          </div>
        </div>
      </Modal>

      {/* Explore */}
      <Modal
        open={dialog === "explore"}
        title="Explore servers"
        description="Public servers you can join right now."
        onClose={() => setDialog(null)}
      >
        <ul className="space-y-2">
          {discover.map((candidate) => {
            const already = servers.some((s) => s.id === candidate.id);
            return (
              <li key={candidate.id} className="flex items-center gap-3 rounded-xl border border-line bg-input/60 p-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-raised text-lg">{candidate.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold">{candidate.name}</p>
                  <p className="truncate text-[11.5px] text-dim">{candidate.description}</p>
                </div>
                <button
                  onClick={() => void joinWithInvite(candidate.invite_code)}
                  disabled={already || busy}
                  className="shrink-0 rounded-lg bg-blurple px-2.5 py-1.5 text-[11.5px] font-semibold text-white transition hover:bg-blurple-soft disabled:bg-raised disabled:text-dim"
                >
                  {already ? "Joined" : "Join"}
                </button>
              </li>
            );
          })}
          {discover.length === 0 && (
            <li className="py-6 text-center text-[12.5px] text-dim">No public servers yet.</li>
          )}
        </ul>
      </Modal>

      {toast && (
        <div
          role="status"
          className="animate-rise fixed bottom-5 left-1/2 z-[80] -translate-x-1/2 rounded-full border border-line bg-raised px-4 py-2 text-[12.5px] font-medium text-bright shadow-2xl shadow-black/60"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ sub views ------------------------------- */

function StoreView() {
  return (
    <section className="flex min-w-0 flex-1 flex-col bg-surface/25">
      <header className="flex h-12 shrink-0 items-center border-b border-line/60 px-4">
        <h2 className="text-[15px] font-bold tracking-tight text-bright">Store</h2>
      </header>
      <div className="scroll-auto flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl">
          <h3 className="text-xl font-bold tracking-tight text-bright">Perks & cosmetics</h3>
          <p className="mt-1 text-[13px] text-muted">
            Everything here is included with BT Pro. Open User Settings → BT Pro to see plans.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ["Animated avatars", "GIF avatars everywhere"],
              ["Custom themes", "Ship your own gradient"],
              ["HD streaming", "1080p60 with stereo"],
              ["Bigger uploads", "100 MB per file"],
            ].map(([title, body]) => (
              <div key={title} className="rounded-xl border border-line bg-raised/60 p-4">
                <p className="text-[13.5px] font-semibold text-bright">{title}</p>
                <p className="mt-0.5 text-[12px] text-muted">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function DiscoverView({
  servers,
  onJoin,
  onOpen,
}: {
  servers: Server[];
  onJoin: (code: string) => void;
  onOpen: (id: string) => void;
}) {
  return (
    <section className="flex min-w-0 flex-1 flex-col bg-surface/25">
      <header className="flex h-12 shrink-0 items-center border-b border-line/60 px-4">
        <h2 className="text-[15px] font-bold tracking-tight text-bright">Discover</h2>
      </header>
      <div className="scroll-auto flex-1 overflow-y-auto p-6">
        <h3 className="text-xl font-bold tracking-tight text-bright">Find your community</h3>
        <p className="mt-1 text-[13px] text-muted">
          From gaming to design, there&apos;s a place for you.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {servers.map((s) => (
            <div key={s.id} className="rounded-xl border border-line bg-raised/60 p-4">
              <div className="flex items-center gap-2.5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-void/60 text-lg">{s.icon}</span>
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-semibold text-bright">{s.name}</p>
                  <p className="truncate text-[11px] text-dim">@{s.invite_code}</p>
                </div>
              </div>
              <p className="mt-2 line-clamp-2 text-[12px] text-muted">{s.description}</p>
              <button
                onClick={() => onOpen(s.id)}
                className="mt-3 w-full rounded-md bg-raised py-1.5 text-[12px] font-semibold text-bright ring-1 ring-line transition hover:bg-hover"
              >
                Open
              </button>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-xl border border-line/70 bg-void/40 p-4">
          <p className="text-[13px] font-semibold text-bright">Have an invite?</p>
          <p className="mt-0.5 text-[12px] text-muted">
            Joining with a link is instant — open it and you&apos;re in.
          </p>
          <button
            onClick={() => onJoin("bt-comms")}
            className="mt-2 rounded-md bg-blurple px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-blurple-soft"
          >
            Join the official BT Comms server
          </button>
        </div>
      </div>
    </section>
  );
}
