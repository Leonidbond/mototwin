"use client";

import { useEffect, useState } from "react";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import {
  isBrandLevelReady,
  isFamilyLevelReady,
  isVariantLevelReady,
  requiresCatalogRequest,
  setPickerLevelMode,
  type MotorcycleCatalogPickerState,
} from "@mototwin/domain";
import type {
  MotorcycleBrandPickerItem,
  MotorcycleGenerationPickerItem,
  MotorcycleModelFamilyPickerItem,
  MotorcycleVariantPickerItem,
} from "@mototwin/types";

const catalogApi = createMotoTwinEndpoints(createApiClient({ baseUrl: "" }));

export function useMotorcycleCatalogPickerData(picker: MotorcycleCatalogPickerState) {
  const [brands, setBrands] = useState<MotorcycleBrandPickerItem[]>([]);
  const [families, setFamilies] = useState<MotorcycleModelFamilyPickerItem[]>([]);
  const [variants, setVariants] = useState<MotorcycleVariantPickerItem[]>([]);
  const [generations, setGenerations] = useState<MotorcycleGenerationPickerItem[]>([]);

  const [isLoadingBrands, setIsLoadingBrands] = useState(true);
  const [isLoadingFamilies, setIsLoadingFamilies] = useState(false);
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);
  const [isLoadingGenerations, setIsLoadingGenerations] = useState(false);

  useEffect(() => {
    const loadBrands = async () => {
      try {
        setIsLoadingBrands(true);
        const data = await catalogApi.getMotorcycleBrands();
        setBrands(data.brands ?? []);
      } catch (error) {
        console.error("Failed to load brands", error);
      } finally {
        setIsLoadingBrands(false);
      }
    };
    void loadBrands();
  }, []);

  useEffect(() => {
    if (picker.brandMode !== "catalog" || !picker.brandId) {
      setFamilies([]);
      return;
    }

    const loadFamilies = async () => {
      try {
        setIsLoadingFamilies(true);
        const data = await catalogApi.getMotorcycleModelFamilies(picker.brandId);
        setFamilies(data.families ?? []);
      } catch (error) {
        console.error("Failed to load model families", error);
      } finally {
        setIsLoadingFamilies(false);
      }
    };
    void loadFamilies();
  }, [picker.brandId, picker.brandMode]);

  useEffect(() => {
    if (picker.familyMode !== "catalog" || !picker.familyId) {
      setVariants([]);
      return;
    }

    const loadVariants = async () => {
      try {
        setIsLoadingVariants(true);
        const data = await catalogApi.getMotorcycleVariants(picker.familyId);
        setVariants(data.variants ?? []);
      } catch (error) {
        console.error("Failed to load variants", error);
      } finally {
        setIsLoadingVariants(false);
      }
    };
    void loadVariants();
  }, [picker.familyId, picker.familyMode]);

  useEffect(() => {
    if (picker.variantMode !== "catalog" || !picker.variantId) {
      setGenerations([]);
      return;
    }

    const loadGenerations = async () => {
      try {
        setIsLoadingGenerations(true);
        const data = await catalogApi.getMotorcycleGenerations(picker.variantId);
        setGenerations(data.generations ?? []);
      } catch (error) {
        console.error("Failed to load generations", error);
      } finally {
        setIsLoadingGenerations(false);
      }
    };
    void loadGenerations();
  }, [picker.variantId, picker.variantMode]);

  return {
    brands,
    families,
    variants,
    generations,
    isLoadingBrands,
    isLoadingFamilies,
    isLoadingVariants,
    isLoadingGenerations,
  };
}

export function pickGenerationYearLabel(generation: MotorcycleGenerationPickerItem): string {
  const curated = generation.yearsLabel?.trim();
  if (curated) {
    return curated;
  }
  if (generation.yearTo != null) {
    return `${generation.yearFrom}–${generation.yearTo}`;
  }
  return `${generation.yearFrom}–`;
}

type MotorcycleCatalogPickerFieldsProps = {
  picker: MotorcycleCatalogPickerState;
  onChange: (next: MotorcycleCatalogPickerState) => void;
  brands: MotorcycleBrandPickerItem[];
  families: MotorcycleModelFamilyPickerItem[];
  variants: MotorcycleVariantPickerItem[];
  generations: MotorcycleGenerationPickerItem[];
  isLoadingBrands: boolean;
  isLoadingFamilies: boolean;
  isLoadingVariants: boolean;
  isLoadingGenerations: boolean;
};

export function MotorcycleCatalogPickerFields(props: MotorcycleCatalogPickerFieldsProps) {
  const {
    picker,
    onChange,
    brands,
    families,
    variants,
    generations,
    isLoadingBrands,
    isLoadingFamilies,
    isLoadingVariants,
    isLoadingGenerations,
  } = props;

  const showCustomGeneration =
    picker.generationMode === "custom" || picker.variantMode === "custom";

  return (
    <>
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-900">Бренд</label>
        {picker.brandMode === "catalog" ? (
          <>
            <select
              value={picker.brandId}
              onChange={(e) =>
                onChange({
                  ...setPickerLevelMode(picker, "brand", "catalog"),
                  brandId: e.target.value,
                })
              }
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
            >
              <option value="">
                {isLoadingBrands ? "Загрузка брендов..." : "Выберите бренд"}
              </option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onChange(setPickerLevelMode(picker, "brand", "custom"))}
              className="mt-2 text-sm font-medium text-gray-600 underline-offset-2 hover:text-gray-950 hover:underline"
            >
              Моей марки нет
            </button>
          </>
        ) : (
          <>
            <input
              value={picker.brandName}
              onChange={(e) => onChange({ ...picker, brandName: e.target.value })}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm"
              placeholder="Например: Beta"
            />
            <button
              type="button"
              onClick={() => onChange(setPickerLevelMode(picker, "brand", "catalog"))}
              className="mt-2 text-sm font-medium text-gray-600 underline-offset-2 hover:text-gray-950 hover:underline"
            >
              Выбрать из списка
            </button>
          </>
        )}
      </div>

      {isBrandLevelReady(picker) ? (
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-900">
            Семейство модели
          </label>
          {picker.familyMode === "catalog" ? (
            <>
              <select
                value={picker.familyId}
                onChange={(e) =>
                  onChange({
                    ...setPickerLevelMode(picker, "family", "catalog"),
                    familyId: e.target.value,
                  })
                }
                disabled={picker.brandMode === "catalog" && (!picker.brandId || isLoadingFamilies)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950 disabled:bg-gray-100"
              >
                <option value="">
                  {picker.brandMode === "catalog" && !picker.brandId
                    ? "Сначала выберите бренд"
                    : isLoadingFamilies
                      ? "Загрузка семейств..."
                      : "Выберите семейство"}
                </option>
                {families.map((family) => (
                  <option key={family.id} value={family.id}>
                    {family.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => onChange(setPickerLevelMode(picker, "family", "custom"))}
                className="mt-2 text-sm font-medium text-gray-600 underline-offset-2 hover:text-gray-950 hover:underline"
              >
                Моей модели нет
              </button>
            </>
          ) : (
            <>
              <input
                value={picker.familyName}
                onChange={(e) => onChange({ ...picker, familyName: e.target.value })}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm"
                placeholder="Например: RR 430"
              />
              {picker.brandMode === "catalog" ? (
                <button
                  type="button"
                  onClick={() => onChange(setPickerLevelMode(picker, "family", "catalog"))}
                  className="mt-2 text-sm font-medium text-gray-600 underline-offset-2 hover:text-gray-950 hover:underline"
                >
                  Выбрать из списка
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {isFamilyLevelReady(picker) ? (
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-900">Модификация</label>
          {picker.variantMode === "catalog" ? (
            <>
              <select
                value={picker.variantId}
                onChange={(e) =>
                  onChange({
                    ...setPickerLevelMode(picker, "variant", "catalog"),
                    variantId: e.target.value,
                  })
                }
                disabled={
                  picker.familyMode === "catalog" && (!picker.familyId || isLoadingVariants)
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950 disabled:bg-gray-100"
              >
                <option value="">
                  {picker.familyMode === "catalog" && !picker.familyId
                    ? "Сначала выберите семейство"
                    : isLoadingVariants
                      ? "Загрузка модификаций..."
                      : "Выберите модификацию"}
                </option>
                {variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => onChange(setPickerLevelMode(picker, "variant", "custom"))}
                className="mt-2 text-sm font-medium text-gray-600 underline-offset-2 hover:text-gray-950 hover:underline"
              >
                Моей модификации нет
              </button>
            </>
          ) : (
            <>
              <input
                value={picker.variantName}
                onChange={(e) => onChange({ ...picker, variantName: e.target.value })}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm"
                placeholder="Например: Racing"
              />
              {picker.familyMode === "catalog" ? (
                <button
                  type="button"
                  onClick={() => onChange(setPickerLevelMode(picker, "variant", "catalog"))}
                  className="mt-2 text-sm font-medium text-gray-600 underline-offset-2 hover:text-gray-950 hover:underline"
                >
                  Выбрать из списка
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {isVariantLevelReady(picker) ? (
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-900">Поколение</label>
          {showCustomGeneration ? (
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-900">Год от</label>
                  <input
                    value={picker.yearFrom}
                    onChange={(e) =>
                      onChange({
                        ...picker,
                        generationMode: "custom",
                        generationId: "",
                        yearFrom: e.target.value,
                      })
                    }
                    inputMode="numeric"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm"
                    placeholder="2024"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-900">
                    Год до (опционально)
                  </label>
                  <input
                    value={picker.yearTo}
                    onChange={(e) =>
                      onChange({
                        ...picker,
                        generationMode: "custom",
                        generationId: "",
                        yearTo: e.target.value,
                      })
                    }
                    inputMode="numeric"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm"
                    placeholder="2026"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">
                  Комментарий (опционально)
                </label>
                <textarea
                  value={picker.userComment}
                  onChange={(e) => onChange({ ...picker, userComment: e.target.value })}
                  rows={2}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm"
                  placeholder="Уточнения для модератора"
                />
              </div>
              {picker.variantMode === "catalog" ? (
                <button
                  type="button"
                  onClick={() =>
                    onChange(setPickerLevelMode(picker, "generation", "catalog"))
                  }
                  className="text-sm font-medium text-gray-600 underline-offset-2 hover:text-gray-950 hover:underline"
                >
                  Выбрать поколение из списка
                </button>
              ) : null}
            </div>
          ) : (
            <>
              <select
                value={picker.generationId}
                onChange={(e) =>
                  onChange({
                    ...picker,
                    generationMode: "catalog",
                    generationId: e.target.value,
                    yearFrom: "",
                    yearTo: "",
                  })
                }
                disabled={!picker.variantId || isLoadingGenerations}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950 disabled:bg-gray-100"
              >
                <option value="">
                  {!picker.variantId
                    ? "Сначала выберите модификацию"
                    : isLoadingGenerations
                      ? "Загрузка поколений..."
                      : "Выберите поколение"}
                </option>
                {generations.map((generation) => {
                  const yearLabel = pickGenerationYearLabel(generation);
                  const specs = generation.technicalSpecs;
                  const driveLabel =
                    specs?.drive && specs.drive !== "UNKNOWN" ? specs.drive : null;
                  const specChunks = [specs?.engine, driveLabel].filter(
                    (chunk): chunk is string => Boolean(chunk?.trim())
                  );
                  const specLabel = specChunks.length > 0 ? ` · ${specChunks.join(" · ")}` : "";
                  const yearPrefix = yearLabel ? `${yearLabel} · ` : "";
                  return (
                    <option key={generation.id} value={generation.id}>
                      {yearPrefix}
                      {generation.name}
                      {specLabel}
                    </option>
                  );
                })}
              </select>
              <button
                type="button"
                onClick={() => onChange(setPickerLevelMode(picker, "generation", "custom"))}
                className="mt-2 text-sm font-medium text-gray-600 underline-offset-2 hover:text-gray-950 hover:underline"
              >
                Моего поколения нет
              </button>
            </>
          )}
        </div>
      ) : null}

      {requiresCatalogRequest(picker) && isVariantLevelReady(picker) ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Новая модель будет отправлена на модерацию вместе с сохранением мотоцикла.
        </div>
      ) : null}
    </>
  );
}
