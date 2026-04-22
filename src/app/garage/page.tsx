"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import { buildGarageDashboardSummary } from "@mototwin/domain";
import { Card } from "@/components/ui";
import { productSemanticColors, typeScale } from "@mototwin/design-tokens";
import type { GarageVehicleItem } from "@mototwin/types";
import { GarageEmptyState } from "./_components/GarageEmptyState";
import { GarageHeader } from "./_components/GarageHeader";
import { GarageSummary } from "./_components/GarageSummary";
import { VehicleCard } from "./_components/VehicleCard";

const garageApi = createMotoTwinEndpoints(createApiClient({ baseUrl: "" }));

export default function GaragePage() {
  const [vehicles, setVehicles] = useState<GarageVehicleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isUsageProfileExpanded, setIsUsageProfileExpanded] = useState(false);
  const [isTechnicalSummaryExpanded, setIsTechnicalSummaryExpanded] = useState(false);
  const [hasLoadedCollapsePrefs, setHasLoadedCollapsePrefs] = useState(false);
  const [trashCount, setTrashCount] = useState(0);

  const loadGarage = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const [garageResult, trashResult] = await Promise.allSettled([
        garageApi.getGarageVehicles(),
        garageApi.getTrashedVehicles(),
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

  useEffect(() => {
    try {
      const usageRaw = localStorage.getItem("garage.usageProfile.expanded");
      const techRaw = localStorage.getItem("garage.technicalSummary.expanded");
      if (usageRaw === "true" || usageRaw === "false") {
        setIsUsageProfileExpanded(usageRaw === "true");
      }
      if (techRaw === "true" || techRaw === "false") {
        setIsTechnicalSummaryExpanded(techRaw === "true");
      }
    } catch {
      // Ignore localStorage failures for local UI prefs.
    } finally {
      setHasLoadedCollapsePrefs(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedCollapsePrefs) return;
    try {
      localStorage.setItem("garage.usageProfile.expanded", String(isUsageProfileExpanded));
    } catch {
      // Ignore localStorage failures for local UI prefs.
    }
  }, [hasLoadedCollapsePrefs, isUsageProfileExpanded]);

  useEffect(() => {
    if (!hasLoadedCollapsePrefs) return;
    try {
      localStorage.setItem("garage.technicalSummary.expanded", String(isTechnicalSummaryExpanded));
    } catch {
      // Ignore localStorage failures for local UI prefs.
    }
  }, [hasLoadedCollapsePrefs, isTechnicalSummaryExpanded]);

  const dashboardSummary = useMemo(
    () => buildGarageDashboardSummary(vehicles),
    [vehicles]
  );

  return (
    <main className="min-h-screen px-6 py-16" style={{ backgroundColor: productSemanticColors.canvas }}>
      <div className="mx-auto grid max-w-6xl gap-6">
        <GarageHeader trashCount={trashCount} />

        {isLoading ? (
          <Card>
            <p
              style={{
                color: productSemanticColors.textMuted,
                fontSize: typeScale.caption.fontSize,
                lineHeight: `${typeScale.caption.lineHeight}px`,
                fontWeight: Number(typeScale.caption.weight),
              }}
            >
              Загрузка гаража...
            </p>
          </Card>
        ) : null}

        {error ? (
          <Card style={{ borderColor: productSemanticColors.errorBorder, backgroundColor: productSemanticColors.errorSurface }}>
            <p
              style={{
                color: productSemanticColors.error,
                fontSize: typeScale.caption.fontSize,
                lineHeight: `${typeScale.caption.lineHeight}px`,
                fontWeight: Number(typeScale.bodyStrong.weight),
              }}
            >
              {error}
            </p>
          </Card>
        ) : null}

        {!isLoading && !error && vehicles.length > 0 ? (
          <GarageSummary
            motorcyclesCount={dashboardSummary.motorcyclesCount}
            motorcyclesWithAttentionCount={dashboardSummary.motorcyclesWithAttentionCount}
            attentionItemsTotalCount={dashboardSummary.attentionItemsTotalCount}
          />
        ) : null}

        {!isLoading && !error && vehicles.length === 0 ? <GarageEmptyState /> : null}

        {!isLoading && !error && vehicles.length > 0 ? (
          <div className="grid gap-6">
            {vehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                isUsageProfileExpanded={isUsageProfileExpanded}
                isTechnicalSummaryExpanded={isTechnicalSummaryExpanded}
                onToggleUsageProfile={() => setIsUsageProfileExpanded((prev) => !prev)}
                onToggleTechnicalSummary={() => setIsTechnicalSummaryExpanded((prev) => !prev)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}
