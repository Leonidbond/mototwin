import { FitmentReportPageClient } from "./FitmentReportPageClient";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ partMasterId?: string; nodeId?: string }>;
};

export default async function Page({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const partMasterId = sp.partMasterId?.trim() || "";
  const nodeId = sp.nodeId?.trim() || "";
  if (!partMasterId || !nodeId) {
    return (
      <div style={{ padding: 24, color: "#feb2b2" }}>
        Укажите параметры <code>partMasterId</code> и <code>nodeId</code> в адресе страницы.
      </div>
    );
  }
  return <FitmentReportPageClient vehicleId={id} partMasterId={partMasterId} nodeId={nodeId} />;
}
