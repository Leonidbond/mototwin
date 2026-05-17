"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import { buildGarageDashboardSummary } from "@mototwin/domain";
import { Card } from "@/components/ui";
import { productSemanticColors, typeScale } from "@mototwin/design-tokens";
import type { GarageVehicleItem } from "@mototwin/types";
import { GarageEmptyState } from "./_components/GarageEmptyState";
import { AddMotorcycleCard } from "./_components/AddMotorcycleCard";
import { GarageHeader } from "./_components/GarageHeader";
import { GarageSidebar } from "./_components/GarageSidebar";
import { GarageSummary } from "./_components/GarageSummary";
import { GarageTasksStrip } from "./_components/GarageTasksStrip";
import { VehicleCard } from "./_components/VehicleCard";
import { useSidebarCollapsed } from "@/lib/use-sidebar-collapsed";

const garageApi = createMotoTwinEndpoints(createApiClient({ baseUrl: "" }));

const SIDEBAR_COLLAPSED_KEY = "garage.sidebar.collapsed";

export default function GaragePage() {
  const [vehicles, setVehicles] = useState<GarageVehicleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [trashCount, setTrashCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [sidebarCollapsed, toggleSidebar] = useSidebarCollapsed(SIDEBAR_COLLAPSED_KEY);

  const loadGarage = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const [garageResult, trashResult, notificationsResult] = await Promise.allSettled([
        garageApi.getGarageVehicles(),
        garageApi.getTrashedVehicles(),
        garageApi.getNotifications({ limit: 1 }),
      ]);

      if (garageResult.status === "rejected") {
        throw garageResult.reason;
      }

      setVehicles(garageResult.value.vehicles ?? []);

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
    () => buildGarageDashboardSummary(vehicles),
    [vehicles]
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
        <GarageSidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
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
