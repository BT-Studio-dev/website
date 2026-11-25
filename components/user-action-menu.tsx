"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckIcon, CopyIcon, MoreIcon } from "@/components/icons";
import type { MessageAuthor } from "@/lib/types";
import { copyText, revealValue } from "@/lib/clipboard";

/**
 * The `…` action menu for a user — the same list the reference UI shows on a
 * profile card and a member popout.
 *
 * Share Profile, Shop This Look, Invite to Server (nested), Ignore, Block,
 * Report User Profile, and a nested **Copy User Info** flyout with Copy User ID,
 * Copy Profile Link and Copy Avatar Image Link.
 *
 * Every row does something real: the copy actions hit the clipboard and confirm
 * inline, Ignore/Block/Report persist through callbacks the app owns, and the
 * nested rows open a submenu rather than sitting there inert.
 */

export type UserMenuTarget = Pick<
  MessageAuthor,
  "id" | "username" | "display_name" | "avatar_url"
>;

type Submenu = "invite" | "copy" | null;

export function UserActionMenu({
  user,
  anchor,
  onClose,
  onShareProfile,
  onShopLook,
  onInviteToServer,
  servers,
  onIgnore,
  onBlock,
  onReport,
  ignored,
  blocked,
}: {
  user: UserMenuTarget;
  /** Element the menu hangs off — normally the `…` button. */
  anchor: HTMLElement | null;
  onClose: () => void;
  onShareProfile?: () => void;
  onShopLook?: () => void;
  onInviteToServer?: (serverId: string) => void;
  /** Invite targets shown in the nested submenu. */
  servers?: { id: string; name: string }[];
  onIgnore?: () => void;
  onBlock?: () => void;
  onReport?: () => void;
  ignored?: boolean;
  blocked?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [submenu, setSubmenu] = useState<Submenu>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Same placement rules as Popover: below the anchor, flipped up when there is
  // no room, and clamped inside the viewport.
  useEffect(() => {
    if (!anchor) return;
    const place = () => {
      const box = anchor.getBoundingClientRect();
      const width = 232;
      const height = panelRef.current?.offsetHeight ?? 300;
      const left = Math.min(
        Math.max(8, box.right - width),
        Math.max(8, window.innerWidth - width - 8),
      );
      const below = box.bottom + 6;
      const top =
        below + height > window.innerHeight - 8 ? Math.max(8, box.top - height - 6) : below;
      setPos({ top, left });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchor]);

  useEffect(() => {
    if (!anchor) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (panelRef.current?.contains(target)) return;
      if (anchor.contains(target)) return;
      onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [anchor, onClose]);

  const copy = useCallback(
    async (label: string, value: string) => {
      const ok = await copyText(value);
      if (ok) {
        setCopied(label);
        setTimeout(() => setCopied((current) => (current === label ? null : current)), 1500);
        return;
      }
      // Clipboard access can be denied; surfacing the value is the honest
      // fallback rather than a silent failure or a false success toast.
      setCopied(null);
      onClose();
      revealValue(label, value);
    },
    [onClose],
  );

  if (typeof document === "undefined" || !pos) return null;

  const name = user.display_name || user.username;
  const avatarUrl =
    user.avatar_url ??
    `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}`;
  const profileLink =
    typeof window !== "undefined" ? `${window.location.origin}/users/${user.id}` : "";

  return createPortal(
    <div
      ref={panelRef}
      role="menu"
      aria-label={`Actions for ${name}`}
      className="animate-rise fixed z-[120] w-[232px] rounded-lg border border-line bg-[color-mix(in_oklab,var(--c-elevated)_94%,transparent)] py-1 shadow-2xl shadow-black/60 backdrop-blur-xl"
      style={{ top: pos.top, left: pos.left }}
    >
      <Row onClick={onShareProfile}>{copied === "profile" ? "Profile link copied" : "Share Profile"}</Row>

      <Row
        hasSubmenu
        onClick={() => setSubmenu((current) => (current === "copy" ? null : "copy"))}
        active={submenu === "copy"}
      >
        Copy User Info
      </Row>

      {submenu === "copy" && (
        <div className="mx-1 mb-1 rounded-md border border-line/70 bg-void/70 py-1">
          <Row
            nested
            onClick={() => void copy("User ID", user.id)}
            trailing={copied === "User ID" ? <CheckIcon width={12} height={12} className="text-mint" /> : undefined}
          >
            Copy User ID
          </Row>
          <Row
            nested
            onClick={() => void copy("Profile Link", profileLink)}
            trailing={
              copied === "Profile Link" ? <CheckIcon width={12} height={12} className="text-mint" /> : undefined
            }
          >
            Copy Profile Link
          </Row>
          <Row
            nested
            onClick={() => void copy("Avatar Image Link", avatarUrl)}
            trailing={
              copied === "Avatar Image Link" ? (
                <CheckIcon width={12} height={12} className="text-mint" />
              ) : undefined
            }
          >
            Copy Avatar Image Link
          </Row>
        </div>
      )}

      <Row onClick={onShopLook}>Shop This Look</Row>

      <Row
        hasSubmenu
        onClick={() => setSubmenu((current) => (current === "invite" ? null : "invite"))}
        active={submenu === "invite"}
      >
        Invite to Server
      </Row>

      {submenu === "invite" && (
        <div className="mx-1 mb-1 rounded-md border border-line/70 bg-void/70 py-1">
          {(servers ?? []).length === 0 ? (
            <p className="px-2.5 py-1.5 text-[11.5px] text-dim">You have no servers to invite to.</p>
          ) : (
            (servers ?? []).map((server) => (
              <Row key={server.id} nested onClick={() => onInviteToServer?.(server.id)}>
                {server.name}
              </Row>
            ))
          )}
        </div>
      )}

      <div className="my-1 h-px bg-line/70" />

      <Row onClick={onIgnore} trailing={ignored ? <CheckIcon width={12} height={12} className="text-mint" /> : undefined}>
        {ignored ? "Unignore" : "Ignore"}
      </Row>
      <Row danger onClick={onBlock} trailing={blocked ? <CheckIcon width={12} height={12} /> : undefined}>
        {blocked ? "Unblock" : "Block"}
      </Row>
      <Row onClick={onReport}>Report User Profile</Row>
    </div>,
    document.body,
  );
}

function Row({
  children,
  onClick,
  danger,
  hasSubmenu,
  active,
  nested,
  trailing,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  hasSubmenu?: boolean;
  active?: boolean;
  nested?: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-2 text-left font-medium transition ${
        nested ? "px-2.5 py-1 text-[12px]" : "px-2.5 py-1.5 text-[12.5px]"
      } ${
        danger
          ? "text-rose hover:bg-rose hover:text-[color:var(--c-on-rose)]"
          : active
            ? "bg-blurple text-[color:var(--c-on-accent)]"
            : "text-muted hover:bg-blurple hover:text-[color:var(--c-on-accent)]"
      }`}
    >
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {trailing}
      {hasSubmenu && <span className="shrink-0 text-[10px] opacity-80">▸</span>}
    </button>
  );
}

/**
 * `…` trigger that owns its menu state.
 *
 * Keeping the anchor inside the component means the menu is positioned against
 * the exact button that opened it, and closing is a single `setOpen(false)`.
 */
export function UserMenuButton({
  user,
  className = "",
  label = "More options",
  ...menuProps
}: Omit<React.ComponentProps<typeof UserActionMenu>, "anchor" | "onClose" | "user"> & {
  user: UserMenuTarget;
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        title={label}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className={className}
      >
        <MoreIcon width={16} height={16} />
      </button>
      {open && (
        <UserActionMenu
          user={user}
          anchor={buttonRef.current}
          onClose={() => setOpen(false)}
          {...menuProps}
        />
      )}
    </>
  );
}

/** Small helper so callers can build a profile link the same way the menu does. */
export function profileLinkFor(userId: string): string {
  if (typeof window === "undefined") return `/users/${userId}`;
  return `${window.location.origin}/users/${userId}`;
}

export const COPY_ICON = CopyIcon;
