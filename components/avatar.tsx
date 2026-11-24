"use client";

import type { Presence } from "@/lib/types";

const presenceColor: Record<Presence, string> = {
  online: "#3ba55d",
  idle: "#faa61a",
  dnd: "#ed4245",
  offline: "#6b7280",
};

export function presenceLabel(status: Presence) {
  return status === "dnd"
    ? "Do Not Disturb"
    : status.charAt(0).toUpperCase() + status.slice(1);
}

export function PresenceDot({
  status,
  size = 12,
  ring = "border-panel",
  className = "",
}: {
  status: Presence;
  size?: number;
  ring?: string;
  className?: string;
}) {
  return (
    <span
      aria-label={presenceLabel(status)}
      className={`inline-block shrink-0 rounded-full border-2 ${ring} ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: presenceColor[status],
      }}
    />
  );
}

export function initialsOf(name: string) {
  return name
    .replace(/[^\p{L}\p{N} ]/gu, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

export function colorFromString(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  const palette = ["#5865f2", "#eb459e", "#3ba55d", "#faa61a", "#00a8fc", "#9b59b6", "#e67e22"];
  return palette[Math.abs(hash) % palette.length];
}

export function Avatar({
  name,
  src,
  size = 36,
  status,
  accent,
  className = "",
}: {
  name: string;
  src?: string | null;
  size?: number;
  status?: Presence;
  accent?: string | null;
  className?: string;
}) {
  const bg = accent ?? colorFromString(name);

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-visible ${className}`}
      style={{ width: size, height: size }}
    >
      <span
        className="flex h-full w-full items-center justify-center overflow-hidden rounded-full font-semibold text-white select-none"
        style={{
          background: src ? undefined : `linear-gradient(145deg, ${bg}, ${bg}cc)`,
          fontSize: Math.max(10, size * 0.36),
        }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          initialsOf(name)
        )}
      </span>
      {status && (
        <span
          className="absolute -right-0.5 -bottom-0.5 rounded-full border-2 border-ink"
          style={{
            width: Math.max(10, size * 0.34),
            height: Math.max(10, size * 0.34),
            backgroundColor: presenceColor[status],
          }}
          aria-label={presenceLabel(status)}
        />
      )}
    </span>
  );
}
