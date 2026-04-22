import { useCallback, useEffect, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import { buildGarageDashboardSummary } from "@mototwin/domain";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import type { GarageVehicleItem } from "@mototwin/types";
import { getApiBaseUrl } from "../src/api-base-url";
import {
  readCollapsiblePreference,
  writeCollapsiblePreference,
} from "../src/ui-collapsible-preferences";
import { GarageEmptyState } from "../components/garage/GarageEmptyState";
import { GarageHeader } from "../components/garage/GarageHeader";
import { GarageSummary } from "../components/garage/GarageSummary";
import { VehicleCard } from "../components/garage/VehicleCard";

export default function HomeScreen() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<GarageVehicleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isUsageProfileExpanded, setIsUsageProfileExpanded] = useState(false);
  const [isTechnicalSummaryExpanded, setIsTechnicalSummaryExpanded] = useState(false);
  const [hasLoadedCollapsePrefs, setHasLoadedCollapsePrefs] = useState(false);
  const [trashCount, setTrashCount] = useState(0);

  const apiBaseUrl = getApiBaseUrl();

  const loadGarage = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const client = createApiClient({ baseUrl: apiBaseUrl });
      const endpoints = createMotoTwinEndpoints(client);
      const [garageResult, trashResult] = await Promise.allSettled([
        endpoints.getGarageVehicles(),
        endpoints.getTrashedVehicles(),
      ]);

      if (garageResult.status === "rejected") {
        throw garageResult.reason;
      }

      setVehicles(garageResult.value.vehicles ?? []);
      if (trashResult.status === "fulfilled") {
        setTrashCount(trashResult.value.vehicles?.length ?? 0);
      } else {
        setTrashCount(0);
      }
    } catch (requestError) {
      console.error(requestError);
      setError("Не удалось загрузить гараж. Проверьте подключение к backend.");
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl]);

  useFocusEffect(
    useCallback(() => {
      void loadGarage();
    }, [loadGarage])
  );

  useEffect(() => {
    void (async () => {
      const usage = await readCollapsiblePreference("garage.usageProfile.expanded");
      const tech = await readCollapsiblePreference("garage.technicalSummary.expanded");
      if (usage != null) {
        setIsUsageProfileExpanded(usage);
      }
      if (tech != null) {
        setIsTechnicalSummaryExpanded(tech);
      }
      setHasLoadedCollapsePrefs(true);
    })();
  }, []);

  useEffect(() => {
    if (!hasLoadedCollapsePrefs) return;
    void writeCollapsiblePreference("garage.usageProfile.expanded", isUsageProfileExpanded);
  }, [hasLoadedCollapsePrefs, isUsageProfileExpanded]);

  useEffect(() => {
    if (!hasLoadedCollapsePrefs) return;
    void writeCollapsiblePreference("garage.technicalSummary.expanded", isTechnicalSummaryExpanded);
  }, [hasLoadedCollapsePrefs, isTechnicalSummaryExpanded]);

  const dashboardSummary = buildGarageDashboardSummary(vehicles);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.textPrimary} />
          <Text style={styles.stateText}>Загрузка гаража...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Не удалось загрузить гараж</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      {vehicles.length === 0 ? (
        <View style={styles.contentWrap}>
          <GarageHeader
            trashCount={trashCount}
            onOpenTrash={() => router.push("/trash")}
            onOpenProfile={() => router.push("/profile")}
            onAddVehicle={() => router.push("/vehicles/new")}
          />
          <GarageEmptyState
            onOpenProfile={() => router.push("/profile")}
            onAddVehicle={() => router.push("/vehicles/new")}
            onReload={() => void loadGarage()}
          />
        </View>
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <VehicleCard
              vehicle={item}
              isUsageProfileExpanded={isUsageProfileExpanded}
              isTechnicalSummaryExpanded={isTechnicalSummaryExpanded}
              onOpenVehicle={(id) => router.push(`/vehicles/${id}`)}
              onToggleUsageProfile={() => setIsUsageProfileExpanded((prev) => !prev)}
              onToggleTechnicalSummary={() =>
                setIsTechnicalSummaryExpanded((prev) => !prev)
              }
            />
          )}
          ListHeaderComponent={
            <View>
              <GarageHeader
                trashCount={trashCount}
                onOpenTrash={() => router.push("/trash")}
                onOpenProfile={() => router.push("/profile")}
                onAddVehicle={() => router.push("/vehicles/new")}
              />
              <GarageSummary
                motorcyclesCount={dashboardSummary.motorcyclesCount}
                motorcyclesWithAttentionCount={dashboardSummary.motorcyclesWithAttentionCount}
                attentionItemsTotalCount={dashboardSummary.attentionItemsTotalCount}
              />
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: c.canvas,
  },
  contentWrap: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 24,
  },
  stateText: {
    color: c.textMuted,
    fontSize: 14,
  },
  errorTitle: {
    color: c.error,
    fontSize: 20,
    fontWeight: "700",
  },
  errorText: {
    color: c.textMuted,
    fontSize: 14,
    textAlign: "center",
    maxWidth: 320,
  },
});
