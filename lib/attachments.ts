import type { SupabaseClient } from "@supabase/supabase-js";
import type { Attachment } from "./types.ts";

/**
 * Attachment helpers — shared by the composer, the feed and the demo store.
 *
 * Files live in the public `chat-attachments` bucket under
 * `<userId>/<uuid>-<slugified-name>`, which matches the storage RLS rule
 * (`(storage.foldername(name))[1] = auth.uid()`).
 */

export const CHAT_ATTACHMENTS_BUCKET = "chat-attachments";

/** 25 MB — mirrors the bucket's file_size_limit. */
export const MAX_ATTACHMENT_BYTES = 26_214_400;

/** At most this many files can ride on one message. */
export const MAX_ATTACHMENTS_PER_MESSAGE = 10;

export const ATTACHMENT_ACCEPT =
  "image/*,video/*,.pdf,.zip,.txt,.md,.json";

const ALLOWED_MIME_PREFIXES = ["image/", "video/", "text/"];
const ALLOWED_MIME_EXACT = [
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/json",
  "application/octet-stream",
];

export type FileLike = {
  name: string;
  type: string;
  size: number;
};

/** Human-readable byte count: 998 B · 1.4 KB · 12.6 MB. */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  // One decimal under 10 units, a whole number above — and never a ".0" tail.
  const tidy = (value: number) => (value < 10 ? value.toFixed(1).replace(/\.0$/, "") : String(Math.round(value)));
  const kb = bytes / 1024;
  if (kb < 1024) return `${tidy(kb)} KB`;
  return `${tidy(kb / 1024)} MB`;
}

/** `My Screenshot (1).PNG` → `my-screenshot-1.png`. */
export function slugifyFileName(name: string): string {
  const dot = name.lastIndexOf(".");
  const base = (dot > 0 ? name.slice(0, dot) : name).toLowerCase();
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
  const slug =
    base
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "file";
  return ext ? `${slug}.${ext.replace(/[^a-z0-9]/g, "")}` : slug;
}

/** Object path inside the bucket, scoped to the uploader. */
export function attachmentPath(userId: string, name: string): string {
  const unique =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${userId}/${unique}-${slugifyFileName(name)}`;
}

export function isAllowedMimeType(type: string): boolean {
  if (!type) return false;
  if (ALLOWED_MIME_PREFIXES.some((prefix) => type.startsWith(prefix))) return true;
  return ALLOWED_MIME_EXACT.includes(type);
}

/**
 * Validate a file before it touches the network.
 * Returns `{ ok: true }` or a human-readable reason.
 */
export function validateAttachment(file: FileLike): { ok: boolean; message?: string } {
  if (!isAllowedMimeType(file.type)) {
    return {
      ok: false,
      message: `${file.name} isn't a supported file type — images, video, PDF, zip or text.`,
    };
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return {
      ok: false,
      message: `${file.name} is ${formatFileSize(file.size)} — the limit is ${formatFileSize(MAX_ATTACHMENT_BYTES)}.`,
    };
  }
  if (file.size === 0) {
    return { ok: false, message: `${file.name} is empty.` };
  }
  return { ok: true };
}

/** Upload one file and return the attachment descriptor to store on the row. */
export async function uploadAttachment(
  supabase: SupabaseClient,
  userId: string,
  file: File,
): Promise<{ attachment: Attachment | null; error: string | null }> {
  const check = validateAttachment(file);
  if (!check.ok) return { attachment: null, error: check.message ?? "That file can't be uploaded." };

  const path = attachmentPath(userId, file.name);
  const { error } = await supabase.storage
    .from(CHAT_ATTACHMENTS_BUCKET)
    .upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });

  if (error) {
    return {
      attachment: null,
      error: error.message.toLowerCase().includes("row-level security")
        ? "Storage rejected the upload — sign out and back in, then try again."
        : `Upload failed: ${error.message}`,
    };
  }

  const { data } = supabase.storage.from(CHAT_ATTACHMENTS_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) return { attachment: null, error: "Could not build a public URL for that file." };

  return {
    attachment: {
      url: data.publicUrl,
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
    },
    error: null,
  };
}

/** Upload many files, keeping successes and collecting the first failure. */
export async function uploadAttachments(
  supabase: SupabaseClient,
  userId: string,
  files: File[],
): Promise<{ attachments: Attachment[]; errors: string[] }> {
  const attachments: Attachment[] = [];
  const errors: string[] = [];
  for (const file of files.slice(0, MAX_ATTACHMENTS_PER_MESSAGE)) {
    const result = await uploadAttachment(supabase, userId, file);
    if (result.attachment) attachments.push(result.attachment);
    if (result.error) errors.push(result.error);
  }
  return { attachments, errors };
}

/** Local object URL for the pending tray (never uploaded). */
export function previewUrl(file: File): string {
  if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") return "";
  return URL.createObjectURL(file);
}

export function isImageAttachment(attachment: Attachment): boolean {
  return attachment.type.startsWith("image/");
}

export function isVideoAttachment(attachment: Attachment): boolean {
  return attachment.type.startsWith("video/");
}

/** Trim, drop empties, dedupe by URL. */
export function normalizeAttachments(input: unknown): Attachment[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: Attachment[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Partial<Attachment>;
    if (typeof item.url !== "string" || !item.url) continue;
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    out.push({
      url: item.url,
      name: typeof item.name === "string" && item.name ? item.name : "attachment",
      type: typeof item.type === "string" && item.type ? item.type : "application/octet-stream",
      size: typeof item.size === "number" && Number.isFinite(item.size) ? item.size : 0,
    });
  }
  return out.slice(0, MAX_ATTACHMENTS_PER_MESSAGE);
}

/** `https://…/ada/9f2-shot.png` → `shot.png` (for a download attribute). */
export function fileNameFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    const last = path.split("/").pop() ?? "attachment";
    return decodeURIComponent(last).replace(/^[a-f0-9]{8}-/, "");
  } catch {
    return url.split("/").pop() ?? "attachment";
  }
}
