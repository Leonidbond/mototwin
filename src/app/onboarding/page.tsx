"use client";

import { useEffect, useMemo, useState } from "react";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import {
  createInitialAddMotorcycleFormValues,
  normalizeAddMotorcyclePayload,
  RIDE_LOAD_TYPE_OPTIONS,
  RIDE_RIDING_STYLE_OPTIONS,
  RIDE_USAGE_INTENSITY_OPTIONS,
  RIDE_USAGE_TYPE_OPTIONS,
  validateAddMotorcycleFormValues,
} from "@mototwin/domain";
import { productSemanticColors } from "@mototwin/design-tokens";
import type {
  AddMotorcycleFormValues,
  RideLoadType,
  RideStyle,
  RideUsageIntensity,
  RideUsageType,
} from "@mototwin/types";

const onboardingApi = createMotoTwinEndpoints(createApiClient({ baseUrl: "" }));

type Brand = {
  id: string;
  name: string;
  slug: string;
};

type Model = {
  id: string;
  name: string;
  slug: string;
  brandId: string;
};

type ModelVariant = {
  id: string;
  modelId: string;
  year: number;
  generation: string | null;
  versionName: string;
  market: string | null;
  engineType: string | null;
  coolingType: string | null;
  wheelSizes: string | null;
  brakeSystem: string | null;
  chainPitch: string | null;
  stockSprockets: string | null;
};

/** Ride profile slice aligned with `AddMotorcycleFormProps["values"]` (see `docs/shared-component-contracts.md`). */
type RideProfileForm = Pick<
  AddMotorcycleFormValues,
  "usageType" | "ridingStyle" | "loadType" | "usageIntensity"
>;

function initialRideProfileForm(): RideProfileForm {
  const m = createInitialAddMotorcycleFormValues();
  return {
    usageType: m.usageType,
    ridingStyle: m.ridingStyle,
    loadType: m.loadType,
    usageIntensity: m.usageIntensity,
  };
}

export default function OnboardingPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [variants, setVariants] = useState<ModelVariant[]>([]);

  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");

  const [nickname, setNickname] = useState("");
  const [vin, setVin] = useState("");
  const [odometer, setOdometer] = useState("");
  const [engineHours, setEngineHours] = useState("");

  const [rideProfile, setRideProfile] = useState<RideProfileForm>(initialRideProfileForm);

  const [isLoadingBrands, setIsLoadingBrands] = useState(true);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  useEffect(() => {
    const loadBrands = async () => {
      try {
        setIsLoadingBrands(true);
        const data = await onboardingApi.getBrands();
        setBrands(data.brands ?? []);
      } catch (error) {
        console.error("Failed to load brands", error);
      } finally {
        setIsLoadingBrands(false);
      }
    };

    loadBrands();
  }, []);

  useEffect(() => {
    if (!selectedBrandId) {
      setModels([]);
      setSelectedModelId("");
      setVariants([]);
      setSelectedVariantId("");
      return;
    }

    const loadModels = async () => {
      try {
        setIsLoadingModels(true);
        setSelectedModelId("");
        setVariants([]);
        setSelectedVariantId("");

        const data = await onboardingApi.getModels(selectedBrandId);
        setModels(data.models ?? []);
      } catch (error) {
        console.error("Failed to load models", error);
      } finally {
        setIsLoadingModels(false);
      }
    };

    loadModels();
  }, [selectedBrandId]);

  useEffect(() => {
    if (!selectedModelId) {
      setVariants([]);
      setSelectedVariantId("");
      return;
    }

    const loadVariants = async () => {
      try {
        setIsLoadingVariants(true);
        setSelectedVariantId("");

        const data = await onboardingApi.getModelVariants(selectedModelId);
        setVariants(data.variants ?? []);
      } catch (error) {
        console.error("Failed to load variants", error);
      } finally {
        setIsLoadingVariants(false);
      }
    };

    loadVariants();
  }, [selectedModelId]);

  const selectedBrand = useMemo(
    () => brands.find((brand) => brand.id === selectedBrandId) ?? null,
    [brands, selectedBrandId]
  );

  const selectedModel = useMemo(
    () => models.find((model) => model.id === selectedModelId) ?? null,
    [models, selectedModelId]
  );

  const selectedVariant = useMemo(
    () => variants.find((variant) => variant.id === selectedVariantId) ?? null,
    [variants, selectedVariantId]
  );

  const handleSubmit = async () => {
    try {
      setSubmitError("");
      setSubmitSuccess("");

      const motorcycleForm: AddMotorcycleFormValues = {
        brandId: selectedBrandId,
        modelId: selectedModelId,
        modelVariantId: selectedVariantId,
        nickname,
        vin,
        odometer,
        engineHours,
        usageType: rideProfile.usageType,
        ridingStyle: rideProfile.ridingStyle,
        loadType: rideProfile.loadType,
        usageIntensity: rideProfile.usageIntensity,
      };

      const validation = validateAddMotorcycleFormValues(motorcycleForm, "web");
      if (validation.errors.length > 0) {
        setSubmitError(validation.errors[0]);
        return;
      }

      setIsSubmitting(true);

      const data = await onboardingApi.createVehicle(
        normalizeAddMotorcyclePayload(motorcycleForm)
      );

      setSubmitSuccess("Мотоцикл успешно сохранен в гараж.");
      console.log("Created vehicle:", data.vehicle);
    } catch (error) {
      console.error(error);
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Произошла ошибка при сохранении."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main
      className="mt-internal-page min-h-screen px-6 py-16 text-gray-950"
      style={{ backgroundColor: productSemanticColors.canvas }}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 max-w-3xl">
          <div className="inline-flex items-center rounded-full border border-gray-300 px-3 py-1 text-sm text-gray-600">
            MotoTwin | Первый мотоцикл в гараже
          </div>

          <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
            Добавление мотоцикла
          </h1>

          <p className="mt-4 text-base leading-7 text-gray-600 sm:text-lg">
            Выберите бренд, модель и модификацию, затем укажите пробег, VIN и
            профиль эксплуатации. На этом шаге мы собираем основу цифрового
            профиля вашего мотоцикла.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="grid gap-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">
                  Бренд
                </label>
                <select
                  value={selectedBrandId}
                  onChange={(e) => setSelectedBrandId(e.target.value)}
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
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">
                  Модель
                </label>
                <select
                  value={selectedModelId}
                  onChange={(e) => setSelectedModelId(e.target.value)}
                  disabled={!selectedBrandId || isLoadingModels}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950 disabled:bg-gray-100"
                >
                  <option value="">
                    {!selectedBrandId
                      ? "Сначала выберите бренд"
                      : isLoadingModels
                      ? "Загрузка моделей..."
                      : "Выберите модель"}
                  </option>
                  {models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">
                  Модификация
                </label>
                <select
                  value={selectedVariantId}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                  disabled={!selectedModelId || isLoadingVariants}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950 disabled:bg-gray-100"
                >
                  <option value="">
                    {!selectedModelId
                      ? "Сначала выберите модель"
                      : isLoadingVariants
                      ? "Загрузка модификаций..."
                      : "Выберите модификацию"}
                  </option>
                  {variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.year} | {variant.versionName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">
                  Название в гараже
                </label>
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Например: Мой GS"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-900">
                    VIN
                  </label>
                  <input
                    value={vin}
                    onChange={(e) => setVin(e.target.value.toUpperCase())}
                    placeholder="Введите VIN"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-900">
                    Пробег, км
                  </label>
                  <input
                    value={odometer}
                    onChange={(e) => setOdometer(e.target.value)}
                    inputMode="numeric"
                    placeholder="Например: 18500"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">
                  Моточасы
                </label>
                <input
                  value={engineHours}
                  onChange={(e) => setEngineHours(e.target.value)}
                  inputMode="numeric"
                  placeholder="Если применимо"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-900">
                    Сценарий эксплуатации
                  </label>
                  <select
                    value={rideProfile.usageType}
                    onChange={(e) =>
                      setRideProfile((prev) => ({
                        ...prev,
                        usageType: e.target.value as RideUsageType,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                  >
                    {RIDE_USAGE_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-900">
                    Стиль езды
                  </label>
                  <select
                    value={rideProfile.ridingStyle}
                    onChange={(e) =>
                      setRideProfile((prev) => ({
                        ...prev,
                        ridingStyle: e.target.value as RideStyle,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                  >
                    {RIDE_RIDING_STYLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-900">
                    Нагрузка
                  </label>
                  <select
                    value={rideProfile.loadType}
                    onChange={(e) =>
                      setRideProfile((prev) => ({
                        ...prev,
                        loadType: e.target.value as RideLoadType,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                  >
                    {RIDE_LOAD_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-900">
                    Интенсивность
                  </label>
                  <select
                    value={rideProfile.usageIntensity}
                    onChange={(e) =>
                      setRideProfile((prev) => ({
                        ...prev,
                        usageIntensity: e.target.value as RideUsageIntensity,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                  >
                    {RIDE_USAGE_INTENSITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-xl bg-gray-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Сохраняем..." : "Сохранить мотоцикл"}
                </button>

                {submitError ? (
                  <p className="mt-4 text-sm text-red-600">{submitError}</p>
                ) : null}

                {submitSuccess ? (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm text-green-600">{submitSuccess}</p>
                    <a
                      href="/garage"
                      className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
                    >
                      Перейти в гараж
                    </a>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <aside className="rounded-3xl border border-gray-200 bg-gray-50 p-8">
            <h2 className="text-2xl font-semibold tracking-tight text-gray-950">
              Предпросмотр профиля
            </h2>

            <div className="mt-6 space-y-4 text-sm leading-6 text-gray-700">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Бренд
                </div>
                <div className="mt-1 font-medium text-gray-950">
                  {selectedBrand?.name || "Не выбран"}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Модель
                </div>
                <div className="mt-1 font-medium text-gray-950">
                  {selectedModel?.name || "Не выбрана"}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Модификация
                </div>
                <div className="mt-1 font-medium text-gray-950">
                  {selectedVariant
                    ? `${selectedVariant.year} | ${selectedVariant.versionName}`
                    : "Не выбрана"}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Название в гараже
                </div>
                <div className="mt-1 font-medium text-gray-950">
                  {nickname || "Не задано"}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  VIN
                </div>
                <div className="mt-1 font-medium text-gray-950">
                  {vin || "Не указан"}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Пробег
                </div>
                <div className="mt-1 font-medium text-gray-950">
                  {odometer ? `${odometer} км` : "Не указан"}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Моточасы
                </div>
                <div className="mt-1 font-medium text-gray-950">
                  {engineHours || "Не указаны"}
                </div>
              </div>
            </div>

            {selectedVariant && (
              <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5">
                <h3 className="text-base font-semibold text-gray-950">
                  Данные модификации
                </h3>

                <div className="mt-4 space-y-3 text-sm leading-6 text-gray-700">
                  <div>
                    <span className="font-medium text-gray-950">Рынок:</span>{" "}
                    {selectedVariant.market || "Не указан"}
                  </div>
                  <div>
                    <span className="font-medium text-gray-950">Двигатель:</span>{" "}
                    {selectedVariant.engineType || "Не указан"}
                  </div>
                  <div>
                    <span className="font-medium text-gray-950">
                      Охлаждение:
                    </span>{" "}
                    {selectedVariant.coolingType || "Не указано"}
                  </div>
                  <div>
                    <span className="font-medium text-gray-950">Колеса:</span>{" "}
                    {selectedVariant.wheelSizes || "Не указаны"}
                  </div>
                  <div>
                    <span className="font-medium text-gray-950">
                      Тормозная система:
                    </span>{" "}
                    {selectedVariant.brakeSystem || "Не указана"}
                  </div>
                  <div>
                    <span className="font-medium text-gray-950">Шаг цепи:</span>{" "}
                    {selectedVariant.chainPitch || "Не указан"}
                  </div>
                  <div>
                    <span className="font-medium text-gray-950">
                      Стоковые звезды:
                    </span>{" "}
                    {selectedVariant.stockSprockets || "Не указаны"}
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}