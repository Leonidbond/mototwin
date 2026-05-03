import type {
  AddServiceKitToWishlistSkippedItem,
  PartRecommendationType,
  PartRecommendationViewModel,
  PartWishlistItem,
  ServiceKitDefinition,
  ServiceKitItemDefinition,
  ServiceKitPreviewItemStatus,
  ServiceKitPreviewViewModel,
  ServiceKitViewModel,
} from "@mototwin/types";
import { isActiveWishlistItem, WISHLIST_KIT_ORIGIN_PREFIX_RU } from "./part-wishlist";

export type ServiceKitWishlistDraft = {
  itemKey: string;
  title: string;
  nodeId: string;
  skuId: string | null;
  quantity: number;
  status: "NEEDED";
  comment: string | null;
  costAmount: number | null;
  currency: string | null;
};

export type ExpandServiceKitSkip = AddServiceKitToWishlistSkippedItem;

type ExistingActiveWishlistItem = {
  nodeId: string | null;
  skuId: string | null;
  title: string;
};

type ExpandServiceKitParams = {
  kit: ServiceKitDefinition;
  nodeIdByCode: Map<string, string>;
  nodeIssueByCode?: Map<string, "MISSING_NODE" | "NON_LEAF_NODE">;
  recommendationsByNodeCode: Map<string, PartRecommendationViewModel[]>;
  existingActiveItems: ExistingActiveWishlistItem[];
};

const recommendationTypeRank: Record<PartRecommendationType, number> = {
  EXACT_FIT: 0,
  MODEL_FIT: 1,
  GENERIC_NODE_MATCH: 2,
  RELATED_CONSUMABLE: 3,
  VERIFY_REQUIRED: 4,
};

type ServiceKitNodeRef = {
  id: string;
  name: string;
  hasChildren: boolean;
};

export const SERVICE_KIT_DEFINITIONS: ServiceKitDefinition[] = [
  {
    id: "ENGINE_OIL_CHANGE_KIT",
    code: "ENGINE_OIL_CHANGE_KIT",
    title: "Комплект: замена масла",
    description: "Масло, фильтр и прокладка/шайба для плановой замены масла.",
    targetNodeCodes: ["ENGINE.LUBE.OIL", "ENGINE.LUBE.FILTER"],
    items: [
      {
        key: "ENGINE_OIL",
        title: "Масло двигателя",
        nodeCode: "ENGINE.LUBE.OIL",
        partType: "ENGINE_OIL",
        quantity: 1,
        role: "PRIMARY",
        required: true,
      },
      {
        key: "OIL_FILTER",
        title: "Масляный фильтр",
        nodeCode: "ENGINE.LUBE.FILTER",
        partType: "OIL_FILTER",
        quantity: 1,
        role: "PRIMARY",
        required: true,
      },
      {
        key: "DRAIN_WASHER",
        title: "Прокладка/шайба сливной пробки",
        nodeCode: "ENGINE.LUBE.OIL",
        partType: "DRAIN_PLUG_WASHER",
        quantity: 1,
        role: "RELATED_CONSUMABLE",
        required: false,
      },
    ],
  },
  {
    id: "FRONT_BRAKE_SERVICE_KIT",
    code: "FRONT_BRAKE_SERVICE_KIT",
    title: "Комплект: передний тормоз",
    description: "Передние колодки, очиститель и тормозная жидкость.",
    targetNodeCodes: ["BRAKES.FRONT.PADS", "BRAKES.FLUID"],
    items: [
      {
        key: "FRONT_PADS",
        title: "Передние тормозные колодки",
        nodeCode: "BRAKES.FRONT.PADS",
        partType: "BRAKE_PADS_FRONT",
        quantity: 1,
        role: "PRIMARY",
        required: true,
      },
      {
        key: "BRAKE_CLEANER",
        title: "Очиститель тормозов",
        nodeCode: "BRAKES.FRONT.PADS",
        partType: "BRAKE_CLEANER",
        quantity: 1,
        role: "RELATED_CONSUMABLE",
        required: false,
      },
      {
        key: "BRAKE_FLUID",
        title: "Тормозная жидкость",
        nodeCode: "BRAKES.FLUID",
        partType: "BRAKE_FLUID",
        quantity: 1,
        role: "RELATED_CONSUMABLE",
        required: false,
      },
    ],
  },
  {
    id: "REAR_BRAKE_SERVICE_KIT",
    code: "REAR_BRAKE_SERVICE_KIT",
    title: "Комплект: задний тормоз",
    description: "Задние колодки, очиститель и тормозная жидкость.",
    targetNodeCodes: ["BRAKES.REAR.PADS", "BRAKES.FLUID"],
    items: [
      {
        key: "REAR_PADS",
        title: "Задние тормозные колодки",
        nodeCode: "BRAKES.REAR.PADS",
        partType: "BRAKE_PADS_REAR",
        quantity: 1,
        role: "PRIMARY",
        required: true,
      },
      {
        key: "BRAKE_CLEANER",
        title: "Очиститель тормозов",
        nodeCode: "BRAKES.REAR.PADS",
        partType: "BRAKE_CLEANER",
        quantity: 1,
        role: "RELATED_CONSUMABLE",
        required: false,
      },
      {
        key: "BRAKE_FLUID",
        title: "Тормозная жидкость",
        nodeCode: "BRAKES.FLUID",
        partType: "BRAKE_FLUID",
        quantity: 1,
        role: "RELATED_CONSUMABLE",
        required: false,
      },
    ],
  },
  {
    id: "CHAIN_SERVICE_KIT",
    code: "CHAIN_SERVICE_KIT",
    title: "Комплект: цепной привод",
    description: "Цепь, звезды и смазка для обслуживания привода.",
    targetNodeCodes: [
      "DRIVETRAIN.CHAIN",
      "DRIVETRAIN.FRONT_SPROCKET",
      "DRIVETRAIN.REAR_SPROCKET",
    ],
    items: [
      {
        key: "CHAIN",
        title: "Цепь",
        nodeCode: "DRIVETRAIN.CHAIN",
        partType: "CHAIN",
        quantity: 1,
        role: "PRIMARY",
        required: true,
      },
      {
        key: "FRONT_SPROCKET",
        title: "Передняя звезда",
        nodeCode: "DRIVETRAIN.FRONT_SPROCKET",
        partType: "FRONT_SPROCKET",
        quantity: 1,
        role: "PRIMARY",
        required: false,
      },
      {
        key: "REAR_SPROCKET",
        title: "Задняя звезда",
        nodeCode: "DRIVETRAIN.REAR_SPROCKET",
        partType: "REAR_SPROCKET",
        quantity: 1,
        role: "PRIMARY",
        required: false,
      },
      {
        key: "CHAIN_LUBE",
        title: "Смазка цепи",
        nodeCode: "DRIVETRAIN.CHAIN",
        partType: "CHAIN_LUBE",
        quantity: 1,
        role: "RELATED_CONSUMABLE",
        required: false,
      },
    ],
  },
  {
    id: "TIRE_FRONT_REPLACEMENT_KIT",
    code: "TIRE_FRONT_REPLACEMENT_KIT",
    title: "Комплект: передняя шина",
    description: "Передняя шина и сопутствующие расходники, если доступны.",
    targetNodeCodes: ["TIRES.FRONT"],
    items: [
      {
        key: "TIRE_FRONT",
        title: "Передняя шина",
        nodeCode: "TIRES.FRONT",
        partType: "TIRE_FRONT",
        quantity: 1,
        role: "PRIMARY",
        required: true,
      },
      {
        key: "FRONT_RIMLOCK",
        title: "Буксатор/ободная лента (перед)",
        nodeCode: "TIRES.RIMLOCK",
        partType: "RIM_LOCK",
        quantity: 1,
        role: "RELATED_CONSUMABLE",
        required: false,
      },
    ],
  },
  {
    id: "TIRE_REAR_REPLACEMENT_KIT",
    code: "TIRE_REAR_REPLACEMENT_KIT",
    title: "Комплект: задняя шина",
    description: "Задняя шина и сопутствующие расходники, если доступны.",
    targetNodeCodes: ["TIRES.REAR"],
    items: [
      {
        key: "TIRE_REAR",
        title: "Задняя шина",
        nodeCode: "TIRES.REAR",
        partType: "TIRE_REAR",
        quantity: 1,
        role: "PRIMARY",
        required: true,
      },
      {
        key: "REAR_RIMLOCK",
        title: "Буксатор/ободная лента (зад)",
        nodeCode: "TIRES.RIMLOCK",
        partType: "RIM_LOCK",
        quantity: 1,
        role: "RELATED_CONSUMABLE",
        required: false,
      },
    ],
  },
];

export function getServiceKitsForNode(nodeCode?: string | null): ServiceKitDefinition[] {
  if (!nodeCode?.trim()) {
    return SERVICE_KIT_DEFINITIONS;
  }
  const code = nodeCode.trim();
  return SERVICE_KIT_DEFINITIONS.filter((kit) =>
    kit.targetNodeCodes.some((target) => target === code)
  );
}

export function chooseBestSkuForKitItem(
  recommendations: PartRecommendationViewModel[],
  item: ServiceKitItemDefinition
): PartRecommendationViewModel | null {
  const candidates = recommendations.filter((rec) => rec.partType === item.partType);
  if (candidates.length === 0) {
    return null;
  }
  return [...candidates].sort((a, b) => {
    const byType =
      recommendationTypeRank[a.recommendationType] - recommendationTypeRank[b.recommendationType];
    if (byType !== 0) return byType;
    if (a.confidence !== b.confidence) return b.confidence - a.confidence;
    const byPrice = Number(b.priceAmount != null) - Number(a.priceAmount != null);
    if (byPrice !== 0) return byPrice;
    return a.canonicalName.localeCompare(b.canonicalName, "ru");
  })[0];
}

export function buildServiceKitViewModel(
  definition: ServiceKitDefinition,
  recommendationsByNodeCode?: Map<string, PartRecommendationViewModel[]>,
  warningsByItemKey?: Map<string, string>
): ServiceKitViewModel {
  return {
    id: definition.id,
    code: definition.code,
    title: definition.title,
    description: definition.description,
    targetNodeCodes: definition.targetNodeCodes,
    items: definition.items.map((item) => {
      const recs = recommendationsByNodeCode?.get(item.nodeCode) ?? [];
      const picked = chooseBestSkuForKitItem(recs, item);
      return {
        key: item.key,
        title: item.title,
        nodeCode: item.nodeCode,
        partType: item.partType,
        quantity: item.quantity,
        role: item.role,
        required: item.required,
        matchedSkuId: picked?.skuId ?? null,
        matchedPartNumbers: picked?.partNumbers?.map((n) => n.trim()).filter(Boolean) ?? [],
        matchedSkuTitle: picked?.canonicalName ?? null,
        matchedPriceAmount: picked?.priceAmount ?? null,
        matchedCurrency: picked?.currency?.trim() || null,
        recommendationType: picked?.recommendationType ?? null,
        warning: warningsByItemKey?.get(item.key) ?? null,
      };
    }),
  };
}

export function normalizeWishlistTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ").toLowerCase();
}

function buildActiveDuplicateSets(items: ExistingActiveWishlistItem[]) {
  const existingSkuKeys = new Set(
    items
      .filter((item) => item.nodeId && item.skuId)
      .map((item) => `${item.nodeId}|${item.skuId}`)
  );
  const existingManualKeys = new Set(
    items
      .filter((item) => item.nodeId && !item.skuId)
      .map((item) => `${item.nodeId}|${normalizeWishlistTitle(item.title)}`)
  );
  return { existingSkuKeys, existingManualKeys };
}

export function isDuplicateActiveWishlistItem(args: {
  nodeId: string;
  skuId: string | null;
  title: string;
  existingActiveItems: ExistingActiveWishlistItem[];
}): boolean {
  const { nodeId, skuId, title, existingActiveItems } = args;
  const { existingSkuKeys, existingManualKeys } = buildActiveDuplicateSets(existingActiveItems);
  if (skuId) {
    return existingSkuKeys.has(`${nodeId}|${skuId}`);
  }
  return existingManualKeys.has(`${nodeId}|${normalizeWishlistTitle(title)}`);
}

export function getServiceKitPreviewItemStatusLabel(status: ServiceKitPreviewItemStatus): string {
  if (status === "WILL_ADD") {
    return "Будет добавлено";
  }
  if (status === "DUPLICATE_ACTIVE_ITEM") {
    return "Уже есть в списке";
  }
  return "Не удалось сопоставить узел";
}

export function buildServiceKitPreview(params: {
  kit: ServiceKitViewModel;
  activeWishlistItems: Pick<PartWishlistItem, "nodeId" | "skuId" | "title" | "status">[];
  nodesByCode: Map<string, ServiceKitNodeRef>;
}): ServiceKitPreviewViewModel {
  const activeItems: ExistingActiveWishlistItem[] = params.activeWishlistItems
    .filter((item) => isActiveWishlistItem({ status: item.status }))
    .map((item) => ({ nodeId: item.nodeId, skuId: item.skuId ?? null, title: item.title }));
  const mutableActiveItems = [...activeItems];
  const previewItems = params.kit.items.map((item) => {
    const nodeRef = params.nodesByCode.get(item.nodeCode);
    const candidateTitle = item.matchedSkuTitle ?? item.title;
    if (!nodeRef) {
      return {
        itemKey: item.key,
        title: candidateTitle,
        nodeCode: item.nodeCode,
        nodeName: null,
        matchedSkuId: item.matchedSkuId,
        matchedSkuTitle: item.matchedSkuTitle,
        costAmount: item.matchedPriceAmount,
        currency: item.matchedCurrency,
        status: "MISSING_NODE" as const,
      };
    }
    if (nodeRef.hasChildren) {
      return {
        itemKey: item.key,
        title: candidateTitle,
        nodeCode: item.nodeCode,
        nodeName: nodeRef.name,
        matchedSkuId: item.matchedSkuId,
        matchedSkuTitle: item.matchedSkuTitle,
        costAmount: item.matchedPriceAmount,
        currency: item.matchedCurrency,
        status: "NON_LEAF_NODE" as const,
      };
    }
    const duplicate = isDuplicateActiveWishlistItem({
      nodeId: nodeRef.id,
      skuId: item.matchedSkuId,
      title: candidateTitle,
      existingActiveItems: mutableActiveItems,
    });
    if (duplicate) {
      return {
        itemKey: item.key,
        title: candidateTitle,
        nodeCode: item.nodeCode,
        nodeName: nodeRef.name,
        matchedSkuId: item.matchedSkuId,
        matchedSkuTitle: item.matchedSkuTitle,
        costAmount: item.matchedPriceAmount,
        currency: item.matchedCurrency,
        status: "DUPLICATE_ACTIVE_ITEM" as const,
      };
    }
    mutableActiveItems.push({ nodeId: nodeRef.id, skuId: item.matchedSkuId, title: candidateTitle });
    return {
      itemKey: item.key,
      title: candidateTitle,
      nodeCode: item.nodeCode,
      nodeName: nodeRef.name,
      matchedSkuId: item.matchedSkuId,
      matchedSkuTitle: item.matchedSkuTitle,
      costAmount: item.matchedPriceAmount,
      currency: item.matchedCurrency,
      status: "WILL_ADD" as const,
    };
  });
  const addableCount = previewItems.filter((item) => item.status === "WILL_ADD").length;
  const duplicateCount = previewItems.filter(
    (item) => item.status === "DUPLICATE_ACTIVE_ITEM"
  ).length;
  const invalidCount = previewItems.length - addableCount - duplicateCount;
  return {
    kitCode: params.kit.code,
    canAddAny: addableCount > 0,
    addableCount,
    duplicateCount,
    invalidCount,
    items: previewItems,
  };
}

export function expandServiceKitToWishlistDrafts(
  params: ExpandServiceKitParams
): { drafts: ServiceKitWishlistDraft[]; skipped: ExpandServiceKitSkip[]; warnings: string[] } {
  const { kit, nodeIdByCode, recommendationsByNodeCode, existingActiveItems } = params;
  const skipped: ExpandServiceKitSkip[] = [];
  const warnings: string[] = [];
  const drafts: ServiceKitWishlistDraft[] = [];
  const { existingSkuKeys, existingManualKeys } = buildActiveDuplicateSets(existingActiveItems);

  for (const item of kit.items) {
    const nodeIssue = params.nodeIssueByCode?.get(item.nodeCode);
    if (nodeIssue) {
      const message =
        nodeIssue === "NON_LEAF_NODE"
          ? `Узел ${item.nodeCode} не является конечным.`
          : `Узел ${item.nodeCode} недоступен.`;
      skipped.push({ itemKey: item.key, title: item.title, reason: nodeIssue, message });
      warnings.push(message);
      continue;
    }
    const nodeId = nodeIdByCode.get(item.nodeCode);
    if (!nodeId) {
      const message = `Узел ${item.nodeCode} недоступен или не является конечным.`;
      skipped.push({ itemKey: item.key, title: item.title, reason: "MISSING_NODE", message });
      warnings.push(message);
      continue;
    }

    const recommendations = recommendationsByNodeCode.get(item.nodeCode) ?? [];
    const picked = chooseBestSkuForKitItem(recommendations, item);
    const title = picked?.canonicalName ?? item.title;
    const skuId = picked?.skuId ?? null;

    if (skuId) {
      const key = `${nodeId}|${skuId}`;
      if (existingSkuKeys.has(key)) {
        skipped.push({
          itemKey: item.key,
          title,
          reason: "DUPLICATE_ACTIVE_ITEM",
          message: "Похожая активная позиция с этим SKU уже есть в списке.",
        });
        continue;
      }
      existingSkuKeys.add(key);
    } else {
      const key = `${nodeId}|${normalizeWishlistTitle(title)}`;
      if (existingManualKeys.has(key)) {
        skipped.push({
          itemKey: item.key,
          title,
          reason: "DUPLICATE_ACTIVE_ITEM",
          message: "Похожая активная позиция уже есть в списке.",
        });
        continue;
      }
      existingManualKeys.add(key);
    }

    drafts.push({
      itemKey: item.key,
      title,
      nodeId,
      skuId,
      quantity: Math.max(1, Math.trunc(item.quantity || 1)),
      status: "NEEDED",
      comment: `${WISHLIST_KIT_ORIGIN_PREFIX_RU} ${kit.title}`,
      costAmount: picked?.priceAmount ?? null,
      currency: picked?.currency?.trim() || null,
    });
  }

  return { drafts, skipped, warnings };
}
