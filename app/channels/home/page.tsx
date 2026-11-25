import type { Metadata } from "next";
import { CommsLoader } from "@/components/comms-loader";

export const metadata: Metadata = {
  title: "Direct Messages",
  description: "Your friends, DMs, and active conversations on BT Comms.",
};

export default function HomePage() {
  return <CommsLoader serverId="@me" />;
}
