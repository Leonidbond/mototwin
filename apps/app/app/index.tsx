import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import type { GarageVehicleItem } from "@mototwin/types";
import { getApiBaseUrl } from "../src/api-base-url";

function formatUsageType(value: string) {
  switch (value) {
    case "CITY":
      return "Город";
    case "HIGHWAY":
      return "Трасса";
    case "MIXED":
      return "Смешанный";
    case "OFFROAD":
      return "Off-road";
    default:
      return value;
  }
}

export default function HomeScreen() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<GarageVehicleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const apiBaseUrl = getApiBaseUrl();

  const loadGarage = useCallback(async () => {
      try {
        setIsLoading(true);
        setError("");
        const client = createApiClient({ baseUrl: apiBaseUrl });
        const endpoints = createMotoTwinEndpoints(client);
        const data = await endpoints.getGarage();
        setVehicles(data.vehicles || []);
      } catch (requestError) {
        console.error(requestError);
        setError("Не удалось загрузить гараж. Проверьте подключение к backend.");
      } finally {
        setIsLoading(false);
      }
    }, [apiBaseUrl]);

  useFocusEffect(
    useCallback(() => {
      loadGarage();
    }, [loadGarage])
  );

  const retryLoadGarage = async () => {
    try {
      setIsLoading(true);
      setError("");
      await loadGarage();
    } catch (requestError) {
      console.error(requestError);
      setError("Не удалось загрузить гараж. Проверьте подключение к backend.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderVehicleCard = ({ item }: { item: GarageVehicleItem }) => {
    const title = item.nickname?.trim() || `${item.brand.name} ${item.model.name}`;
    const subtitle = `${item.brand.name} · ${item.model.name}`;
    const variantLabel = item.modelVariant
      ? `${item.modelVariant.year} · ${item.modelVariant.versionName}`
      : "Модификация не указана";
    const hasVin = Boolean(item.vin?.trim());
    const hasEngineHours = item.engineHours != null;
    const hasUsageType = Boolean(item.rideProfile?.usageType);
    const engineType = item.modelVariant?.engineType?.trim() || "";
    const coolingType = item.modelVariant?.coolingType?.trim() || "";

    return (
      <View style={styles.card}>
        <Pressable onPress={() => router.push(`/vehicles/${item.id}`)}>
          <Text style={styles.cardTitleLink}>{title}</Text>
        </Pressable>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
        <Text style={styles.cardMeta}>{variantLabel}</Text>
        <View style={styles.cardDivider} />
        <View style={styles.metricsRow}>
          <View style={styles.metricBlock}>
            <Text style={styles.metricLabel}>Пробег</Text>
            <Text style={styles.metricValue}>{item.odometer} км</Text>
          </View>
          {hasEngineHours ? (
            <View style={styles.metricBlock}>
              <Text style={styles.metricLabel}>Моточасы</Text>
              <Text style={styles.metricValue}>{item.engineHours} ч</Text>
            </View>
          ) : null}
        </View>

        {hasVin ? <Text style={styles.vinText}>VIN: {item.vin}</Text> : null}

        {(hasUsageType || engineType || coolingType) ? (
          <View style={styles.secondaryMetaWrap}>
            {hasUsageType ? (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipLabel}>
                  Профиль: {formatUsageType(item.rideProfile?.usageType || "")}
                </Text>
              </View>
            ) : null}
            {engineType ? (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipLabel}>Двигатель: {engineType}</Text>
              </View>
            ) : null}
            {coolingType ? (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipLabel}>Охлаждение: {coolingType}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {isLoading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color="#111827" />
          <Text style={styles.stateText}>Загрузка гаража...</Text>
        </View>
      ) : null}

      {!isLoading && error ? (
        <View style={styles.stateContainer}>
          <Text style={styles.errorTitle}>Не удалось загрузить гараж</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.hintText}>Текущий API: {apiBaseUrl}</Text>
          <Pressable onPress={retryLoadGarage} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Повторить</Text>
          </Pressable>
        </View>
      ) : null}

      {!isLoading && !error && vehicles.length === 0 ? (
        <View style={styles.stateContainer}>
          <Text style={styles.emptyTitle}>Гараж пока пуст</Text>
          <Text style={styles.stateText}>
            Гараж хранит ваши мотоциклы и их текущее состояние, чтобы быстро вести обслуживание.
          </Text>
          <Pressable
            onPress={() => router.push("/vehicles/new")}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Добавить мотоцикл</Text>
          </Pressable>
          <Pressable onPress={retryLoadGarage} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Обновить список</Text>
          </Pressable>
        </View>
      ) : null}

      {!isLoading && !error && vehicles.length > 0 ? (
        <FlatList
          data={vehicles}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={renderVehicleCard}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.title}>MotoTwin Garage</Text>
              <Text style={styles.subtitle}>Сохраненные мотоциклы: {vehicles.length}</Text>
              <Text style={styles.description}>
                Здесь хранятся ваши мотоциклы, их текущее состояние и быстрый доступ к журналу
                обслуживания.
              </Text>
              <Pressable
                onPress={() => router.push("/vehicles/new")}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>Добавить мотоцикл</Text>
              </Pressable>
            </View>
          }
        />
      ) : null}
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F7F7",
  },
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },
  description: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    color: "#4B5563",
  },
  stateText: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    color: "#4B5563",
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  errorText: {
    marginTop: 10,
    textAlign: "center",
    color: "#B91C1C",
    fontSize: 14,
    lineHeight: 20,
  },
  hintText: {
    marginTop: 8,
    color: "#6B7280",
    fontSize: 12,
    textAlign: "center",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: "#111827",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  primaryButton: {
    marginTop: 14,
    backgroundColor: "#111827",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
    alignSelf: "flex-start",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryButton: {
    marginTop: 10,
    borderColor: "#D1D5DB",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  listHeader: {
    paddingTop: 12,
    paddingBottom: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  cardTitleLink: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    textDecorationLine: "underline",
  },
  cardSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#4B5563",
  },
  cardMeta: {
    marginTop: 8,
    fontSize: 13,
    color: "#374151",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 10,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
  },
  metricBlock: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  metricValue: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  vinText: {
    marginTop: 8,
    fontSize: 12,
    color: "#6B7280",
  },
  secondaryMetaWrap: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  metaChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FCFCFD",
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  metaChipLabel: {
    fontSize: 11,
    color: "#4B5563",
    fontWeight: "500",
  },
});
