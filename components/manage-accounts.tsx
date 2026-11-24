"use client";

import { useState } from "react";
import { Avatar } from "@/components/avatar";
import { CloseIcon, PlusIcon } from "@/components/icons";
import { Modal } from "@/components/modal";
import type { LinkedAccount } from "@/lib/types";

/**
 * Manage Accounts — view the accounts signed in on this device, switch between
 * them (one click), or sign into another one.
 */
export function ManageAccountsModal({
  open,
  onClose,
  accounts,
  onSwitch,
  onAddAccount,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  accounts: LinkedAccount[];
  onSwitch: (accountId: string) => void;
  onAddAccount: () => void;
  busy?: boolean;
}) {
  const [removed, setRemoved] = useState<string[]>([]);
  const visible = accounts.filter((a) => !removed.includes(a.id));

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Manage Accounts"
      description="Switch between the accounts signed in on this device."
      footer={
        <button
          onClick={onAddAccount}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-md bg-blurple px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-blurple-soft disabled:opacity-50"
        >
          <PlusIcon width={13} height={13} /> Add an account
        </button>
      }
    >
      <ul className="space-y-1.5">
        {visible.map((account) => (
          <li key={account.id}>
            <div
              className={`flex items-center gap-3 rounded-xl border p-2.5 transition ${
                account.active
                  ? "border-mint/45 bg-mint/10"
                  : "border-line/70 bg-white/[0.03] hover:bg-white/[0.06]"
              }`}
            >
              <Avatar
                name={account.display_name || account.username}
                src={account.avatar_url}
                accent={account.accent_color}
                size={36}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold text-bright">
                  {account.display_name || account.username}
                  {account.active && (
                    <span className="ml-1.5 rounded bg-mint/20 px-1 py-0.5 text-[9px] font-bold tracking-wide text-mint uppercase">
                      Active
                    </span>
                  )}
                </p>
                <p className="truncate text-[11.5px] text-dim">@{account.username} · {account.email}</p>
              </div>
              <button
                onClick={() => onSwitch(account.id)}
                disabled={account.active || busy}
                className="shrink-0 rounded-md bg-raised px-2.5 py-1 text-[11.5px] font-semibold text-bright ring-1 ring-line transition hover:bg-hover disabled:opacity-40"
              >
                {account.active ? "Signed in" : "Switch"}
              </button>
              <button
                onClick={() => setRemoved((prev) => [...prev, account.id])}
                aria-label={`Remove ${account.username}`}
                className="grid h-6 w-6 shrink-0 place-items-center rounded text-dim transition hover:text-rose"
              >
                <CloseIcon width={12} height={12} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-3 rounded-lg border border-line/60 bg-void/40 p-2.5 text-[11px] leading-relaxed text-dim">
        Adding an account keeps the current one signed in. Session data stays on this device only.
      </p>
    </Modal>
  );
}
