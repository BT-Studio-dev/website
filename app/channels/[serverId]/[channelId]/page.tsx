import { CommsLoader } from "@/components/comms-loader";

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ serverId: string; channelId: string }>;
}) {
  const { serverId, channelId } = await params;
  return <CommsLoader serverId={serverId} channelId={channelId} />;
}
