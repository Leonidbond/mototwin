import { useLocalSearchParams } from "expo-router";
import { FitmentReportScreen } from "../../../../components/vehicle-wishlist/fitment-report-screen";

export default function WishlistFitmentReportScreen() {
  const params = useLocalSearchParams<{ id?: string; nodeId?: string; partMasterId?: string }>();
  const vehicleId = typeof params.id === "string" ? params.id : "";
  const nodeId = typeof params.nodeId === "string" ? params.nodeId.trim() : "";
  const partMasterId = typeof params.partMasterId === "string" ? params.partMasterId.trim() : "";

  return (
    <FitmentReportScreen vehicleId={vehicleId} nodeId={nodeId} partMasterId={partMasterId} />
  );
}
