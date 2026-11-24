"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * A single floating menu surface.
 *
 * Every dropdown in the app (server header, voice devices, user quick-action,
 * status duration) is built from these pieces so the glass styling, entrance
 * animation, outside-click dismissal and keyboard handling stay identical.
 */

export function Popover({
  open,
  onClose,
  anchor,
  children,
  width = 240,
  align = "start",
  side = "auto",
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  /** Element the menu positions itself against. */
  anchor: HTMLElement | null;
  children: React.ReactNode;
  width?: number;
  align?: "start" | "end" | "center";
  side?: "auto" | "top" | "bottom" | "right";
  labelledBy?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchor) return;
    const place = () => {
      const box = anchor.getBoundingClientRect();
      const panel = panelRef.current;
      const height = panel?.offsetHeight ?? 240;
      const vh = window.innerHeight;
      const vw = window.innerWidth;

      let top: number;
      if (side === "top") top = box.top - height - 8;
      else if (side === "right") top = box.top + box.height / 2 - height / 2;
      else if (side === "bottom") top = box.bottom + 8;
      else {
        // auto: prefer above when there isn't room below (voice + user panels
        // live at the bottom of the screen).
        top = box.bottom + 8;
        if (top + height > vh - 8) top = Math.max(8, box.top - height - 8);
      }

      let left: number;
      if (align === "end" || side === "right") left = box.right - width;
      else if (align === "center") left = box.left + box.width / 2 - width / 2;
      else left = box.left;

      left = Math.min(Math.max(8, left), Math.max(8, vw - width - 8));
      top = Math.min(Math.max(8, top), Math.max(8, vh - height - 8));
      setPos({ top, left });
    };

    place();
    const raf = requestAnimationFrame(place);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchor, width, align, side]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (anchor?.contains(target)) return;
      onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, anchor, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={panelRef}
      role="menu"
      aria-labelledby={labelledBy}
      style={{
        position: "fixed",
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        width,
        opacity: pos ? 1 : 0,
      }}
      className="animate-rise z-[90] overflow-hidden rounded-lg border border-white/10 bg-[color-mix(in_oklab,var(--c-void)_92%,transparent)] py-1.5 shadow-2xl shadow-black/60 backdrop-blur-2xl"
    >
      {children}
    </div>,
    document.body,
  );
}

export function MenuItem({
  children,
  onSelect,
  tone = "default",
  shortcut,
  submenu,
  icon,
  disabled,
  nested = false,
}: {
  children: React.ReactNode;
  onSelect?: () => void;
  tone?: "default" | "danger" | "accent";
  shortcut?: string;
  /** Renders a chevron and reveals this content on hover / focus. */
  submenu?: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  nested?: boolean;
}) {
  const [openSub, setOpenSub] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toneClass =
    tone === "danger"
      ? "text-rose hover:bg-rose hover:text-white"
      : tone === "accent"
        ? "text-blurple-soft hover:bg-blurple hover:text-white"
        : "text-muted hover:bg-blurple hover:text-white";

  function enter() {
    if (!submenu) return;
    if (timer.current) clearTimeout(timer.current);
    setOpenSub(true);
  }
  function leave() {
    if (!submenu) return;
    timer.current = setTimeout(() => setOpenSub(false), 130);
  }

  return (
    <div className="relative" onMouseEnter={enter} onMouseLeave={leave}>
      <button
        type="button"
        role="menuitem"
        disabled={disabled}
        aria-haspopup={submenu ? "menu" : undefined}
        aria-expanded={submenu ? openSub : undefined}
        onClick={() => {
          if (submenu) {
            setOpenSub((v) => !v);
            return;
          }
          onSelect?.();
        }}
        className={`flex w-full items-center gap-2 px-2.5 py-[7px] text-left text-[13px] font-medium transition disabled:opacity-40 ${toneClass} ${
          nested ? "pl-4" : ""
        }`}
      >
        {icon && <span className="grid h-4 w-4 shrink-0 place-items-center opacity-90">{icon}</span>}
        <span className="min-w-0 flex-1 truncate">{children}</span>
        {shortcut && (
          <span className="shrink-0 text-[11px] tracking-wide opacity-70">{shortcut}</span>
        )}
        {submenu && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="shrink-0 opacity-80">
            <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </button>

      {submenu && openSub && (
        <div
          role="menu"
          className="animate-rise absolute top-[-6px] left-full z-10 ml-1 w-[210px] rounded-lg border border-white/10 bg-[color-mix(in_oklab,var(--c-void)_94%,transparent)] py-1.5 shadow-2xl shadow-black/60 backdrop-blur-2xl"
        >
          {submenu}
        </div>
      )}
    </div>
  );
}

export function MenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2.5 pt-1.5 pb-1 text-[10.5px] font-bold tracking-[0.14em] text-dim/90 uppercase">
      {children}
    </p>
  );
}

export function MenuSeparator() {
  return <div className="my-1 h-px bg-white/8" />;
}

export function MenuCheckbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={checked}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className="flex w-full items-center gap-2 px-2.5 py-[7px] text-left text-[13px] font-medium text-muted transition hover:bg-blurple hover:text-white"
    >
      <span
        className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded-[3px] border transition ${
          checked ? "border-white bg-white text-[var(--c-void)]" : "border-white/45"
        }`}
      >
        {checked && (
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
            <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" />
          </svg>
        )}
      </span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </button>
  );
}
