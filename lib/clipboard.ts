/**
 * Clipboard access that tells the truth about whether it worked.
 *
 * `navigator.clipboard` only exists in a secure context and can still be
 * rejected by a permissions policy, so a bare `clipboard.writeText()` inside a
 * `try {} catch {}` produces a button that appears to do nothing: the user
 * clicks "Copy User ID", nothing lands on the clipboard, and there is no
 * feedback at all. Several call sites did exactly that.
 *
 * This tries the modern API, falls back to the legacy selection trick, and
 * reports the outcome so the caller can show an honest message — or surface the
 * value itself rather than silently dropping it.
 */

async function writeWithSelection(value: string): Promise<boolean> {
  if (typeof document === "undefined") return false;
  const area = document.createElement("textarea");
  area.value = value;
  // Off-screen but still selectable; `display: none` cannot be copied.
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.top = "-9999px";
  area.style.opacity = "0";
  document.body.appendChild(area);
  try {
    area.select();
    area.setSelectionRange(0, value.length);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
  }
}

/**
 * Copies `value`, returning whether it actually made it to the clipboard.
 *
 * Never throws — a caller that gets `false` should tell the user instead of
 * pretending the copy happened.
 */
export async function copyText(value: string): Promise<boolean> {
  if (!value) return false;

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Permission denied or an insecure context — fall through.
    }
  }

  return writeWithSelection(value);
}

/**
 * Last-resort fallback for when the clipboard is unavailable: show the value so
 * the user can copy it by hand.
 *
 * Returns `false` when there is no prompt available (e.g. during SSR), so the
 * caller isn't told a copy succeeded when nothing happened.
 */
export function revealValue(label: string, value: string): boolean {
  if (typeof window === "undefined" || typeof window.prompt !== "function") return false;
  window.prompt(`Copy ${label}`, value);
  return true;
}
