import { createApiClient } from "./fetcher";
import { createMotoTwinEndpoints } from "./mototwin-endpoints";
import type {
  PickerDraftCart,
  PickerDraftItemKit,
  PickerDraftItemSku,
  PickerQuantitySubmitResolution,
  PickerSubmitResult,
} from "@mototwin/types";

type MotoTwinEndpoints = ReturnType<typeof createMotoTwinEndpoints>;

export type SubmitPickerDraftApi = Pick<
  MotoTwinEndpoints,
  "createWishlistItem" | "addServiceKitToWishlist" | "updateWishlistItem"
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
export type SubmitPickerDraftOptions = {
  /** Для строк превью `quantityUpgrade`: `addAllFromDraft` | `setQtyToDraft` (см. `@mototwin/types`). */
  quantityResolutions?: PickerQuantitySubmitResolution[];
};

function nextWishlistQtyFromResolution(res: PickerQuantitySubmitResolution): number {
  if (res.mode === "addAllFromDraft") {
    return Math.max(1, Math.trunc(res.existingQty) + Math.trunc(res.draftRequestedQty));
  }
  const existing = Math.max(1, Math.trunc(res.existingQty));
  const draft = Math.max(1, Math.trunc(res.draftRequestedQty));
  /** Не уменьшаем количество в списке: если в подборе меньше или столько же — остаётся `existing`. */
  return Math.max(existing, draft);
}

export async function submitPickerDraft(
  api: SubmitPickerDraftApi,
  draft: PickerDraftCart,
  options?: SubmitPickerDraftOptions
): Promise<PickerSubmitResult> {
  const result: PickerSubmitResult = {
    createdSkuIds: [],
    createdKitCodes: [],
    skipped: [],
    warnings: [],
    createdWishlistItemIds: [],
    updatedWishlistItemIds: [],
    noOpQuantityUpdates: 0,
  };

  const resolutionByDraftId = new Map<string, PickerQuantitySubmitResolution>();
  for (const r of options?.quantityResolutions ?? []) {
    resolutionByDraftId.set(r.draftId, r);
  }

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
      const qtyRes = resolutionByDraftId.get(item.draftId);
      if (qtyRes) {
        try {
          const existingQty = Math.max(1, Math.trunc(qtyRes.existingQty));
          const nextQty = nextWishlistQtyFromResolution(qtyRes);
          if (qtyRes.mode === "setQtyToDraft" && nextQty === existingQty) {
            result.noOpQuantityUpdates = (result.noOpQuantityUpdates ?? 0) + 1;
          } else {
            await api.updateWishlistItem(draft.vehicleId, qtyRes.existingWishlistItemId, {
              nodeId: qtyRes.nodeId,
              quantity: nextQty,
            });
            result.updatedWishlistItemIds.push(qtyRes.existingWishlistItemId);
          }
        } catch (e) {
          const message = e instanceof Error ? e.message : "Не удалось обновить количество";
          result.skipped.push({ kind: "sku", label, reason: message });
        }
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
