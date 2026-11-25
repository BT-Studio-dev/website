import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  /**
   * Canonical Discord-style URLs.
   *
   * `/channels/@me` can't exist as a route directory (Next treats `@me` as a
   * parallel-route slot), so the friendly URL is rewritten onto the real
   * `/channels/home` routes at the config level. Header, proxy and CDN caches
   * all see the same 200 for the canonical path.
   */
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/channels/@me", destination: "/channels/home" },
        { source: "/channels/@me/:dmId", destination: "/channels/home/:dmId" },
      ],
    };
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Embedding is allowed for our own preview hosts; everything else is
          // blocked, which keeps clickjacking protection without breaking the
          // sandboxed live preview.
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://*.e2b.app https://btcomms.gg https://*.vercel.app",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
