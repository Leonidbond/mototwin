import { useMemo } from "react";
import { useLocalSearchParams } from "expo-router";
import { WishlistItemEditor } from "./wishlist-item-editor";

export default function NewWishlistItemScreen() {
  const params = useLocalSearchParams<{ id?: string; nodeId?: string }>();
  const vehicleId = typeof params.id === "string" ? params.id : "";
  const presetNodeId = useMemo(() => {
    const raw = params.nodeId;
    return typeof raw === "string" ? raw : "";
  }, [params.nodeId]);

  return (
    <WishlistItemEditor mode="create" vehicleId={vehicleId} presetNodeId={presetNodeId} />
  );
}
