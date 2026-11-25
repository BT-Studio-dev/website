"use client";

import { useRef, useState } from "react";
import { Popover } from "@/components/ui/popover";
import { StatusIcon, statusLabel } from "@/components/user-menu";
import { STATUS_OPTIONS } from "@/lib/presence";
import { STATUS_DURATIONS, type Presence, type StatusDuration } from "@/lib/types";

/**
 * Reusable status chooser: four presence rows, with the duration flyout on
 * the right for Idle / DND / Invisible.
 */
export function StatusPicker({
  status,
  onPick,
  trigger,
  width = 244,
}: {
  status: Presence;
  onPick: (status: Presence, duration: StatusDuration) => void;
  /** Custom trigger; a labelled button is rendered when omitted. */
  trigger?: (props: { onClick: () => void; open: boolean }) => React.ReactNode;
  width?: number;
}) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [durationFor, setDurationFor] = useState<Presence | null>(null);

  return (
    <>
      <span ref={anchorRef} className="inline-flex">
        {trigger ? (
          trigger({ onClick: () => setOpen((v) => !v), open })
        ) : (
          <button
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={open}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] font-semibold text-bright transition hover:bg-hover/60"
          >
            <StatusIcon status={status} />
            {statusLabel(status)}
            <span className="text-[10px] text-dim">▾</span>
          </button>
        )}
      </span>

      <Popover
        open={open}
        onClose={() => {
          setOpen(false);
          setDurationFor(null);
        }}
        anchor={anchorRef.current}
        width={width}
      >
        {STATUS_OPTIONS.map((option) => (
          <div key={option.id} className="relative">
            <button
              type="button"
              onMouseEnter={() => option.timed && setDurationFor(option.id)}
              onClick={() =>
                option.timed
                  ? setDurationFor((v) => (v === option.id ? null : option.id))
                  : (onPick(option.id, "forever"), setOpen(false))
              }
              className="flex w-full items-center gap-2 px-2.5 py-[7px] text-left text-[12.5px] font-medium text-muted transition hover:bg-blurple hover:text-[color:var(--c-on-accent)]"
            >
              <StatusIcon status={option.id} />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{option.label}</span>
                {option.description && (
                  <span className="block truncate text-[10px] opacity-80">{option.description}</span>
                )}
              </span>
              {option.timed && <span className="text-[10px] opacity-80">›</span>}
            </button>

            {option.timed && durationFor === option.id && (
              <div className="animate-rise absolute top-0 left-full z-10 ml-1 w-[152px] rounded-md border border-subtle bg-[color-mix(in_oklab,var(--c-void)_94%,transparent)] py-1 shadow-2xl shadow-black/60 backdrop-blur-2xl">
                {STATUS_DURATIONS.map((duration) => (
                  <button
                    key={duration.id}
                    type="button"
                    onClick={() => {
                      onPick(option.id, duration.id);
                      setOpen(false);
                      setDurationFor(null);
                    }}
                    className="block w-full px-2.5 py-1.5 text-left text-[12.5px] font-medium text-muted transition hover:bg-blurple hover:text-[color:var(--c-on-accent)]"
                  >
                    {duration.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </Popover>
    </>
  );
}

/** Inline "Set status" button used by settings/account panels. */
export function SendMessageButton({ onClick, label = "Set Status" }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="rounded-md bg-raised px-2.5 py-1 text-[11.5px] font-semibold text-bright ring-1 ring-line transition hover:bg-hover"
    >
      {label}
    </button>
  );
}
