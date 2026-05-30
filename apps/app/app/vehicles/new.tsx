import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
  MotorcycleBrandPickerItem,
  MotorcycleGenerationPickerItem,
  MotorcycleModelFamilyPickerItem,
  MotorcycleVariantPickerItem,
  RideLoadType,
  RideStyle,
  RideUsageIntensity,
  RideUsageType,
} from "@mototwin/types";
import { createMobileApiClient } from "../../src/create-mobile-api-client";
import { withAuthGuard } from "../../src/mobile-auth-guard";
import { isVehicleLimitErrorMessage } from "../../src/subscription-access";
import { useMobileSubscription } from "../../src/use-mobile-subscription";
import { SubscriptionLockBanner } from "../../components/subscription/subscription-lock-banner";
import { KeyboardAwareScrollScreen } from "../../components/expo-shell/keyboard-aware-scroll-screen";
import { ScreenHeader } from "../../components/expo-shell/screen-header";

type RideOption<T extends string> = {
  value: T;
  label: string;
};

type FormErrors = {
  motorcycleBrandId?: string;
  motorcycleModelFamilyId?: string;
  motorcycleVariantId?: string;
  motorcycleGenerationId?: string;
  odometer?: string;
  engineHours?: string;
};

const USAGE_TYPE_OPTIONS = RIDE_USAGE_TYPE_OPTIONS as RideOption<RideUsageType>[];
const RIDING_STYLE_OPTIONS = RIDE_RIDING_STYLE_OPTIONS as RideOption<RideStyle>[];
const LOAD_TYPE_OPTIONS = RIDE_LOAD_TYPE_OPTIONS as RideOption<RideLoadType>[];
const USAGE_INTENSITY_OPTIONS = RIDE_USAGE_INTENSITY_OPTIONS as RideOption<RideUsageIntensity>[];

function formatGenerationYear(item: MotorcycleGenerationPickerItem): string {
  const label = item.yearsLabel?.trim();
  if (label) {
    return label;
  }
  if (item.yearFrom && item.yearTo) {
    return `${item.yearFrom}–${item.yearTo}`;
  }
  if (item.yearFrom) {
    return `${item.yearFrom}–`;
  }
  return "—";
}

function getGenerationLabel(item: MotorcycleGenerationPickerItem): string {
  const year = formatGenerationYear(item);
  const trimmedName = item.name?.trim();
  return trimmedName ? `${year} · ${trimmedName}` : year;
}

function getGenerationSpecsHint(item: MotorcycleGenerationPickerItem): string | null {
  const specs = item.technicalSpecs;
  if (!specs) {
    return null;
  }
  const parts: string[] = [];
  if (specs.engine?.trim()) {
    parts.push(specs.engine.trim());
  }
  if (specs.displacementCc != null) {
    parts.push(`${specs.displacementCc} см³`);
  }
  if (specs.powerHpNormalized != null) {
    parts.push(`${specs.powerHpNormalized} л.с.`);
  } else if (specs.powerValue != null && specs.powerUnit) {
    parts.push(`${specs.powerValue} ${specs.powerUnit}`);
  }
  if (specs.gearbox?.trim()) {
    parts.push(specs.gearbox.trim());
  }
  return parts.length > 0 ? parts.join(" · ") : null;
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
  const { capabilities, isLoading: isSubscriptionLoading } = useMobileSubscription();
  const [garageVehicleCount, setGarageVehicleCount] = useState(0);

  const [brands, setBrands] = useState<MotorcycleBrandPickerItem[]>([]);
  const [modelFamilies, setModelFamilies] = useState<MotorcycleModelFamilyPickerItem[]>([]);
  const [variants, setVariants] = useState<MotorcycleVariantPickerItem[]>([]);
  const [generations, setGenerations] = useState<MotorcycleGenerationPickerItem[]>([]);

  const [isLoadingBrands, setIsLoadingBrands] = useState(true);
  const [isLoadingModelFamilies, setIsLoadingModelFamilies] = useState(false);
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);
  const [isLoadingGenerations, setIsLoadingGenerations] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [screenError, setScreenError] = useState("");
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [motorcycleBrandId, setMotorcycleBrandId] = useState("");
  const [motorcycleModelFamilyId, setMotorcycleModelFamilyId] = useState("");
  const [motorcycleVariantId, setMotorcycleVariantId] = useState("");
  const [motorcycleGenerationId, setMotorcycleGenerationId] = useState("");

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
    let cancelled = false;
    const loadGarageCount = async () => {
      try {
        const endpoints = createMobileApiClient();
        const garage = await withAuthGuard(
          () => endpoints.getGarageVehicles(),
          () => router.replace("/login")
        );
        if (!garage || cancelled) {
          return;
        }
        setGarageVehicleCount(garage.vehicles?.length ?? 0);
      } catch {
        if (!cancelled) {
          setGarageVehicleCount(0);
        }
      }
    };
    void loadGarageCount();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const vehicleLimitReached =
    capabilities.maxVehicles != null && garageVehicleCount >= capabilities.maxVehicles;

  useEffect(() => {
    if (isSubscriptionLoading || !vehicleLimitReached) {
      return;
    }
    router.replace("/subscription");
  }, [isSubscriptionLoading, router, vehicleLimitReached]);

  useEffect(() => {
    const loadBrands = async () => {
      try {
        setIsLoadingBrands(true);
        setScreenError("");
        const endpoints = createMobileApiClient();
        const response = await withAuthGuard(
          () => endpoints.getMotorcycleBrands(),
          () => router.replace("/login")
        );
        if (!response) {
          return;
        }
        setBrands(response.brands || []);
      } catch (error) {
        setScreenError("Не удалось загрузить марки. Проверьте подключение к backend.");
      } finally {
        setIsLoadingBrands(false);
      }
    };

    void loadBrands();
  }, [router]);

  useEffect(() => {
    if (!motorcycleBrandId) {
      setModelFamilies([]);
      setMotorcycleModelFamilyId("");
      setVariants([]);
      setMotorcycleVariantId("");
      setGenerations([]);
      setMotorcycleGenerationId("");
      return;
    }

    const loadModelFamilies = async () => {
      try {
        setIsLoadingModelFamilies(true);
        setScreenError("");
        const endpoints = createMobileApiClient();
        const response = await withAuthGuard(
          () => endpoints.getMotorcycleModelFamilies(motorcycleBrandId),
          () => router.replace("/login")
        );
        if (!response) {
          return;
        }
        setModelFamilies(response.families || []);
      } catch (error) {
        setScreenError("Не удалось загрузить семейства выбранной марки.");
      } finally {
        setIsLoadingModelFamilies(false);
      }
    };

    setMotorcycleModelFamilyId("");
    setVariants([]);
    setMotorcycleVariantId("");
    setGenerations([]);
    setMotorcycleGenerationId("");
    void loadModelFamilies();
  }, [motorcycleBrandId, router]);

  useEffect(() => {
    if (!motorcycleModelFamilyId) {
      setVariants([]);
      setMotorcycleVariantId("");
      setGenerations([]);
      setMotorcycleGenerationId("");
      return;
    }

    const loadVariants = async () => {
      try {
        setIsLoadingVariants(true);
        setScreenError("");
        const endpoints = createMobileApiClient();
        const response = await withAuthGuard(
          () => endpoints.getMotorcycleVariants(motorcycleModelFamilyId),
          () => router.replace("/login")
        );
        if (!response) {
          return;
        }
        setVariants(response.variants || []);
      } catch (error) {
        setScreenError("Не удалось загрузить модификации выбранного семейства.");
      } finally {
        setIsLoadingVariants(false);
      }
    };

    setMotorcycleVariantId("");
    setGenerations([]);
    setMotorcycleGenerationId("");
    void loadVariants();
  }, [motorcycleModelFamilyId, router]);

  useEffect(() => {
    if (!motorcycleVariantId) {
      setGenerations([]);
      setMotorcycleGenerationId("");
      return;
    }

    const loadGenerations = async () => {
      try {
        setIsLoadingGenerations(true);
        setScreenError("");
        const endpoints = createMobileApiClient();
        const response = await withAuthGuard(
          () => endpoints.getMotorcycleGenerations(motorcycleVariantId),
          () => router.replace("/login")
        );
        if (!response) {
          return;
        }
        setGenerations(response.generations || []);
      } catch (error) {
        setScreenError("Не удалось загрузить поколения выбранной модификации.");
      } finally {
        setIsLoadingGenerations(false);
      }
    };

    setMotorcycleGenerationId("");
    void loadGenerations();
  }, [motorcycleVariantId, router]);

  const submitCreateVehicle = async () => {
    if (vehicleLimitReached) {
      router.push("/subscription");
      return;
    }

    const motorcycleForm: AddMotorcycleFormValues = {
      motorcycleBrandId,
      motorcycleModelFamilyId,
      motorcycleVariantId,
      motorcycleGenerationId,
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

      const endpoints = createMobileApiClient();
      const created = await withAuthGuard(
        () => endpoints.createVehicle(normalizeAddMotorcyclePayload(motorcycleForm)),
        () => router.replace("/login")
      );
      if (!created) {
        return;
      }

      router.replace("/garage");
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (isVehicleLimitErrorMessage(message)) {
        router.push("/subscription");
        return;
      }
      setScreenError("Не удалось добавить мотоцикл. Проверьте данные и попробуйте снова.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScreenHeader title="Добавить мотоцикл" />
      <KeyboardAwareScrollScreen contentContainerStyle={styles.content}>
        <Text style={styles.description}>
          Заполните базовые данные. Сначала выберите марку, семейство, модификацию и поколение.
        </Text>

        {screenError ? <Text style={styles.errorText}>{screenError}</Text> : null}
        {vehicleLimitReached ? (
          <View style={{ marginTop: 12 }}>
            <SubscriptionLockBanner
              title="Лимит мотоциклов в гараже"
              description={
                capabilities.maxVehicles === 1
                  ? "Тариф Free позволяет вести только 1 мотоцикл. Перейдите на Rider, чтобы добавить до 3."
                  : "Тариф Rider позволяет вести до 3 мотоциклов. Перейдите на Pro для неограниченного гаража."
              }
              requiredPlan={capabilities.maxVehicles === 1 ? "RIDER" : "PRO"}
            />
          </View>
        ) : null}

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
                const isSelected = brand.id === motorcycleBrandId;
                return (
                  <Pressable
                    key={brand.id}
                    onPress={() => {
                      setMotorcycleBrandId(brand.id);
                      setFormErrors((prev) => ({ ...prev, motorcycleBrandId: undefined }));
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
          {formErrors.motorcycleBrandId ? (
            <Text style={styles.inlineErrorText}>{formErrors.motorcycleBrandId}</Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Семейство *</Text>
          {!motorcycleBrandId ? (
            <Text style={styles.hintText}>Сначала выберите марку.</Text>
          ) : null}
          {motorcycleBrandId && isLoadingModelFamilies ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={c.textPrimary} />
              <Text style={styles.loadingText}>Загрузка семейств...</Text>
            </View>
          ) : null}
          {motorcycleBrandId && !isLoadingModelFamilies ? (
            <View style={styles.chipsWrap}>
              {modelFamilies.map((family) => {
                const isSelected = family.id === motorcycleModelFamilyId;
                return (
                  <Pressable
                    key={family.id}
                    onPress={() => {
                      setMotorcycleModelFamilyId(family.id);
                      setFormErrors((prev) => ({
                        ...prev,
                        motorcycleModelFamilyId: undefined,
                      }));
                    }}
                    style={[styles.chip, isSelected && styles.chipActive]}
                  >
                    <Text style={[styles.chipLabel, isSelected && styles.chipLabelActive]}>
                      {family.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          {formErrors.motorcycleModelFamilyId ? (
            <Text style={styles.inlineErrorText}>{formErrors.motorcycleModelFamilyId}</Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Модификация *</Text>
          {!motorcycleModelFamilyId ? (
            <Text style={styles.hintText}>Сначала выберите семейство.</Text>
          ) : null}
          {motorcycleModelFamilyId && isLoadingVariants ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={c.textPrimary} />
              <Text style={styles.loadingText}>Загрузка модификаций...</Text>
            </View>
          ) : null}
          {motorcycleModelFamilyId && !isLoadingVariants ? (
            <View style={styles.chipsWrap}>
              {variants.map((variant) => {
                const isSelected = variant.id === motorcycleVariantId;
                return (
                  <Pressable
                    key={variant.id}
                    onPress={() => {
                      setMotorcycleVariantId(variant.id);
                      setFormErrors((prev) => ({
                        ...prev,
                        motorcycleVariantId: undefined,
                      }));
                    }}
                    style={[styles.chip, isSelected && styles.chipActive]}
                  >
                    <Text style={[styles.chipLabel, isSelected && styles.chipLabelActive]}>
                      {variant.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          {formErrors.motorcycleVariantId ? (
            <Text style={styles.inlineErrorText}>{formErrors.motorcycleVariantId}</Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Поколение *</Text>
          {!motorcycleVariantId ? (
            <Text style={styles.hintText}>Сначала выберите модификацию.</Text>
          ) : null}
          {motorcycleVariantId && isLoadingGenerations ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={c.textPrimary} />
              <Text style={styles.loadingText}>Загрузка поколений...</Text>
            </View>
          ) : null}
          {motorcycleVariantId && !isLoadingGenerations ? (
            <View style={styles.generationList}>
              {generations.map((generation) => {
                const isSelected = generation.id === motorcycleGenerationId;
                const specsHint = getGenerationSpecsHint(generation);
                return (
                  <Pressable
                    key={generation.id}
                    onPress={() => {
                      setMotorcycleGenerationId(generation.id);
                      setFormErrors((prev) => ({
                        ...prev,
                        motorcycleGenerationId: undefined,
                      }));
                    }}
                    style={[
                      styles.generationCard,
                      isSelected && styles.generationCardActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.generationTitle,
                        isSelected && styles.generationTitleActive,
                      ]}
                    >
                      {getGenerationLabel(generation)}
                    </Text>
                    {specsHint ? (
                      <Text
                        style={[
                          styles.generationSubtitle,
                          isSelected && styles.generationSubtitleActive,
                        ]}
                      >
                        {specsHint}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          {formErrors.motorcycleGenerationId ? (
            <Text style={styles.inlineErrorText}>{formErrors.motorcycleGenerationId}</Text>
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
          disabled={isSaving || vehicleLimitReached}
          style={[styles.submitButton, (isSaving || vehicleLimitReached) && styles.submitButtonDisabled]}
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
  description: {
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
    color: c.onPrimaryAction,
  },
  generationList: {
    marginTop: 10,
    gap: 8,
  },
  generationCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  generationCardActive: {
    backgroundColor: c.primaryAction,
    borderColor: c.primaryAction,
  },
  generationTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: c.textPrimary,
  },
  generationTitleActive: {
    color: c.onPrimaryAction,
  },
  generationSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: c.textMeta,
  },
  generationSubtitleActive: {
    color: c.onPrimaryAction,
    opacity: 0.85,
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
    color: c.onPrimaryAction,
  },
});
