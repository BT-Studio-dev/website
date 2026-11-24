import type { Metadata } from "next";
import { CommsLoader } from "@/components/comms-loader";

export const metadata: Metadata = {
  title: "Channels",
  description: "Your BT Comms workspace — channels, messages, and members.",
};

export default function ChannelsPage() {
  return <CommsLoader />;
}
