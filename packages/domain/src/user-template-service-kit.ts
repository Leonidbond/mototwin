import type {
  AddServiceEventFormValues,
  PartRecommendationViewModel,
  PartSkuViewModel,
  ServiceActionType,
  ServiceKitDefinition,
  ServiceKitItemDefinition,
} from "@mototwin/types";
import { createEmptyBundleItemFormValues, createInitialAddServiceEventFormValues } from "./forms";

/** Prefix for synthetic service kit codes derived from {@link UserServiceEventFormTemplate}. */
export const USER_SERVICE_KIT_CODE_PREFIX = "user_template:" as const;

export function isUserServiceKitCode(kitCode: string): boolean {
  return kitCode.startsWith(USER_SERVICE_KIT_CODE_PREFIX);
}

export function buildUserServiceKitCode(templateId: string): string {
  return `${USER_SERVICE_KIT_CODE_PREFIX}${templateId.trim()}`;
}

export function parseUserServiceKitTemplateId(kitCode: string): string | null {
  if (!isUserServiceKitCode(kitCode)) {
    return null;
  }
  const id = kitCode.slice(USER_SERVICE_KIT_CODE_PREFIX.length).trim();
  return id.length > 0 ? id : null;
}

export type NodeRefLite = {
  code: string;
  name: string;
};

function parseBundleQuantity(raw: string): number {
  const t = raw.trim();
  if (!t) return 1;
  const n = Number.parseInt(t, 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n > 9999 ? 9999 : n;
}

function rankRecommendations(recs: PartRecommendationViewModel[]): PartRecommendationViewModel[] {
  const recommendationTypeRank: Record<string, number> = {
    EXACT_FIT: 0,
    MODEL_FIT: 1,
    GENERIC_NODE_MATCH: 2,
    RELATED_CONSUMABLE: 3,
    VERIFY_REQUIRED: 4,
  };
  return [...recs].sort((a, b) => {
    const byType =
      (recommendationTypeRank[a.recommendationType] ?? 99) -
      (recommendationTypeRank[b.recommendationType] ?? 99);
    if (byType !== 0) return byType;
    if (a.confidence !== b.confidence) return b.confidence - a.confidence;
    const byPrice = Number(b.priceAmount != null) - Number(a.priceAmount != null);
    if (byPrice !== 0) return byPrice;
    return a.canonicalName.localeCompare(b.canonicalName, "ru");
  });
}

/**
 * Picks partType + preferredSkuId for a bundle row using catalog recommendations (same vehicle context).
 */
export function inferKitItemPartBinding(args: {
  skuField: string;
  partNameField: string;
  recommendations: PartRecommendationViewModel[];
}): { partType: string; preferredSkuId: string | null } {
  const recs = args.recommendations;
  if (recs.length === 0) {
    return { partType: "UNKNOWN", preferredSkuId: null };
  }
  const ranked = rankRecommendations(recs);
  const skuNeedle = args.skuField.trim().toLowerCase();
  if (skuNeedle) {
    for (const r of recs) {
      if (r.skuId === args.skuField.trim()) {
        return { partType: r.partType, preferredSkuId: r.skuId };
      }
    }
    for (const r of recs) {
      const hit = r.partNumbers.some((n) => {
        const raw = typeof n?.number === "string" ? n.number : "";
        return raw.trim().toLowerCase() === skuNeedle;
      });
      if (hit) {
        return { partType: r.partType, preferredSkuId: r.skuId };
      }
    }
  }
  const nameNeedle = args.partNameField.trim().toLowerCase();
  if (nameNeedle) {
    const byName = recs.find((r) => r.canonicalName.trim().toLowerCase() === nameNeedle);
    if (byName) {
      return { partType: byName.partType, preferredSkuId: byName.skuId };
    }
  }
  const top = ranked[0];
  return { partType: top?.partType ?? "UNKNOWN", preferredSkuId: null };
}

/**
 * Builds a synthetic {@link ServiceKitDefinition} from an ADVANCED add-service-event form snapshot.
 */
export function advancedFormToSyntheticServiceKitDefinition(args: {
  templateId: string;
  form: AddServiceEventFormValues;
  nodesById: Map<string, NodeRefLite>;
  recommendationsByNodeCode: Map<string, PartRecommendationViewModel[]>;
}): ServiceKitDefinition | null {
  const { templateId, form, nodesById, recommendationsByNodeCode } = args;
  if (form.mode !== "ADVANCED" || form.items.length === 0) {
    return null;
  }
  const kitCode = buildUserServiceKitCode(templateId);
  const items: ServiceKitItemDefinition[] = [];
  const targetCodes = new Set<string>();

  for (const row of form.items) {
    const nodeId = row.nodeId.trim();
    if (!nodeId) {
      continue;
    }
    const node = nodesById.get(nodeId);
    if (!node) {
      continue;
    }
    const nodeCode = node.code;
    targetCodes.add(nodeCode);
    const recs = recommendationsByNodeCode.get(nodeCode) ?? [];
    const { partType, preferredSkuId } = inferKitItemPartBinding({
      skuField: row.sku,
      partNameField: row.partName,
      recommendations: recs,
    });
    const title = row.partName.trim() || node.name;
    items.push({
      key: row.key,
      title,
      nodeCode,
      partType,
      quantity: parseBundleQuantity(row.quantity),
      role: "PRIMARY",
      required: true,
      preferredSkuId: preferredSkuId ?? undefined,
    });
  }

  if (items.length === 0) {
    return null;
  }

  return {
    id: `USER_TEMPLATE_${templateId}`,
    code: kitCode,
    title: form.title.trim() || "Мой комплект",
    description: form.comment.trim() || "Пользовательский комплект из шаблона сервисного журнала.",
    targetNodeCodes: [...targetCodes],
    items,
  };
}

export function filterUserTemplateKitsByContextNode(
  kits: ServiceKitDefinition[],
  contextNodeCode: string | null
): ServiceKitDefinition[] {
  if (!contextNodeCode?.trim()) {
    return kits;
  }
  const code = contextNodeCode.trim();
  return kits.filter((kit) => kit.targetNodeCodes.some((c) => c === code));
}

export type WishlistKitTemplateSourceMeta = {
  kitTitle: string;
  kitCode: string;
  builtIn: boolean;
};

export type WishlistRowSnapshotInput = {
  nodeId: string;
  actionType?: ServiceActionType;
  skuId: string | null;
  displaySku: string;
  partName: string;
  quantity: number;
};

/**
 * Builds an ADVANCED {@link AddServiceEventFormValues} snapshot from wishlist lines created by a kit add.
 */
/**
 * ADVANCED form snapshot from picker draft SKU lines (сохранение «своего комплекта»).
 */
export function advancedServiceKitSnapshotFromPickerLines(args: {
  title: string;
  extraComment?: string;
  lines: Array<{
    nodeId: string | null;
    sku: PartSkuViewModel;
    quantity: number;
  }>;
}): AddServiceEventFormValues | null {
  const lines = args.lines.filter((l) => {
    const nid = (l.nodeId?.trim() || l.sku.primaryNodeId)?.trim();
    return Boolean(nid);
  });
  if (lines.length === 0) {
    return null;
  }
  const base = createInitialAddServiceEventFormValues();
  const items = lines.map((l) => {
    const nodeId = (l.nodeId?.trim() || l.sku.primaryNodeId)!.trim();
    const pn = l.sku.partNumbers[0]?.number?.trim() ?? "";
    const label = [l.sku.brandName?.trim(), l.sku.canonicalName?.trim()].filter(Boolean).join(" ").trim();
    return createEmptyBundleItemFormValues({
      nodeId,
      actionType: "REPLACE",
      partName: label || l.sku.canonicalName,
      sku: pn,
      quantity: String(Math.max(1, Math.trunc(l.quantity))),
    });
  });
  return {
    ...base,
    title: args.title.trim(),
    mode: "ADVANCED",
    commonActionType: "REPLACE",
    comment: args.extraComment?.trim() ?? "",
    items,
  };
}

export function wishlistRowsToAdvancedFormForTemplate(args: {
  rows: WishlistRowSnapshotInput[];
  source: WishlistKitTemplateSourceMeta;
}): AddServiceEventFormValues {
  const base = createInitialAddServiceEventFormValues();
  const { kitTitle, kitCode } = args.source;
  const today = new Date();
  const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const titleRu = `Из комплекта: ${kitTitle} · ${ymd}`;
  const items = args.rows.map((r) =>
    createEmptyBundleItemFormValues({
      nodeId: r.nodeId,
      actionType: r.actionType ?? "REPLACE",
      partName: r.partName,
      sku: r.displaySku,
      quantity: String(Math.max(1, Math.trunc(r.quantity || 1))),
      comment: "",
    })
  );
  return {
    ...base,
    title: titleRu,
    mode: "ADVANCED",
    commonActionType: "REPLACE",
    eventDate: "",
    odometer: "",
    engineHours: "",
    partsCost: "",
    laborCost: "",
    comment: `Источник: комплект ${args.source.builtIn ? "каталога" : "пользовательский"} «${kitTitle}» (${kitCode}).`,
    items: items.length > 0 ? items : [createEmptyBundleItemFormValues()],
  };
}
