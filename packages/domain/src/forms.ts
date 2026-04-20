import type {
  AddMotorcycleFormValues,
  AddMotorcyclePayload,
  AddServiceEventFormValues,
  AddServiceEventPayload,
  AddServiceEventValidationContext,
  EditVehicleProfileFormValues,
  EditVehicleProfilePayload,
  FormValidationResult,
  PartWishlistItem,
  ServiceEventItem,
  UpdateVehicleStateFormValues,
  UpdateVehicleStatePayload,
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

export function createInitialAddServiceEventFormValues(): AddServiceEventFormValues {
  return {
    nodeId: "",
    eventDate: "",
    serviceType: "",
    odometer: "",
    engineHours: "",
    costAmount: "",
    currency: DEFAULT_ADD_SERVICE_EVENT_CURRENCY,
    comment: "",
    installedPartsJson: "",
  };
}

export type VehicleOdometerStateForServiceEvent = {
  odometer: number;
  engineHours: number | null;
};

export type ServiceEventNodeTemplate = {
  serviceType: string;
  comment: string;
};

const FALLBACK_NODE_SERVICE_TYPE_RU = "Обслуживание узла";
const FALLBACK_NODE_SERVICE_COMMENT_PREFIX_RU = "Зафиксировано обслуживание узла:";

const NODE_SERVICE_EVENT_TEMPLATES: Record<string, ServiceEventNodeTemplate> = {
  "ENGINE.LUBE.OIL": {
    serviceType: "Замена масла",
    comment: "Заменено моторное масло",
  },
  "ENGINE.LUBE.FILTER": {
    serviceType: "Замена масляного фильтра",
    comment: "Заменен масляный фильтр",
  },
  "INTAKE.FILTER": {
    serviceType: "Замена воздушного фильтра",
    comment: "Заменен воздушный фильтр",
  },
  "ELECTRICS.IGNITION.SPARK": {
    serviceType: "Замена свечи зажигания",
    comment: "Заменена свеча зажигания",
  },
  "BRAKES.FRONT.PADS": {
    serviceType: "Замена передних тормозных колодок",
    comment: "Заменены передние тормозные колодки",
  },
  "BRAKES.REAR.PADS": {
    serviceType: "Замена задних тормозных колодок",
    comment: "Заменены задние тормозные колодки",
  },
  "BRAKES.FLUID": {
    serviceType: "Замена тормозной жидкости",
    comment: "Заменена тормозная жидкость",
  },
  "DRIVETRAIN.CHAIN": {
    serviceType: "Обслуживание цепи",
    comment: "Проверка, очистка, смазка и натяжение цепи",
  },
  "DRIVETRAIN.FRONT_SPROCKET": {
    serviceType: "Замена ведущей звезды",
    comment: "Заменена ведущая звезда",
  },
  "DRIVETRAIN.REAR_SPROCKET": {
    serviceType: "Замена ведомой звезды",
    comment: "Заменена ведомая звезда",
  },
  "TIRES.FRONT": {
    serviceType: "Замена передней шины",
    comment: "Заменена передняя шина",
  },
  "TIRES.REAR": {
    serviceType: "Замена задней шины",
    comment: "Заменена задняя шина",
  },
  "COOLING.LIQUID": {
    serviceType: "Замена охлаждающей жидкости",
    comment: "Заменена охлаждающая жидкость",
  },
  "SUSPENSION.FRONT.OIL": {
    serviceType: "Замена масла в вилке",
    comment: "Заменено масло в передней вилке",
  },
  "ELECTRICS.BATTERY": {
    serviceType: "Замена аккумулятора",
    comment: "Заменен аккумулятор",
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
  return {
    ...base,
    nodeId: args.nodeId.trim(),
    eventDate: args.currentDateYmd ?? getTodayDateYmdLocal(),
    odometer: String(args.vehicle.odometer),
    engineHours: args.vehicle.engineHours != null ? String(args.vehicle.engineHours) : "",
    serviceType: template?.serviceType ?? FALLBACK_NODE_SERVICE_TYPE_RU,
    comment:
      template?.comment ?? `${FALLBACK_NODE_SERVICE_COMMENT_PREFIX_RU} ${fallbackNodeName}`,
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
  const costAmount = hasCost ? formatExpenseAmountRu(item.costAmount as number) : "";
  const currency = hasCost
    ? (item.currency?.trim() || DEFAULT_ADD_SERVICE_EVENT_CURRENCY).toUpperCase()
    : base.currency;
  return {
    ...base,
    nodeId: item.nodeId ?? "",
    eventDate,
    serviceType: WISHLIST_INSTALL_SERVICE_TYPE_RU,
    odometer: String(vehicle.odometer),
    engineHours: vehicle.engineHours != null ? String(vehicle.engineHours) : "",
    costAmount,
    currency,
    comment: buildAddServiceEventCommentFromWishlistItem(item),
    installedPartsJson: buildWishlistInstalledPartsJsonString(item),
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
  return {
    ...base,
    nodeId: event.nodeId,
    eventDate: toIsoDateInputValue(event.eventDate),
    serviceType: event.serviceType ?? "",
    odometer: String(event.odometer),
    engineHours: event.engineHours != null ? String(event.engineHours) : "",
    costAmount: event.costAmount != null ? formatExpenseAmountRu(event.costAmount) : "",
    currency:
      event.currency?.trim().toUpperCase() ||
      options?.fallbackCurrency ||
      DEFAULT_ADD_SERVICE_EVENT_CURRENCY,
    comment: event.comment ?? "",
    installedPartsJson:
      event.installedPartsJson == null ? "" : JSON.stringify(event.installedPartsJson, null, 2),
  };
}

export function normalizeEditServiceEventPayload(
  values: AddServiceEventFormValues
): AddServiceEventPayload {
  return normalizeAddServiceEventPayload(values);
}

export function normalizeAddServiceEventPayload(
  values: AddServiceEventFormValues
): AddServiceEventPayload {
  const trimmedCost = values.costAmount.trim();
  const parsedCost =
    trimmedCost === ""
      ? null
      : Number.parseFloat(trimmedCost.replace(",", "."));

  const costAmount =
    parsedCost !== null && !Number.isNaN(parsedCost) && parsedCost >= 0 ? parsedCost : null;

  const trimmedCurrency = values.currency.trim();
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

  return {
    nodeId: values.nodeId.trim(),
    eventDate: eventDateIso,
    odometer: Math.trunc(Number(values.odometer.trim())),
    engineHours,
    serviceType: values.serviceType.trim(),
    costAmount,
    currency: costAmount !== null && trimmedCurrency ? trimmedCurrency.toUpperCase() : null,
    comment: values.comment.trim() || null,
    installedPartsJson,
  };
}

export function validateAddServiceEventFormValues(
  values: AddServiceEventFormValues,
  context: AddServiceEventValidationContext
): FormValidationResult {
  if (!values.nodeId.trim()) {
    return { errors: ["Выберите узел."] };
  }
  if (context.isLeafNode === false) {
    return { errors: ["Выберите узел последнего уровня."] };
  }
  if (!values.serviceType.trim() || !values.eventDate.trim()) {
    return { errors: ["Заполните тип сервиса и дату."] };
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

  const trimmedCost = values.costAmount.trim();
  if (trimmedCost !== "") {
    const parsedCost = Number.parseFloat(trimmedCost.replace(",", "."));
    if (Number.isNaN(parsedCost) || parsedCost < 0) {
      return { errors: ["Стоимость должна быть неотрицательным числом."] };
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

export function validateEditVehicleProfileFormValues(
  _values: EditVehicleProfileFormValues
): FormValidationResult {
  return { errors: [] };
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
