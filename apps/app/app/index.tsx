import { useCallback, useState, type ReactNode } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import { buildGarageDashboardSummary } from "@mototwin/domain";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import type { GarageVehicleItem } from "@mototwin/types";
import { getApiBaseUrl } from "../src/api-base-url";
import { GarageBottomNav } from "../components/garage/GarageBottomNav";
import { GarageEmptyState } from "../components/garage/GarageEmptyState";
import { GarageHeader } from "../components/garage/GarageHeader";
import { GarageSummary } from "../components/garage/GarageSummary";
import { VehicleCard } from "../components/garage/VehicleCard";

export default function HomeScreen() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<GarageVehicleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
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

  const dashboardSummary = buildGarageDashboardSummary(vehicles);
  const openTrash = useCallback(() => router.push("/trash"), [router]);
  const openProfile = useCallback(() => router.push("/profile"), [router]);
  const openAddVehicle = useCallback(() => router.push("/vehicles/new"), [router]);
  const reloadGarage = useCallback(() => void loadGarage(), [loadGarage]);
  const openVehicle = useCallback((id: string) => router.push(`/vehicles/${id}`), [router]);
  const openServiceEvent = useCallback(
    (id: string) => router.push(`/vehicles/${id}/service-events/new`),
    [router]
  );
  const openServiceLog = useCallback(
    (id: string) => router.push(`/vehicles/${id}/service-log`),
    [router]
  );
  const primaryVehicleId = vehicles[0]?.id ?? null;
  const openGarage = useCallback(() => router.push("/"), [router]);
  const openNodes = useCallback(() => {
    if (!primaryVehicleId) return;
    router.push(`/vehicles/${primaryVehicleId}`);
  }, [primaryVehicleId, router]);
  const openJournal = useCallback(() => {
    if (!primaryVehicleId) return;
    router.push(`/vehicles/${primaryVehicleId}/service-log`);
  }, [primaryVehicleId, router]);
  const openExpenses = useCallback(() => {
    if (!primaryVehicleId) return;
    router.push(`/vehicles/${primaryVehicleId}/service-log`);
  }, [primaryVehicleId, router]);

  if (isLoading) {
    return (
      <GarageScreenState>
        <ActivityIndicator size="large" color={c.textPrimary} />
        <Text style={styles.stateText}>Загрузка гаража...</Text>
      </GarageScreenState>
    );
  }

  if (error) {
    return (
      <GarageScreenState>
        <Text style={styles.errorTitle}>Не удалось загрузить гараж</Text>
        <Text style={styles.errorText}>{error}</Text>
      </GarageScreenState>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar style="light" />
      <View style={styles.screen}>
        {vehicles.length === 0 ? (
          <View style={styles.contentWrap}>
            <GarageHeader
              trashCount={trashCount}
              onOpenTrash={openTrash}
              onOpenProfile={openProfile}
              onAddVehicle={openAddVehicle}
            />
            <GarageEmptyState onReload={reloadGarage} />
          </View>
        ) : (
          <FlatList
            data={vehicles}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <VehicleCard
                vehicle={item}
                onOpenVehicle={openVehicle}
                onAddServiceEvent={openServiceEvent}
                onOpenServiceLog={openServiceLog}
              />
            )}
            ListHeaderComponent={
              <View>
                <GarageHeader
                  trashCount={trashCount}
                  onOpenTrash={openTrash}
                  onOpenProfile={openProfile}
                  onAddVehicle={openAddVehicle}
                />
                <GarageSummary
                  motorcyclesCount={dashboardSummary.motorcyclesCount}
                  motorcyclesWithAttentionCount={dashboardSummary.motorcyclesWithAttentionCount}
                  attentionItemsTotalCount={dashboardSummary.attentionItemsTotalCount}
                  expensesLabel={dashboardSummary.currentMonthExpensesLabel}
                />
              </View>
            }
          />
        )}
        <GarageBottomNav
          onOpenGarage={openGarage}
          onOpenNodes={openNodes}
          onOpenJournal={openJournal}
          onOpenExpenses={openExpenses}
          onOpenProfile={openProfile}
          hasVehicleContext={!!primaryVehicleId}
        />
      </View>
    </SafeAreaView>
  );
}

function GarageScreenState(props: { children: ReactNode }) {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.center}>{props.children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: c.canvas,
  },
  screen: {
    flex: 1,
  },
  contentWrap: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
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
