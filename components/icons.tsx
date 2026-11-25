import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const HashIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18" />
  </svg>
);

export const SpeakerIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M11 5 6 9H3v6h3l5 4V5Z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
  </svg>
);

export const UsersIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20" />
    <circle cx="9" cy="7" r="3.2" />
    <path d="M22 20v-1.5a4 4 0 0 0-3-3.87M16.5 4.2a3.2 3.2 0 0 1 0 5.9" />
  </svg>
);

export const SendIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="m4.5 12 15-7.5-4 15-3.5-6.5-7.5-1Z" />
  </svg>
);

export const PlusIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const SearchIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.6-3.6" />
  </svg>
);

export const SettingsIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="3.1" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.11A1.7 1.7 0 0 0 8.9 19.3a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.7 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.11A1.7 1.7 0 0 0 4.7 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.7a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.11A1.7 1.7 0 0 0 15 4.7a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.3 9v.03A1.7 1.7 0 0 0 20.86 10H21a2 2 0 1 1 0 4h-.11A1.7 1.7 0 0 0 19.4 15Z" />
  </svg>
);

export const MicIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);

export const MicOffIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M9 9v2a3 3 0 0 0 4.2 2.75M15 10.5V6a3 3 0 0 0-5.6-1.5" />
    <path d="M5 11a7 7 0 0 0 10.5 6.1M19 11v.5" />
    <path d="M12 18v3M3 3l18 18" />
  </svg>
);

export const HeadphonesIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
    <rect x="2.5" y="14" width="4" height="6" rx="2" />
    <rect x="17.5" y="14" width="4" height="6" rx="2" />
  </svg>
);

export const LogoutIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5M21 12H9" />
  </svg>
);

export const CompassIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
  </svg>
);

export const CloseIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const CheckIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="m4 12.5 5 5L20 6.5" />
  </svg>
);

export const CopyIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="9" y="9" width="12" height="12" rx="2.5" />
    <path d="M15 5.5A2.5 2.5 0 0 0 12.5 3H5a2 2 0 0 0-2 2v7.5A2.5 2.5 0 0 0 5.5 15" />
  </svg>
);

export const BoltIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z" />
  </svg>
);

export const TrashIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M3.5 6.5h17M9 6.5V4.8A1.8 1.8 0 0 1 10.8 3h2.4A1.8 1.8 0 0 1 15 4.8v1.7" />
    <path d="M5.5 6.5 6.6 19a2 2 0 0 0 2 1.9h6.8a2 2 0 0 0 2-1.9l1.1-12.5" />
  </svg>
);

export const MenuIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const LockIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
    <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
  </svg>
);

export const ChevronIcon = (p: IconProps) => (
  <svg {...base} strokeWidth={2.6} {...p}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

export const HomeIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M3.5 10.6 12 3.8l8.5 6.8" />
    <path d="M5.8 9.5V20h12.4V9.5" />
    <path d="M10 20v-5.2h4V20" />
  </svg>
);

export const FriendsIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="9" cy="8" r="3.4" />
    <path d="M3 20v-1.3A4.2 4.2 0 0 1 7.2 14.5h3.6a4.2 4.2 0 0 1 4.2 4.2V20" />
    <path d="M17.4 6.2a3.4 3.4 0 0 1 0 6.3M18.6 20v-1.3a4.2 4.2 0 0 0-1.6-3.3" />
  </svg>
);

export const StoreIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 8.5 5.6 4h12.8L20 8.5" />
    <path d="M4 8.5h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-11Z" />
    <path d="M9.5 13.5h5" />
  </svg>
);

export const SparkleIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9 12 3.5Z" />
    <path d="M18.5 16.5 19.2 19l2.5.7-2.5.7-.7 2.5" />
  </svg>
);

export const MessageBubbleIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M20.5 11.4c0 4.1-3.8 7.4-8.5 7.4a9.8 9.8 0 0 1-2.9-.4L4 20l1.3-3.8A6.9 6.9 0 0 1 3.5 11.4C3.5 7.3 7.3 4 12 4s8.5 3.3 8.5 7.4Z" />
  </svg>
);

export const MoreIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
  </svg>
);

export const CheckCircleIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12.3 2.7 2.7L16 9.6" />
  </svg>
);

export const XCircleIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m9 9 6 6M15 9l-6 6" />
  </svg>
);

export const MoonIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M20 13.5A8.2 8.2 0 0 1 10.5 4a8.5 8.5 0 1 0 9.5 9.5Z" />
  </svg>
);

export const SunIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.6v2M12 19.4v2M2.6 12h2M19.4 12h2M5.4 5.4l1.4 1.4M17.2 17.2l1.4 1.4M18.6 5.4l-1.4 1.4M6.8 17.2l-1.4 1.4" />
  </svg>
);

export const KeyIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="8" cy="15" r="4.2" />
    <path d="m11 12 8.5-8.5M17 5l2.5 2.5M14.5 7.5 17 10" />
  </svg>
);

export const ShieldIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 3.2 5 6v6c0 4.2 3 7.6 7 8.8 4-1.2 7-4.6 7-8.8V6l-7-2.8Z" />
    <path d="m9 12 2.2 2.2L15.5 10" />
  </svg>
);

export const DeviceIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="2.5" y="5" width="13" height="9.5" rx="1.6" />
    <path d="M6 18.5h6" />
    <rect x="17" y="9" width="4.5" height="9.5" rx="1.4" />
  </svg>
);

export const BellIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 4 1.5 5.5 1.5 5.5H5s1.5-1.5 1.5-5.5Z" />
    <path d="M10 18.5a2 2 0 0 0 4 0" />
  </svg>
);

export const PaletteIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.8-.9 1.8-1.9 0-1.4 1-1.9 2-1.9h1.3a3.4 3.4 0 0 0 3.4-3.4A8.4 8.4 0 0 0 12 3.5Z" />
    <circle cx="8" cy="10" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="7.6" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="15.8" cy="10" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);

export const AccessibilityIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="4.8" r="1.9" />
    <path d="M5 8.4h14M12 8.4V14M12 14l-2.6 6M12 14l2.6 6" />
  </svg>
);

export const CardIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="2.5" y="5.5" width="19" height="13" rx="2.4" />
    <path d="M2.5 10h19M6 14.5h3" />
  </svg>
);

export const GiftIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="3.5" y="9" width="17" height="11" rx="1.8" />
    <path d="M3.5 9h17M12 9v11" />
    <path d="M12 9S10.8 4.5 8.5 4.5a2.4 2.4 0 0 0 0 4.5H12ZM12 9s1.2-4.5 3.5-4.5a2.4 2.4 0 0 1 0 4.5H12Z" />
  </svg>
);

export const BoostIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 3 6 11h4l-1 10 7-12h-4l0-6Z" />
  </svg>
);

export const EyeIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="2.9" />
  </svg>
);

export const EyeOffIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M9.6 5.9A9.6 9.6 0 0 1 12 5.8c6 0 9.5 6.2 9.5 6.2a17 17 0 0 1-3 3.9M6.4 7.6A16.5 16.5 0 0 0 2.5 12S6 18.2 12 18.2a9.5 9.5 0 0 0 3.6-.7" />
    <path d="M3 3l18 18M10.2 10.3a2.6 2.6 0 0 0 3.5 3.5" />
  </svg>
);

export const PencilIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 20h4L20 8a2.8 2.8 0 0 0-4-4L4 16v4Z" />
    <path d="m14.5 5.5 4 4" />
  </svg>
);

export const PhoneIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M7 3.5h3l1.5 4-2 1.5a11 11 0 0 0 5.5 5.5l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 5 5.7 2 2 0 0 1 7 3.5Z" />
  </svg>
);

export const AppsIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
  </svg>
);

export const DataIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <ellipse cx="12" cy="6" rx="7.5" ry="3" />
    <path d="M4.5 6v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6" />
    <path d="M4.5 12v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6" />
  </svg>
);

export const UserIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M4.8 20.2v-1.2a4.6 4.6 0 0 1 4.6-4.6h5.2a4.6 4.6 0 0 1 4.6 4.6v1.2" />
  </svg>
);

/* ----------------------- Phase 4 additions ----------------------- */

export const ChevronDownIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const DownloadIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M4 20h16" />
  </svg>
);

export const CrownIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M3 7l4 4 5-7 5 7 4-4-2 12H5L3 7Z" />
  </svg>
);

export const GifIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="M10 10H8.5A1.5 1.5 0 0 0 7 11.5v1A1.5 1.5 0 0 0 8.5 14H10v-1.4H8.8" />
    <path d="M13 10v4m0-4h2m-2 2h1.6M18 10v4m0-4h1.6" />
  </svg>
);

export const StickerIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M21 12a9 9 0 1 0-9 9c4 0 7-2.4 9-9Z" />
    <path d="M12 21c0-4 2-9 9-9" />
    <circle cx="9" cy="10" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="15" cy="10" r="0.9" fill="currentColor" stroke="none" />
  </svg>
);

export const EmojiIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 14.5a4.2 4.2 0 0 0 7 0" />
    <circle cx="9" cy="9.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="9.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export const AtIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M16 8v5a2.5 2.5 0 0 0 5 0v-1a9 9 0 1 0-4 7.5" />
  </svg>
);

export const SlashIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <path d="m14.5 7.5-5 9" />
  </svg>
);

export const VolumeIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" />
    <path d="M15.5 9a4 4 0 0 1 0 6" />
    <path d="M18 6.5a7.5 7.5 0 0 1 0 11" />
  </svg>
);

export const CameraIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="3" y="6" width="12" height="12" rx="2.5" />
    <path d="m15 11 6-3v8l-6-3" />
  </svg>
);

export const UploadIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 20V8m0 0 4.5 4.5M12 8 7.5 12.5M4 4h16" />
  </svg>
);

export const RadiusIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 20V9a5 5 0 0 1 5-5h11" />
    <circle cx="4" cy="20" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export const GiftBoxIcon = GiftIcon;

export const StatusOnlineIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="8" fill="currentColor" stroke="none" />
  </svg>
);

export const StatusIdleIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <circle cx="12" cy="12" r="8" fill="currentColor" />
    <circle cx="8.5" cy="8.5" r="6.2" fill="var(--status-cut, #111214)" />
  </svg>
);

export const StatusDndIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <circle cx="12" cy="12" r="8" fill="currentColor" />
    <rect x="7.5" y="10.8" width="9" height="2.4" rx="1.2" fill="var(--status-cut, #111214)" />
  </svg>
);

export const StatusOfflineIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <circle cx="12" cy="12" r="7.2" stroke="currentColor" strokeWidth="2.4" fill="none" />
  </svg>
);

/* ----------------------- Attachments (v5) ----------------------- */

export const ImageIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
    <circle cx="8.5" cy="9.5" r="1.6" />
    <path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5" />
  </svg>
);

export const FileIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M14 3H7.5A2.5 2.5 0 0 0 5 5.5v13A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V8l-5-5Z" />
    <path d="M14 3v5h5" />
  </svg>
);

export const ThreadIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 5.5h16M4 11h10M4 16.5h7" />
    <path d="M19.5 12.5v5a1.5 1.5 0 0 1-1.5 1.5h-3.5L11 22v-3H9" />
  </svg>
);

export const UploadCloudIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M6.5 18.5A4.5 4.5 0 0 1 6 9.6a5.6 5.6 0 0 1 10.9-1.4A4.2 4.2 0 0 1 18 18.5" />
    <path d="M12 21v-8m0 0-3 3m3-3 3 3" />
  </svg>
);

/* --------------------- Settings: keybinds, language (v6) --------------------- */

export const KeybindIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
    <path d="M6 10h.01M9.5 10h.01M13 10h.01M16.5 10h.01M7.5 14h9" />
  </svg>
);

export const GlobeIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3.5 9h17M3.5 15h17" />
    <path d="M12 3c2.4 2.4 3.6 5.4 3.6 9s-1.2 6.6-3.6 9c-2.4-2.4-3.6-5.4-3.6-9S9.6 5.4 12 3Z" />
  </svg>
);

export const ClockIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);
