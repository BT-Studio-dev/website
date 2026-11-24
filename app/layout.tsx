import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { APPEARANCE_BOOT_SCRIPT } from "@/lib/theme-boot";

export const metadata: Metadata = {
  metadataBase: new URL("https://btcomms.gg"),
  title: {
    default: "BT Comms — Talk, hang out, ship",
    template: "%s · BT Comms",
  },
  description:
    "BT Comms is a fast, realtime chat and voice workspace by BT Studio. Servers, channels, live message feeds, and presence — all in one dark, focused place.",
  applicationName: "BT Comms",
  authors: [{ name: "BT Studio", url: "https://btcomms.gg" }],
  keywords: [
    "BT Comms",
    "btcomms",
    "chat",
    "realtime",
    "voice channels",
    "team communication",
    "BT Studio",
  ],
  openGraph: {
    type: "website",
    url: "https://btcomms.gg",
    siteName: "BT Comms",
    title: "BT Comms — Talk, hang out, ship",
    description:
      "Servers, channels, a live message feed, and presence. Built with Next.js and Supabase by BT Studio.",
  },
  twitter: {
    card: "summary_large_image",
    title: "BT Comms — Talk, hang out, ship",
    description:
      "A fast, realtime chat and voice workspace by BT Studio.",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0d12",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Replays the saved theme before first paint — no wrong-theme flash. */}
        <script dangerouslySetInnerHTML={{ __html: APPEARANCE_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-dvh overflow-x-hidden bg-void text-bright antialiased">
        {children}
      </body>
    </html>
  );
}
