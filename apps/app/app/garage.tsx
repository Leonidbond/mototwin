import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { buildGarageDashboardSummary, getCurrentExpenseYear } from "@mototwin/domain";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import type { ExpenseItem, GarageVehicleItem, SubscriptionCurrentResponse } from "@mototwin/types";
import {
  cancelInFlightMobileApiRequests,
  createMobileApiClient,
  prioritizeMobileApiForNavigation,
} from "../src/create-mobile-api-client";
import { readLastViewedVehicleId } from "../src/ui-last-viewed-vehicle";
import { AppScreenHelpBar } from "../components/expo-shell/app-screen-help-bar";
import { GarageBottomNav } from "../components/garage/GarageBottomNav";
import { GarageEmptyState } from "../components/garage/GarageEmptyState";
import { GarageHeader } from "../components/garage/GarageHeader";
import { GarageSummary } from "../components/garage/GarageSummary";
import { VehicleCard } from "../components/garage/VehicleCard";

function formatGarageLoadError(message: string): string {
  if (message.includes("Превышено время ожидания")) {
    return "Не удалось соединиться с сервером. Это может быть временная проблема сети — нажмите «Повторить».";
  }
  if (message.toLowerCase().includes("требуется вход")) {
    return "Сессия истекла. Войдите в аккаунт снова.";
  }
  return message;
}

export default function GarageScreen() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<GarageVehicleItem[]>([]);
  const [seasonExpenses, setSeasonExpenses] = useState<ExpenseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [trashCount, setTrashCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [subscription, setSubscription] = useState<SubscriptionCurrentResponse | null>(null);
  const [lastViewedVehicleId, setLastViewedVehicleId] = useState<string | null>(null);
  const loadSeqRef = useRef(0);
  const hasLoadedOnceRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);

  const loadGarageExtras = useCallback(async (endpoints: ReturnType<typeof createMobileApiClient>) => {
    const [trashResult, notificationsResult, subscriptionResult, expensesResult] =
      await Promise.allSettled([
      endpoints.getTrashedVehicles(),
      endpoints.getNotifications({ limit: 1 }),
      endpoints.getSubscriptionCurrent(),
      endpoints.getExpenses({ year: getCurrentExpenseYear() }),
    ]);

    if (trashResult.status === "fulfilled") {
      setTrashCount(trashResult.value.vehicles?.length ?? 0);
    } else {
      setTrashCount(0);
    }
    if (notificationsResult.status === "fulfilled") {
      setNotificationCount(notificationsResult.value.unreadCount ?? 0);
    } else {
      setNotificationCount(0);
    }
    if (subscriptionResult.status === "fulfilled") {
      setSubscription(subscriptionResult.value);
    } else {
      setSubscription(null);
    }
    if (expensesResult.status === "fulfilled") {
      setSeasonExpenses(expensesResult.value.expenses ?? []);
    } else {
      setSeasonExpenses([]);
    }
  }, []);

  const loadGarage = useCallback(async () => {
    const seq = ++loadSeqRef.current;
    const showBlockingSpinner = !hasLoadedOnceRef.current;
    prioritizeMobileApiForNavigation();
    try {
      if (showBlockingSpinner) {
        setIsLoading(true);
        setError("");
      }
      const endpoints = createMobileApiClient();
      const fetchGarage = () => endpoints.getGarageVehicles();

      let garageResult: Awaited<ReturnType<typeof fetchGarage>>;
      try {
        garageResult = await fetchGarage();
      } catch (firstError) {
        const isTimeout =
          firstError instanceof Error &&
          firstError.message.includes("Превышено время ожидания");
        if (isTimeout) {
          // no-op: timeout is handled by user-facing error state below
        }
        throw firstError;
      }

      if (seq !== loadSeqRef.current) {
        return;
      }
      setVehicles(garageResult.vehicles ?? []);
      hasLoadedOnceRef.current = true;
      setError("");
      void loadGarageExtras(endpoints);
    } catch (requestError) {
      if (seq !== loadSeqRef.current) {
        return;
      }
      if (
        requestError instanceof Error &&
        requestError.message === "Запрос отменён."
      ) {
        return;
      }
      console.error(requestError);
      if (
        requestError instanceof Error &&
        requestError.message.toLowerCase().includes("требуется вход")
      ) {
        router.replace("/login");
        return;
      }
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось загрузить гараж. Проверьте подключение к backend."
      );
    } finally {
      if (seq === loadSeqRef.current) {
        setIsLoading(false);
      }
    }
  }, [loadGarageExtras, router]);

  useFocusEffect(
    useCallback(() => {
      void loadGarage();
      return () => undefined;
    }, [loadGarage])
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;
      const becameBackground = prevState === "active" && nextState === "background";
      const becameActive = prevState !== "active" && nextState === "active";
      if (becameBackground) {
        cancelInFlightMobileApiRequests("Запрос отменён: приложение свёрнуто.");
        return;
      }
      if (becameActive) {
        void loadGarage();
      }
    });
    return () => sub.remove();
  }, [loadGarage]);

  useEffect(() => {
    setLastViewedVehicleId(readLastViewedVehicleId());
  }, [vehicles.length]);

  const dashboardSummary = buildGarageDashboardSummary(vehicles, {
    seasonExpenses,
    selectedYear: getCurrentExpenseYear(),
  });
  const openTrash = useCallback(() => router.push("/trash"), [router]);
  const openNotifications = useCallback(() => router.push("/notifications"), [router]);
  const openProfile = useCallback(() => router.push("/profile"), [router]);
  const openAddVehicle = useCallback(() => {
    const maxVehicles = subscription?.capabilities.maxVehicles;
    if (maxVehicles != null && vehicles.length >= maxVehicles) {
      router.push("/subscription");
      return;
    }
    router.push("/vehicles/new");
  }, [router, subscription?.capabilities.maxVehicles, vehicles.length]);
  const reloadGarage = useCallback(() => void loadGarage(), [loadGarage]);
  const openVehicle = useCallback((id: string) => {
    prioritizeMobileApiForNavigation();
    router.push(`/vehicles/${id}`);
  }, [router]);
  const openServiceEvent = useCallback(
    (id: string) => router.push(`/vehicles/${id}/service-events/new`),
    [router]
  );
  const openExpenses = useCallback(
    (id: string) => router.push(`/vehicles/${id}/expenses`),
    [router]
  );
  const primaryVehicleId = vehicles[0]?.id ?? null;
  const navVehicleId = primaryVehicleId ?? lastViewedVehicleId;
  const openGarage = useCallback(() => router.push("/garage"), [router]);
  const openNodes = useCallback(() => {
    if (!navVehicleId) return;
    router.push(`/vehicles/${navVehicleId}/nodes`);
  }, [navVehicleId, router]);
  const openJournal = useCallback(() => {
    if (!navVehicleId) return;
    router.push(`/vehicles/${navVehicleId}/service-log`);
  }, [navVehicleId, router]);
  const openGarageExpenses = useCallback(() => {
    router.push("/expenses");
  }, [router]);
  const openPicker = useCallback(() => {
    if (!navVehicleId) return;
    router.push(`/vehicles/${navVehicleId}/wishlist`);
  }, [navVehicleId, router]);

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
        <Text style={styles.errorText}>{formatGarageLoadError(error)}</Text>
        <Pressable style={styles.retryButton} onPress={reloadGarage}>
          <Text style={styles.retryButtonText}>Повторить</Text>
        </Pressable>
      </GarageScreenState>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar style="light" />
      <View style={styles.screen}>
        <AppScreenHelpBar />
        {vehicles.length === 0 ? (
          <View style={styles.contentWrap}>
            <GarageHeader
              trashCount={trashCount}
              notificationCount={notificationCount}
              onOpenTrash={openTrash}
              onOpenNotifications={openNotifications}
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
                onOpenExpenses={openExpenses}
              />
            )}
            ListHeaderComponent={
              <View>
                <GarageHeader
                  trashCount={trashCount}
                  notificationCount={notificationCount}
                  onOpenTrash={openTrash}
                  onOpenNotifications={openNotifications}
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
          onOpenPicker={openPicker}
          onOpenExpenses={openGarageExpenses}
          onOpenProfile={openProfile}
          hasVehicleContext={!!navVehicleId}
        />
      </View>
    </SafeAreaView>
  );
}

function GarageScreenState(props: { children: ReactNode }) {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <AppScreenHelpBar />
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
  retryButton: {
    marginTop: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: c.primaryAction,
    paddingHorizontal: 24,
    paddingVertical: 13,
  },
  retryButtonText: {
    color: c.canvas,
    fontSize: 15,
    fontWeight: "700",
  },
});

