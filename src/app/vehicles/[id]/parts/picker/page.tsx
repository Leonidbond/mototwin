import { PartPickerPage } from "./_components/PartPickerPage";

type PartPickerRouteProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    nodeId?: string;
    focus?: string;
  }>;
};

export default async function PartPickerRoute({
  params,
  searchParams,
}: PartPickerRouteProps) {
  const [{ id: vehicleId }, sp] = await Promise.all([params, searchParams]);
  const initialNodeId = sp.nodeId?.trim() || null;
  const initialFocus = sp.focus === "kits" ? "kits" : "all";
  return (
    <PartPickerPage
      vehicleId={vehicleId}
      initialNodeId={initialNodeId}
      initialFocus={initialFocus}
    />
  );
}
