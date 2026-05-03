import type {
  CreateServiceEventInput,
  ServiceActionType,
  ServiceEventMode,
} from "./service-event";
import type {
  CreateVehicleInput,
  RideLoadType,
  RideStyle,
  RideUsageIntensity,
  RideUsageType,
  UpdateVehicleProfilePayload,
  UpdateVehicleStateInput,
} from "./vehicle";

/**
 * Stringly-typed form values для одного пункта bundle (узел + детали).
 * В BASIC режиме UI скрывает per-item поля и делает actionType общим.
 */
export type BundleItemFormValues = {
  /** Стабильный локальный ключ для React-list (не отправляется на сервер). */
  key: string;
  nodeId: string;
  actionType: ServiceActionType;
  partName: string;
  sku: string;
  quantity: string;
  partCost: string;
  laborCost: string;
  comment: string;
};

/** Stringly-typed fields as entered in inputs (web or mobile). */
export type AddServiceEventFormValues = {
  /** Bundle title — основной заголовок события. */
  title: string;
  /** Текущий режим формы. */
  mode: ServiceEventMode;
  /**
   * Общий action type для BASIC-режима — применяется ко всем выбранным узлам.
   * В ADVANCED игнорируется (action type живёт в `items[].actionType`).
   */
  commonActionType: ServiceActionType;
  eventDate: string;
  odometer: string;
  engineHours: string;
  /** Сумма по запчастям (BASIC: ручной ввод; ADVANCED: можно автосчитать из items). */
  partsCost: string;
  /** Сумма работы (BASIC: ручной ввод; ADVANCED: можно автосчитать из items). */
  laborCost: string;
  /** ISO 4217; default for new forms is `RUB` via `createInitialAddServiceEventFormValues`. */
  currency: string;
  comment: string;
  /**
   * JSON string for API `installedPartsJson`; empty after trim → null on submit.
   * Used e.g. when prefilling from a wishlist item.
   */
  installedPartsJson: string;
  installedExpenseItemIds: string[];
  /** Items bundle (>= 1 строка). */
  items: BundleItemFormValues[];
};

/** API-ready shape; alias of existing contract. */
export type AddServiceEventPayload = CreateServiceEventInput;

export type UpdateVehicleStateFormValues = {
  odometer: string;
  engineHours: string;
};

export type UpdateVehicleStatePayload = UpdateVehicleStateInput;

export type EditVehicleProfileFormValues = {
  nickname: string;
  vin: string;
  usageType: RideUsageType;
  ridingStyle: RideStyle;
  loadType: RideLoadType;
  usageIntensity: RideUsageIntensity;
};

export type VehicleProfileFormValues = EditVehicleProfileFormValues;

export type EditVehicleProfilePayload = UpdateVehicleProfilePayload;

export type AddMotorcycleFormValues = {
  brandId: string;
  modelId: string;
  modelVariantId: string;
  nickname: string;
  vin: string;
  odometer: string;
  engineHours: string;
  usageType: RideUsageType;
  ridingStyle: RideStyle;
  loadType: RideLoadType;
  usageIntensity: RideUsageIntensity;
};

export type AddMotorcyclePayload = CreateVehicleInput;

export type FormValidationResult = {
  errors: string[];
};

export type RideProfileFieldOption<T extends string> = {
  value: T;
  label: string;
};

export type AddServiceEventValidationContext = {
  /** Local calendar date upper bound `YYYY-MM-DD` (no future dates). */
  todayDateYmd: string;
  /** When set, event odometer must not exceed this (web rule). */
  currentVehicleOdometer: number | null;
  /**
   * Set of nodeIds known to be leaves (для валидации каждого `items[].nodeId`).
   * Если не передан, проверка leaf-уровня пропускается (доверяем серверу).
   */
  leafNodeIds?: ReadonlySet<string>;
};
