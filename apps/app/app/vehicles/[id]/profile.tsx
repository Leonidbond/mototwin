import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import {
  buildInitialVehicleProfileFormValues,
  normalizeVehicleProfileFormValues,
  RIDE_LOAD_TYPE_OPTIONS,
  RIDE_RIDING_STYLE_OPTIONS,
  RIDE_USAGE_INTENSITY_OPTIONS,
  RIDE_USAGE_TYPE_OPTIONS,
  validateVehicleProfileFormValues,
} from "@mototwin/domain";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import type {
  EditVehicleProfileFormValues,
  RideLoadType,
  RideStyle,
  RideUsageIntensity,
  RideUsageType,
  VehicleRideProfile,
} from "@mototwin/types";
import { getApiBaseUrl } from "../../../src/api-base-url";
import { KeyboardAwareScrollScreen } from "../../components/keyboard-aware-scroll-screen";
import { ScreenHeader } from "../../components/screen-header";

const USAGE_TYPES = RIDE_USAGE_TYPE_OPTIONS as Array<{ value: RideUsageType; label: string }>;
const RIDING_STYLES = RIDE_RIDING_STYLE_OPTIONS as Array<{ value: RideStyle; label: string }>;
const LOAD_TYPES = RIDE_LOAD_TYPE_OPTIONS as Array<{ value: RideLoadType; label: string }>;
const USAGE_INTENSITIES = RIDE_USAGE_INTENSITY_OPTIONS as Array<{
  value: RideUsageIntensity;
  label: string;
}>;

const profileDefaults = buildInitialVehicleProfileFormValues({
  ridingStyle: "CALM",
});
const DEFAULT_RIDE_PROFILE: VehicleRideProfile = {
  usageType: profileDefaults.usageType,
  ridingStyle: profileDefaults.ridingStyle,
  loadType: profileDefaults.loadType,
  usageIntensity: profileDefaults.usageIntensity,
};

export default function EditVehicleProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const vehicleId = typeof params.id === "string" ? params.id : "";
  const apiBaseUrl = getApiBaseUrl();

  const [nickname, setNickname] = useState("");
  const [vin, setVin] = useState("");
  const [usageType, setUsageType] = useState<RideUsageType>(DEFAULT_RIDE_PROFILE.usageType);
  const [ridingStyle, setRidingStyle] = useState<RideStyle>(DEFAULT_RIDE_PROFILE.ridingStyle);
  const [loadType, setLoadType] = useState<RideLoadType>(DEFAULT_RIDE_PROFILE.loadType);
  const [usageIntensity, setUsageIntensity] = useState<RideUsageIntensity>(
    DEFAULT_RIDE_PROFILE.usageIntensity
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!vehicleId) {
        setError("Не удалось определить ID мотоцикла.");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError("");
        const client = createApiClient({ baseUrl: apiBaseUrl });
        const endpoints = createMotoTwinEndpoints(client);
        const data = await endpoints.getVehicleDetail(vehicleId);
        if (!data.vehicle) {
          setError("Мотоцикл не найден.");
          return;
        }

        setNickname(data.vehicle.nickname ?? "");
        setVin(data.vehicle.vin ?? "");
        setUsageType(data.vehicle.rideProfile?.usageType ?? DEFAULT_RIDE_PROFILE.usageType);
        setRidingStyle(data.vehicle.rideProfile?.ridingStyle ?? DEFAULT_RIDE_PROFILE.ridingStyle);
        setLoadType(data.vehicle.rideProfile?.loadType ?? DEFAULT_RIDE_PROFILE.loadType);
        setUsageIntensity(
          data.vehicle.rideProfile?.usageIntensity ?? DEFAULT_RIDE_PROFILE.usageIntensity
        );
      } catch (requestError) {
        console.error(requestError);
        setError("Не удалось загрузить профиль мотоцикла.");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [apiBaseUrl, vehicleId]);

  async function save() {
    if (!vehicleId) {
      setError("Не удалось определить ID мотоцикла.");
      return;
    }

    const profileValues: EditVehicleProfileFormValues = {
      nickname,
      vin,
      usageType,
      ridingStyle,
      loadType,
      usageIntensity,
    };
    const validation = validateVehicleProfileFormValues(profileValues);
    if (validation.errors.length > 0) {
      setError(validation.errors[0]);
      return;
    }
    const input = normalizeVehicleProfileFormValues(profileValues);

    try {
      setIsSaving(true);
      setError("");
      const client = createApiClient({ baseUrl: apiBaseUrl });
      const endpoints = createMotoTwinEndpoints(client);
      await endpoints.updateVehicleProfile(vehicleId, input);
      Alert.alert("Готово", "Мотоцикл обновлен");
      router.replace(`/vehicles/${vehicleId}`);
    } catch (requestError) {
      console.error(requestError);
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Не удалось обновить профиль.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={c.textPrimary} />
          <Text style={styles.stateText}>Загрузка профиля...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScreenHeader title="Профиль мотоцикла" />
      <KeyboardAwareScrollScreen contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardSubtitle}>
            Можно изменить никнейм, VIN и профиль эксплуатации.
          </Text>
          <Text style={styles.cardHint}>
            Пробег и моточасы обновляются через действие «Обновить состояние».
          </Text>

          <Field label="Никнейм">
            <TextInput
              value={nickname}
              onChangeText={setNickname}
              style={styles.input}
              placeholder="Опционально"
            />
          </Field>

          <Field label="VIN">
            <TextInput
              value={vin}
              onChangeText={setVin}
              style={styles.input}
              placeholder="Опционально"
              autoCapitalize="characters"
            />
          </Field>

          <PickerRow
            label="Сценарий эксплуатации"
            options={USAGE_TYPES}
            value={usageType}
            onSelect={setUsageType}
          />
          <PickerRow
            label="Стиль езды"
            options={RIDING_STYLES}
            value={ridingStyle}
            onSelect={setRidingStyle}
          />
          <PickerRow
            label="Нагрузка"
            options={LOAD_TYPES}
            value={loadType}
            onSelect={setLoadType}
          />
          <PickerRow
            label="Интенсивность"
            options={USAGE_INTENSITIES}
            value={usageIntensity}
            onSelect={setUsageIntensity}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            onPress={save}
            disabled={isSaving}
            style={({ pressed }) => [
              styles.saveButton,
              isSaving && styles.saveButtonDisabled,
              pressed && !isSaving && styles.saveButtonPressed,
            ]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={c.onPrimaryAction} />
            ) : (
              <Text style={styles.saveButtonText}>Сохранить профиль</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAwareScrollScreen>
    </SafeAreaView>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function PickerRow<T extends string>({
  label,
  options,
  value,
  onSelect,
}: {
  label: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  onSelect: (nextValue: T) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.optionWrap}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <Pressable
              key={option.value}
              style={[styles.optionChip, active && styles.optionChipActive]}
              onPress={() => onSelect(option.value)}
            >
              <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: c.canvas,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  stateText: {
    marginTop: 12,
    fontSize: 14,
    color: c.textSecondary,
    textAlign: "center",
  },
  card: {
    backgroundColor: c.card,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: c.textPrimary,
  },
  cardSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: c.textMuted,
    lineHeight: 18,
  },
  cardHint: {
    marginTop: 4,
    fontSize: 12,
    color: c.textMuted,
    lineHeight: 16,
  },
  field: {
    marginTop: 12,
  },
  label: {
    fontSize: 12,
    color: c.textMuted,
    marginBottom: 6,
  },
  input: {
    backgroundColor: c.card,
    borderColor: c.borderStrong,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: c.textPrimary,
  },
  optionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionChip: {
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.card,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  optionChipActive: {
    borderColor: c.primaryAction,
    backgroundColor: c.primaryAction,
  },
  optionChipText: {
    fontSize: 13,
    color: c.textMeta,
  },
  optionChipTextActive: {
    color: c.onPrimaryAction,
    fontWeight: "600",
  },
  errorText: {
    marginTop: 10,
    color: c.error,
    fontSize: 13,
  },
  saveButton: {
    marginTop: 14,
    backgroundColor: c.primaryAction,
    borderRadius: 12,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonPressed: {
    opacity: 0.9,
  },
  saveButtonText: {
    color: c.onPrimaryAction,
    fontSize: 14,
    fontWeight: "700",
  },
});
