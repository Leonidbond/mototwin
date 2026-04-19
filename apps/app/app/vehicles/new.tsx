import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
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
import { productSemanticColors as c } from "@mototwin/design-tokens";
import type {
  AddMotorcycleFormValues,
  BrandItem,
  ModelItem,
  ModelVariantItem,
  RideLoadType,
  RideStyle,
  RideUsageIntensity,
  RideUsageType,
} from "@mototwin/types";
import { getApiBaseUrl } from "../../src/api-base-url";
import { KeyboardAwareScrollScreen } from "../components/keyboard-aware-scroll-screen";

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

const USAGE_TYPE_OPTIONS = RIDE_USAGE_TYPE_OPTIONS as RideOption<RideUsageType>[];
const RIDING_STYLE_OPTIONS = RIDE_RIDING_STYLE_OPTIONS as RideOption<RideStyle>[];
const LOAD_TYPE_OPTIONS = RIDE_LOAD_TYPE_OPTIONS as RideOption<RideLoadType>[];
const USAGE_INTENSITY_OPTIONS = RIDE_USAGE_INTENSITY_OPTIONS as RideOption<RideUsageIntensity>[];

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

const defaultNewMotorcycleForm = createInitialAddMotorcycleFormValues();

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

  const [usageType, setUsageType] = useState<RideUsageType>(defaultNewMotorcycleForm.usageType);
  const [ridingStyle, setRidingStyle] = useState<RideStyle>(defaultNewMotorcycleForm.ridingStyle);
  const [loadType, setLoadType] = useState<RideLoadType>(defaultNewMotorcycleForm.loadType);
  const [usageIntensity, setUsageIntensity] = useState<RideUsageIntensity>(
    defaultNewMotorcycleForm.usageIntensity
  );

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
    const motorcycleForm: AddMotorcycleFormValues = {
      brandId,
      modelId,
      modelVariantId,
      nickname,
      vin,
      odometer,
      engineHours,
      usageType,
      ridingStyle,
      loadType,
      usageIntensity,
    };

    const validation = validateAddMotorcycleFormValues(motorcycleForm, "mobile");
    if (validation.errors.length > 0) {
      setFormErrors(validation.fieldErrors ?? {});
      setScreenError(validation.errors[0]);
      return;
    }

    try {
      setIsSaving(true);
      setScreenError("");
      setFormErrors({});

      const client = createApiClient({ baseUrl: apiBaseUrl });
      const endpoints = createMotoTwinEndpoints(client);

      await endpoints.createVehicle(normalizeAddMotorcyclePayload(motorcycleForm));

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
      <KeyboardAwareScrollScreen contentContainerStyle={styles.content}>
        <Text style={styles.title}>Добавление мотоцикла</Text>
        <Text style={styles.description}>
          Заполните базовые данные. Сначала выберите марку, затем модель и модификацию.
        </Text>

        {screenError ? <Text style={styles.errorText}>{screenError}</Text> : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Марка *</Text>
          {isLoadingBrands ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={c.textPrimary} />
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
              <ActivityIndicator size="small" color={c.textPrimary} />
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
              <ActivityIndicator size="small" color={c.textPrimary} />
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
            placeholderTextColor={c.textTertiary}
          />
          <TextInput
            style={styles.input}
            value={vin}
            onChangeText={setVin}
            placeholder="VIN (опционально)"
            placeholderTextColor={c.textTertiary}
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
            placeholderTextColor={c.textTertiary}
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
            placeholderTextColor={c.textTertiary}
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
      </KeyboardAwareScrollScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: c.canvas,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: c.textPrimary,
  },
  description: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: c.textSecondary,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    color: c.error,
  },
  section: {
    marginTop: 18,
    backgroundColor: c.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    padding: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: c.textPrimary,
  },
  hintText: {
    marginTop: 8,
    fontSize: 13,
    color: c.textMuted,
  },
  loadingRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: c.textSecondary,
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
    borderColor: c.borderStrong,
    backgroundColor: c.card,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  chipActive: {
    backgroundColor: c.primaryAction,
    borderColor: c.primaryAction,
  },
  chipLabel: {
    fontSize: 13,
    color: c.textMeta,
    fontWeight: "500",
  },
  chipLabelActive: {
    color: c.textInverse,
  },
  input: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: c.textPrimary,
  },
  inputError: {
    borderColor: c.validationErrorBorder,
  },
  inlineErrorText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: c.error,
  },
  fieldLabel: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: "600",
    color: c.textMeta,
  },
  submitButton: {
    marginTop: 18,
    borderRadius: 10,
    backgroundColor: c.primaryAction,
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
    color: c.textInverse,
  },
});
