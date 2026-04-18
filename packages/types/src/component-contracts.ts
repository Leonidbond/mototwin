import type {
  AddMotorcycleFormValues,
  AddServiceEventFormValues,
  EditVehicleProfileFormValues,
  RideProfileFieldOption,
  UpdateVehicleStateFormValues,
} from "./forms";
import type { NodeTreeItemViewModel } from "./node";
import type {
  ServiceEventsSortField,
  ServiceLogEntryDateStyle,
  ServiceLogEntryViewModel,
  ServiceLogFilters,
  ServiceLogMonthGroupViewModel,
  ServiceLogSortState,
} from "./service-log";
import type { GarageAttentionIndicatorViewModel } from "./attention";
import type {
  BrandItem,
  ModelItem,
  ModelVariantItem,
  RideLoadType,
  RideProfileViewModel,
  RideStyle,
  RideUsageIntensity,
  RideUsageType,
  VehicleDetailViewModel,
  VehicleStateViewModel,
  VehicleSummaryViewModel,
  VehicleTechnicalInfoViewModel,
} from "./vehicle";

/** One garage list card: identity + preformatted summary lines (see view models). */
export type GarageCardProps = {
  vehicleId: string;
  /** e.g. "Brand | Model" caption above the title */
  brandModelCaption: string;
  summary: VehicleSummaryViewModel;
  rideProfile: RideProfileViewModel | null;
  /** Short spec strip (engine, cooling, …) — optional; web garage shows four tiles */
  specHighlights?: Array<{ label: string; value: string }>;
  onOpenDetails?: () => void;
  /** Maintenance attention chip next to title (garage list). */
  attentionIndicator: GarageAttentionIndicatorViewModel;
};

/** Vehicle screen hero / title block */
export type VehicleHeaderProps = {
  vehicleId: string;
  detail: VehicleDetailViewModel;
  onOpenServiceLog?: () => void;
  onEditProfile?: () => void;
};

/** Read-only odometer / engine hours block + edit affordances */
export type VehicleStateSectionProps = {
  state: VehicleStateViewModel;
  isEditing?: boolean;
  isSaving?: boolean;
  errorMessage?: string;
  onRequestEdit?: () => void;
  onCancelEdit?: () => void;
};

/** Localized ride profile lines */
export type RideProfileSectionProps = {
  profile: RideProfileViewModel | null;
  title?: string;
  emptyMessage?: string;
  isCollapsed?: boolean;
  onToggleCollapsed?: () => void;
};

/** Key/value technical rows from variant */
export type TechnicalInfoSectionProps = {
  technical: VehicleTechnicalInfoViewModel;
  title?: string;
  isCollapsed?: boolean;
  onToggleCollapsed?: () => void;
  isLoading?: boolean;
  errorMessage?: string;
};

/** Whole tree section: roots are view-model nodes */
export type NodeTreeSectionProps = {
  roots: NodeTreeItemViewModel[];
  title?: string;
  isLoading?: boolean;
  errorMessage?: string;
  emptyMessage?: string;
};

/** One row / node in an expandable tree (platform renders chevron, badges, etc.) */
export type NodeTreeItemProps = {
  item: NodeTreeItemViewModel;
  depth: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onRequestAddServiceEvent?: () => void;
};

/** Service journal grouped by month */
export type ServiceLogTimelineProps = {
  monthGroups: ServiceLogMonthGroupViewModel[];
  filters?: ServiceLogFilters;
  sort?: ServiceLogSortState;
  onFilterChange?: (field: keyof ServiceLogFilters, value: string) => void;
  onSortFieldToggle?: (field: ServiceEventsSortField) => void;
  isLoading?: boolean;
  errorMessage?: string;
  emptyMessage?: string;
};

/** Single journal row */
export type ServiceLogEntryProps = {
  entry: ServiceLogEntryViewModel;
  dateStyle?: ServiceLogEntryDateStyle;
  isCommentExpanded?: boolean;
  onToggleCommentExpanded?: () => void;
};

/** Add service event (values + submit lifecycle; node pickers stay screen-level on web) */
export type AddServiceEventFormProps = {
  values: AddServiceEventFormValues;
  validationErrors: string[];
  serverErrorMessage?: string;
  successMessage?: string;
  isSubmitting: boolean;
  onFieldChange: (field: keyof AddServiceEventFormValues, value: string) => void;
  onSubmit: () => void;
  onCancel?: () => void;
};

export type UpdateVehicleStateFormProps = {
  values: UpdateVehicleStateFormValues;
  validationErrors: string[];
  errorMessage?: string;
  isSubmitting: boolean;
  onFieldChange: (field: keyof UpdateVehicleStateFormValues, value: string) => void;
  onSubmit: () => void;
  onCancel?: () => void;
};

export type EditVehicleProfileFormProps = {
  values: EditVehicleProfileFormValues;
  validationErrors: string[];
  errorMessage?: string;
  isSubmitting: boolean;
  rideProfileOptions: {
    usageType: ReadonlyArray<RideProfileFieldOption<RideUsageType>>;
    ridingStyle: ReadonlyArray<RideProfileFieldOption<RideStyle>>;
    loadType: ReadonlyArray<RideProfileFieldOption<RideLoadType>>;
    usageIntensity: ReadonlyArray<RideProfileFieldOption<RideUsageIntensity>>;
  };
  onPatchValues: (patch: Partial<EditVehicleProfileFormValues>) => void;
  onSubmit: () => void;
  onCancel?: () => void;
};

export type AddMotorcycleFormProps = {
  values: AddMotorcycleFormValues;
  brands: BrandItem[];
  models: ModelItem[];
  variants: ModelVariantItem[];
  isLoadingBrands: boolean;
  isLoadingModels: boolean;
  isLoadingVariants: boolean;
  validationErrors: string[];
  submitError?: string;
  isSubmitting: boolean;
  rideProfileOptions: EditVehicleProfileFormProps["rideProfileOptions"];
  onPatchValues: (patch: Partial<AddMotorcycleFormValues>) => void;
  onSubmit: () => void;
};
