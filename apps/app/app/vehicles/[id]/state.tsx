import { useEffect, useState } from "react";
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
import { getApiBaseUrl } from "../../../src/api-base-url";

export default function UpdateVehicleStateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const vehicleId = typeof params.id === "string" ? params.id : "";
  const apiBaseUrl = getApiBaseUrl();

  const [odometer, setOdometer] = useState("");
  const [engineHours, setEngineHours] = useState("");
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
        setOdometer(String(data.vehicle.odometer));
        setEngineHours(
          data.vehicle.engineHours != null ? String(data.vehicle.engineHours) : ""
        );
      } catch (requestError) {
        console.error(requestError);
        setError("Не удалось загрузить текущее состояние.");
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

    const nextOdometer = Number.parseInt(odometer, 10);
    if (Number.isNaN(nextOdometer) || nextOdometer < 0) {
      setError("Пробег обязателен и должен быть >= 0.");
      return;
    }

    const nextEngineHours =
      engineHours.trim() === "" ? null : Number.parseInt(engineHours, 10);
    if (
      nextEngineHours !== null &&
      (Number.isNaN(nextEngineHours) || nextEngineHours < 0)
    ) {
      setError("Моточасы должны быть пустыми или >= 0.");
      return;
    }

    try {
      setIsSaving(true);
      setError("");
      const client = createApiClient({ baseUrl: apiBaseUrl });
      const endpoints = createMotoTwinEndpoints(client);
      await endpoints.updateVehicleState(vehicleId, {
        odometer: nextOdometer,
        engineHours: nextEngineHours,
      });
      // Return to vehicle detail; detail and downstream screens reload on focus.
      router.replace(`/vehicles/${vehicleId}`);
    } catch (requestError) {
      console.error(requestError);
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Не удалось обновить состояние.";
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
          <Text style={styles.stateText}>Загрузка текущего состояния...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Текущее состояние</Text>
          <Text style={styles.cardSubtitle}>
            Обновите актуальный пробег и моточасы мотоцикла.
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Пробег, км</Text>
            <TextInput
              value={odometer}
              onChangeText={setOdometer}
              style={styles.input}
              keyboardType="number-pad"
              placeholder="0"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Моточасы</Text>
            <TextInput
              value={engineHours}
              onChangeText={setEngineHours}
              style={styles.input}
              keyboardType="number-pad"
              placeholder="Пусто = null"
            />
          </View>

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
              <Text style={styles.saveButtonText}>Сохранить состояние</Text>
            )}
          </Pressable>
        </View>
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
