import type {
  CreatePartWishlistItemInput,
  FormValidationResult,
  PartWishlistFormValues,
  PartWishlistItem,
  PartWishlistItemStatus,
  PartWishlistItemViewModel,
  PartWishlistStatusGroupViewModel,
  UpdatePartWishlistItemInput,
} from "@mototwin/types";

export const PART_WISHLIST_STATUS_ORDER: PartWishlistItemStatus[] = [
  "NEEDED",
  "ORDERED",
  "BOUGHT",
  "INSTALLED",
];

export const partWishlistStatusLabelsRu: Record<PartWishlistItemStatus, string> = {
  NEEDED: "Нужно купить",
  ORDERED: "Заказано",
  BOUGHT: "Куплено",
  INSTALLED: "Установлено",
};

export function getPartWishlistStatusLabelRu(status: PartWishlistItemStatus): string {
  return partWishlistStatusLabelsRu[status];
}

export function isPartWishlistItemStatus(value: string): value is PartWishlistItemStatus {
  return (
    value === "NEEDED" ||
    value === "ORDERED" ||
    value === "BOUGHT" ||
    value === "INSTALLED"
  );
}

/** Default service type when opening Add Service Event from a wishlist line marked INSTALLED. */
export const WISHLIST_INSTALL_SERVICE_TYPE_RU = "Установка запчасти";

/** Shown when status becomes INSTALLED but the line has no node link (no auto-open of Add Service Event). */
export const WISHLIST_INSTALLED_NO_NODE_SERVICE_HINT =
  "Позиция не привязана к узлу, сервисное событие не открыто автоматически";

export function isWishlistTransitionToInstalled(
  previousStatus: PartWishlistItemStatus,
  nextStatus: PartWishlistItemStatus
): boolean {
  return previousStatus !== "INSTALLED" && nextStatus === "INSTALLED";
}

/** Active «shopping list»: everything except completed installs (still stored in DB / API). */
export function isActiveWishlistItem(item: { status: PartWishlistItemStatus }): boolean {
  return item.status !== "INSTALLED";
}

export function filterActiveWishlistItems<T extends { status: PartWishlistItemStatus }>(
  items: T[]
): T[] {
  return items.filter(isActiveWishlistItem);
}

export function createInitialPartWishlistFormValues(
  preset?: Partial<Pick<PartWishlistFormValues, "nodeId" | "status">>
): PartWishlistFormValues {
  return {
    title: "",
    quantity: "1",
    status: preset?.status ?? "NEEDED",
    nodeId: preset?.nodeId ?? "",
    comment: "",
  };
}

export function partWishlistFormValuesFromItem(item: PartWishlistItem): PartWishlistFormValues {
  return {
    title: item.title,
    quantity: String(item.quantity),
    status: item.status,
    nodeId: item.nodeId ?? "",
    comment: item.comment ?? "",
  };
}

export function validatePartWishlistFormValues(values: PartWishlistFormValues): FormValidationResult {
  const errors: string[] = [];
  const title = values.title.trim();
  if (!title) {
    errors.push("Укажите название запчасти или расходника.");
  }
  const q = values.quantity.trim();
  if (q) {
    const n = Number(q);
    if (!Number.isInteger(n) || n < 1) {
      errors.push("Количество должно быть целым числом не меньше 1.");
    }
  }
  if (!isPartWishlistItemStatus(values.status)) {
    errors.push("Недопустимый статус.");
  }
  return { errors };
}

export function normalizeCreatePartWishlistPayload(
  values: PartWishlistFormValues
): CreatePartWishlistItemInput {
  const title = values.title.trim();
  const q = values.quantity.trim();
  const quantity = q ? Number.parseInt(q, 10) : 1;
  const nodeIdRaw = values.nodeId.trim();
  return {
    title,
    quantity: Number.isInteger(quantity) && quantity >= 1 ? quantity : 1,
    nodeId: nodeIdRaw ? nodeIdRaw : null,
    comment: values.comment.trim() ? values.comment.trim() : null,
    status: values.status,
  };
}

export function normalizeUpdatePartWishlistPayload(
  values: PartWishlistFormValues
): UpdatePartWishlistItemInput {
  const title = values.title.trim();
  const q = values.quantity.trim();
  const quantity = q ? Number.parseInt(q, 10) : undefined;
  const nodeIdRaw = values.nodeId.trim();
  const out: UpdatePartWishlistItemInput = {
    title,
    status: values.status,
    comment: values.comment.trim() ? values.comment.trim() : null,
    nodeId: nodeIdRaw ? nodeIdRaw : null,
  };
  if (quantity !== undefined && Number.isInteger(quantity) && quantity >= 1) {
    out.quantity = quantity;
  }
  return out;
}

export function buildPartWishlistItemViewModel(item: PartWishlistItem): PartWishlistItemViewModel {
  return {
    ...item,
    statusLabelRu: getPartWishlistStatusLabelRu(item.status),
  };
}

export function groupPartWishlistItemsByStatus(
  items: PartWishlistItemViewModel[]
): PartWishlistStatusGroupViewModel[] {
  const byStatus = new Map<PartWishlistItemStatus, PartWishlistItemViewModel[]>();
  for (const s of PART_WISHLIST_STATUS_ORDER) {
    byStatus.set(s, []);
  }
  for (const item of items) {
    const list = byStatus.get(item.status);
    if (list) {
      list.push(item);
    }
  }
  return PART_WISHLIST_STATUS_ORDER.map((status) => ({
    status,
    sectionTitleRu: partWishlistStatusLabelsRu[status],
    items: byStatus.get(status) ?? [],
  })).filter((g) => g.items.length > 0);
}
