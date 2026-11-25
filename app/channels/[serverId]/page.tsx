import { CommsLoader } from "@/components/comms-loader";

export default async function ServerPage({
  params,
}: {
  params: Promise<{ serverId: string }>;
}) {
  const { serverId } = await params;
  return <CommsLoader serverId={serverId} />;
}
