import { useMemo } from "react";
import { useLocalSearchParams } from "expo-router";
import { WishlistItemEditor } from "./wishlist-item-editor";

export default function NewWishlistItemScreen() {
  const params = useLocalSearchParams<{ id?: string; nodeId?: string; skuId?: string; kitCode?: string }>();
  const vehicleId = typeof params.id === "string" ? params.id : "";
  const presetNodeId = useMemo(() => {
    const raw = params.nodeId;
    return typeof raw === "string" ? raw : "";
  }, [params.nodeId]);
  const presetSkuId = useMemo(() => {
    const raw = params.skuId;
    return typeof raw === "string" ? raw : "";
  }, [params.skuId]);
  const presetKitCode = useMemo(() => {
    const raw = params.kitCode;
    return typeof raw === "string" ? raw : "";
  }, [params.kitCode]);

  return (
    <WishlistItemEditor
      mode="create"
      vehicleId={vehicleId}
      presetNodeId={presetNodeId}
      presetSkuId={presetSkuId}
      presetKitCode={presetKitCode}
    />
  );
}
