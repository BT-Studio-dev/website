import type { Metadata } from "next";
import { CommsLoader } from "@/components/comms-loader";

export const metadata: Metadata = {
  title: "Direct Messages",
};

export default async function DmPage({
  params,
}: {
  params: Promise<{ dmId: string }>;
}) {
  const { dmId } = await params;
  return <CommsLoader serverId="@me" dmId={dmId} />;
}
