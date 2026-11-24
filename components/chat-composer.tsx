"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import {
  AtIcon,
  CloseIcon,
  EmojiIcon,
  GifIcon,
  GiftIcon,
  PlusIcon,
  SendIcon,
  SlashIcon,
  StickerIcon,
} from "@/components/icons";
import {
  applyEmoticons,
  applyShortcodes,
  activeMentionQuery,
  activeSlashQuery,
  BUILTIN_MENTIONS,
  EMOJI_PALETTE,
  SLASH_COMMANDS,
  type MentionOption,
} from "@/lib/chat-features";
import type { MessageAuthor } from "@/lib/types";

/**
 * The floating pill composer shared by the DM feed and the channel feed.
 *
 * `+` opens an attachment tray, `@` opens mention autocomplete (including the
 * built-in `@game` / `@time` tags), `/` opens slash commands, and the right
 * cluster holds gift / GIF / sticker / emoji buttons.
 */
export function ChatComposer({
  placeholder,
  ariaLabel,
  onSubmit,
  members = [],
  selfId,
  autoEmoticons = true,
  previewMarkup = true,
  showSendButton = true,
  leftSlot,
  compact,
}: {
  placeholder: string;
  ariaLabel: string;
  onSubmit: (content: string) => void;
  members?: MessageAuthor[];
  selfId?: string;
  autoEmoticons?: boolean;
  previewMarkup?: boolean;
  showSendButton?: boolean;
  /** Extra control rendered inside the pill, left of the `+`. */
  leftSlot?: React.ReactNode;
  compact?: boolean;
}) {
  const [value, setValue] = useState("");
  const [caret, setCaret] = useState(0);
  const [tray, setTray] = useState<"none" | "attach" | "emoji" | "gif" | "sticker" | "gift">("none");
  const [attachments, setAttachments] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const mentionQuery = useMemo(
    () => (value.trimStart().startsWith("/") ? activeSlashQuery(value, caret) : activeMentionQuery(value, caret)),
    [value, caret],
  );

  const isSlash = value.trimStart().startsWith("/") && !value.includes(" ");

  const mentionOptions: MentionOption[] = useMemo(() => {
    if (isSlash) {
      const needle = (mentionQuery ?? "").toLowerCase();
      return SLASH_COMMANDS.filter((c) => c.name.slice(1).startsWith(needle)).map((c) => ({
        id: c.name,
        label: c.name,
        description: c.description,
        insert: c.insert ?? `${c.name} `,
        builtin: true,
      }));
    }
    const needle = (mentionQuery ?? "").toLowerCase();
    const people: MentionOption[] = members
      .filter((m) => m.id !== selfId)
      .filter((m) => !needle || m.username.toLowerCase().includes(needle) || (m.display_name ?? "").toLowerCase().includes(needle))
      .slice(0, 6)
      .map((m) => ({
        id: m.id,
        label: m.display_name || m.username,
        description: `@${m.username}`,
        avatar_url: m.avatar_url,
        accent_color: m.accent_color,
        insert: `<@${m.id}> `,
      }));
    const builtins = BUILTIN_MENTIONS.filter(
      (b) => !needle || b.label.slice(1).startsWith(needle),
    );
    return [...builtins, ...people];
  }, [isSlash, mentionQuery, members, selfId]);

  const showAutocomplete = mentionQuery !== null && mentionOptions.length > 0;

  useEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 176)}px`;
  }, [value]);

  function submit() {
    let content = value.trim();
    if (!content && attachments.length === 0) return;
    if (autoEmoticons) content = applyEmoticons(content);
    if (previewMarkup) content = applyShortcodes(content);
    const full = [content, ...attachments].filter(Boolean).join(" ");
    onSubmit(full);
    setValue("");
    setAttachments([]);
    setTray("none");
    textareaRef.current?.focus();
  }

  function insertAtCaret(text: string) {
    const node = textareaRef.current;
    const start = node?.selectionStart ?? value.length;
    const end = node?.selectionEnd ?? value.length;
    // Replace the partial @query / /command being typed.
    const upto = value.slice(0, start);
    const replaced = upto.replace(/(^|\s)(@[\w.-]*|\/[\w-]*)$/, `$1${text}`);
    const next = replaced + value.slice(end);
    setValue(next);
    setTray("none");
    requestAnimationFrame(() => {
      const pos = replaced.length;
      node?.focus();
      node?.setSelectionRange(pos, pos);
      setCaret(pos);
    });
  }

  function pickSlash(option: MentionOption) {
    // Commands that take an argument leave the caret after the space.
    insertAtCaret(option.insert.endsWith(" ") ? option.insert : `${option.insert} `);
  }

  const attachTray = (
    <div className="animate-rise absolute bottom-full left-0 z-20 mb-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-[color-mix(in_oklab,var(--c-void)_94%,transparent)] py-1 shadow-2xl shadow-black/60 backdrop-blur-2xl">
      <p className="px-2.5 pt-1 pb-1 text-[10px] font-bold tracking-[0.14em] text-dim uppercase">
        Attach
      </p>
      {[
        { label: "Upload a file", icon: <PlusIcon width={14} height={14} /> },
        { label: "Create a poll", icon: <GifIcon width={14} height={14} /> },
        { label: "Send a sticker", icon: <StickerIcon width={14} height={14} /> },
        { label: "Start a thread", icon: <SlashIcon width={14} height={14} /> },
      ].map((item) => (
        <button
          key={item.label}
          onClick={() => {
            if (item.label === "Upload a file") fileRef.current?.click();
            setTray("none");
          }}
          className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[12.5px] font-medium text-muted transition hover:bg-blurple hover:text-white"
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="relative shrink-0 px-3 pb-3 md:px-4 md:pb-4">
      {/* autocomplete above the pill */}
      {showAutocomplete && (
        <div className="animate-rise absolute bottom-full left-3 z-30 mb-1 max-h-64 w-[min(420px,calc(100%-2rem))] overflow-y-auto rounded-xl border border-white/10 bg-[color-mix(in_oklab,var(--c-void)_94%,transparent)] p-1 shadow-2xl shadow-black/60 backdrop-blur-2xl scroll-thin">
          <p className="px-2 py-1 text-[10px] font-bold tracking-[0.14em] text-dim uppercase">
            {isSlash ? "Commands" : "Members"}
          </p>
          {mentionOptions.map((option) => (
            <button
              key={`${option.id}`}
              onClick={() => (isSlash ? pickSlash(option) : insertAtCaret(option.insert))}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-blurple/25"
            >
              {option.avatar_url !== undefined || !isSlash ? (
                <Avatar
                  name={option.label}
                  src={option.avatar_url}
                  accent={option.accent_color}
                  size={24}
                />
              ) : (
                <span className="grid h-6 w-6 place-items-center rounded-full bg-raised text-[10px]">
                  /
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-bright">
                  {option.label}
                </span>
                {option.description && (
                  <span className="block truncate text-[11px] text-dim">{option.description}</span>
                )}
              </span>
              {option.builtin && (
                <span className="shrink-0 rounded bg-amber/15 px-1.5 py-0.5 text-[9.5px] font-bold tracking-wide text-amber uppercase">
                  built-in
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* emoji picker */}
      {tray === "emoji" && (
        <div className="animate-rise absolute bottom-full right-3 z-30 mb-2 w-[298px] rounded-xl border border-white/10 bg-[color-mix(in_oklab,var(--c-void)_94%,transparent)] p-2 shadow-2xl shadow-black/60 backdrop-blur-2xl">
          <div className="scroll-thin max-h-56 overflow-y-auto">
            {EMOJI_PALETTE.map((group) => (
              <div key={group.group} className="mb-1.5">
                <p className="px-1 pb-1 text-[10px] font-bold tracking-[0.12em] text-dim uppercase">
                  {group.group}
                </p>
                <div className="grid grid-cols-8 gap-0.5">
                  {group.emoji.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setValue((v) => v + emoji)}
                      className="grid h-7 place-items-center rounded text-[16px] transition hover:bg-white/12"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* gif / sticker / gift trays */}
      {tray === "gif" && (
        <div className="animate-rise absolute bottom-full right-3 z-30 mb-2 w-[300px] rounded-xl border border-white/10 bg-[color-mix(in_oklab,var(--c-void)_94%,transparent)] p-2 shadow-2xl shadow-black/60 backdrop-blur-2xl">
          <p className="px-1 pb-1.5 text-[10px] font-bold tracking-[0.12em] text-dim uppercase">
            Trending GIFs
          </p>
          <div className="grid grid-cols-3 gap-1">
            {["Celebrate", "Ship it", "Mind blown", "Hi there", "Nice", "Let's go"].map((label) => (
              <button
                key={label}
                onClick={() => {
                  setValue((v) => `${v} [${label} GIF]`.trim());
                  setTray("none");
                }}
                className="grid h-14 place-items-center rounded-md bg-gradient-to-br from-blurple/40 to-blurple-soft/25 px-1 text-center text-[10.5px] font-semibold text-white transition hover:brightness-125"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {tray === "sticker" && (
        <div className="animate-rise absolute bottom-full right-3 z-30 mb-2 w-[250px] rounded-xl border border-white/10 bg-[color-mix(in_oklab,var(--c-void)_94%,transparent)] p-2 shadow-2xl shadow-black/60 backdrop-blur-2xl">
          <p className="px-1 pb-1.5 text-[10px] font-bold tracking-[0.12em] text-dim uppercase">
            BT Comms Stickers
          </p>
          <div className="grid grid-cols-4 gap-1">
            {["🦊", "🐙", "🛸", "🍄", "🪐", "🐝", "🎈", "🧊"].map((sticker) => (
              <button
                key={sticker}
                onClick={() => {
                  setValue((v) => `${v} ${sticker} `.trimStart());
                  setTray("none");
                }}
                className="grid h-12 place-items-center rounded-md bg-white/6 text-[22px] transition hover:bg-white/14"
              >
                {sticker}
              </button>
            ))}
          </div>
        </div>
      )}

      {tray === "gift" && (
        <div className="animate-rise absolute bottom-full right-3 z-30 mb-2 w-[264px] rounded-xl border border-white/10 bg-[color-mix(in_oklab,var(--c-void)_94%,transparent)] p-3 shadow-2xl shadow-black/60 backdrop-blur-2xl">
          <p className="text-[12.5px] font-semibold text-bright">Send a gift</p>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">
            Unlock BT Pro for a friend — 1 month, or a Nitro-style boost bundle.
          </p>
          <button
            onClick={() => {
              setValue((v) => `${v} 🎁 BT Pro (1 month)`.trim());
              setTray("none");
            }}
            className="mt-2 w-full rounded-md bg-blurple py-1.5 text-[12px] font-semibold text-white transition hover:bg-blurple-soft"
          >
            Add gift to message
          </button>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {attachments.map((url) => (
            <span
              key={url}
              className="flex items-center gap-1 rounded-full border border-line bg-void/70 px-2 py-0.5 text-[10.5px] text-muted"
            >
              {url.split("/").pop()}
              <button
                onClick={() => setAttachments((prev) => prev.filter((u) => u !== url))}
                aria-label="Remove attachment"
                className="text-dim hover:text-rose"
              >
                <CloseIcon width={10} height={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* ---------- the pill ---------- */}
      <div
        className={`composer-pill relative flex items-end gap-1 rounded-[26px] px-2 py-1.5 ring-1 ring-white/10 transition focus-within:ring-blurple/45 ${
          compact ? "" : "shadow-lg"
        }`}
      >
        {leftSlot}

        <div className="relative">
          <button
            type="button"
            onClick={() => setTray((t) => (t === "attach" ? "none" : "attach"))}
            aria-label="Attach a file"
            title="Attach a file"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/8 text-muted transition hover:bg-white/14 hover:text-bright"
          >
            <PlusIcon width={17} height={17} />
          </button>
          {tray === "attach" && attachTray}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setAttachments((prev) => [...prev, URL.createObjectURL(file)]);
              e.target.value = "";
            }}
          />
        </div>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setCaret(e.target.selectionStart);
          }}
          onSelect={(e) => setCaret((e.target as HTMLTextAreaElement).selectionStart)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (showAutocomplete && mentionOptions[0]) {
                isSlash ? pickSlash(mentionOptions[0]) : insertAtCaret(mentionOptions[0].insert);
                return;
              }
              submit();
            }
            if (e.key === "Tab" && showAutocomplete && mentionOptions[0]) {
              e.preventDefault();
              isSlash ? pickSlash(mentionOptions[0]) : insertAtCaret(mentionOptions[0].insert);
            }
            if (e.key === "Escape") setTray("none");
          }}
          rows={1}
          maxLength={4000}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className="scroll-thin max-h-44 min-h-8 w-full resize-none self-center bg-transparent px-1 py-1.5 text-[14px] leading-relaxed outline-none placeholder:text-dim"
        />

        <div className="flex shrink-0 items-center gap-0.5 self-center">
          <button
            onClick={() => setTray((t) => (t === "gift" ? "none" : "gift"))}
            aria-label="Send a gift"
            title="Send a gift"
            className="grid h-7 w-7 place-items-center rounded-md text-muted transition hover:bg-white/10 hover:text-bright"
          >
            <GiftIcon width={17} height={17} />
          </button>
          <button
            onClick={() => setTray((t) => (t === "gif" ? "none" : "gif"))}
            aria-label="Send a GIF"
            title="Send a GIF"
            className="grid h-7 w-7 place-items-center rounded-md text-muted transition hover:bg-white/10 hover:text-bright"
          >
            <GifIcon width={17} height={17} />
          </button>
          <button
            onClick={() => setTray((t) => (t === "sticker" ? "none" : "sticker"))}
            aria-label="Send a sticker"
            title="Send a sticker"
            className="grid h-7 w-7 place-items-center rounded-md text-muted transition hover:bg-white/10 hover:text-bright"
          >
            <StickerIcon width={17} height={17} />
          </button>
          <button
            onClick={() => setTray((t) => (t === "emoji" ? "none" : "emoji"))}
            aria-label="Insert emoji"
            title="Insert emoji"
            className="grid h-7 w-7 place-items-center rounded-md text-muted transition hover:bg-white/10 hover:text-bright"
          >
            <EmojiIcon width={17} height={17} />
          </button>
          <button
            onClick={() => insertAtCaret("@")}
            aria-label="Mention someone"
            title="Mention someone (@game and @time work too)"
            className="grid h-7 w-7 place-items-center rounded-md text-muted transition hover:bg-white/10 hover:text-bright"
          >
            <AtIcon width={17} height={17} />
          </button>
          {showSendButton && (
            <button
              onClick={submit}
              disabled={!value.trim() && attachments.length === 0}
              aria-label="Send message"
              className="ml-0.5 grid h-8 w-8 place-items-center rounded-full bg-blurple text-white transition hover:bg-blurple-soft disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-dim"
            >
              <SendIcon width={15} height={15} />
            </button>
          )}
        </div>
      </div>

      <p className="mt-1 px-3 text-[10px] text-dim">
        <span className="font-semibold">Enter</span> to send ·{" "}
        <span className="font-semibold">Shift + Enter</span> for a new line ·{" "}
        <span className="font-semibold">@</span> mentions ·{" "}
        <span className="font-semibold">/</span> commands
      </p>
    </div>
  );
}
