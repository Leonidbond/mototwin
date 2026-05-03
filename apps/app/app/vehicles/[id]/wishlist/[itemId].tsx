import { useMemo } from "react";
import { useLocalSearchParams } from "expo-router";
import { WishlistItemEditor } from "./wishlist-item-editor";

export default function EditWishlistItemScreen() {
  const params = useLocalSearchParams<{ id?: string; itemId?: string }>();
  const vehicleId = typeof params.id === "string" ? params.id : "";
  const itemId = useMemo(() => {
    const raw = params.itemId;
    return typeof raw === "string" ? raw : "";
  }, [params.itemId]);

  return <WishlistItemEditor vehicleId={vehicleId} itemId={itemId} />;
}
