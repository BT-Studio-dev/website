"use client";

import { useRef, useState } from "react";
import {
  MenuCheckbox,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  Popover,
} from "@/components/ui/popover";
import {
  BellIcon,
  BoostIcon,
  ChevronDownIcon,
  CopyIcon,
  DeviceIcon,
  EyeIcon,
  HashIcon,
  KeyIcon,
  LogoutIcon,
  PencilIcon,
  PlusIcon,
  ShieldIcon,
  SparkleIcon,
  TrashIcon,
  UsersIcon,
} from "@/components/icons";

export type ServerMenuAction =
  | "boost"
  | "invite"
  | "apps"
  | "notifications"
  | "privacy"
  | "edit-profile"
  | "leave"
  | "copy-info"
  | "settings"
  | "insights"
  | "create-channel"
  | "create-category"
  | "create-event"
  | "security"
  | "report-raid";

/**
 * Server header dropdown.
 *
 * Owners/admins additionally get the admin block (Server Settings, Insights,
 * Create Channel / Category / Event, Security Actions, Report Raid).
 */
export function ServerMenu({
  serverName,
  canManage,
  showAllChannels,
  hideMutedChannels,
  onToggleAll,
  onToggleMuted,
  onAction,
}: {
  serverName: string;
  canManage: boolean;
  showAllChannels: boolean;
  hideMutedChannels: boolean;
  onToggleAll: (next: boolean) => void;
  onToggleMuted: (next: boolean) => void;
  onAction: (action: ServerMenuAction) => void;
}) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  function go(action: ServerMenuAction) {
    setOpen(false);
    onAction(action);
  }

  return (
    <>
      <button
        ref={anchorRef}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={`${serverName} — server menu`}
        className="group flex min-w-0 flex-1 items-center justify-between gap-1 rounded-md px-1 py-1 text-left transition hover:bg-hover/60"
      >
        <span className="min-w-0 flex-1 truncate text-[14px] font-semibold tracking-tight text-bright">
          {serverName}
        </span>
        <ChevronDownIcon
          width={13}
          height={13}
          className={`shrink-0 text-muted transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      <Popover open={open} onClose={() => setOpen(false)} anchor={anchorRef.current} width={252} side="bottom">
        <MenuItem icon={<BoostIcon width={14} height={14} />} onSelect={() => go("boost")}>
          Server Boost
        </MenuItem>

        <MenuItem
          icon={<PlusIcon width={14} height={14} />}
          onSelect={() => go("invite")}
          submenu={
            <>
              <MenuItem nested onSelect={() => go("invite")}>
                Invite to Server
              </MenuItem>
              <MenuItem nested onSelect={() => go("apps")}>
                App Directory
              </MenuItem>
            </>
          }
        >
          Invite to Server
        </MenuItem>

        <MenuSeparator />
        <MenuCheckbox checked={showAllChannels} onChange={onToggleAll}>
          Show All Channels
        </MenuCheckbox>
        <MenuCheckbox checked={hideMutedChannels} onChange={onToggleMuted}>
          Hide Muted Channels
        </MenuCheckbox>

        <MenuSeparator />
        <MenuItem icon={<BellIcon width={14} height={14} />} onSelect={() => go("notifications")}>
          Notification Settings
        </MenuItem>
        <MenuItem icon={<ShieldIcon width={14} height={14} />} onSelect={() => go("privacy")}>
          Privacy Settings
        </MenuItem>
        <MenuItem icon={<PencilIcon width={14} height={14} />} onSelect={() => go("edit-profile")}>
          Edit Per-server Profile
        </MenuItem>

        <MenuSeparator />
        <MenuItem
          icon={<CopyIcon width={14} height={14} />}
          onSelect={() => go("copy-info")}
          submenu={
            <>
              <MenuItem nested onSelect={() => go("copy-info")}>
                Copy Server ID
              </MenuItem>
              <MenuItem nested onSelect={() => go("invite")}>
                Copy Invite Link
              </MenuItem>
            </>
          }
        >
          Copy Server Info
        </MenuItem>

        {canManage && (
          <>
            <MenuSeparator />
            <MenuLabel>Admin</MenuLabel>
            <MenuItem icon={<HashIcon width={14} height={14} />} onSelect={() => go("settings")}>
              Server Settings
            </MenuItem>
            <MenuItem icon={<EyeIcon width={14} height={14} />} onSelect={() => go("insights")}>
              Server Insights
            </MenuItem>
            <MenuItem icon={<PlusIcon width={14} height={14} />} onSelect={() => go("create-channel")}>
              Create Channel
            </MenuItem>
            <MenuItem icon={<MenuIconish />} onSelect={() => go("create-category")}>
              Create Category
            </MenuItem>
            <MenuItem icon={<SparkleIcon width={14} height={14} />} onSelect={() => go("create-event")}>
              Create Event
            </MenuItem>
            <MenuSeparator />
            <MenuItem icon={<KeyIcon width={14} height={14} />} onSelect={() => go("security")}>
              Security Actions
            </MenuItem>
            <MenuItem icon={<DeviceIcon width={14} height={14} />} onSelect={() => go("report-raid")}>
              Report Raid
            </MenuItem>
          </>
        )}

        <MenuSeparator />
        <MenuItem
          tone="danger"
          icon={<LogoutIcon width={14} height={14} />}
          onSelect={() => go("leave")}
        >
          Leave Server
        </MenuItem>
      </Popover>
    </>
  );
}

function MenuIconish() {
  return <UsersIcon width={14} height={14} />;
}

export { TrashIcon };
