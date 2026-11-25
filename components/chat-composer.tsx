"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import {
  AppsIcon,
  AtIcon,
  CloseIcon,
  EmojiIcon,
  FileIcon,
  GifIcon,
  GiftIcon,
  ImageIcon,
  PlusIcon,
  SendIcon,
  SlashIcon,
  StickerIcon,
  ThreadIcon,
  TrashIcon,
  UploadCloudIcon,
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
import {
  ATTACHMENT_ACCEPT,
  MAX_ATTACHMENTS_PER_MESSAGE,
  formatFileSize,
  isImageAttachment,
  isStoredAttachmentUrl,
  isVideoAttachment,
  previewUrl,
  stripStrayUrls,
} from "@/lib/attachments";
import type { Attachment, MessageAuthor } from "@/lib/types";

/**
 * The floating pill composer shared by the DM feed and the channel feed.
 *
 * `+` opens the attachment menu (Upload a File / Create Thread / Use Apps),
 * `@` opens mention autocomplete (including `@game` / `@time`), `/` opens slash
 * commands, and the right cluster holds gift / GIF / sticker / emoji.
 *
 * Files chosen, pasted or dropped are uploaded right away so the pending tray
 * can show real thumbnails; sending just hands the descriptors to the feed.
 */

/** Imperative API so the feed's drop overlay can push files into the tray. */
export type ComposerApi = {
  addFiles: (files: File[] | FileList) => void;
  focus: () => void;
};

export type UploadResult = { attachments: Attachment[]; errors: string[] };

export function ChatComposer({
  placeholder,
  ariaLabel,
  onSubmit,
  onUpload,
  onCreateThread,
  onUseApps,
  members = [],
  selfId,
  autoEmoticons = true,
  previewMarkup = true,
  showSendButton = true,
  leftSlot,
  compact,
  apiRef,
}: {
  placeholder: string;
  ariaLabel: string;
  onSubmit: (content: string, attachments: Attachment[]) => void;
  /** Uploads files and returns stored descriptors. */
  onUpload?: (files: File[]) => Promise<UploadResult>;
  onCreateThread?: () => void;
  onUseApps?: () => void;
  members?: MessageAuthor[];
  selfId?: string;
  autoEmoticons?: boolean;
  previewMarkup?: boolean;
  showSendButton?: boolean;
  /** Extra control rendered inside the pill, left of the `+`. */
  leftSlot?: React.ReactNode;
  compact?: boolean;
  /** Filled with an imperative handle (used by the drag-and-drop overlay). */
  apiRef?: React.MutableRefObject<ComposerApi | null>;
}) {
  const [value, setValue] = useState("");
  const [caret, setCaret] = useState(0);
  const [tray, setTray] = useState<"none" | "attach" | "emoji" | "gif" | "sticker" | "gift">("none");
  const [pending, setPending] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

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

  /* ------------------------------ uploading ----------------------------- */

  async function addFiles(files: File[] | FileList) {
    const list = Array.from(files);
    if (list.length === 0) return;
    const room = MAX_ATTACHMENTS_PER_MESSAGE - pending.length - uploading;
    if (room <= 0) {
      setUploadError(`You can attach up to ${MAX_ATTACHMENTS_PER_MESSAGE} files per message.`);
      return;
    }
    const batch = list.slice(0, room);
    setUploadError(null);

    // No uploader wired (demo / preview) — fall back to local object URLs so
    // the tray still previews the file.
    if (!onUpload) {
      setPending((prev) => [
        ...prev,
        ...batch.map((file) => ({
          url: previewUrl(file),
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size,
        })),
      ]);
      return;
    }

    setUploading((n) => n + batch.length);
    const result = await onUpload(batch);
    setUploading((n) => Math.max(0, n - batch.length));
    if (result.attachments.length > 0) {
      setPending((prev) => [...prev, ...result.attachments].slice(0, MAX_ATTACHMENTS_PER_MESSAGE));
    }
    if (result.errors.length > 0) setUploadError(result.errors[0]);
    textareaRef.current?.focus();
  }

  useEffect(() => {
    if (!apiRef) return;
    apiRef.current = {
      addFiles: (files) => void addFiles(files),
      focus: () => textareaRef.current?.focus(),
    };
    return () => {
      apiRef.current = null;
    };
  });

  /* ------------------------------- sending ------------------------------ */

  function submit() {
    // Defence in depth: the textarea never receives a blob URL from us, but a
    // clipboard or a third-party drag can still paste one in as *text*. Strip it
    // so the feed renders the uploaded file, never "blob:https://…".
    let content = stripStrayUrls(value);
    if (!content && pending.length === 0) return;
    if (content) {
      if (autoEmoticons) content = applyEmoticons(content);
      if (previewMarkup) content = applyShortcodes(content);
    }
    onSubmit(content, pending);
    setValue("");
    setPending([]);
    setTray("none");
    setUploadError(null);
    requestAnimationFrame(() => {
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      textareaRef.current?.focus();
    });
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

  /* ------------------------------- pasting ------------------------------ */

  function handlePaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = event.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind !== "file") continue;
      const file = item.getAsFile();
      if (file) files.push(file);
    }
    if (files.length > 0) {
      // Files belong in the attachment tray. Preventing the default stops the
      // browser from also inserting the file's blob: URL as text.
      event.preventDefault();
      void addFiles(files);
    } else {
      // A clipboard that only carries a blob:/data: URL is not a message.
      const text = event.clipboardData.getData("text/plain") ?? "";
      if (/^\s*(blob|data):/i.test(text)) event.preventDefault();
    }
  }

  const busy = uploading > 0;
  const canSend = Boolean(value.trim()) || pending.length > 0;

  const attachTray = (
    <div className="animate-rise absolute bottom-full left-0 z-40 mb-2 w-60 overflow-hidden rounded-xl border border-subtle bg-[color-mix(in_oklab,var(--c-input)_94%,transparent)] py-1 shadow-2xl shadow-black/60 backdrop-blur-2xl">
      <p className="px-2.5 pt-1 pb-1 text-[10px] font-bold tracking-[0.14em] text-dim uppercase">
        Attach
      </p>
      <button
        type="button"
        onClick={() => {
          fileRef.current?.click();
          setTray("none");
        }}
        className="flex w-full items-center gap-2.5 px-2.5 py-2 text-left text-[12.5px] font-medium text-muted transition hover:bg-blurple hover:text-[color:var(--c-on-accent)]"
      >
        <UploadCloudIcon width={15} height={15} />
        Upload a File
        <span className="ml-auto text-[10px] text-dim opacity-80">⌘U</span>
      </button>
      <button
        type="button"
        onClick={() => {
          setTray("none");
          onCreateThread?.();
        }}
        className="flex w-full items-center gap-2.5 px-2.5 py-2 text-left text-[12.5px] font-medium text-muted transition hover:bg-blurple hover:text-[color:var(--c-on-accent)]"
      >
        <ThreadIcon width={15} height={15} />
        Create Thread
      </button>
      <button
        type="button"
        onClick={() => {
          setTray("none");
          onUseApps?.();
        }}
        className="flex w-full items-center gap-2.5 px-2.5 py-2 text-left text-[12.5px] font-medium text-muted transition hover:bg-blurple hover:text-[color:var(--c-on-accent)]"
      >
        <AppsIcon width={15} height={15} />
        Use Apps
      </button>
    </div>
  );

  return (
    <div ref={rootRef} className="relative min-w-0 shrink-0 px-3 pb-3 md:px-4 md:pb-4">
      {/* autocomplete above the pill */}
      {showAutocomplete && (
        <div
          role="listbox"
          aria-label={isSlash ? "Commands" : "Members"}
          className="animate-rise scroll-auto absolute bottom-full left-3 right-3 z-40 mb-1 max-h-64 overflow-y-auto rounded-xl border border-subtle bg-[color-mix(in_oklab,var(--c-input)_94%,transparent)] p-1 shadow-2xl shadow-black/60 backdrop-blur-2xl sm:right-auto sm:w-[min(420px,100%)]"
        >
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
        <div className="animate-rise absolute bottom-full right-3 z-40 mb-2 w-[298px] rounded-xl border border-subtle bg-[color-mix(in_oklab,var(--c-input)_94%,transparent)] p-2 shadow-2xl shadow-black/60 backdrop-blur-2xl">
          <div className="scroll-auto max-h-56 overflow-y-auto">
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
                      className="grid h-7 place-items-center rounded text-[16px] transition hover:bg-hover/60"
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
        <div className="animate-rise absolute bottom-full right-3 z-40 mb-2 w-[300px] rounded-xl border border-subtle bg-[color-mix(in_oklab,var(--c-input)_94%,transparent)] p-2 shadow-2xl shadow-black/60 backdrop-blur-2xl">
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
        <div className="animate-rise absolute bottom-full right-3 z-40 mb-2 w-[250px] rounded-xl border border-subtle bg-[color-mix(in_oklab,var(--c-input)_94%,transparent)] p-2 shadow-2xl shadow-black/60 backdrop-blur-2xl">
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
                className="grid h-12 place-items-center rounded-md bg-hover/55 text-[22px] transition hover:bg-hover/60"
              >
                {sticker}
              </button>
            ))}
          </div>
        </div>
      )}

      {tray === "gift" && (
        <div className="animate-rise absolute bottom-full right-3 z-40 mb-2 w-[264px] rounded-xl border border-subtle bg-[color-mix(in_oklab,var(--c-input)_94%,transparent)] p-3 shadow-2xl shadow-black/60 backdrop-blur-2xl">
          <p className="text-[12.5px] font-semibold text-bright">Send a gift</p>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">
            Unlock BT Pro for a friend — 1 month, or a Nitro-style boost bundle.
          </p>
          <button
            onClick={() => {
              setValue((v) => `${v} 🎁 BT Pro (1 month)`.trim());
              setTray("none");
            }}
            className="mt-2 w-full rounded-md bg-blurple py-1.5 text-[12px] font-semibold text-[color:var(--c-on-accent)] transition hover:bg-blurple-soft"
          >
            Add gift to message
          </button>
        </div>
      )}

      {/* ---------- pending attachment tray ---------- */}
      {(pending.length > 0 || busy || uploadError) && (
        <div className="mb-1.5 rounded-xl border border-subtle bg-elevated/70 p-2 backdrop-blur-md">
          {uploadError && (
            <p role="alert" className="mb-1.5 flex items-start justify-between gap-2 px-1 text-[11.5px] text-rose">
              <span className="min-w-0 flex-1">{uploadError}</span>
              <button onClick={() => setUploadError(null)} aria-label="Dismiss" className="shrink-0 text-dim hover:text-rose">
                <CloseIcon width={11} height={11} />
              </button>
            </p>
          )}

          <div className="scroll-auto flex max-h-[168px] gap-2 overflow-x-auto overflow-y-hidden pb-0.5">
            {pending.map((attachment) => (
              <PendingCard
                key={attachment.url}
                attachment={attachment}
                onRemove={() => setPending((prev) => prev.filter((a) => a.url !== attachment.url))}
              />
            ))}

            {Array.from({ length: uploading }).map((_, index) => (
              <div
                key={`uploading-${index}`}
                className="grid h-[120px] w-[164px] shrink-0 animate-pulse place-items-center rounded-lg border border-subtle bg-hover/40"
              >
                <span className="text-[10.5px] font-medium text-dim">Uploading…</span>
              </div>
            ))}

            {pending.length + uploading < MAX_ATTACHMENTS_PER_MESSAGE && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-label="Add more files"
                className="grid h-[120px] w-[64px] shrink-0 place-items-center rounded-lg border border-dashed border-subtle text-dim transition hover:border-blurple/60 hover:text-bright"
              >
                <PlusIcon width={18} height={18} />
              </button>
            )}
          </div>

          <p className="px-1 pt-1 text-[10px] text-dim">
            {pending.length === 1 ? "1 file" : `${pending.length} of ${MAX_ATTACHMENTS_PER_MESSAGE} files`}{" "}
            ready · they upload to the channel, never into the text box
          </p>
        </div>
      )}

      {/* ---------- the pill ---------- */}
      <div
        className={`composer-pill relative flex min-w-0 items-end gap-1 rounded-[26px] px-2 py-1.5 ring-1 transition focus-within:ring-blurple/45 ${
          dragging ? "ring-2 ring-blurple" : "ring-subtle"
        } ${compact ? "" : "shadow-lg"}`}
        onDragOver={(event) => {
          if (event.dataTransfer?.types?.includes("Files")) {
            event.preventDefault();
            setDragging(true);
          }
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          if (event.dataTransfer?.files?.length) {
            event.preventDefault();
            setDragging(false);
            void addFiles(event.dataTransfer.files);
          }
        }}
      >
        {leftSlot}

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setTray((t) => (t === "attach" ? "none" : "attach"))}
            aria-label="Upload a file or create a thread"
            aria-expanded={tray === "attach"}
            title="Upload a file"
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition ${
              tray === "attach"
                ? "bg-blurple text-[color:var(--c-on-accent)]"
                : "bg-hover/55 text-muted hover:bg-hover/60 hover:text-bright"
            }`}
          >
            <PlusIcon width={17} height={17} />
          </button>
          {tray === "attach" && attachTray}
          <input
            ref={fileRef}
            type="file"
            accept={ATTACHMENT_ACCEPT}
            multiple
            data-composer-file="true"
            aria-label="Choose files to upload"
            className="hidden"
            onChange={(event) => {
              if (event.target.files?.length) void addFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </div>

        <textarea
          ref={textareaRef}
          data-composer-input="true"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setCaret(e.target.selectionStart);
          }}
          onSelect={(e) => setCaret((e.target as HTMLTextAreaElement).selectionStart)}
          onPaste={handlePaste}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              if (showAutocomplete && mentionOptions[0]) {
                isSlash ? pickSlash(mentionOptions[0]) : insertAtCaret(mentionOptions[0].insert);
                return;
              }
              submit();
            }
            // Discord parity: → at the very end of the message sends, ← behaves
            // normally. Both Enter and the send button dispatch through submit().
            if (e.key === "ArrowRight" && value.length > 0) {
              const el = e.currentTarget;
              if (el.selectionStart === value.length && el.selectionEnd === value.length) {
                e.preventDefault();
                submit();
                return;
              }
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
          className="scroll-auto max-h-44 min-h-8 w-full min-w-0 flex-1 resize-none self-center bg-transparent px-1 py-1.5 text-[14px] leading-relaxed text-bright outline-none placeholder:text-dim"
        />

        <div className="flex shrink-0 items-center gap-0.5 self-center">
          <IconButton label="Send a gift" onClick={() => setTray((t) => (t === "gift" ? "none" : "gift"))} active={tray === "gift"}>
            <GiftIcon width={17} height={17} />
          </IconButton>
          <IconButton label="Send a GIF" onClick={() => setTray((t) => (t === "gif" ? "none" : "gif"))} active={tray === "gif"}>
            <GifIcon width={17} height={17} />
          </IconButton>
          <IconButton
            label="Send a sticker"
            onClick={() => setTray((t) => (t === "sticker" ? "none" : "sticker"))}
            active={tray === "sticker"}
            className="hidden sm:grid"
          >
            <StickerIcon width={17} height={17} />
          </IconButton>
          <IconButton
            label="Insert emoji"
            onClick={() => setTray((t) => (t === "emoji" ? "none" : "emoji"))}
            active={tray === "emoji"}
          >
            <EmojiIcon width={17} height={17} />
          </IconButton>
          <IconButton label="Mention someone" onClick={() => insertAtCaret("@")} className="hidden sm:grid">
            <AtIcon width={17} height={17} />
          </IconButton>
          <IconButton label="Use apps" onClick={() => onUseApps?.()} className="hidden lg:grid">
            <AppsIcon width={16} height={16} />
          </IconButton>
          {showSendButton && (
            <button
              type="button"
              onClick={submit}
              disabled={!canSend || busy}
              aria-label="Send message"
              title="Send message"
              className="ml-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blurple text-[color:var(--c-on-accent)] transition hover:bg-blurple-soft disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-dim"
            >
              <SendIcon width={15} height={15} />
            </button>
          )}
        </div>
      </div>

      <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 px-3 text-[10px] leading-snug text-dim">
        <span>
          <span className="font-semibold">Enter</span> to send
        </span>
        <span aria-hidden>·</span>
        <span>
          <span className="font-semibold">Shift + Enter</span> for a new line
        </span>
        <span aria-hidden>·</span>
        <span>
          <span className="font-semibold">@</span> mentions / commands
        </span>
        <span aria-hidden className="hidden sm:inline">
          ·
        </span>
        <span className="hidden sm:inline">
          <span className="font-semibold">Paste</span> or drop images to attach
        </span>
      </p>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  active,
  className = "",
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={`grid h-7 w-7 shrink-0 place-items-center rounded-md transition ${
        active ? "bg-hover/60 text-bright" : "text-muted hover:bg-hover/60 hover:text-bright"
      } ${className}`}
    >
      {children}
    </button>
  );
}

/** A removable thumbnail card in the pending tray. */
function PendingCard({
  attachment,
  onRemove,
}: {
  attachment: Attachment;
  onRemove: () => void;
}) {
  const image = isImageAttachment(attachment);
  const video = isVideoAttachment(attachment);
  const [broken, setBroken] = useState(false);

  return (
    <div className="group relative h-[120px] w-[164px] shrink-0 overflow-hidden rounded-lg border border-subtle bg-input/60">
      {image && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={attachment.url}
          alt={attachment.name}
          onError={() => setBroken(true)}
          className="h-full w-full object-cover"
        />
      ) : video && !broken ? (
        <video src={attachment.url} muted className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-2 text-center">
          <FileIcon width={22} height={22} className="text-muted" />
          <span className="line-clamp-2 text-[10px] leading-tight text-dim">{attachment.name}</span>
          <span className="text-[9px] text-dim">{formatFileSize(attachment.size)}</span>
        </div>
      )}

      {/* Filename strip — the tray is the only place a file name is shown, so it
          must be readable even on a bright thumbnail. */}
      <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-1.5 py-1">
        <ImageIcon width={10} height={10} className="shrink-0 text-white/70" />
        <span className="truncate text-[9.5px] font-medium text-white/90">
          {attachment.name}
        </span>
      </span>

      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${attachment.name}`}
        title={`Remove ${attachment.name}`}
        className="absolute top-1 right-1 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-white/90 transition hover:bg-rose hover:text-[color:var(--c-on-rose)] focus:opacity-100 focus-visible:ring-2 focus-visible:ring-white/70 sm:opacity-0 sm:group-hover:opacity-100"
      >
        <TrashIcon width={12} height={12} />
      </button>
    </div>
  );
}
