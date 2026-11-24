"use client";

import { Avatar } from "@/components/avatar";
import {
  AccessibilityIcon,
  AppsIcon,
  BellIcon,
  BoostIcon,
  CardIcon,
  DataIcon,
  DeviceIcon,
  EyeOffIcon,
  FriendsIcon,
  GiftIcon,
  HeadphonesIcon,
  KeyIcon,
  LogoutIcon,
  PaletteIcon,
  PencilIcon,
  PhoneIcon,
  SearchIcon,
  ShieldIcon,
  SpeakerIcon,
  SparkleIcon,
  UserIcon,
} from "@/components/icons";
import type { Profile } from "@/lib/types";

export type SettingsSectionId =
  | "account"
  | "data"
  | "privacy"
  | "notifications"
  | "bt-pro"
  | "boost"
  | "subscriptions"
  | "gifts"
  | "billing"
  | "appearance"
  | "voice"
  | "accessibility"
  | "apps";

export type NavItem = {
  id: SettingsSectionId;
  label: string;
  icon: React.ReactNode;
  keywords: string[];
  badge?: string;
};

export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "User Settings",
    items: [
      {
        id: "account",
        label: "Account",
        icon: <UserIcon width={16} height={16} />,
        keywords: ["account", "info", "username", "email", "phone", "password", "security", "mfa", "2fa", "devices", "status", "standing", "family", "profile"],
      },
      {
        id: "data",
        label: "Data & Privacy",
        icon: <DataIcon width={16} height={16} />,
        keywords: ["data", "privacy", "analytics", "tracking", "personalization"],
      },
      {
        id: "privacy",
        label: "Messaging Permissions",
        icon: <EyeOffIcon width={16} height={16} />,
        keywords: ["messaging", "permissions", "dms", "direct messages", "filter", "spam", "safe"],
      },
      {
        id: "notifications",
        label: "Notifications",
        icon: <BellIcon width={16} height={16} />,
        keywords: ["notifications", "alerts", "push", "email", "sounds"],
      },
    ],
  },
  {
    title: "Billing",
    items: [
      {
        id: "bt-pro",
        label: "BT Pro",
        icon: <SparkleIcon width={16} height={16} />,
        keywords: ["pro", "nitro", "upgrade", "premium", "plan"],
        badge: "NEW",
      },
      {
        id: "boost",
        label: "Server Boost",
        icon: <BoostIcon width={16} height={16} />,
        keywords: ["boost", "server", "levels", "perks"],
      },
      {
        id: "subscriptions",
        label: "Subscriptions",
        icon: <CardIcon width={16} height={16} />,
        keywords: ["subscriptions", "plans", "renew", "cancel"],
      },
      {
        id: "gifts",
        label: "Gift Inventory",
        icon: <GiftIcon width={16} height={16} />,
        keywords: ["gift", "inventory", "redeem", "code"],
      },
      {
        id: "billing",
        label: "Billing",
        icon: <CardIcon width={16} height={16} />,
        keywords: ["billing", "payment", "card", "invoice", "receipt"],
      },
    ],
  },
  {
    title: "App Settings",
    items: [
      {
        id: "appearance",
        label: "Appearance",
        icon: <PaletteIcon width={16} height={16} />,
        keywords: ["appearance", "theme", "dark", "light", "gradient", "density", "color", "font"],
      },
      {
        id: "accessibility",
        label: "Accessibility",
        icon: <AccessibilityIcon width={16} height={16} />,
        keywords: ["accessibility", "motion", "contrast", "saturation", "font", "scale", "zoom"],
      },
      {
        id: "voice",
        label: "Voice & Video",
        icon: <HeadphonesIcon width={16} height={16} />,
        keywords: ["voice", "video", "microphone", "speaker", "input", "output", "volume", "test"],
      },
      {
        id: "apps",
        label: "Authorized Apps",
        icon: <AppsIcon width={16} height={16} />,
        keywords: ["apps", "games", "authorized", "integrations", "connections"],
      },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export function SettingsNav({
  profile,
  active,
  onSelect,
  query,
  onQueryChange,
  onEditProfiles,
  onLogout,
  pendingRequests,
}: {
  profile: Profile;
  active: SettingsSectionId;
  onSelect: (id: SettingsSectionId) => void;
  query: string;
  onQueryChange: (query: string) => void;
  onEditProfiles: () => void;
  onLogout: () => void;
  pendingRequests: number;
}) {
  const needle = query.trim().toLowerCase();
  const matches = (item: NavItem) =>
    !needle ||
    item.label.toLowerCase().includes(needle) ||
    item.keywords.some((k) => k.includes(needle));

  return (
    <aside className="flex w-[248px] shrink-0 flex-col bg-ink/80">
      {/* Profile card */}
      <div className="shrink-0 border-b border-line/60 p-3">
        <div
          className="relative overflow-hidden rounded-xl border border-line/70 p-3"
          style={{
            background: `linear-gradient(150deg, ${profile.banner_color ?? profile.accent_color}55, var(--c-panel) 70%)`,
          }}
        >
          <div className="flex items-center gap-2.5">
            <Avatar
              name={profile.display_name}
              src={profile.avatar_url}
              accent={profile.accent_color}
              size={40}
              status={profile.status}
            />
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-bold text-bright">
                {profile.display_name}
              </p>
              <p className="truncate text-[11px] text-dim">@{profile.username}</p>
            </div>
          </div>
          <button
            onClick={onEditProfiles}
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-md bg-void/60 py-1.5 text-[12px] font-semibold text-bright ring-1 ring-line/70 transition hover:bg-void/80"
          >
            <PencilIcon width={12} height={12} />
            Edit Profiles
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="shrink-0 px-3 py-2.5">
        <div className="flex items-center gap-1.5 rounded-md bg-void/70 px-2.5 py-1.5 ring-1 ring-line/70 focus-within:ring-blurple/50">
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search"
            aria-label="Search settings"
            className="w-full bg-transparent text-[12.5px] outline-none placeholder:text-dim"
          />
          <SearchIcon width={13} height={13} className="shrink-0 text-dim" />
        </div>
      </div>

      {/* Groups */}
      <nav className="scroll-thin min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter(matches);
          if (items.length === 0) return null;
          return (
            <div key={group.title} className="mb-3">
              <p className="px-2 pb-1 text-[10.5px] font-bold tracking-widest text-dim uppercase">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const isActive = active === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onSelect(item.id)}
                      aria-current={isActive ? "page" : undefined}
                      className={`group flex w-full items-center gap-2.5 rounded-md px-2 py-[7px] text-[13.5px] font-medium transition ${
                        isActive
                          ? "bg-hover text-bright"
                          : "text-muted hover:bg-hover/50 hover:text-bright"
                      }`}
                    >
                      <span className={isActive ? "text-blurple-soft" : "text-dim"}>
                        {item.icon}
                      </span>
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.id === "notifications" && pendingRequests > 0 && (
                        <span className="rounded-full bg-rose px-1.5 text-[10px] font-bold text-white">
                          {pendingRequests}
                        </span>
                      )}
                      {item.badge && (
                        <span className="rounded bg-blurple/25 px-1 text-[9px] font-bold tracking-wide text-blurple-soft uppercase">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {ALL_NAV_ITEMS.every((item) => !matches(item)) && (
          <p className="px-2 py-4 text-[12px] text-dim">No settings match “{query}”.</p>
        )}
      </nav>

      {/* Footer: quick links + log out */}
      <div className="shrink-0 space-y-0.5 border-t border-line/60 px-2 py-2">
        <QuickLink icon={<FriendsIcon width={14} height={14} />} label="Friend requests" badge={pendingRequests} />
        <QuickLink icon={<DeviceIcon width={14} height={14} />} label="Devices" />
        <QuickLink icon={<PhoneIcon width={14} height={14} />} label="Support" />
        <button
          onClick={onLogout}
          className="mt-1 flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-[13px] font-semibold text-rose transition hover:bg-rose/15"
        >
          <LogoutIcon width={15} height={15} />
          Log Out
        </button>
      </div>
    </aside>
  );
}

function QuickLink({
  icon,
  label,
  badge = 0,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[12.5px] text-muted">
      <span className="text-dim">{icon}</span>
      <span className="flex-1">{label}</span>
      {badge > 0 && (
        <span className="rounded-full bg-rose px-1.5 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </div>
  );
}

/* Keep unused icon imports referenced so tree-shaking stays predictable. */
void KeyIcon;
void ShieldIcon;
void SpeakerIcon;
