import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import type {
  BrandItem,
  ModelItem,
  ModelVariantItem,
  RideLoadType,
  RideStyle,
  RideUsageIntensity,
  RideUsageType,
} from "@mototwin/types";
import { getApiBaseUrl } from "../../src/api-base-url";

type RideOption<T extends string> = {
  value: T;
  label: string;
};

type FormErrors = {
  brandId?: string;
  modelId?: string;
  modelVariantId?: string;
  odometer?: string;
  engineHours?: string;
};

const USAGE_TYPE_OPTIONS: RideOption<RideUsageType>[] = [
  { value: "CITY", label: "Город" },
  { value: "HIGHWAY", label: "Трасса" },
  { value: "MIXED", label: "Смешанный" },
  { value: "OFFROAD", label: "Off-road" },
];

const RIDING_STYLE_OPTIONS: RideOption<RideStyle>[] = [
  { value: "CALM", label: "Спокойный" },
  { value: "ACTIVE", label: "Активный" },
  { value: "AGGRESSIVE", label: "Агрессивный" },
];

const LOAD_TYPE_OPTIONS: RideOption<RideLoadType>[] = [
  { value: "SOLO", label: "Соло" },
  { value: "PASSENGER", label: "Пассажир" },
  { value: "LUGGAGE", label: "Багаж" },
  { value: "PASSENGER_LUGGAGE", label: "Пассажир + багаж" },
];

const USAGE_INTENSITY_OPTIONS: RideOption<RideUsageIntensity>[] = [
  { value: "LOW", label: "Низкая" },
  { value: "MEDIUM", label: "Средняя" },
  { value: "HIGH", label: "Высокая" },
];

function getVariantLabel(variant: ModelVariantItem): string {
  const yearPart = String(variant.year);
  const versionPart = variant.versionName?.trim() || "Без версии";
  return `${yearPart} · ${versionPart}`;
}

function SelectChips<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: RideOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <View style={styles.chipsWrap}>
      {options.map((option) => {
        const isSelected = option.value === selected;
        return (
          <Pressable
            key={option.value}
            onPress={() => onSelect(option.value)}
            style={[styles.chip, isSelected && styles.chipActive]}
          >
            <Text style={[styles.chipLabel, isSelected && styles.chipLabelActive]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function NewVehicleScreen() {
  const router = useRouter();
  const apiBaseUrl = getApiBaseUrl();

  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [models, setModels] = useState<ModelItem[]>([]);
  const [variants, setVariants] = useState<ModelVariantItem[]>([]);

  const [isLoadingBrands, setIsLoadingBrands] = useState(true);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [screenError, setScreenError] = useState("");
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [brandId, setBrandId] = useState("");
  const [modelId, setModelId] = useState("");
  const [modelVariantId, setModelVariantId] = useState("");

  const [nickname, setNickname] = useState("");
  const [vin, setVin] = useState("");
  const [odometer, setOdometer] = useState("");
  const [engineHours, setEngineHours] = useState("");

  const [usageType, setUsageType] = useState<RideUsageType>("MIXED");
  const [ridingStyle, setRidingStyle] = useState<RideStyle>("CALM");
  const [loadType, setLoadType] = useState<RideLoadType>("SOLO");
  const [usageIntensity, setUsageIntensity] = useState<RideUsageIntensity>("MEDIUM");

  useEffect(() => {
    const loadBrands = async () => {
      try {
        setIsLoadingBrands(true);
        setScreenError("");
        const client = createApiClient({ baseUrl: apiBaseUrl });
        const endpoints = createMotoTwinEndpoints(client);
        const response = await endpoints.getBrands();
        setBrands(response.brands || []);
      } catch (error) {
        console.error(error);
        setScreenError("Не удалось загрузить марки. Проверьте подключение к backend.");
      } finally {
        setIsLoadingBrands(false);
      }
    };

    loadBrands();
  }, [apiBaseUrl]);

  useEffect(() => {
    if (!brandId) {
      setModels([]);
      setModelId("");
      setVariants([]);
      setModelVariantId("");
      return;
    }

    const loadModels = async () => {
      try {
        setIsLoadingModels(true);
        setScreenError("");
        const client = createApiClient({ baseUrl: apiBaseUrl });
        const endpoints = createMotoTwinEndpoints(client);
        const response = await endpoints.getModels(brandId);
        setModels(response.models || []);
      } catch (error) {
        console.error(error);
        setScreenError("Не удалось загрузить модели выбранной марки.");
      } finally {
        setIsLoadingModels(false);
      }
    };

    setModelId("");
    setVariants([]);
    setModelVariantId("");
    loadModels();
  }, [apiBaseUrl, brandId]);

  useEffect(() => {
    if (!modelId) {
      setVariants([]);
      setModelVariantId("");
      return;
    }

    const loadVariants = async () => {
      try {
        setIsLoadingVariants(true);
        setScreenError("");
        const client = createApiClient({ baseUrl: apiBaseUrl });
        const endpoints = createMotoTwinEndpoints(client);
        const response = await endpoints.getModelVariants(modelId);
        setVariants(response.variants || []);
      } catch (error) {
        console.error(error);
        setScreenError("Не удалось загрузить модификации выбранной модели.");
      } finally {
        setIsLoadingVariants(false);
      }
    };

    setModelVariantId("");
    loadVariants();
  }, [apiBaseUrl, modelId]);

  const submitCreateVehicle = async () => {
    const nextErrors: FormErrors = {};

    if (!brandId) {
      nextErrors.brandId = "Выберите марку.";
    }

    if (!modelId) {
      nextErrors.modelId = "Выберите модель.";
    }

    if (!modelVariantId) {
      nextErrors.modelVariantId = "Выберите модификацию.";
    }

    const odometerNumber = Number(odometer);
    if (!Number.isFinite(odometerNumber) || !Number.isInteger(odometerNumber) || odometerNumber < 0) {
      nextErrors.odometer = "Пробег обязателен и должен быть целым числом >= 0.";
    }

    const trimmedEngineHours = engineHours.trim();
    let engineHoursValue: number | null = null;
    if (trimmedEngineHours.length > 0) {
      const parsed = Number(trimmedEngineHours);
      if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
        nextErrors.engineHours = "Моточасы должны быть целым числом >= 0.";
      }
      engineHoursValue = parsed;
    }

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      setScreenError("Проверьте обязательные поля формы.");
      return;
    }

    try {
      setIsSaving(true);
      setScreenError("");
      setFormErrors({});

      const client = createApiClient({ baseUrl: apiBaseUrl });
      const endpoints = createMotoTwinEndpoints(client);

      await endpoints.createVehicle({
        brandId,
        modelId,
        modelVariantId,
        nickname: nickname.trim() ? nickname.trim() : null,
        vin: vin.trim() ? vin.trim() : null,
        odometer: odometerNumber,
        engineHours: engineHoursValue,
        rideProfile: {
          usageType,
          ridingStyle,
          loadType,
          usageIntensity,
        },
      });

      router.replace("/");
    } catch (error) {
      console.error(error);
      setScreenError("Не удалось добавить мотоцикл. Проверьте данные и попробуйте снова.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Добавить мотоцикл</Text>
        <Text style={styles.description}>
          Заполните базовые данные. Сначала выберите марку, затем модель и модификацию.
        </Text>

        {screenError ? <Text style={styles.errorText}>{screenError}</Text> : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Марка *</Text>
          {isLoadingBrands ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#111827" />
              <Text style={styles.loadingText}>Загрузка марок...</Text>
            </View>
          ) : (
            <View style={styles.chipsWrap}>
              {brands.map((brand) => {
                const isSelected = brand.id === brandId;
                return (
                  <Pressable
                    key={brand.id}
                    onPress={() => {
                      setBrandId(brand.id);
                      setFormErrors((prev) => ({ ...prev, brandId: undefined }));
                    }}
                    style={[styles.chip, isSelected && styles.chipActive]}
                  >
                    <Text style={[styles.chipLabel, isSelected && styles.chipLabelActive]}>
                      {brand.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          {formErrors.brandId ? <Text style={styles.inlineErrorText}>{formErrors.brandId}</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Модель *</Text>
          {!brandId ? <Text style={styles.hintText}>Сначала выберите марку.</Text> : null}
          {brandId && isLoadingModels ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#111827" />
              <Text style={styles.loadingText}>Загрузка моделей...</Text>
            </View>
          ) : null}
          {brandId && !isLoadingModels ? (
            <View style={styles.chipsWrap}>
              {models.map((model) => {
                const isSelected = model.id === modelId;
                return (
                  <Pressable
                    key={model.id}
                    onPress={() => {
                      setModelId(model.id);
                      setFormErrors((prev) => ({ ...prev, modelId: undefined }));
                    }}
                    style={[styles.chip, isSelected && styles.chipActive]}
                  >
                    <Text style={[styles.chipLabel, isSelected && styles.chipLabelActive]}>
                      {model.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          {formErrors.modelId ? <Text style={styles.inlineErrorText}>{formErrors.modelId}</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Модификация *</Text>
          {!modelId ? <Text style={styles.hintText}>Сначала выберите модель.</Text> : null}
          {modelId && isLoadingVariants ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#111827" />
              <Text style={styles.loadingText}>Загрузка модификаций...</Text>
            </View>
          ) : null}
          {modelId && !isLoadingVariants ? (
            <View style={styles.chipsWrap}>
              {variants.map((variant) => {
                const isSelected = variant.id === modelVariantId;
                return (
                  <Pressable
                    key={variant.id}
                    onPress={() => {
                      setModelVariantId(variant.id);
                      setFormErrors((prev) => ({ ...prev, modelVariantId: undefined }));
                    }}
                    style={[styles.chip, isSelected && styles.chipActive]}
                  >
                    <Text style={[styles.chipLabel, isSelected && styles.chipLabelActive]}>
                      {getVariantLabel(variant)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          {formErrors.modelVariantId ? (
            <Text style={styles.inlineErrorText}>{formErrors.modelVariantId}</Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Базовые данные</Text>
          <TextInput
            style={styles.input}
            value={nickname}
            onChangeText={setNickname}
            placeholder="Никнейм (опционально)"
            placeholderTextColor="#9CA3AF"
          />
          <TextInput
            style={styles.input}
            value={vin}
            onChangeText={setVin}
            placeholder="VIN (опционально)"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="characters"
          />
          <TextInput
            style={[styles.input, formErrors.odometer && styles.inputError]}
            value={odometer}
            onChangeText={(value) => {
              setOdometer(value);
              setFormErrors((prev) => ({ ...prev, odometer: undefined }));
            }}
            placeholder="Пробег, км *"
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
          />
          {formErrors.odometer ? <Text style={styles.inlineErrorText}>{formErrors.odometer}</Text> : null}
          <TextInput
            style={[styles.input, formErrors.engineHours && styles.inputError]}
            value={engineHours}
            onChangeText={(value) => {
              setEngineHours(value);
              setFormErrors((prev) => ({ ...prev, engineHours: undefined }));
            }}
            placeholder="Моточасы (опционально)"
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
          />
          {formErrors.engineHours ? (
            <Text style={styles.inlineErrorText}>{formErrors.engineHours}</Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Профиль эксплуатации</Text>
          <Text style={styles.fieldLabel}>Тип использования</Text>
          <SelectChips options={USAGE_TYPE_OPTIONS} selected={usageType} onSelect={setUsageType} />

          <Text style={styles.fieldLabel}>Стиль езды</Text>
          <SelectChips options={RIDING_STYLE_OPTIONS} selected={ridingStyle} onSelect={setRidingStyle} />

          <Text style={styles.fieldLabel}>Загрузка</Text>
          <SelectChips options={LOAD_TYPE_OPTIONS} selected={loadType} onSelect={setLoadType} />

          <Text style={styles.fieldLabel}>Интенсивность</Text>
          <SelectChips
            options={USAGE_INTENSITY_OPTIONS}
            selected={usageIntensity}
            onSelect={setUsageIntensity}
          />
        </View>

        <Pressable
          onPress={submitCreateVehicle}
          disabled={isSaving}
          style={[styles.submitButton, isSaving && styles.submitButtonDisabled]}
        >
          <Text style={styles.submitButtonText}>
            {isSaving ? "Сохраняем..." : "Добавить мотоцикл"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F7F7",
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  description: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#4B5563",
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    color: "#B91C1C",
  },
  section: {
    marginTop: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  hintText: {
    marginTop: 8,
    fontSize: 13,
    color: "#6B7280",
  },
  loadingRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: "#4B5563",
  },
  chipsWrap: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  chipActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  chipLabel: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
  },
  chipLabelActive: {
    color: "#FFFFFF",
  },
  input: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },
  inputError: {
    borderColor: "#DC2626",
  },
  inlineErrorText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: "#B91C1C",
  },
  fieldLabel: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  submitButton: {
    marginTop: 18,
    borderRadius: 10,
    backgroundColor: "#111827",
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
