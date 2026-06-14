import type { CreateMotorcycleCatalogRequestInput, MotorcycleCatalogPickerFormState } from "@mototwin/types";

export type CatalogPickerLevel = "brand" | "family" | "variant" | "generation";
export type CatalogPickerLevelMode = "catalog" | "custom";

export type MotorcycleCatalogPickerState = MotorcycleCatalogPickerFormState;

export type CatalogPickerFieldErrors = Partial<
  Record<
    | "brand"
    | "family"
    | "variant"
    | "generation"
    | "yearFrom"
    | "yearTo",
    string
  >
>;

const LEVEL_ORDER: CatalogPickerLevel[] = ["brand", "family", "variant", "generation"];

export function createInitialMotorcycleCatalogPickerState(
  overrides?: Partial<MotorcycleCatalogPickerState>
): MotorcycleCatalogPickerState {
  return {
    brandMode: "catalog",
    brandId: "",
    brandName: "",
    familyMode: "catalog",
    familyId: "",
    familyName: "",
    variantMode: "catalog",
    variantId: "",
    variantName: "",
    generationMode: "catalog",
    generationId: "",
    yearFrom: "",
    yearTo: "",
    userComment: "",
    ...overrides,
  };
}

export function resetPickerFromLevel(
  state: MotorcycleCatalogPickerState,
  level: CatalogPickerLevel
): MotorcycleCatalogPickerState {
  const startIndex = LEVEL_ORDER.indexOf(level);
  const next = { ...state };

  for (const current of LEVEL_ORDER.slice(startIndex)) {
    switch (current) {
      case "brand":
        next.brandMode = "catalog";
        next.brandId = "";
        next.brandName = "";
        break;
      case "family":
        next.familyMode = "catalog";
        next.familyId = "";
        next.familyName = "";
        break;
      case "variant":
        next.variantMode = "catalog";
        next.variantId = "";
        next.variantName = "";
        break;
      case "generation":
        next.generationMode = "catalog";
        next.generationId = "";
        next.yearFrom = "";
        next.yearTo = "";
        next.userComment = "";
        break;
      default:
        break;
    }
  }

  return next;
}

export function setPickerLevelMode(
  state: MotorcycleCatalogPickerState,
  level: CatalogPickerLevel,
  mode: CatalogPickerLevelMode
): MotorcycleCatalogPickerState {
  const childLevel =
    level === "brand"
      ? "family"
      : level === "family"
        ? "variant"
        : level === "variant"
          ? "generation"
          : null;

  let next: MotorcycleCatalogPickerState = { ...state, [`${level}Mode`]: mode } as MotorcycleCatalogPickerState;

  if (mode === "custom" && level !== "generation") {
    next[`${level}Id` as "brandId" | "familyId" | "variantId"] = "";
  }

  if (childLevel) {
    next = resetPickerFromLevel(next, childLevel);
    if (mode === "custom" && level !== "brand") {
      next[`${childLevel}Mode` as "familyMode" | "variantMode" | "generationMode"] = "custom";
    }
  }

  if (level === "brand" && mode === "custom") {
    next.familyMode = "custom";
    next.variantMode = "custom";
    next.generationMode = "custom";
  } else if (level === "family" && mode === "custom") {
    next.variantMode = "custom";
    next.generationMode = "custom";
  } else if (level === "variant" && mode === "custom") {
    next.generationMode = "custom";
  }

  return next;
}

export function isFullCatalogPath(state: MotorcycleCatalogPickerState): boolean {
  return (
    state.brandMode === "catalog" &&
    state.brandId.trim() !== "" &&
    state.familyMode === "catalog" &&
    state.familyId.trim() !== "" &&
    state.variantMode === "catalog" &&
    state.variantId.trim() !== "" &&
    state.generationMode === "catalog" &&
    state.generationId.trim() !== ""
  );
}

export function requiresCatalogRequest(state: MotorcycleCatalogPickerState): boolean {
  return !isFullCatalogPath(state);
}

export function isBrandLevelReady(state: MotorcycleCatalogPickerState): boolean {
  return state.brandMode === "catalog"
    ? state.brandId.trim() !== ""
    : state.brandName.trim() !== "";
}

export function isFamilyLevelReady(state: MotorcycleCatalogPickerState): boolean {
  if (!isBrandLevelReady(state)) {
    return false;
  }
  return state.familyMode === "catalog"
    ? state.familyId.trim() !== ""
    : state.familyName.trim() !== "";
}

export function isVariantLevelReady(state: MotorcycleCatalogPickerState): boolean {
  if (!isFamilyLevelReady(state)) {
    return false;
  }
  return state.variantMode === "catalog"
    ? state.variantId.trim() !== ""
    : state.variantName.trim() !== "";
}

export function isGenerationLevelReady(state: MotorcycleCatalogPickerState): boolean {
  if (!isVariantLevelReady(state)) {
    return false;
  }
  if (state.generationMode === "catalog") {
    return state.generationId.trim() !== "";
  }
  const yearFrom = Number(state.yearFrom.trim());
  return Number.isInteger(yearFrom) && yearFrom >= 1900;
}

export function isCatalogPickerComplete(state: MotorcycleCatalogPickerState): boolean {
  if (isFullCatalogPath(state)) {
    return true;
  }
  return requiresCatalogRequest(state) && isGenerationLevelReady(state);
}

export function validateCatalogPickerState(
  state: MotorcycleCatalogPickerState
): { errors: string[]; fieldErrors: CatalogPickerFieldErrors } {
  const errors: string[] = [];
  const fieldErrors: CatalogPickerFieldErrors = {};

  if (state.brandMode === "catalog") {
    if (!state.brandId.trim()) {
      errors.push("Выберите марку.");
      fieldErrors.brand = "Выберите марку.";
    }
  } else if (!state.brandName.trim()) {
    errors.push("Укажите марку.");
    fieldErrors.brand = "Укажите марку.";
  }

  if (isBrandLevelReady(state)) {
    if (state.familyMode === "catalog") {
      if (!state.familyId.trim()) {
        errors.push("Выберите семейство модели.");
        fieldErrors.family = "Выберите семейство модели.";
      }
    } else if (!state.familyName.trim()) {
      errors.push("Укажите модель (семейство).");
      fieldErrors.family = "Укажите модель (семейство).";
    }
  }

  if (isFamilyLevelReady(state)) {
    if (state.variantMode === "catalog") {
      if (!state.variantId.trim()) {
        errors.push("Выберите модификацию.");
        fieldErrors.variant = "Выберите модификацию.";
      }
    } else if (!state.variantName.trim()) {
      errors.push("Укажите модификацию.");
      fieldErrors.variant = "Укажите модификацию.";
    }
  }

  if (isVariantLevelReady(state)) {
    if (state.generationMode === "catalog") {
      if (!state.generationId.trim()) {
        errors.push("Выберите поколение.");
        fieldErrors.generation = "Выберите поколение.";
      }
    } else {
      const yearFromRaw = state.yearFrom.trim();
      const yearFrom = Number(yearFromRaw);
      if (!yearFromRaw || !Number.isInteger(yearFrom) || yearFrom < 1900) {
        errors.push("Укажите корректный год выпуска.");
        fieldErrors.yearFrom = "Укажите корректный год выпуска.";
      }
      const yearToRaw = state.yearTo.trim();
      if (yearToRaw) {
        const yearTo = Number(yearToRaw);
        if (!Number.isInteger(yearTo) || yearTo < yearFrom) {
          errors.push("Год окончания не может быть раньше года начала.");
          fieldErrors.yearTo = "Год окончания не может быть раньше года начала.";
        }
      }
    }
  }

  return {
    errors: [...new Set(errors)],
    fieldErrors,
  };
}

export function toCatalogRequestDraft(
  state: MotorcycleCatalogPickerState
): CreateMotorcycleCatalogRequestInput {
  const yearFrom = Math.trunc(Number(state.yearFrom.trim()));
  const yearToRaw = state.yearTo.trim();
  const yearTo = yearToRaw ? Math.trunc(Number(yearToRaw)) : null;

  return {
    motorcycleBrandId: state.brandMode === "catalog" ? state.brandId.trim() : undefined,
    brandName: state.brandMode === "custom" ? state.brandName.trim() : undefined,
    motorcycleModelFamilyId:
      state.familyMode === "catalog" ? state.familyId.trim() : undefined,
    familyName: state.familyMode === "custom" ? state.familyName.trim() : undefined,
    motorcycleVariantId:
      state.variantMode === "catalog" ? state.variantId.trim() : undefined,
    variantName: state.variantMode === "custom" ? state.variantName.trim() : undefined,
    yearFrom,
    yearTo,
    userComment: state.userComment.trim() || undefined,
  };
}

export function getCatalogPickerDisplayLabel(state: MotorcycleCatalogPickerState): string {
  const brand =
    state.brandMode === "catalog" ? state.brandId : state.brandName.trim() || "—";
  const family =
    state.familyMode === "catalog" ? state.familyId : state.familyName.trim() || "—";
  const variant =
    state.variantMode === "catalog" ? state.variantId : state.variantName.trim() || "—";
  return `${brand} ${family} ${variant}`.trim();
}

export function syncLegacyPickerIds(
  state: MotorcycleCatalogPickerState
): Pick<
  AddMotorcycleFormValuesLegacyIds,
  "motorcycleBrandId" | "motorcycleModelFamilyId" | "motorcycleVariantId" | "motorcycleGenerationId"
> {
  return {
    motorcycleBrandId: state.brandMode === "catalog" ? state.brandId : "",
    motorcycleModelFamilyId: state.familyMode === "catalog" ? state.familyId : "",
    motorcycleVariantId: state.variantMode === "catalog" ? state.variantId : "",
    motorcycleGenerationId:
      state.generationMode === "catalog" ? state.generationId : "",
  };
}

type AddMotorcycleFormValuesLegacyIds = {
  motorcycleBrandId: string;
  motorcycleModelFamilyId: string;
  motorcycleVariantId: string;
  motorcycleGenerationId: string;
};
