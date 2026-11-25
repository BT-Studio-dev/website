"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon, EyeIcon, EyeOffIcon, PencilIcon } from "@/components/icons";
import { copyText, revealValue } from "@/lib/clipboard";

/* ------------------------------- layout -------------------------------- */

export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="text-[19px] font-bold tracking-tight text-bright">{title}</h2>
      {description && (
        <p className="mt-1 mb-4 max-w-2xl text-[13px] leading-relaxed text-muted">
          {description}
        </p>
      )}
      {!description && <div className="mb-4" />}
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function SettingsCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-line/80 bg-raised/60 p-4 ${className}`}
    >
      {children}
    </div>
  );
}

export function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold tracking-widest text-dim uppercase">
      {children}
    </p>
  );
}

export function Divider() {
  return <div className="my-4 h-px bg-line/70" />;
}

/* ------------------------------- buttons ------------------------------- */

type ButtonTone = "primary" | "secondary" | "danger" | "ghost" | "success";

const TONES: Record<ButtonTone, string> = {
  primary:
    "bg-blurple text-[color:var(--c-on-accent)] hover:bg-blurple-soft shadow-sm shadow-blurple/30",
  secondary: "bg-raised text-bright hover:bg-hover border border-line",
  danger: "bg-rose/15 text-rose hover:bg-rose/25 border border-rose/30",
  success: "bg-mint text-[color:var(--c-on-mint)] hover:brightness-110",
  ghost: "text-muted hover:text-bright hover:bg-hover/60",
};

export function SettingsButton({
  children,
  tone = "primary",
  onClick,
  disabled,
  type = "button",
  full,
  className = "",
}: {
  children: React.ReactNode;
  tone?: ButtonTone;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  full?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
        TONES[tone]
      } ${full ? "w-full" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

/* -------------------------------- fields ------------------------------- */

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-semibold tracking-widest text-muted uppercase">
          {label}
        </span>
        {hint && <span className="text-[10.5px] text-dim">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  maxLength,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
  disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      disabled={disabled}
      className="w-full rounded-lg border border-line bg-void/70 px-3 py-2 text-[13.5px] outline-none transition focus:border-blurple/60 disabled:opacity-60"
    />
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
  maxLength,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
}) {
  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className="w-full resize-none rounded-lg border border-line bg-void/70 px-3 py-2 text-[13.5px] outline-none transition focus:border-blurple/60"
      />
      {maxLength && (
        <p className="mt-1 text-right text-[10.5px] text-dim">
          {value.length}/{maxLength}
        </p>
      )}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[13.5px] font-semibold text-bright">{label}</p>
        {description && (
          <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{description}</p>
        )}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50 ${
          checked ? "bg-mint" : "bg-line"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

export function RadioRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; description?: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="space-y-1.5">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition ${
              active
                ? "border-blurple/60 bg-blurple/10"
                : "border-line bg-void/40 hover:bg-hover/40"
            }`}
          >
            <span
              className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 ${
                active ? "border-blurple" : "border-line"
              }`}
            >
              {active && <span className="h-2 w-2 rounded-full bg-blurple" />}
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold text-bright">
                {option.label}
              </span>
              {option.description && (
                <span className="mt-0.5 block text-[11.5px] leading-relaxed text-muted">
                  {option.description}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function Select({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  label?: string;
}) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-[11px] font-semibold tracking-widest text-muted uppercase">
          {label}
        </span>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg border border-line bg-void/70 px-3 py-2 text-[13px] outline-none focus:border-blurple/60"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/* --------------------------- masked + reveal --------------------------- */

export function MaskedRow({
  label,
  value,
  masked,
  onEdit,
  copyable,
  note,
}: {
  label: string;
  value: string;
  /** When provided, the row starts masked and this is displayed instead. */
  masked: string;
  onEdit?: () => void;
  copyable?: boolean;
  note?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    const ok = await copyText(value);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
      return;
    }
    // Clipboard blocked — show the value so the click still achieves something.
    setCopied(false);
    revealValue(label, value);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold tracking-widest text-dim uppercase">
          {label}
        </p>
        <p className="mt-0.5 truncate font-mono text-[13px] text-bright">
          {revealed ? value : masked}
        </p>
        {note && <p className="mt-0.5 text-[11px] text-dim">{note}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <SettingsButton tone="secondary" onClick={() => setRevealed((v) => !v)}>
          {revealed ? <EyeOffIcon width={13} height={13} /> : <EyeIcon width={13} height={13} />}
          {revealed ? "Hide" : "Reveal"}
        </SettingsButton>
        {copyable && (
          <SettingsButton tone="ghost" onClick={() => void copy()}>
            {copied ? (
              <CheckIcon width={13} height={13} className="text-mint" />
            ) : (
              <CopyIcon width={13} height={13} />
            )}
          </SettingsButton>
        )}
        {onEdit && (
          <SettingsButton tone="secondary" onClick={onEdit}>
            <PencilIcon width={13} height={13} />
            Edit
          </SettingsButton>
        )}
      </div>
    </div>
  );
}

/* -------------------------------- toasts ------------------------------- */

export function InlineNote({
  tone = "info",
  children,
}: {
  tone?: "info" | "success" | "error";
  children: React.ReactNode;
}) {
  const styles = {
    info: "border-line bg-void/50 text-muted",
    success: "border-mint/30 bg-mint/10 text-mint",
    error: "border-rose/30 bg-rose/10 text-rose",
  }[tone];

  return (
    <p role="status" className={`rounded-lg border px-3 py-2 text-[12.5px] ${styles}`}>
      {children}
    </p>
  );
}
