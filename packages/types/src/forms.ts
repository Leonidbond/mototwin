import type { CreateServiceEventInput } from "./service-event";
import type {
  CreateVehicleInput,
  RideLoadType,
  RideStyle,
  RideUsageIntensity,
  RideUsageType,
  UpdateVehicleProfilePayload,
  UpdateVehicleStateInput,
} from "./vehicle";

/** Stringly-typed fields as entered in inputs (web or mobile). */
export type AddServiceEventFormValues = {
  nodeId: string;
  eventDate: string;
  serviceType: string;
  odometer: string;
  engineHours: string;
  costAmount: string;
  /** ISO 4217; default for new forms is `RUB` via `createInitialAddServiceEventFormValues`. */
  currency: string;
  comment: string;
  /**
   * JSON string for API `installedPartsJson`; empty after trim → null on submit.
   * Used e.g. when prefilling from a wishlist item.
   */
  installedPartsJson: string;
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
  /** When false and `nodeId` is set, selection is not a leaf (web cascaded picker). */
  isLeafNode?: boolean;
};
