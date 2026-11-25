"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { UploadCloudIcon } from "@/components/icons";
import { MAX_ATTACHMENTS_PER_MESSAGE, formatFileSize, MAX_ATTACHMENT_BYTES } from "@/lib/attachments";

/**
 * Full-pane drag-and-drop target for a chat feed.
 *
 * Wraps the feed, dims it with an "Upload to #general / @ada" overlay while
 * files hover, and hands the dropped files to `onFiles`. Drag events are
 * counted so moving over child elements never flickers the overlay off.
 */
export function UploadDropzone({
  target,
  onFiles,
  children,
  disabled,
}: {
  /** Where the files would land — `#general` or `@ada`. */
  target: string;
  onFiles: (files: File[]) => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const [depth, setDepth] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = depth > 0 && !disabled;

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const holdsFiles = (event: React.DragEvent) =>
    Array.from(event.dataTransfer?.types ?? []).includes("Files");

  const onDragEnter = useCallback(
    (event: React.DragEvent) => {
      if (disabled || !holdsFiles(event)) return;
      event.preventDefault();
      setDepth((n) => n + 1);
      setHint(null);
    },
    [disabled],
  );

  const onDragOver = useCallback(
    (event: React.DragEvent) => {
      if (disabled || !holdsFiles(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    },
    [disabled],
  );

  const onDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDepth((n) => Math.max(0, n - 1));
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setDepth(0);
      const files = Array.from(event.dataTransfer?.files ?? []);
      if (files.length === 0) return;

      if (files.length > MAX_ATTACHMENTS_PER_MESSAGE) {
        setHint(`Only the first ${MAX_ATTACHMENTS_PER_MESSAGE} files will be attached.`);
      }
      const oversized = files.filter((file) => file.size > MAX_ATTACHMENT_BYTES);
      if (oversized.length > 0) {
        setHint(
          `${oversized[0].name} is ${formatFileSize(oversized[0].size)} — over the ${formatFileSize(
            MAX_ATTACHMENT_BYTES,
          )} limit.`,
        );
      }
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setHint(null), 4000);

      onFiles(files.slice(0, MAX_ATTACHMENTS_PER_MESSAGE));
    },
    [onFiles],
  );

  return (
    <div
      className="relative flex min-h-0 min-w-0 flex-1 flex-col"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {children}

      {active && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-40 grid place-items-center bg-void/70 backdrop-blur-sm"
        >
          <div className="animate-rise mx-4 flex max-w-md flex-col items-center rounded-2xl border-2 border-dashed border-blurple/70 bg-elevated/85 px-8 py-10 text-center shadow-2xl">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-blurple/20 text-blurple-soft">
              <UploadCloudIcon width={26} height={26} />
            </span>
            <p className="mt-3 text-[15px] font-bold tracking-tight text-bright">
              Upload to {target}
            </p>
            <p className="mt-1 text-[12.5px] text-muted">
              Drop images, video, PDFs or zips — up to {MAX_ATTACHMENTS_PER_MESSAGE} files,{" "}
              {formatFileSize(MAX_ATTACHMENT_BYTES)} each.
            </p>
          </div>
        </div>
      )}

      {hint && !active && (
        <div
          role="status"
          className="pointer-events-none absolute inset-x-3 bottom-3 z-40 rounded-lg border border-amber/40 bg-amber/15 px-3 py-2 text-[12px] text-amber backdrop-blur"
        >
          {hint}
        </div>
      )}
    </div>
  );
}
