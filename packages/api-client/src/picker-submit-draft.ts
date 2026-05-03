import { createApiClient } from "./fetcher";
import { createMotoTwinEndpoints } from "./mototwin-endpoints";
import type {
  PickerDraftCart,
  PickerDraftItemKit,
  PickerDraftItemSku,
  PickerSubmitResult,
} from "@mototwin/types";

type MotoTwinEndpoints = ReturnType<typeof createMotoTwinEndpoints>;

export type SubmitPickerDraftApi = Pick<
  MotoTwinEndpoints,
  "createWishlistItem" | "addServiceKitToWishlist"
>;

export function createPickerSubmitApi(baseUrl: string): SubmitPickerDraftApi {
  return createMotoTwinEndpoints(createApiClient({ baseUrl }));
}

function buildSkuLabel(item: PickerDraftItemSku): string {
  const brand = item.sku.brandName?.trim();
  const name = item.sku.canonicalName?.trim();
  if (brand && name) return `${brand} ${name}`;
  return name || brand || "Деталь без названия";
}

function buildKitLabel(item: PickerDraftItemKit): string {
  return item.kit.title || `Комплект ${item.kit.code}`;
}

/**
 * Последовательно отправляет drafts в wishlist:
 * - SKU → POST wishlist
 * - Kit → POST wishlist/kits
 */
export async function submitPickerDraft(
  api: SubmitPickerDraftApi,
  draft: PickerDraftCart
): Promise<PickerSubmitResult> {
  const result: PickerSubmitResult = {
    createdSkuIds: [],
    createdKitCodes: [],
    skipped: [],
    warnings: [],
    createdWishlistItemIds: [],
  };

  for (const item of draft.items) {
    if (item.kind === "sku") {
      const targetNodeId = item.nodeId ?? item.sku.primaryNodeId;
      const label = buildSkuLabel(item);
      if (!targetNodeId) {
        result.skipped.push({
          kind: "sku",
          label,
          reason: "Не выбран узел для позиции",
        });
        continue;
      }
      try {
        const res = await api.createWishlistItem(draft.vehicleId, {
          nodeId: targetNodeId,
          skuId: item.sku.id,
          quantity: Math.max(1, item.quantity),
          status: "NEEDED",
          costAmount: item.sku.priceAmount ?? null,
          currency: item.sku.currency ?? null,
        });
        result.createdSkuIds.push(item.sku.id);
        if (res.item?.id) {
          result.createdWishlistItemIds.push(res.item.id);
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : "Не удалось добавить позицию";
        result.skipped.push({ kind: "sku", label, reason: message });
      }
    } else {
      const label = buildKitLabel(item);
      try {
        const res = await api.addServiceKitToWishlist(draft.vehicleId, {
          kitCode: item.kit.code,
          contextNodeId: item.contextNodeId,
        });
        const kitResult = res.result;
        result.createdKitCodes.push(item.kit.code);
        for (const created of kitResult.createdItems ?? []) {
          if (created.id) result.createdWishlistItemIds.push(created.id);
        }
        for (const sk of kitResult.skippedItems ?? []) {
          result.skipped.push({ kind: "kit", label: `${label} · ${sk.title}`, reason: sk.message });
        }
        for (const warning of kitResult.warnings ?? []) {
          result.warnings.push(warning);
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : "Не удалось добавить комплект";
        result.skipped.push({ kind: "kit", label, reason: message });
      }
    }
  }

  return result;
}
