import { useEffect, useMemo, useRef } from "react";
import { ActivityIndicator, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { productSemanticColors as c } from "@mototwin/design-tokens";

const FORWARD_QUERY_KEYS = [
  "wishlistItemId",
  "nodeId",
  "partsSearch",
  "serviceEventId",
  "returnTo",
] as const;

/**
 * Паритет с web `/vehicles/[id]/parts`: «Корзина замен».
 * В Expo основной экран — `wishlist/index`, сюда только прокидываем query.
 */
export default function VehiclePartsEntryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const vehicleId = typeof params.id === "string" ? params.id : "";
  const lastReplacedRef = useRef<string | null>(null);

  const targetHref = useMemo(() => {
    if (!vehicleId) return null;
    const q = new URLSearchParams();
    for (const key of FORWARD_QUERY_KEYS) {
      const raw = params[key];
      const v = Array.isArray(raw) ? raw[0] : raw;
      if (typeof v === "string" && v.trim()) {
        q.set(key, v.trim());
      }
    }
    const suffix = q.toString() ? `?${q.toString()}` : "";
    return `/vehicles/${vehicleId}/wishlist${suffix}`;
  }, [params, vehicleId]);

  useEffect(() => {
    if (!targetHref || lastReplacedRef.current === targetHref) return;
    lastReplacedRef.current = targetHref;
    router.replace(targetHref as never);
  }, [router, targetHref]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.canvas }}>
      <ActivityIndicator size="large" color={c.textPrimary} />
    </View>
  );
}
