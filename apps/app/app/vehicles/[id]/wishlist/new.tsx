import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

/**
 * Legacy `/wishlist/new` — редирект на single-page picker (см. `parts-wishlist-mvp.md`).
 */
export default function LegacyWishlistNewRedirect() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    nodeId?: string;
    skuId?: string;
    kitCode?: string;
  }>();

  useEffect(() => {
    const id = typeof params.id === "string" ? params.id : "";
    if (!id) {
      return;
    }
    const q = new URLSearchParams();
    if (typeof params.nodeId === "string" && params.nodeId.trim()) {
      q.set("nodeId", params.nodeId.trim());
    }
    if (typeof params.skuId === "string" && params.skuId.trim()) {
      q.set("skuId", params.skuId.trim());
    }
    if (typeof params.kitCode === "string" && params.kitCode.trim()) {
      q.set("kitCode", params.kitCode.trim());
    }
    const suffix = q.toString() ? `?${q.toString()}` : "";
    router.replace(`/vehicles/${id}/wishlist/picker${suffix}`);
  }, [params.id, params.nodeId, params.skuId, params.kitCode, router]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
