import { CommunityPartPageClient } from "./CommunityPartPageClient";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nodeId?: string }>;
};

export default async function Page({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const initialNodeId = sp.nodeId?.trim() || "";
  return <CommunityPartPageClient vehicleId={id} initialNodeId={initialNodeId} />;
}
