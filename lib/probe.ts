let cached: { url: string; result: Promise<boolean> } | null = null;

/**
 * Cheap reachability check against the Supabase REST endpoint.
 * Cached per URL so we only pay for it once per page load.
 */
export function isSupabaseReachable(url: string): Promise<boolean> {
  if (!url) return Promise.resolve(false);
  if (cached?.url === url) return cached.result;

  const result = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    try {
      const response = await fetch(`${url}/rest/v1/`, {
        method: "HEAD",
        signal: controller.signal,
        cache: "no-store",
      });
      // Any HTTP response means the host is reachable.
      return response.status < 500;
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  })();

  cached = { url, result };
  return result;
}
