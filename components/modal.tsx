"use client";

import { useEffect, useRef } from "react";
import { CloseIcon } from "@/components/icons";

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  size = "md",
  tone = "default",
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  /** `brand` gives the multi-step server modals their illustrated header. */
  tone?: "default" | "brand";
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("input,textarea,button")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        aria-label="Close dialog"
        onClick={onClose}
        className="animate-fade absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        className={`animate-rise relative flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-2xl border border-line shadow-2xl shadow-black/60 ${
          size === "sm"
            ? "max-w-sm bg-panel"
            : size === "lg"
              ? "max-w-lg bg-panel"
              : size === "xl"
                ? "max-w-2xl bg-panel"
                : "max-w-md bg-panel"
        } ${tone === "brand" ? "border-white/12 bg-[color-mix(in_oklab,var(--c-panel)_92%,transparent)] backdrop-blur-2xl" : ""}`}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-line/70 px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight text-bright">{title}</h2>
            {description && <p className="mt-0.5 text-[12px] text-muted">{description}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted transition hover:bg-hover hover:text-bright"
          >
            <CloseIcon width={15} height={15} />
          </button>
        </header>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-line/70 bg-abyss/50 px-5 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
