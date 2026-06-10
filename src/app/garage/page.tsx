"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { createWebApiClient } from "@/lib/create-web-api-client";
import { getGarageVehiclesDeduped } from "@/lib/web-api-dedup";
import { buildGarageDashboardSummary, getCurrentExpenseYear } from "@mototwin/domain";
import { Card } from "@/components/ui";
import { productSemanticColors, typeScale } from "@mototwin/design-tokens";
import type { ExpenseItem, GarageVehicleItem } from "@mototwin/types";
import { GarageEmptyState } from "./_components/GarageEmptyState";
import { AddMotorcycleCard } from "./_components/AddMotorcycleCard";
import { GarageHeader } from "./_components/GarageHeader";
import { GarageSidebar } from "./_components/GarageSidebar";
import { GarageSummary } from "./_components/GarageSummary";
import { GarageTasksStrip } from "./_components/GarageTasksStrip";
import { VehicleCard } from "./_components/VehicleCard";
import { useSidebarCollapsed } from "@/lib/use-sidebar-collapsed";

const garageApi = createWebApiClient();

const SIDEBAR_COLLAPSED_KEY = "garage.sidebar.collapsed";

export default function GaragePage() {
  return <GaragePageContent />;
}

function GaragePageContent() {
  const [vehicles, setVehicles] = useState<GarageVehicleItem[]>([]);
  const [seasonExpenses, setSeasonExpenses] = useState<ExpenseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [trashCount, setTrashCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [sidebarCollapsed, toggleSidebar] = useSidebarCollapsed(SIDEBAR_COLLAPSED_KEY);

  const loadGarage = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const fastGarageResult = await getGarageVehiclesDeduped({ includeAttention: false });
      setVehicles(fastGarageResult.vehicles ?? []);

      void getGarageVehiclesDeduped({ includeAttention: true })
        .then((fullGarageResult) => {
          setVehicles(fullGarageResult.vehicles ?? []);
        })
        .catch((backgroundError) => {
          console.warn("Garage attention refresh failed:", backgroundError);
        });

      void Promise.allSettled([
        garageApi.getTrashedVehicles(),
        garageApi.getNotifications({ limit: 1 }),
        garageApi.getExpenses({ year: getCurrentExpenseYear() }),
      ]).then(([trashResult, notificationsResult, expensesResult]) => {
        if (trashResult.status === "fulfilled") {
          setTrashCount(trashResult.value.vehicles?.length ?? 0);
        } else {
          console.warn("Failed to fetch trashed vehicles count:", trashResult.reason);
          setTrashCount(0);
        }
        if (notificationsResult.status === "fulfilled") {
          setNotificationCount(notificationsResult.value.unreadCount ?? 0);
        } else {
          console.warn("Failed to fetch notifications count:", notificationsResult.reason);
          setNotificationCount(0);
        }
        if (expensesResult.status === "fulfilled") {
          setSeasonExpenses(expensesResult.value.expenses ?? []);
        } else {
          console.warn("Failed to fetch garage season expenses:", expensesResult.reason);
          setSeasonExpenses([]);
        }
      });
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Произошла ошибка при загрузке гаража."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGarage();
  }, [loadGarage]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void loadGarage();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadGarage]);

  const dashboardSummary = useMemo(
    () =>
      buildGarageDashboardSummary(vehicles, {
        seasonExpenses,
        seasonExpensesLoaded: !isLoading,
        selectedYear: getCurrentExpenseYear(),
      }),
    [vehicles, seasonExpenses]
  );
  const hasVehicles = vehicles.length > 0;
  const showSummary = !isLoading && !error && hasVehicles;
  const showEmptyState = !isLoading && !error && !hasVehicles;
  const showVehicleList = !isLoading && !error && hasVehicles;

  return (
    <main
      style={{
        width: "100%",
        flex: 1,
        minHeight: "100vh",
        backgroundColor: productSemanticColors.canvas,
      }}
    >
      <div
        style={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: `${sidebarCollapsed ? 64 : 220}px minmax(0, 1fr)`,
          alignItems: "start",
          transition: "grid-template-columns 0.18s ease",
        }}
      >
        <GarageSidebar
          collapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
          prefetchedGarageVehicles={isLoading ? undefined : vehicles}
        />
        <section
          style={{
            display: "grid",
            gap: 12,
            padding: "12px 24px",
            maxWidth: 1600,
            width: "100%",
            minWidth: 0,
            justifySelf: "center",
          }}
        >
          <GarageHeader trashCount={trashCount} notificationCount={notificationCount} />

          {isLoading ? <GarageStateCard>Загрузка гаража...</GarageStateCard> : null}

          {error ? (
            <GarageStateCard isError>{error}</GarageStateCard>
          ) : null}

          {showSummary ? (
            <GarageSummary
              motorcyclesCount={dashboardSummary.motorcyclesCount}
              motorcyclesWithAttentionCount={dashboardSummary.motorcyclesWithAttentionCount}
              attentionItemsTotalCount={dashboardSummary.attentionItemsTotalCount}
              expensesLabel={dashboardSummary.currentMonthExpensesLabel}
            />
          ) : null}

          {showEmptyState ? <GarageEmptyState onReload={() => void loadGarage()} /> : null}

          {showVehicleList ? (
            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 420px), 1fr))",
              }}
            >
              {vehicles.map((vehicle, index) => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  silhouettePriority={index < 2}
                />
              ))}
              <AddMotorcycleCard />
            </div>
          ) : null}

          {showVehicleList ? <GarageTasksStrip vehicles={vehicles} /> : null}
        </section>
      </div>
    </main>
  );
}

function GarageStateCard(props: { children: ReactNode; isError?: boolean }) {
  const textStyle = props.isError
    ? {
        color: productSemanticColors.error,
        fontSize: typeScale.caption.fontSize,
        lineHeight: `${typeScale.caption.lineHeight}px`,
        fontWeight: Number(typeScale.bodyStrong.weight),
      }
    : {
        color: productSemanticColors.textMuted,
        fontSize: typeScale.caption.fontSize,
        lineHeight: `${typeScale.caption.lineHeight}px`,
        fontWeight: Number(typeScale.caption.weight),
      };

  return (
    <Card
      style={
        props.isError
          ? {
              borderColor: productSemanticColors.errorBorder,
              backgroundColor: productSemanticColors.errorSurface,
            }
          : undefined
      }
    >
      <p style={textStyle}>{props.children}</p>
    </Card>
  );
}
