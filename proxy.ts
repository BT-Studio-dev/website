import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/channels"];
const AUTH_PAGES = ["/login", "/signup"];

/**
 * Lightweight session gate.
 *
 * The auth cookie written by @supabase/ssr contains a readable JWT, so the
 * routing decision happens locally — no round-trip to Supabase on every
 * request. Real authorisation is enforced by Postgres row-level security;
 * this only chooses which screen to render.
 */
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const signedIn =
    hasSupabaseSession(request) ||
    // `?demo=1` lets reviewers open the workspace without an account.
    request.nextUrl.searchParams.has("demo");

  if (PROTECTED_PREFIXES.some((p) => path.startsWith(p)) && !signedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (AUTH_PAGES.includes(path) && signedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/channels";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)",
  ],
};

/** Looks for a Supabase auth cookie holding a non-expired access token. */
function hasSupabaseSession(request: NextRequest): boolean {
  for (const cookie of request.cookies.getAll()) {
    if (!/^sb-.*-auth-token(\.\d+)?$/.test(cookie.name)) continue;
    const raw = cookie.value;
    if (!raw) continue;

    if (raw.startsWith("base64-")) {
      try {
        const decoded = JSON.parse(atob(raw.slice(7))) as { expires_at?: number };
        if (decoded?.expires_at && decoded.expires_at * 1000 > Date.now()) return true;
      } catch {
        /* ignore */
      }
      continue;
    }

    const payloadPart = raw.split(".")[1];
    if (!payloadPart) {
      try {
        const parsed = JSON.parse(decodeURIComponent(raw)) as { expires_at?: number };
        if (parsed?.expires_at && parsed.expires_at * 1000 > Date.now()) return true;
      } catch {
        /* ignore */
      }
      continue;
    }

    try {
      const payload = JSON.parse(
        atob(payloadPart.replace(/-/g, "+").replace(/_/g, "/")),
      ) as { exp?: number };
      if (!payload.exp || payload.exp * 1000 > Date.now()) return true;
    } catch {
      /* ignore malformed cookies */
    }
  }

  return false;
}
