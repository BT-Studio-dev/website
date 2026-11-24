"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ProfileCard, type CardProfile } from "@/components/profile/profile-card";
import { WidgetPanel } from "@/components/profile/widget-panel";
import {
  DECORATIONS,
  NAME_STYLES,
  NAMEPLATES,
  PROFILE_EFFECTS,
  CONNECTIONS,
  connectionMeta,
} from "@/lib/profile-cosmetics";
import {
  CheckIcon,
  CloseIcon,
  PencilIcon,
  PlusIcon,
  SparkleIcon,
  TrashIcon,
} from "@/components/icons";
import type {
  ConnectionKind,
  ProfileConnection,
  ProfileWidget,
  WidgetGame,
  WidgetKind,
} from "@/lib/types";

export type ProfileDraft = {
  display_name: string;
  pronouns: string;
  server_tag: string;
  custom_status: string;
  custom_status_emoji: string;
  bio: string;
  avatar_url: string | null;
  banner_color: string;
  banner_url: string | null;
  theme_primary: string;
  theme_secondary: string;
  avatar_decoration: string;
  profile_effect: string;
  name_style: string;
  nameplate: string;
  connections: ProfileConnection[];
  widgets: ProfileWidget[];
};

export type ServerProfile = Partial<
  Pick<
    ProfileDraft,
    | "display_name"
    | "avatar_url"
    | "banner_color"
    | "pronouns"
    | "server_tag"
    | "avatar_decoration"
    | "name_style"
  >
>;

export function draftFromProfile(profile: CardProfile): ProfileDraft {
  return {
    display_name: profile.display_name ?? "",
    pronouns: profile.pronouns ?? "",
    server_tag: profile.server_tag ?? "",
    custom_status: profile.custom_status ?? "",
    custom_status_emoji: profile.custom_status_emoji ?? "",
    bio: profile.bio ?? "",
    avatar_url: profile.avatar_url ?? null,
    banner_color: profile.banner_color ?? profile.accent_color ?? "#7c3aed",
    banner_url: profile.banner_url ?? null,
    theme_primary: profile.theme_primary ?? "#7c3aed",
    theme_secondary: profile.theme_secondary ?? "#0ea5e9",
    avatar_decoration: profile.avatar_decoration ?? "none",
    profile_effect: profile.profile_effect ?? "none",
    name_style: profile.name_style ?? "default",
    nameplate: profile.nameplate ?? "none",
    connections: profile.connections ?? [],
    widgets: profile.widgets ?? [],
  };
}

const BANNER_SWATCHES = [
  "#7c3aed",
  "#2563eb",
  "#0ea5e9",
  "#14b8a6",
  "#22c55e",
  "#eab308",
  "#f97316",
  "#ef4444",
  "#ec4899",
  "#64748b",
];

export function EditProfileModal({
  open,
  onClose,
  profile,
  servers = [],
  serverProfiles = {},
  saving = false,
  note,
  onSave,
  onUploadAvatar,
  onUploadBanner,
}: {
  open: boolean;
  onClose: () => void;
  profile: CardProfile;
  servers?: { id: string; name: string; icon: string }[];
  serverProfiles?: Record<string, ServerProfile>;
  saving?: boolean;
  note?: { tone: "info" | "success" | "error"; text: string } | null;
  onSave: (
    draft: ProfileDraft,
    serverProfiles: Record<string, ServerProfile>,
  ) => void | Promise<void>;
  onUploadAvatar?: (file: File) => Promise<string | null>;
  onUploadBanner?: (file: File) => Promise<string | null>;
}) {
  const initial = useMemo(() => draftFromProfile(profile), [profile]);
  const [draft, setDraft] = useState<ProfileDraft>(initial);
  const [perServer, setPerServer] = useState<Record<string, ServerProfile>>(serverProfiles);
  const [scope, setScope] = useState<string>("main");
  const [proPreview, setProPreview] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState<"avatar" | "banner" | null>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);

  // Reset on open (and when switching identity).
  useEffect(() => {
    if (!open) return;
    setDraft(draftFromProfile(profile));
    setPerServer(serverProfiles);
    setScope("main");
    setStatus(null);
  }, [open, profile, serverProfiles]);

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

  const serverOverride = scope === "main" ? null : (perServer[scope] ?? {});

  /** What the live preview renders: main draft + any per-server override. */
  const preview: CardProfile = useMemo(() => {
    const base: CardProfile = {
      ...profile,
      display_name: draft.display_name || profile.username,
      username: profile.username,
      avatar_url: draft.avatar_url,
      pronouns: draft.pronouns || null,
      server_tag: draft.server_tag || profile.server_tag || null,
      custom_status: draft.custom_status || null,
      custom_status_emoji: draft.custom_status_emoji || null,
      bio: draft.bio || null,
      banner_color: draft.banner_color,
      banner_url: draft.banner_url,
      theme_primary: proPreview ? draft.theme_primary : null,
      theme_secondary: proPreview ? draft.theme_secondary : null,
      avatar_decoration: draft.avatar_decoration,
      profile_effect: draft.profile_effect,
      name_style: draft.name_style,
      nameplate: draft.nameplate,
      connections: draft.connections,
      widgets: draft.widgets,
    };
    if (!serverOverride) return base;
    return { ...base, ...serverOverride };
  }, [draft, profile, proPreview, serverOverride]);

  const dirty = useMemo(
    () =>
      JSON.stringify(draft) !== JSON.stringify(initial) ||
      JSON.stringify(perServer) !== JSON.stringify(serverProfiles),
    [draft, initial, perServer, serverProfiles],
  );

  if (!open) return null;

  function set<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function setServerField(key: keyof ServerProfile, value: string | null) {
    if (scope === "main") return;
    setPerServer((prev) => ({
      ...prev,
      [scope]: { ...(prev[scope] ?? {}), [key]: value },
    }));
  }

  /** gated: PRO-only cosmetics render but need the preview toggle on. */
  function gated(pro: boolean | undefined) {
    return Boolean(pro) && !proPreview;
  }

  async function handleAvatar(file: File) {
    if (!onUploadAvatar) {
      const url = URL.createObjectURL(file);
      set("avatar_url", url);
      return;
    }
    setUploading("avatar");
    const url = await onUploadAvatar(file);
    setUploading(null);
    if (url) {
      set("avatar_url", url);
      setStatus("Avatar uploaded.");
    } else {
      setStatus("Avatar upload failed.");
    }
  }

  async function handleBanner(file: File) {
    if (!onUploadBanner) {
      const url = URL.createObjectURL(file);
      set("banner_url", url);
      return;
    }
    setUploading("banner");
    const url = await onUploadBanner(file);
    setUploading(null);
    if (url) {
      set("banner_url", url);
      setStatus("Banner uploaded.");
    } else {
      setStatus("Banner upload failed.");
    }
  }

  function addWidget(kind: WidgetKind, game: WidgetGame) {
    setDraft((prev) => ({
      ...prev,
      widgets: [...prev.widgets, { id: `w-${game.id}-${Date.now()}`, kind, game }],
    }));
  }

  function removeWidget(id: string) {
    setDraft((prev) => ({ ...prev, widgets: prev.widgets.filter((w) => w.id !== id) }));
  }

  function addConnection(kind: ConnectionKind) {
    const meta = connectionMeta(kind);
    setDraft((prev) => ({
      ...prev,
      connections: [
        ...prev.connections,
        {
          id: `c-${kind}-${Date.now()}`,
          kind,
          handle: "",
          url: meta.urlPrefix,
        },
      ],
    }));
  }

  function updateConnection(id: string, handle: string) {
    setDraft((prev) => ({
      ...prev,
      connections: prev.connections.map((connection) =>
        connection.id === id
          ? {
              ...connection,
              handle,
              url: `${connectionMeta(connection.kind).urlPrefix}${handle.replace(/^@/, "")}`,
            }
          : connection,
      ),
    }));
  }

  function removeConnection(id: string) {
    setDraft((prev) => ({
      ...prev,
      connections: prev.connections.filter((connection) => connection.id !== id),
    }));
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col bg-void/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Edit profile"
    >
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-line/60 px-5 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-blurple to-blurple-soft text-white">
            <PencilIcon width={15} height={15} />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-[16px] font-bold tracking-tight text-bright">Edit Profile</h1>
            <p className="truncate text-[11.5px] text-dim">
              Everything below previews live — nothing saves until you hit Save Changes.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => setProPreview((v) => !v)}
            aria-pressed={proPreview}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-bold tracking-wide uppercase transition ${
              proPreview
                ? "border-amber/60 bg-amber/20 text-amber"
                : "border-line bg-void/60 text-muted hover:text-bright"
            }`}
          >
            <SparkleIcon width={13} height={13} />
            Preview BT Pro
          </button>
          <button
            onClick={onClose}
            aria-label="Close profile editor"
            className="flex items-center gap-1.5 rounded-full border border-line bg-void/60 px-3 py-1.5 text-[11.5px] font-semibold text-muted transition hover:border-rose/50 hover:text-rose"
          >
            <span className="rounded bg-raised px-1.5 py-0.5 font-mono text-[10px]">ESC</span>
            <CloseIcon width={14} height={14} />
          </button>
        </div>
      </header>

      <div className="scroll-auto grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 xl:grid-cols-[300px_minmax(0,1fr)_336px] xl:overflow-hidden">
        {/* ------------------------- left: customization ------------------------ */}
        <div className="scroll-auto min-h-0 space-y-3 xl:overflow-y-auto xl:pr-1">
          {/* Profile switcher */}
          <section className="rounded-xl border border-line/80 bg-elevated/60 p-3">
            <p className="mb-1.5 text-[10.5px] font-semibold tracking-widest text-dim uppercase">
              Profile
            </p>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="w-full appearance-none rounded-lg border border-line bg-void/70 px-2.5 py-2 text-[12.5px] font-medium outline-none focus:border-blurple/60"
            >
              <option value="main">Main Profile</option>
              {servers.map((server) => (
                <option key={server.id} value={server.id}>
                  {server.icon} {server.name}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] leading-relaxed text-dim">
              {scope === "main"
                ? "Applies everywhere you don't have a per-server profile."
                : "Only shown inside this server."}
            </p>
          </section>

          {scope !== "main" ? (
            <section className="space-y-3 rounded-xl border border-line/80 bg-elevated/60 p-3">
              <CardLabel>Per-server overrides</CardLabel>
              <Field label="Nickname">
                <input
                  value={serverOverride?.display_name ?? ""}
                  onChange={(e) => setServerField("display_name", e.target.value)}
                  placeholder={draft.display_name}
                  className="w-full rounded-lg border border-line bg-void/70 px-2.5 py-1.5 text-[12.5px] outline-none focus:border-blurple/60"
                />
              </Field>
              <Field label="Pronouns">
                <input
                  value={serverOverride?.pronouns ?? ""}
                  onChange={(e) => setServerField("pronouns", e.target.value)}
                  placeholder={draft.pronouns || "she/her"}
                  className="w-full rounded-lg border border-line bg-void/70 px-2.5 py-1.5 text-[12.5px] outline-none focus:border-blurple/60"
                />
              </Field>
              <Field label="Server tag">
                <input
                  value={serverOverride?.server_tag ?? ""}
                  onChange={(e) => setServerField("server_tag", e.target.value)}
                  placeholder={draft.server_tag || "BT"}
                  maxLength={6}
                  className="w-full rounded-lg border border-line bg-void/70 px-2.5 py-1.5 text-[12.5px] outline-none focus:border-blurple/60"
                />
              </Field>
              <p className="text-[11px] leading-relaxed text-dim">
                Avatar, banner and decorations stay global.
              </p>
            </section>
          ) : (
            <>
              {/* Identity */}
              <section className="space-y-2.5 rounded-xl border border-line/80 bg-elevated/60 p-3">
                <CardLabel>Identity</CardLabel>
                <Field label="Display name">
                  <input
                    value={draft.display_name}
                    onChange={(e) => set("display_name", e.target.value)}
                    maxLength={40}
                    className="w-full rounded-lg border border-line bg-void/70 px-2.5 py-1.5 text-[12.5px] outline-none focus:border-blurple/60"
                  />
                </Field>
                <div className="grid grid-cols-[1fr_72px] gap-2">
                  <Field label="Pronouns">
                    <input
                      value={draft.pronouns}
                      onChange={(e) => set("pronouns", e.target.value)}
                      placeholder="she/her"
                      maxLength={40}
                      className="w-full rounded-lg border border-line bg-void/70 px-2.5 py-1.5 text-[12.5px] outline-none focus:border-blurple/60"
                    />
                  </Field>
                  <Field label="Tag">
                    <input
                      value={draft.server_tag}
                      onChange={(e) => set("server_tag", e.target.value.toUpperCase())}
                      placeholder="BT"
                      maxLength={6}
                      className="w-full rounded-lg border border-line bg-void/70 px-2.5 py-1.5 text-[12.5px] outline-none focus:border-blurple/60"
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-[1fr_64px] gap-2">
                  <Field label="Custom status">
                    <input
                      value={draft.custom_status}
                      onChange={(e) => set("custom_status", e.target.value)}
                      maxLength={128}
                      placeholder="Building something"
                      className="w-full rounded-lg border border-line bg-void/70 px-2.5 py-1.5 text-[12.5px] outline-none focus:border-blurple/60"
                    />
                  </Field>
                  <Field label="Emoji">
                    <input
                      value={draft.custom_status_emoji}
                      onChange={(e) => set("custom_status_emoji", e.target.value)}
                      maxLength={4}
                      placeholder="🚀"
                      className="w-full rounded-lg border border-line bg-void/70 px-2.5 py-1.5 text-[12.5px] outline-none focus:border-blurple/60"
                    />
                  </Field>
                </div>
              </section>

              {/* Nameplate */}
              <ChipSection
                label="Nameplate"
                options={NAMEPLATES.map((n) => ({
                  id: n.id,
                  label: n.label,
                  style: n.style,
                }))}
                value={draft.nameplate}
                onChange={(id) => set("nameplate", id)}
              />

              {/* Avatar + decoration */}
              <section className="space-y-2.5 rounded-xl border border-line/80 bg-elevated/60 p-3">
                <CardLabel>Avatar & Decoration</CardLabel>
                <div className="flex items-center gap-2.5">
                  <label className="group relative cursor-pointer">
                    <span className="grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-raised text-[10px] text-dim ring-2 ring-line">
                      {draft.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={draft.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        "Upload"
                      )}
                    </span>
                    <input
                      ref={avatarInput}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleAvatar(file);
                      }}
                    />
                  </label>
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => avatarInput.current?.click()}
                      className="rounded-md bg-raised px-2 py-1 text-[11.5px] font-semibold text-bright transition hover:bg-hover"
                    >
                      {uploading === "avatar" ? "Uploading…" : "Upload image"}
                    </button>
                    <p className="mt-1 text-[10.5px] leading-snug text-dim">
                      PNG, JPG or <span className="text-mint">animated GIF</span> · 4 MB
                    </p>
                  </div>
                </div>

                <input
                  value={draft.avatar_url ?? ""}
                  onChange={(e) => set("avatar_url", e.target.value || null)}
                  placeholder="…or paste an image URL"
                  className="w-full rounded-lg border border-line bg-void/70 px-2.5 py-1.5 text-[11.5px] outline-none focus:border-blurple/60"
                />

                <div>
                  <p className="mb-1.5 text-[10.5px] font-semibold tracking-widest text-dim uppercase">
                    Decoration
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {DECORATIONS.map((deco) => {
                      const active = draft.avatar_decoration === deco.id;
                      return (
                        <button
                          key={deco.id}
                          onClick={() => set("avatar_decoration", deco.id)}
                          aria-pressed={active}
                          title={deco.label}
                          className={`grid h-9 w-9 place-items-center rounded-full border transition ${
                            active ? "border-bright" : "border-line/70 hover:border-muted"
                          }`}
                          style={{ background: deco.id === "none" ? "transparent" : deco.ring }}
                        >
                          {deco.id === "none" ? <CloseIcon width={12} height={12} className="text-dim" /> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* Banner */}
              <section className="space-y-2.5 rounded-xl border border-line/80 bg-elevated/60 p-3">
                <CardLabel>Banner</CardLabel>
                <div className="flex flex-wrap gap-1.5">
                  {BANNER_SWATCHES.map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        set("banner_color", color);
                        set("banner_url", null);
                      }}
                      aria-label={`Banner ${color}`}
                      aria-pressed={draft.banner_color === color && !draft.banner_url}
                      className={`h-6 w-6 rounded-md transition ${
                        draft.banner_color === color && !draft.banner_url
                          ? "ring-2 ring-bright ring-offset-2 ring-offset-panel"
                          : "opacity-85 hover:opacity-100"
                      }`}
                      style={{ background: color }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={draft.banner_color}
                    onChange={(e) => set("banner_color", e.target.value)}
                    aria-label="Custom banner colour"
                    className="h-7 w-9 cursor-pointer rounded border border-line bg-transparent"
                  />
                  <span className="font-mono text-[11px] text-muted">
                    {draft.banner_color.toUpperCase()}
                  </span>
                </div>

                <div className="rounded-lg border border-amber/40 bg-amber/10 p-2">
                  <p className="mb-1 flex items-center gap-1 text-[10.5px] font-bold tracking-wide text-amber uppercase">
                    <SparkleIcon width={11} height={11} /> BT Pro
                  </p>
                  <button
                    onClick={() => bannerInput.current?.click()}
                    className="rounded-md bg-raised px-2 py-1 text-[11.5px] font-semibold text-bright transition hover:bg-hover"
                  >
                    {uploading === "banner" ? "Uploading…" : "Upload banner image / GIF"}
                  </button>
                  <input
                    ref={bannerInput}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleBanner(file);
                    }}
                  />
                  {draft.banner_url && (
                    <button
                      onClick={() => set("banner_url", null)}
                      className="ml-1.5 rounded-md bg-rose/15 px-2 py-1 text-[11.5px] font-semibold text-rose transition hover:bg-rose/25"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </section>

              {/* Effects */}
              <ChipSection
                label="Profile Effect & Frame"
                options={PROFILE_EFFECTS.map((e) => ({
                  id: e.id,
                  label: e.label,
                  pro: e.pro,
                  preview: e.overlay,
                }))}
                value={draft.profile_effect}
                onChange={(id) => set("profile_effect", id)}
                gated={gated}
              />

              {/* Name style */}
              <ChipSection
                label="Display Name Style"
                options={NAME_STYLES.map((s) => ({
                  id: s.id,
                  label: s.label,
                  pro: s.pro,
                  textStyle: s.style,
                }))}
                value={draft.name_style}
                onChange={(id) => set("name_style", id)}
                gated={gated}
              />

              {/* Pro theme */}
              <section className="space-y-2 rounded-xl border border-amber/40 bg-amber/[0.07] p-3">
                <p className="flex items-center gap-1.5 text-[10.5px] font-bold tracking-widest text-amber uppercase">
                  <SparkleIcon width={12} height={12} /> Profile Theme
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-1 block text-[10px] tracking-widest text-dim uppercase">Top</span>
                    <input
                      type="color"
                      value={draft.theme_primary}
                      onChange={(e) => set("theme_primary", e.target.value)}
                      className="h-7 w-full cursor-pointer rounded border border-line bg-transparent"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[10px] tracking-widest text-dim uppercase">Bottom</span>
                    <input
                      type="color"
                      value={draft.theme_secondary}
                      onChange={(e) => set("theme_secondary", e.target.value)}
                      className="h-7 w-full cursor-pointer rounded border border-line bg-transparent"
                    />
                  </label>
                </div>
                <div
                  className="h-8 rounded-md"
                  style={{
                    backgroundImage: `linear-gradient(165deg, ${draft.theme_primary}, ${draft.theme_secondary})`,
                  }}
                />
                <p className="text-[10.5px] leading-snug text-amber/80">
                  {proPreview ? "Previewing BT Pro — theme renders on the card." : "Turn on Preview BT Pro to see it."}
                </p>
              </section>
            </>
          )}
        </div>

        {/* --------------------------- center: preview -------------------------- */}
        <div className="scroll-auto min-h-0 xl:overflow-y-auto">
          <div className="mx-auto max-w-[420px]">
            <p className="mb-2 text-center text-[10.5px] font-semibold tracking-widest text-dim uppercase">
              Live preview
            </p>
            <ProfileCard
              profile={preview}
              memberSince={
                profile.created_at
                  ? new Date(profile.created_at).toLocaleDateString(undefined, {
                      month: "long",
                      year: "numeric",
                    })
                  : null
              }
              actionSlot={
                <div className="mb-1 flex gap-1.5">
                  <button className="rounded-md bg-blurple px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-blurple-soft">
                    Message
                  </button>
                  <button className="rounded-md bg-raised px-3 py-1.5 text-[12px] font-semibold text-bright ring-1 ring-line transition hover:bg-hover">
                    Add Friend
                  </button>
                </div>
              }
            />

            {/* Bio editor */}
            <div className="mt-3 rounded-xl border border-line/80 bg-elevated/60 p-3">
              <p className="mb-1.5 text-[10.5px] font-semibold tracking-widest text-dim uppercase">
                About me
              </p>
              <textarea
                value={draft.bio}
                onChange={(e) => set("bio", e.target.value)}
                rows={4}
                maxLength={190}
                placeholder="Tell people what you're into…"
                className="w-full resize-none rounded-lg border border-line bg-void/70 px-2.5 py-2 text-[12.5px] outline-none focus:border-blurple/60"
              />
              <p className="mt-1 text-right text-[10.5px] text-dim">{draft.bio.length}/190</p>
            </div>

            {/* Connections */}
            <div className="mt-3 rounded-xl border border-line/80 bg-elevated/60 p-3">
              <p className="mb-2 text-[10.5px] font-semibold tracking-widest text-dim uppercase">
                Connections
              </p>
              <ul className="space-y-1.5">
                {draft.connections.map((connection) => (
                  <li key={connection.id} className="flex items-center gap-1.5">
                    <span
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[9px] font-bold text-black"
                      style={{ background: connectionMeta(connection.kind).color }}
                    >
                      {connectionMeta(connection.kind).label.slice(0, 2).toUpperCase()}
                    </span>
                    <input
                      value={connection.handle}
                      onChange={(e) => updateConnection(connection.id, e.target.value)}
                      placeholder={connectionMeta(connection.kind).placeholder}
                      className="min-w-0 flex-1 rounded-md border border-line bg-void/70 px-2 py-1 text-[12px] outline-none focus:border-blurple/60"
                    />
                    <button
                      onClick={() => removeConnection(connection.id)}
                      aria-label="Remove connection"
                      className="shrink-0 rounded-md p-1.5 text-dim transition hover:bg-rose/15 hover:text-rose"
                    >
                      <TrashIcon width={12} height={12} />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex flex-wrap gap-1">
                {CONNECTIONS.map((meta) => (
                  <button
                    key={meta.kind}
                    onClick={() => addConnection(meta.kind)}
                    className="flex items-center gap-1 rounded-md border border-line bg-void/60 px-1.5 py-1 text-[10.5px] font-semibold text-muted transition hover:border-blurple/50 hover:text-bright"
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} />
                    {meta.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 flex items-center gap-1 text-[10.5px] text-dim">
                <PlusIcon width={10} height={10} /> Add a connection above
              </p>
            </div>
          </div>
        </div>

        {/* --------------------------- right: widgets --------------------------- */}
        <div className="min-h-0 xl:overflow-hidden">
          <WidgetPanel widgets={draft.widgets} onAdd={addWidget} onRemove={removeWidget} />
        </div>
      </div>

      {/* Save bar */}
      {dirty && (
        <div className="animate-rise flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-line/60 bg-sidebar/95 px-5 py-3 backdrop-blur">
          <p className="text-[12.5px] font-medium text-amber">Careful — you have unsaved changes!</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setDraft(initial);
                setPerServer(serverProfiles);
                setStatus(null);
              }}
              className="rounded-lg px-3 py-1.5 text-[12.5px] font-semibold text-muted transition hover:text-bright"
            >
              Reset
            </button>
            <button
              onClick={() => void onSave(draft, perServer)}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-mint px-4 py-1.5 text-[12.5px] font-bold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              <CheckIcon width={13} height={13} />
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      {(status || note) && (
        <p
          role="status"
          className={`shrink-0 border-t px-5 py-1.5 text-[11.5px] ${
            (note?.tone ?? "info") === "error"
              ? "border-rose/30 bg-rose/10 text-rose"
              : (note?.tone ?? "info") === "success"
                ? "border-mint/30 bg-mint/10 text-mint"
                : "border-line bg-void/60 text-muted"
          }`}
        >
          {note?.text ?? status}
        </p>
      )}
    </div>
  );
}

/* ------------------------------ sub-parts ------------------------------ */

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10.5px] font-semibold tracking-widest text-dim uppercase">{children}</p>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold tracking-widest text-dim uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}

function ChipSection({
  label,
  options,
  value,
  onChange,
  gated,
}: {
  label: string;
  options: {
    id: string;
    label: string;
    pro?: boolean;
    style?: React.CSSProperties;
    textStyle?: React.CSSProperties;
    preview?: string;
  }[];
  value: string;
  onChange: (id: string) => void;
  gated?: (pro: boolean | undefined) => boolean;
}) {
  return (
    <section className="rounded-xl border border-line/80 bg-elevated/60 p-3">
      <p className="mb-1.5 text-[10.5px] font-semibold tracking-widest text-dim uppercase">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const locked = gated?.(option.pro) ?? false;
          const active = value === option.id;
          return (
            <button
              key={option.id}
              onClick={() => onChange(option.id)}
              aria-pressed={active}
              disabled={locked}
              title={locked ? "Enable Preview BT Pro to use this" : option.label}
              className={`relative rounded-lg border px-2 py-1.5 text-[11.5px] font-semibold transition ${
                active
                  ? "border-blurple/70 bg-blurple/15 text-bright"
                  : "border-line bg-void/50 text-muted hover:border-muted/60 hover:text-bright"
              } ${locked ? "cursor-not-allowed opacity-45" : ""}`}
            >
              {option.preview ? (
                <span
                  className="mr-1 inline-block h-3 w-3 rounded-sm align-middle"
                  style={{ background: option.preview }}
                />
              ) : null}
              <span
                style={option.textStyle}
                className={option.textStyle && option.id !== "default" ? "align-middle" : "align-middle"}
              >
                {option.label}
              </span>
              {option.pro && (
                <span className="ml-1 align-middle text-[8.5px] font-bold tracking-wide text-amber uppercase">
                  pro
                </span>
              )}
              {option.style && option.id !== "none" ? (
                <span
                  aria-hidden
                  className="ml-1 inline-block h-2.5 w-2.5 rounded-full align-middle"
                  style={option.style.backgroundImage ? option.style : { background: option.style.background as string }}
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
