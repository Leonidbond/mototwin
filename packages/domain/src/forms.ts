import type {
  AddMotorcycleFormValues,
  AddMotorcyclePayload,
  AddServiceEventFormValues,
  AddServiceEventPayload,
  AddServiceEventValidationContext,
  BundleItemFormValues,
  CreateServiceBundleItemInput,
  EditVehicleProfileFormValues,
  EditVehicleProfilePayload,
  FormValidationResult,
  PartWishlistItem,
  ServiceActionType,
  ServiceBundleItem,
  ServiceEventItem,
  ServiceEventMode,
  UpdateVehicleStateFormValues,
  UpdateVehicleStatePayload,
  VehicleProfileFormValues,
} from "@mototwin/types";
import { formatExpenseAmountRu } from "./expense-summary";
import { buildPartSkuLabel } from "./part-catalog";
import {
  WISHLIST_INSTALL_SERVICE_COMMENT_PREFIX_RU,
  WISHLIST_INSTALL_SERVICE_TYPE_RU,
} from "./part-wishlist";

/** Local calendar `YYYY-MM-DD` (same semantics as web `getTodayDateString` in vehicle page). */
export function getTodayDateYmdLocal(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Canonical ISO 4217 code for new service events (web + Expo). */
export const DEFAULT_ADD_SERVICE_EVENT_CURRENCY = "RUB";

// ---------------------------------------------------------------------------
// Service action types — labels + heuristics
// ---------------------------------------------------------------------------

const SERVICE_ACTION_TYPE_LABELS_RU: Record<ServiceActionType, string> = {
  REPLACE: "Замена",
  SERVICE: "Обслуживание",
  INSPECT: "Проверка",
  CLEAN: "Очистка",
  ADJUST: "Регулировка",
};

export const SERVICE_ACTION_TYPE_OPTIONS: ReadonlyArray<{
  value: ServiceActionType;
  label: string;
}> = [
  { value: "REPLACE", label: SERVICE_ACTION_TYPE_LABELS_RU.REPLACE },
  { value: "SERVICE", label: SERVICE_ACTION_TYPE_LABELS_RU.SERVICE },
  { value: "INSPECT", label: SERVICE_ACTION_TYPE_LABELS_RU.INSPECT },
  { value: "CLEAN", label: SERVICE_ACTION_TYPE_LABELS_RU.CLEAN },
  { value: "ADJUST", label: SERVICE_ACTION_TYPE_LABELS_RU.ADJUST },
];

export function getServiceActionTypeLabelRu(action: ServiceActionType): string {
  return SERVICE_ACTION_TYPE_LABELS_RU[action] ?? SERVICE_ACTION_TYPE_LABELS_RU.SERVICE;
}

/** Map a free-form RU `serviceType` (legacy) to a {@link ServiceActionType}. */
export function mapServiceTypeStringToActionType(value: string | null | undefined): ServiceActionType {
  const lc = (value ?? "").trim().toLowerCase();
  if (!lc) {
    return "SERVICE";
  }
  if (lc.includes("замен")) {
    return "REPLACE";
  }
  if (lc.includes("проверк") || lc.includes("диагност")) {
    return "INSPECT";
  }
  if (lc.includes("чистк") || lc.includes("очистк")) {
    return "CLEAN";
  }
  if (lc.includes("регулир") || lc.includes("настройк")) {
    return "ADJUST";
  }
  return "SERVICE";
}

export const SERVICE_EVENT_MODE_LABELS_RU: Record<ServiceEventMode, string> = {
  BASIC: "Быстро",
  ADVANCED: "Подробно",
};

export function getServiceEventModeLabelRu(mode: ServiceEventMode): string {
  return SERVICE_EVENT_MODE_LABELS_RU[mode] ?? SERVICE_EVENT_MODE_LABELS_RU.BASIC;
}

// ---------------------------------------------------------------------------
// Bundle item helpers
// ---------------------------------------------------------------------------

let bundleItemKeyCounter = 0;
function nextBundleItemKey(): string {
  bundleItemKeyCounter += 1;
  return `b${bundleItemKeyCounter}_${Date.now().toString(36)}`;
}

export function createEmptyBundleItemFormValues(
  overrides?: Partial<BundleItemFormValues>
): BundleItemFormValues {
  return {
    key: overrides?.key ?? nextBundleItemKey(),
    nodeId: overrides?.nodeId ?? "",
    actionType: overrides?.actionType ?? "SERVICE",
    partName: overrides?.partName ?? "",
    sku: overrides?.sku ?? "",
    quantity: overrides?.quantity ?? "",
    partCost: overrides?.partCost ?? "",
    laborCost: overrides?.laborCost ?? "",
    comment: overrides?.comment ?? "",
  };
}

function bundleItemFromExisting(item: ServiceBundleItem): BundleItemFormValues {
  return createEmptyBundleItemFormValues({
    nodeId: item.nodeId,
    actionType: item.actionType,
    partName: item.partName ?? "",
    sku: item.sku ?? "",
    quantity: item.quantity != null ? String(item.quantity) : "",
    partCost: item.partCost != null ? formatExpenseAmountRu(item.partCost) : "",
    laborCost: item.laborCost != null ? formatExpenseAmountRu(item.laborCost) : "",
    comment: item.comment ?? "",
  });
}

export function createInitialAddServiceEventFormValues(): AddServiceEventFormValues {
  return {
    title: "",
    mode: "BASIC",
    commonActionType: "SERVICE",
    eventDate: "",
    odometer: "",
    engineHours: "",
    partsCost: "",
    laborCost: "",
    currency: DEFAULT_ADD_SERVICE_EVENT_CURRENCY,
    comment: "",
    installedPartsJson: "",
    installedExpenseItemIds: [],
    items: [createEmptyBundleItemFormValues()],
  };
}

export type VehicleOdometerStateForServiceEvent = {
  odometer: number;
  engineHours: number | null;
};

export type ServiceEventNodeTemplate = {
  serviceType: string;
  comment: string;
  actionType: ServiceActionType;
};

const FALLBACK_NODE_SERVICE_TYPE_RU = "Обслуживание узла";
const FALLBACK_NODE_SERVICE_COMMENT_PREFIX_RU = "Зафиксировано обслуживание узла:";

const NODE_SERVICE_EVENT_TEMPLATES: Record<string, ServiceEventNodeTemplate> = {
  "ENGINE.LUBE.OIL": {
    serviceType: "Замена масла",
    comment: "Заменено моторное масло",
    actionType: "REPLACE",
  },
  "ENGINE.LUBE.FILTER": {
    serviceType: "Замена масляного фильтра",
    comment: "Заменен масляный фильтр",
    actionType: "REPLACE",
  },
  "INTAKE.FILTER": {
    serviceType: "Замена воздушного фильтра",
    comment: "Заменен воздушный фильтр",
    actionType: "REPLACE",
  },
  "ELECTRICS.IGNITION.SPARK": {
    serviceType: "Замена свечи зажигания",
    comment: "Заменена свеча зажигания",
    actionType: "REPLACE",
  },
  "BRAKES.FRONT.PADS": {
    serviceType: "Замена передних тормозных колодок",
    comment: "Заменены передние тормозные колодки",
    actionType: "REPLACE",
  },
  "BRAKES.REAR.PADS": {
    serviceType: "Замена задних тормозных колодок",
    comment: "Заменены задние тормозные колодки",
    actionType: "REPLACE",
  },
  "BRAKES.FLUID": {
    serviceType: "Замена тормозной жидкости",
    comment: "Заменена тормозная жидкость",
    actionType: "REPLACE",
  },
  "DRIVETRAIN.CHAIN": {
    serviceType: "Обслуживание цепи",
    comment: "Проверка, очистка, смазка и натяжение цепи",
    actionType: "SERVICE",
  },
  "DRIVETRAIN.FRONT_SPROCKET": {
    serviceType: "Замена ведущей звезды",
    comment: "Заменена ведущая звезда",
    actionType: "REPLACE",
  },
  "DRIVETRAIN.REAR_SPROCKET": {
    serviceType: "Замена ведомой звезды",
    comment: "Заменена ведомая звезда",
    actionType: "REPLACE",
  },
  "TIRES.FRONT": {
    serviceType: "Замена передней шины",
    comment: "Заменена передняя шина",
    actionType: "REPLACE",
  },
  "TIRES.REAR": {
    serviceType: "Замена задней шины",
    comment: "Заменена задняя шина",
    actionType: "REPLACE",
  },
  "COOLING.LIQUID": {
    serviceType: "Замена охлаждающей жидкости",
    comment: "Заменена охлаждающая жидкость",
    actionType: "REPLACE",
  },
  "SUSPENSION.FRONT.OIL": {
    serviceType: "Замена масла в вилке",
    comment: "Заменено масло в передней вилке",
    actionType: "REPLACE",
  },
  "ELECTRICS.BATTERY": {
    serviceType: "Замена аккумулятора",
    comment: "Заменен аккумулятор",
    actionType: "REPLACE",
  },
};

export function getServiceEventTemplateForNode(nodeCode: string): ServiceEventNodeTemplate | null {
  const normalizedCode = nodeCode.trim().toUpperCase();
  if (!normalizedCode) {
    return null;
  }
  const template = NODE_SERVICE_EVENT_TEMPLATES[normalizedCode];
  return template ?? null;
}

type CreateInitialAddServiceEventFromNodeArgs = {
  nodeId: string;
  nodeCode: string;
  nodeName: string;
  vehicle: VehicleOdometerStateForServiceEvent;
  currentDateYmd?: string;
};

export function createInitialAddServiceEventFromNode(
  args: CreateInitialAddServiceEventFromNodeArgs
): AddServiceEventFormValues {
  const base = createInitialAddServiceEventFormValues();
  const template = getServiceEventTemplateForNode(args.nodeCode);
  const fallbackNodeName = args.nodeName.trim() || "узел";
  const actionType = template?.actionType ?? "SERVICE";
  return {
    ...base,
    title: template?.serviceType ?? FALLBACK_NODE_SERVICE_TYPE_RU,
    mode: "BASIC",
    commonActionType: actionType,
    eventDate: args.currentDateYmd ?? getTodayDateYmdLocal(),
    odometer: String(args.vehicle.odometer),
    engineHours: args.vehicle.engineHours != null ? String(args.vehicle.engineHours) : "",
    comment:
      template?.comment ?? `${FALLBACK_NODE_SERVICE_COMMENT_PREFIX_RU} ${fallbackNodeName}`,
    items: [
      createEmptyBundleItemFormValues({
        nodeId: args.nodeId.trim(),
        actionType,
      }),
    ],
  };
}

export function buildAddServiceEventCommentFromWishlistItem(item: PartWishlistItem): string {
  const lines = [
    `${WISHLIST_INSTALL_SERVICE_COMMENT_PREFIX_RU} ${item.title}`,
    `Количество: ${item.quantity}`,
  ];
  if (item.sku) {
    lines.push(
      `Каталог: ${buildPartSkuLabel({
        brandName: item.sku.brandName,
        canonicalName: item.sku.canonicalName,
      })}`
    );
    const art = item.sku.primaryPartNumber?.trim();
    if (art) {
      lines.push(`Артикул: ${art}`);
    }
    lines.push(`Тип SKU: ${item.sku.partType}`);
  }
  const w = item.comment?.trim();
  if (w) {
    lines.push(w);
  }
  return lines.join("\n");
}

export function buildWishlistInstalledPartsJsonString(item: PartWishlistItem): string {
  return JSON.stringify({
    source: "wishlist",
    wishlistItemId: item.id,
    title: item.title,
    quantity: item.quantity,
    skuId: item.skuId ?? null,
    skuLabel: item.sku
      ? buildPartSkuLabel({
          brandName: item.sku.brandName,
          canonicalName: item.sku.canonicalName,
        })
      : null,
  });
}

/** Prefills {@link AddServiceEventFormValues} after marking a wishlist line as INSTALLED (client opens Add Service Event). */
export function createInitialAddServiceEventFromWishlistItem(
  item: PartWishlistItem,
  vehicle: VehicleOdometerStateForServiceEvent,
  options?: { todayDateYmd?: string }
): AddServiceEventFormValues {
  const base = createInitialAddServiceEventFormValues();
  const eventDate = options?.todayDateYmd ?? getTodayDateYmdLocal();
  const hasCost = item.costAmount != null && Number.isFinite(item.costAmount);
  const partsCost = hasCost ? formatExpenseAmountRu(item.costAmount as number) : "";
  const currency = hasCost
    ? (item.currency?.trim() || DEFAULT_ADD_SERVICE_EVENT_CURRENCY).toUpperCase()
    : base.currency;
  const skuPartNumber = item.sku?.primaryPartNumber?.trim() ?? "";
  return {
    ...base,
    title: WISHLIST_INSTALL_SERVICE_TYPE_RU,
    mode: "BASIC",
    commonActionType: "REPLACE",
    eventDate,
    odometer: String(vehicle.odometer),
    engineHours: vehicle.engineHours != null ? String(vehicle.engineHours) : "",
    partsCost,
    laborCost: "",
    currency,
    comment: buildAddServiceEventCommentFromWishlistItem(item),
    installedPartsJson: buildWishlistInstalledPartsJsonString(item),
    items: [
      createEmptyBundleItemFormValues({
        nodeId: item.nodeId ?? "",
        actionType: "REPLACE",
        partName: item.title.trim(),
        sku: skuPartNumber,
      }),
    ],
  };
}

type CreateInitialEditServiceEventValuesOptions = {
  fallbackCurrency?: string;
};

function toIsoDateInputValue(isoDateLike: string): string {
  const date = new Date(isoDateLike);
  if (!Number.isNaN(date.getTime())) {
    return date.toISOString().slice(0, 10);
  }
  return isoDateLike.trim().slice(0, 10);
}

export function createInitialEditServiceEventValues(
  event: ServiceEventItem,
  options?: CreateInitialEditServiceEventValuesOptions
): AddServiceEventFormValues {
  const base = createInitialAddServiceEventFormValues();
  const items =
    event.items && event.items.length > 0
      ? event.items.map(bundleItemFromExisting)
      : [
          createEmptyBundleItemFormValues({
            nodeId: event.nodeId,
            actionType: mapServiceTypeStringToActionType(event.serviceType),
            partName: event.partName?.trim() ?? "",
            sku: event.partSku?.trim() ?? "",
          }),
        ];
  // Общий action type для BASIC: первый item.
  const commonActionType = items[0]?.actionType ?? "SERVICE";
  const partsCostNumeric = event.partsCost ?? null;
  const laborCostNumeric = event.laborCost ?? null;
  const totalCostNumeric = event.totalCost ?? event.costAmount ?? null;
  const partsCostString =
    partsCostNumeric != null && Number.isFinite(partsCostNumeric)
      ? formatExpenseAmountRu(partsCostNumeric)
      : laborCostNumeric == null && totalCostNumeric != null && Number.isFinite(totalCostNumeric)
        ? formatExpenseAmountRu(totalCostNumeric)
        : "";
  const laborCostString =
    laborCostNumeric != null && Number.isFinite(laborCostNumeric)
      ? formatExpenseAmountRu(laborCostNumeric)
      : "";
  return {
    ...base,
    title: event.title?.trim() ?? event.serviceType?.trim() ?? "",
    mode: event.mode ?? "BASIC",
    commonActionType,
    eventDate: toIsoDateInputValue(event.eventDate),
    odometer: String(event.odometer),
    engineHours: event.engineHours != null ? String(event.engineHours) : "",
    partsCost: partsCostString,
    laborCost: laborCostString,
    currency:
      event.currency?.trim().toUpperCase() ||
      options?.fallbackCurrency ||
      DEFAULT_ADD_SERVICE_EVENT_CURRENCY,
    comment: event.comment ?? "",
    installedPartsJson:
      event.installedPartsJson == null ? "" : JSON.stringify(event.installedPartsJson, null, 2),
    installedExpenseItemIds: [],
    items,
  };
}

export type CreateInitialRepeatServiceEventValuesOptions = {
  fallbackCurrency?: string;
  /** Локальная дата нового события `YYYY-MM-DD`. По умолчанию — сегодня на клиенте. */
  todayDateYmd?: string;
};

/**
 * Форма **нового** события с тем же узлом, типом работ, суммами, комментарием и полями запчасти, что у исходного;
 * дата — «сегодня» (или `todayDateYmd`); пробег и моточасы — из актуального состояния мотоцикла.
 */
export function createInitialRepeatServiceEventValues(
  event: ServiceEventItem,
  vehicle: VehicleOdometerStateForServiceEvent,
  options?: CreateInitialRepeatServiceEventValuesOptions
): AddServiceEventFormValues {
  if (event.eventKind === "STATE_UPDATE") {
    return createInitialAddServiceEventFormValues();
  }
  const fromSource = createInitialEditServiceEventValues(event, {
    fallbackCurrency: options?.fallbackCurrency,
  });
  const today =
    typeof options?.todayDateYmd === "string" && options.todayDateYmd.trim()
      ? options.todayDateYmd.trim().slice(0, 10)
      : getTodayDateYmdLocal();
  return {
    ...fromSource,
    eventDate: today,
    odometer: String(vehicle.odometer),
    engineHours: vehicle.engineHours != null ? String(vehicle.engineHours) : "",
  };
}

function parseDecimalOrNull(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number.parseFloat(trimmed.replace(",", "."));
  if (Number.isNaN(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

function parsePositiveIntegerOrNull(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function normalizeBundleItemPayload(
  item: BundleItemFormValues,
  mode: ServiceEventMode,
  commonActionType: ServiceActionType
): CreateServiceBundleItemInput {
  const nodeId = item.nodeId.trim();
  if (mode === "BASIC") {
    return {
      nodeId,
      actionType: commonActionType,
      comment: item.comment.trim() ? item.comment.trim() : null,
    };
  }
  const partName = item.partName.trim();
  const sku = item.sku.trim();
  const comment = item.comment.trim();
  return {
    nodeId,
    actionType: item.actionType,
    partName: partName ? partName.slice(0, 500) : null,
    sku: sku ? sku.slice(0, 200) : null,
    quantity: parsePositiveIntegerOrNull(item.quantity),
    partCost: parseDecimalOrNull(item.partCost),
    laborCost: parseDecimalOrNull(item.laborCost),
    comment: comment ? comment : null,
  };
}

export function normalizeAddServiceEventPayload(
  values: AddServiceEventFormValues
): AddServiceEventPayload {
  const eventDateIso = new Date(values.eventDate.trim()).toISOString();

  const trimmedEngine = values.engineHours.trim();
  let engineHours: number | null = null;
  if (trimmedEngine !== "") {
    const parsed = Number(trimmedEngine);
    if (!Number.isNaN(parsed)) {
      engineHours = Math.trunc(parsed);
    }
  }

  const rawParts = values.installedPartsJson?.trim() ?? "";
  let installedPartsJson: unknown | null = null;
  if (rawParts !== "") {
    try {
      installedPartsJson = JSON.parse(rawParts) as unknown;
    } catch {
      installedPartsJson = null;
    }
  }

  const items = values.items.map((item) =>
    normalizeBundleItemPayload(item, values.mode, values.commonActionType)
  );

  // ADVANCED: предпочитаем суммы из items, иначе используем верхний уровень.
  let partsCost = parseDecimalOrNull(values.partsCost);
  let laborCost = parseDecimalOrNull(values.laborCost);
  if (values.mode === "ADVANCED") {
    const itemsPartsCostSum = items.reduce(
      (acc, it) => (it.partCost != null ? acc + it.partCost : acc),
      0
    );
    const itemsLaborCostSum = items.reduce(
      (acc, it) => (it.laborCost != null ? acc + it.laborCost : acc),
      0
    );
    const anyPart = items.some((it) => it.partCost != null);
    const anyLabor = items.some((it) => it.laborCost != null);
    if (anyPart) {
      partsCost = itemsPartsCostSum;
    }
    if (anyLabor) {
      laborCost = itemsLaborCostSum;
    }
  }

  const totalCost =
    partsCost != null || laborCost != null ? (partsCost ?? 0) + (laborCost ?? 0) : null;

  const trimmedCurrency = values.currency.trim();

  return {
    nodeId: items[0]?.nodeId ?? "",
    title: values.title.trim(),
    mode: values.mode,
    eventDate: eventDateIso,
    odometer: Math.trunc(Number(values.odometer.trim())),
    engineHours,
    partsCost,
    laborCost,
    totalCost,
    currency: totalCost != null && trimmedCurrency ? trimmedCurrency.toUpperCase() : null,
    comment: values.comment.trim() || null,
    installedPartsJson,
    installedExpenseItemIds: values.installedExpenseItemIds,
    items,
  };
}

export function normalizeEditServiceEventPayload(
  values: AddServiceEventFormValues
): AddServiceEventPayload {
  return normalizeAddServiceEventPayload(values);
}

export function validateAddServiceEventFormValues(
  values: AddServiceEventFormValues,
  context: AddServiceEventValidationContext
): FormValidationResult {
  if (!values.items.length) {
    return { errors: ["Добавьте хотя бы один узел."] };
  }
  if (!values.title.trim()) {
    return { errors: ["Укажите название события."] };
  }
  if (!values.eventDate.trim()) {
    return { errors: ["Заполните дату события."] };
  }
  if (Number.isNaN(new Date(values.eventDate.trim()).getTime())) {
    return { errors: ["Введите корректную дату."] };
  }
  if (!values.odometer.trim()) {
    return { errors: ["Укажите пробег."] };
  }

  const parsedOdometer = Number(values.odometer.trim());
  if (!Number.isInteger(parsedOdometer) || parsedOdometer < 0) {
    return { errors: ["Пробег должен быть целым числом не меньше 0."] };
  }

  const datePart = values.eventDate.trim().slice(0, 10);
  if (datePart && datePart > context.todayDateYmd) {
    return { errors: ["Дата события не может быть в будущем."] };
  }

  if (
    context.currentVehicleOdometer !== null &&
    parsedOdometer > context.currentVehicleOdometer
  ) {
    return {
      errors: [
        `Пробег события не может быть больше текущего (${context.currentVehicleOdometer} км).`,
      ],
    };
  }

  const trimmedEngine = values.engineHours.trim();
  if (trimmedEngine !== "") {
    const parsedEngine = Number(trimmedEngine);
    if (!Number.isInteger(parsedEngine) || parsedEngine < 0) {
      return { errors: ["Моточасы должны быть целым числом не меньше 0."] };
    }
  }

  const rawParts = values.installedPartsJson?.trim() ?? "";
  if (rawParts !== "") {
    try {
      JSON.parse(rawParts);
    } catch {
      return {
        errors: ["Поле установленных запчастей должно быть пустым или корректным JSON."],
      };
    }
  }

  for (const cost of [values.partsCost, values.laborCost]) {
    const trimmed = cost.trim();
    if (trimmed === "") {
      continue;
    }
    const parsed = Number.parseFloat(trimmed.replace(",", "."));
    if (Number.isNaN(parsed) || parsed < 0) {
      return { errors: ["Суммы должны быть неотрицательными числами."] };
    }
  }

  // Проверка items.
  const seenNodeIds = new Set<string>();
  for (let index = 0; index < values.items.length; index += 1) {
    const item = values.items[index];
    const nodeId = item.nodeId.trim();
    if (!nodeId) {
      return { errors: [`Выберите узел для строки №${index + 1}.`] };
    }
    if (seenNodeIds.has(nodeId)) {
      return { errors: ["В одном событии нельзя выбирать один узел дважды."] };
    }
    seenNodeIds.add(nodeId);
    if (context.leafNodeIds && context.leafNodeIds.size > 0 && !context.leafNodeIds.has(nodeId)) {
      return { errors: [`Узел в строке №${index + 1} должен быть последнего уровня.`] };
    }

    if (values.mode === "ADVANCED") {
      const qtyTrimmed = item.quantity.trim();
      if (qtyTrimmed !== "") {
        const qty = Number(qtyTrimmed);
        if (!Number.isInteger(qty) || qty <= 0) {
          return { errors: [`Количество в строке №${index + 1} должно быть положительным целым.`] };
        }
      }
      for (const cost of [item.partCost, item.laborCost]) {
        const trimmed = cost.trim();
        if (trimmed === "") {
          continue;
        }
        const parsed = Number.parseFloat(trimmed.replace(",", "."));
        if (Number.isNaN(parsed) || parsed < 0) {
          return {
            errors: [`Суммы в строке №${index + 1} должны быть неотрицательными.`],
          };
        }
      }
    }
  }

  return { errors: [] };
}

/**
 * Expo/mobile: same business rules as web when `context` is passed (leaf, date cap, odometer vs vehicle).
 */
export function validateAddServiceEventFormValuesMobile(
  values: AddServiceEventFormValues,
  context: AddServiceEventValidationContext
): FormValidationResult {
  return validateAddServiceEventFormValues(values, context);
}

export function createInitialVehicleStateFormValues(
  currentOdometer: number,
  currentEngineHours: number | null
): UpdateVehicleStateFormValues {
  return {
    odometer: String(currentOdometer),
    engineHours: currentEngineHours !== null ? String(currentEngineHours) : "",
  };
}

export function normalizeVehicleStatePayload(
  values: UpdateVehicleStateFormValues
): UpdateVehicleStatePayload {
  const parsedOdometer = Number(values.odometer.trim());
  const trimmedEngine = values.engineHours.trim();
  let engineHours: number | null = null;
  if (trimmedEngine !== "") {
    engineHours = Number(trimmedEngine);
  }
  return {
    odometer: Math.trunc(parsedOdometer),
    engineHours: engineHours !== null ? Math.trunc(engineHours) : null,
  };
}

export function validateVehicleStateFormValues(
  values: UpdateVehicleStateFormValues,
  mode: "web" | "mobile" = "web"
): FormValidationResult {
  const errors: string[] = [];

  if (!values.odometer.trim()) {
    errors.push(mode === "web" ? "Укажите пробег." : "Пробег обязателен и должен быть >= 0.");
    return { errors };
  }

  const parsedOdometer =
    mode === "mobile" ? Number.parseInt(values.odometer, 10) : Number(values.odometer.trim());

  if (mode === "web") {
    if (!Number.isInteger(parsedOdometer) || parsedOdometer < 0) {
      errors.push("Пробег должен быть целым числом не меньше 0.");
    }
  } else if (Number.isNaN(parsedOdometer) || parsedOdometer < 0) {
    errors.push("Пробег обязателен и должен быть >= 0.");
  }

  const trimmedEngine = values.engineHours.trim();
  if (trimmedEngine !== "") {
    const parsed =
      mode === "mobile" ? Number.parseInt(trimmedEngine, 10) : Number(trimmedEngine);
    if (mode === "web") {
      if (!Number.isInteger(parsed) || parsed < 0) {
        errors.push("Моточасы должны быть целым числом не меньше 0.");
      }
    } else if (Number.isNaN(parsed) || parsed < 0) {
      errors.push("Моточасы должны быть пустыми или >= 0.");
    }
  }

  return { errors };
}

export function createInitialEditVehicleProfileFormValues(
  defaults?: Partial<EditVehicleProfileFormValues>
): EditVehicleProfileFormValues {
  return {
    nickname: "",
    vin: "",
    usageType: "MIXED",
    ridingStyle: "ACTIVE",
    loadType: "SOLO",
    usageIntensity: "MEDIUM",
    ...defaults,
  };
}

export function buildInitialVehicleProfileFormValues(
  defaults?: Partial<VehicleProfileFormValues>
): VehicleProfileFormValues {
  return createInitialEditVehicleProfileFormValues(defaults);
}

export function normalizeEditVehicleProfilePayload(
  values: EditVehicleProfileFormValues
): EditVehicleProfilePayload {
  return {
    nickname: values.nickname.trim() || null,
    vin: values.vin.trim() || null,
    rideProfile: {
      usageType: values.usageType,
      ridingStyle: values.ridingStyle,
      loadType: values.loadType,
      usageIntensity: values.usageIntensity,
    },
  };
}

export function normalizeVehicleProfileFormValues(
  values: VehicleProfileFormValues
): EditVehicleProfilePayload {
  const nickname = values.nickname.trim().slice(0, 80) || null;
  const vinRaw = values.vin.trim().toUpperCase();
  const vin = vinRaw ? vinRaw.slice(0, 32) : null;
  return {
    nickname,
    vin,
    rideProfile: {
      usageType: values.usageType,
      ridingStyle: values.ridingStyle,
      loadType: values.loadType,
      usageIntensity: values.usageIntensity,
    },
  };
}

export function validateEditVehicleProfileFormValues(
  values: EditVehicleProfileFormValues
): FormValidationResult {
  const errors: string[] = [];
  if (values.nickname.trim().length > 80) {
    errors.push("Название в гараже должно быть не длиннее 80 символов.");
  }
  if (values.vin.trim().length > 32) {
    errors.push("VIN должен быть не длиннее 32 символов.");
  }
  return { errors };
}

export function validateVehicleProfileFormValues(
  values: VehicleProfileFormValues
): FormValidationResult {
  return validateEditVehicleProfileFormValues(values);
}

export function createInitialAddMotorcycleFormValues(
  overrides?: Partial<AddMotorcycleFormValues>
): AddMotorcycleFormValues {
  return {
    brandId: "",
    modelId: "",
    modelVariantId: "",
    nickname: "",
    vin: "",
    odometer: "",
    engineHours: "",
    usageType: "MIXED",
    ridingStyle: "ACTIVE",
    loadType: "SOLO",
    usageIntensity: "MEDIUM",
    ...overrides,
  };
}

export function normalizeAddMotorcyclePayload(
  values: AddMotorcycleFormValues
): AddMotorcyclePayload {
  const odometer = Math.trunc(Number(values.odometer.trim()));
  const trimmedEngine = values.engineHours.trim();
  let engineHours: number | null = null;
  if (trimmedEngine !== "") {
    engineHours = Math.trunc(Number(trimmedEngine));
  }

  return {
    brandId: values.brandId.trim(),
    modelId: values.modelId.trim(),
    modelVariantId: values.modelVariantId.trim(),
    nickname: values.nickname.trim() || null,
    vin: values.vin.trim() || null,
    odometer,
    engineHours,
    rideProfile: {
      usageType: values.usageType,
      ridingStyle: values.ridingStyle,
      loadType: values.loadType,
      usageIntensity: values.usageIntensity,
    },
  };
}

export type AddMotorcycleFieldErrors = Partial<
  Record<"brandId" | "modelId" | "modelVariantId" | "odometer" | "engineHours", string>
>;

export function validateAddMotorcycleFormValues(
  values: AddMotorcycleFormValues,
  style: "web" | "mobile" = "web"
): FormValidationResult & { fieldErrors?: AddMotorcycleFieldErrors } {
  const errors: string[] = [];
  const fieldErrors: AddMotorcycleFieldErrors = {};

  const missingTree =
    !values.brandId.trim() || !values.modelId.trim() || !values.modelVariantId.trim();

  if (missingTree) {
    if (style === "web") {
      errors.push("Выберите бренд, модель и модификацию.");
    } else {
      if (!values.brandId.trim()) {
        fieldErrors.brandId = "Выберите марку.";
      }
      if (!values.modelId.trim()) {
        fieldErrors.modelId = "Выберите модель.";
      }
      if (!values.modelVariantId.trim()) {
        fieldErrors.modelVariantId = "Выберите модификацию.";
      }
      errors.push("Проверьте обязательные поля формы.");
    }
  }

  if (!values.odometer.trim()) {
    const msg =
      style === "web" ? "Укажите пробег." : "Пробег обязателен и должен быть целым числом >= 0.";
    errors.push(msg);
    fieldErrors.odometer = style === "mobile" ? msg : fieldErrors.odometer;
  } else {
    const odometerNumber = Number(values.odometer.trim());
    if (
      !Number.isFinite(odometerNumber) ||
      !Number.isInteger(odometerNumber) ||
      odometerNumber < 0
    ) {
      const msg =
        style === "web" ? "Укажите пробег." : "Пробег обязателен и должен быть целым числом >= 0.";
      errors.push(msg);
      if (style === "mobile") {
        fieldErrors.odometer = msg;
      }
    }
  }

  if (style === "mobile") {
    const trimmedEngine = values.engineHours.trim();
    if (trimmedEngine !== "") {
      const parsed = Number(trimmedEngine);
      if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
        const msg = "Моточасы должны быть целым числом >= 0.";
        errors.push(msg);
        fieldErrors.engineHours = msg;
      }
    }
  }

  const uniqueErrors = [...new Set(errors.filter(Boolean))];
  const hasFields = Object.values(fieldErrors).some(Boolean);

  return {
    errors: uniqueErrors,
    ...(hasFields ? { fieldErrors } : {}),
  };
}
