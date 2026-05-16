import { useLocalSearchParams } from "expo-router";
import { CommunityPartScreen } from "../../../../components/vehicle-wishlist/community-part-screen";

export default function WishlistCommunityScreen() {
  const params = useLocalSearchParams<{ id?: string; nodeId?: string; partMasterId?: string }>();
  const vehicleId = typeof params.id === "string" ? params.id : "";
  const initialNodeId = typeof params.nodeId === "string" ? params.nodeId.trim() : "";
  const partMasterId = typeof params.partMasterId === "string" ? params.partMasterId.trim() : "";

  return (
    <CommunityPartScreen
      vehicleId={vehicleId}
      initialNodeId={initialNodeId}
      initialPartMasterId={partMasterId}
    />
  );
}
