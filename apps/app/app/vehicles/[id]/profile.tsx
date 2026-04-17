import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
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
  RideLoadType,
  RideStyle,
  RideUsageIntensity,
  RideUsageType,
  UpdateVehicleProfileInput,
  VehicleRideProfile,
} from "@mototwin/types";
import { getApiBaseUrl } from "../../../src/api-base-url";

const USAGE_TYPES: Array<{ value: RideUsageType; label: string }> = [
  { value: "CITY", label: "Город" },
  { value: "HIGHWAY", label: "Трасса" },
  { value: "MIXED", label: "Смешанный" },
  { value: "OFFROAD", label: "Бездорожье" },
];

const RIDING_STYLES: Array<{ value: RideStyle; label: string }> = [
  { value: "CALM", label: "Спокойный" },
  { value: "ACTIVE", label: "Активный" },
  { value: "AGGRESSIVE", label: "Агрессивный" },
];

const LOAD_TYPES: Array<{ value: RideLoadType; label: string }> = [
  { value: "SOLO", label: "Соло" },
  { value: "PASSENGER", label: "Пассажир" },
  { value: "LUGGAGE", label: "Багаж" },
  { value: "PASSENGER_LUGGAGE", label: "Пассажир + багаж" },
];

const USAGE_INTENSITIES: Array<{ value: RideUsageIntensity; label: string }> = [
  { value: "LOW", label: "Низкая" },
  { value: "MEDIUM", label: "Средняя" },
  { value: "HIGH", label: "Высокая" },
];

const DEFAULT_RIDE_PROFILE: VehicleRideProfile = {
  usageType: "MIXED",
  ridingStyle: "CALM",
  loadType: "SOLO",
  usageIntensity: "MEDIUM",
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

    const input: UpdateVehicleProfileInput = {
      nickname: nickname.trim() || null,
      vin: vin.trim() || null,
      rideProfile: {
        usageType,
        ridingStyle,
        loadType,
        usageIntensity,
      },
    };

    try {
      setIsSaving(true);
      setError("");
      const client = createApiClient({ baseUrl: apiBaseUrl });
      const endpoints = createMotoTwinEndpoints(client);
      await endpoints.updateVehicleProfile(vehicleId, input);
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
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color="#111827" />
          <Text style={styles.stateText}>Загрузка профиля...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Профиль мотоцикла</Text>
          <Text style={styles.cardSubtitle}>
            Можно изменить только nickname, VIN и riding profile.
          </Text>

          <Field label="Nickname">
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
            label="Usage type"
            options={USAGE_TYPES}
            value={usageType}
            onSelect={setUsageType}
          />
          <PickerRow
            label="Riding style"
            options={RIDING_STYLES}
            value={ridingStyle}
            onSelect={setRidingStyle}
          />
          <PickerRow
            label="Load type"
            options={LOAD_TYPES}
            value={loadType}
            onSelect={setLoadType}
          />
          <PickerRow
            label="Usage intensity"
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
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Сохранить профиль</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
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
    backgroundColor: "#F7F7F7",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
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
    color: "#4B5563",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  cardSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },
  field: {
    marginTop: 12,
  },
  label: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "#D1D5DB",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },
  optionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionChip: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  optionChipActive: {
    borderColor: "#111827",
    backgroundColor: "#111827",
  },
  optionChipText: {
    fontSize: 13,
    color: "#374151",
  },
  optionChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  errorText: {
    marginTop: 10,
    color: "#B91C1C",
    fontSize: 13,
  },
  saveButton: {
    marginTop: 14,
    backgroundColor: "#111827",
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
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
