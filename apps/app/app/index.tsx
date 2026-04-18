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
import { buildGarageCardProps, filterMeaningfulGarageSpecHighlights } from "@mototwin/domain";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import type { GarageVehicleItem } from "@mototwin/types";
import { getApiBaseUrl } from "../src/api-base-url";

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
        const data = await endpoints.getGarageVehicles();
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
    const card = buildGarageCardProps(item);
    const { summary, rideProfile } = card;
    const specHighlights = filterMeaningfulGarageSpecHighlights(card.specHighlights);

    return (
      <View style={styles.card}>
        <Text style={styles.cardCaption}>{card.brandModelCaption}</Text>
        <Pressable onPress={() => router.push(`/vehicles/${item.id}`)}>
          <Text style={styles.cardTitleLink}>{summary.title}</Text>
        </Pressable>
        <Text style={styles.cardSubtitle}>{summary.subtitle}</Text>
        <Text style={styles.cardMeta}>{summary.yearVersionLine.replace(" · ", " | ")}</Text>
        <View style={styles.cardDivider} />
        <View style={styles.metricsRow}>
          <View style={styles.metricBlock}>
            <Text style={styles.metricLabel}>Пробег</Text>
            <Text style={styles.metricValue}>{summary.odometerLine}</Text>
          </View>
          <View style={styles.metricBlock}>
            <Text style={styles.metricLabel}>Моточасы</Text>
            <Text style={styles.metricValue}>
              {summary.engineHoursLineWithUnit ?? "Не указаны"}
            </Text>
          </View>
          <View style={styles.metricBlock}>
            <Text style={styles.metricLabel}>VIN</Text>
            <Text style={styles.metricValue}>{summary.vinLine || "Не указан"}</Text>
          </View>
        </View>

        {rideProfile ? (
          <View style={styles.rideProfileBlock}>
            <Text style={styles.rideProfileTitle}>Профиль эксплуатации</Text>
            <View style={styles.secondaryMetaWrap}>
              <View style={styles.metaChip}>
                <Text style={styles.metaChipLabel}>Сценарий: {rideProfile.usageType}</Text>
              </View>
              <View style={styles.metaChip}>
                <Text style={styles.metaChipLabel}>Стиль: {rideProfile.ridingStyle}</Text>
              </View>
              <View style={styles.metaChip}>
                <Text style={styles.metaChipLabel}>Нагрузка: {rideProfile.loadType}</Text>
              </View>
              <View style={styles.metaChip}>
                <Text style={styles.metaChipLabel}>Интенсивность: {rideProfile.usageIntensity}</Text>
              </View>
            </View>
          </View>
        ) : (
          <Text style={styles.noRideProfile}>Профиль эксплуатации пока не задан.</Text>
        )}

        {specHighlights.length > 0 ? (
          <View style={styles.secondaryMetaWrap}>
            {specHighlights.map((spec) => (
              <View key={spec.label} style={styles.metaChip}>
                <Text style={styles.metaChipLabel}>
                  {spec.label}: {spec.value}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {isLoading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={c.textPrimary} />
          <Text style={styles.stateText}>Загрузка гаража...</Text>
        </View>
      ) : null}

      {!isLoading && error ? (
        <View style={styles.stateContainer}>
          <Text style={styles.errorTitle}>Не удалось загрузить гараж</Text>
          <Text style={styles.errorText}>{error}</Text>
          {__DEV__ ? (
            <Text style={styles.hintText}>Текущий API: {apiBaseUrl}</Text>
          ) : null}
          <Pressable onPress={retryLoadGarage} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Повторить</Text>
          </Pressable>
        </View>
      ) : null}

      {!isLoading && !error && vehicles.length === 0 ? (
        <View style={styles.stateContainer}>
          <Text style={styles.emptyTitle}>В гараже пока нет мотоциклов</Text>
          <Text style={styles.stateText}>
            Начните с добавления первого мотоцикла. После этого здесь появится его карточка.
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
              <Text style={styles.eyebrow}>MotoTwin | Гараж</Text>
              <Text style={styles.title}>Ваш гараж</Text>
              <Text style={styles.subtitle}>Мотоциклов: {vehicles.length}</Text>
              <Text style={styles.description}>
                Здесь отображаются сохранённые мотоциклы, их профиль и базовые данные для
                обслуживания и учёта.
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
    backgroundColor: c.canvas,
  },
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  eyebrow: {
    alignSelf: "flex-start",
    fontSize: 12,
    fontWeight: "600",
    color: c.textMuted,
    letterSpacing: 0.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: c.textPrimary,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: "600",
    color: c.textMeta,
  },
  description: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    color: c.textSecondary,
  },
  stateText: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    color: c.textSecondary,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: c.textPrimary,
    textAlign: "center",
  },
  errorText: {
    marginTop: 10,
    textAlign: "center",
    color: c.error,
    fontSize: 14,
    lineHeight: 20,
  },
  hintText: {
    marginTop: 8,
    color: c.textMuted,
    fontSize: 12,
    textAlign: "center",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: c.textPrimary,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: c.primaryAction,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: c.textInverse,
    fontSize: 14,
    fontWeight: "600",
  },
  primaryButton: {
    marginTop: 14,
    backgroundColor: c.primaryAction,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
    alignSelf: "flex-start",
  },
  primaryButtonText: {
    color: c.textInverse,
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryButton: {
    marginTop: 10,
    borderColor: c.borderStrong,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: c.textMeta,
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
    backgroundColor: c.card,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  cardCaption: {
    fontSize: 12,
    color: c.textMuted,
    marginBottom: 4,
  },
  cardTitleLink: {
    fontSize: 17,
    fontWeight: "700",
    color: c.textPrimary,
    textDecorationLine: "underline",
  },
  cardSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: c.textSecondary,
  },
  cardMeta: {
    marginTop: 8,
    fontSize: 13,
    color: c.textMeta,
  },
  cardDivider: {
    height: 1,
    backgroundColor: c.divider,
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
    color: c.textMuted,
  },
  metricValue: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: "700",
    color: c.textPrimary,
  },
  rideProfileBlock: {
    marginTop: 10,
  },
  rideProfileTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: c.textPrimary,
    marginBottom: 6,
  },
  noRideProfile: {
    marginTop: 8,
    fontSize: 12,
    color: c.textMuted,
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
    borderColor: c.border,
    backgroundColor: c.chipBackground,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  metaChipLabel: {
    fontSize: 11,
    color: c.textSecondary,
    fontWeight: "500",
  },
});
