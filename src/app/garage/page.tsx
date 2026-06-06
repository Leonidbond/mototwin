"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { createWebApiClient } from "@/lib/create-web-api-client";
import { getGarageVehiclesDeduped } from "@/lib/web-api-dedup";
import { AuthGate } from "@/components/auth/AuthGate";
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

const garageApi = createWebApiClient();

const SIDEBAR_COLLAPSED_KEY = "garage.sidebar.collapsed";

if (typeof window !== "undefined") {
  // #region agent log
  fetch("http://127.0.0.1:7691/ingest/26105bb6-0b1c-4ea6-81d5-5f2a1ba438cd",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"6800ea"},body:JSON.stringify({sessionId:"6800ea",runId:"run2",hypothesisId:"H5",location:"src/app/garage/page.tsx:28",message:"garage module evaluated",data:{href:window.location.href},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  void fetch("/api/debug/client-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      runId: "run2",
      hypothesisId: "H5",
      location: "src/app/garage/page.tsx:34",
      message: "garage module evaluated",
      href: window.location.href,
      ts: Date.now(),
    }),
  }).catch(() => {});
}

export default function GaragePage() {
  return (
    <AuthGate>
      <GaragePageContent />
    </AuthGate>
  );
}

function GaragePageContent() {
  const [vehicles, setVehicles] = useState<GarageVehicleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [trashCount, setTrashCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [sidebarCollapsed, toggleSidebar] = useSidebarCollapsed(SIDEBAR_COLLAPSED_KEY);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      void fetch("/api/debug/client-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId: "run2",
          hypothesisId: "H5",
          location: "src/app/garage/page.tsx:58",
          message: "window error",
          data: {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          },
          ts: Date.now(),
        }),
      }).catch(() => {});
    };
    window.addEventListener("error", onError);
    return () => window.removeEventListener("error", onError);
  }, []);

  const loadGarage = useCallback(async () => {
    // #region agent log
    fetch("http://127.0.0.1:7691/ingest/26105bb6-0b1c-4ea6-81d5-5f2a1ba438cd",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"6800ea"},body:JSON.stringify({sessionId:"6800ea",runId:"run1",hypothesisId:"H2",location:"src/app/garage/page.tsx:44",message:"loadGarage start",data:{visibility:typeof document!=="undefined"?document.visibilityState:"n/a"},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    try {
      setIsLoading(true);
      setError("");
      const garageResult = await getGarageVehiclesDeduped();
      // #region agent log
      fetch("http://127.0.0.1:7691/ingest/26105bb6-0b1c-4ea6-81d5-5f2a1ba438cd",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"6800ea"},body:JSON.stringify({sessionId:"6800ea",runId:"run1",hypothesisId:"H2",location:"src/app/garage/page.tsx:51",message:"loadGarage got vehicles",data:{vehicles:(garageResult.vehicles??[]).length},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      setVehicles(garageResult.vehicles ?? []);

      void Promise.allSettled([
        garageApi.getTrashedVehicles(),
        garageApi.getNotifications({ limit: 1 }),
      ]).then(([trashResult, notificationsResult]) => {
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
      });
    } catch (err) {
      console.error(err);
      // #region agent log
      fetch("http://127.0.0.1:7691/ingest/26105bb6-0b1c-4ea6-81d5-5f2a1ba438cd",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"6800ea"},body:JSON.stringify({sessionId:"6800ea",runId:"run1",hypothesisId:"H2",location:"src/app/garage/page.tsx:76",message:"loadGarage failed",data:{error:err instanceof Error?err.message:String(err)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
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
