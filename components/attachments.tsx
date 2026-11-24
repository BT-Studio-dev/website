"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CloseIcon, DownloadIcon } from "@/components/icons";
import { formatFileSize, isImageAttachment, isVideoAttachment } from "@/lib/attachments";
import type { Attachment } from "@/lib/types";

/**
 * Inline attachment rendering for the chat feeds.
 *
 * Images and videos render as rounded tiles with a shimmering skeleton while
 * they decode, then open in a full-screen lightbox on click. Everything else
 * renders as a file chip with name, size and a download link.
 */

export function AttachmentGrid({
  attachments,
  maxWidth = 460,
}: {
  attachments: Attachment[];
  /** Constrains the tile row so long images never widen the feed. */
  maxWidth?: number;
}) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  if (attachments.length === 0) return null;

  return (
    <>
      <div className="mt-1.5 flex flex-wrap gap-1.5" style={{ maxWidth }}>
        {attachments.map((attachment, index) => (
          <AttachmentTile
            key={`${attachment.url}-${index}`}
            attachment={attachment}
            sole={attachments.length === 1}
            onOpen={() => setLightbox(index)}
          />
        ))}
      </div>
      {lightbox !== null && (
        <Lightbox
          attachments={attachments}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onNavigate={(next) =>
            setLightbox(((next % attachments.length) + attachments.length) % attachments.length)
          }
        />
      )}
    </>
  );
}

function AttachmentTile({
  attachment,
  sole,
  onOpen,
}: {
  attachment: Attachment;
  sole: boolean;
  onOpen: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const image = isImageAttachment(attachment);
  const video = isVideoAttachment(attachment);

  if (image || video) {
    const width = sole ? 420 : 200;
    const height = sole ? 300 : 150;
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${attachment.name}`}
        className="group relative overflow-hidden rounded-lg border border-subtle bg-input/60 transition hover:brightness-110"
        style={{ width, maxWidth: "100%", height }}
      >
        {!loaded && !failed && (
          <span
            aria-hidden
            className="absolute inset-0 animate-pulse bg-gradient-to-br from-hover/50 via-hover/25 to-hover/50"
          />
        )}
        {failed ? (
          <span className="grid h-full w-full place-items-center px-2 text-center text-[11px] text-dim">
            Couldn&apos;t load {attachment.name}
          </span>
        ) : image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={attachment.url}
            alt={attachment.name}
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={`h-full w-full object-cover transition-opacity duration-200 ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          />
        ) : (
          <video
            src={attachment.url}
            preload="metadata"
            onLoadedData={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={`h-full w-full object-cover transition-opacity duration-200 ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          />
        )}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent px-2 py-1 text-[10.5px] font-medium text-white opacity-0 transition group-hover:opacity-100">
          <span className="truncate">{attachment.name}</span>
          <span className="shrink-0 opacity-80">{formatFileSize(attachment.size)}</span>
        </span>
      </button>
    );
  }

  return (
    <a
      href={attachment.url}
      download={attachment.name}
      target="_blank"
      rel="noopener noreferrer"
      className="flex max-w-full items-center gap-2 rounded-lg border border-subtle bg-input/60 px-2.5 py-2 transition hover:border-blurple/50 hover:bg-hover/50"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-hover/60 text-muted">
        <DownloadIcon width={15} height={15} />
      </span>
      <span className="min-w-0">
        <span className="block max-w-[220px] truncate text-[12.5px] font-semibold text-bright">
          {attachment.name}
        </span>
        <span className="block text-[10.5px] text-dim">{formatFileSize(attachment.size)}</span>
      </span>
    </a>
  );
}

/** Full-screen viewer with keyboard navigation. */
function Lightbox({
  attachments,
  index,
  onClose,
  onNavigate,
}: {
  attachments: Attachment[];
  index: number;
  onClose: () => void;
  onNavigate: (next: number) => void;
}) {
  const current = attachments[index];
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") onNavigate(index + 1);
      if (event.key === "ArrowLeft") onNavigate(index - 1);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [index, onClose, onNavigate]);

  if (!mounted || !current) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${current.name} — image viewer`}
      onClick={onClose}
      className="animate-fade fixed inset-0 z-[120] flex flex-col bg-black/85 backdrop-blur-md"
    >
      <header className="flex shrink-0 items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-white">{current.name}</p>
          <p className="text-[11px] text-white/60">
            {formatFileSize(current.size)}
            {attachments.length > 1 && ` · ${index + 1} of ${attachments.length}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <a
            href={current.url}
            download={current.name}
            onClick={(e) => e.stopPropagation()}
            aria-label="Download"
            className="grid h-9 w-9 place-items-center rounded-md text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <DownloadIcon width={18} height={18} />
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close viewer"
            className="grid h-9 w-9 place-items-center rounded-md text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <CloseIcon width={18} height={18} />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-6">
        {isVideoAttachment(current) ? (
          <video
            src={current.url}
            controls
            autoPlay
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full rounded-lg"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.url}
            alt={current.name}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
          />
        )}
      </div>

      {attachments.length > 1 && (
        <div className="flex shrink-0 items-center justify-center gap-2 pb-4">
          {attachments.map((attachment, i) => (
            <button
              key={`${attachment.url}-${i}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(i);
              }}
              aria-label={`Show ${attachment.name}`}
              aria-current={i === index}
              className={`h-1.5 w-6 rounded-full transition ${
                i === index ? "bg-white" : "bg-white/30 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
