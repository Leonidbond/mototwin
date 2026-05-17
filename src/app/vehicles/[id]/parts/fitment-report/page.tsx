import { PartCompatibilityReportPageClient } from "./PartCompatibilityReportPageClient";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ partMasterId?: string; nodeId?: string }>;
};

export default async function Page({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const partMasterId = sp.partMasterId?.trim() || "";
  const nodeId = sp.nodeId?.trim() || "";
  return <PartCompatibilityReportPageClient vehicleId={id} partMasterId={partMasterId} nodeId={nodeId} />;
}
