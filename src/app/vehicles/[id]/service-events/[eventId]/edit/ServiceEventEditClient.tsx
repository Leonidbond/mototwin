"use client";

import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import {
  createInitialEditServiceEventValues,
  normalizeEditServiceEventPayload,
} from "@mototwin/domain";
import { productSemanticColors } from "@mototwin/design-tokens";
import { GarageSidebar } from "@/app/garage/_components/GarageSidebar";
import { useSidebarCollapsed } from "@/lib/use-sidebar-collapsed";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AddServiceEventFormValues, NodeTreeItem, ServiceEventItem } from "@mototwin/types";
import { ServiceEventForm } from "../../../_components/service-event-form";

const api = createMotoTwinEndpoints(createApiClient({ baseUrl: "" }));

export function ServiceEventEditClient() {
  const params = useParams<{ id: string; eventId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const vehicleId = params.id;
  const eventId = params.eventId;
  const [sidebarCollapsed, toggleSidebar] = useSidebarCollapsed();
  const returnToEncoded = searchParams.get("returnTo");

  const todayDateYmd = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [nodeTree, setNodeTree] = useState<NodeTreeItem[]>([]);
  const [vehicleOdometer, setVehicleOdometer] = useState<number | null>(null);
  const [vehicleEngineHours, setVehicleEngineHours] = useState<number | null>(null);
  const [initialForm, setInitialForm] = useState<AddServiceEventFormValues | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vehicleDisplayName, setVehicleDisplayName] = useState("Мотоцикл");

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setIsLoading(true);
        setLoadError("");
        const [detail, tree, serviceRes] = await Promise.all([
          api.getVehicleDetail(vehicleId),
          api.getNodeTree(vehicleId),
          api.getServiceEvents(vehicleId),
        ]);
        if (cancelled) return;
        const vehicle = detail.vehicle;
        if (vehicle) {
          const nm =
            vehicle.nickname?.trim() ||
            `${vehicle.brandName} ${vehicle.modelName}`.trim() ||
            "Мотоцикл";
          setVehicleDisplayName(nm);
        }
        setVehicleOdometer(vehicle?.odometer ?? null);
        setVehicleEngineHours(vehicle?.engineHours ?? null);
        setNodeTree(tree.nodeTree ?? []);
        const events = serviceRes.serviceEvents ?? [];
        const ev = events.find((e: ServiceEventItem) => e.id === eventId);
        if (!ev || ev.eventKind === "STATE_UPDATE") {
          setLoadError("Событие не найдено или недоступно для редактирования.");
          setInitialForm(null);
          return;
        }
        setInitialForm(createInitialEditServiceEventValues(ev));
        setResetKey((k) => k + 1);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Не удалось загрузить данные.");
          setInitialForm(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [eventId, vehicleId]);

  const decodedReturnTo = useMemo(() => {
    if (!returnToEncoded) {
      return `/vehicles/${vehicleId}/service-log`;
    }
    try {
      return decodeURIComponent(returnToEncoded);
    } catch {
      return `/vehicles/${vehicleId}/service-log`;
    }
  }, [returnToEncoded, vehicleId]);

  const onCancel = useCallback(() => {
    router.replace(decodedReturnTo);
  }, [decodedReturnTo, router]);

  const serviceEventPageBreadcrumbs = useMemo(
    () => [
      { label: "Гараж", href: "/garage" },
      { label: vehicleDisplayName, href: `/vehicles/${vehicleId}` },
      { label: "Журнал", href: `/vehicles/${vehicleId}/service-log` },
      { label: "Редактирование" },
    ],
    [vehicleDisplayName, vehicleId]
  );

  const onSubmit = useCallback(
    async (form: AddServiceEventFormValues) => {
      try {
        setIsSubmitting(true);
        setSubmitError("");
        await api.updateServiceEvent(vehicleId, eventId, normalizeEditServiceEventPayload(form));
        router.replace(decodedReturnTo);
      } catch (e) {
        console.error(e);
        setSubmitError(e instanceof Error ? e.message : "Не удалось сохранить изменения.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [decodedReturnTo, eventId, router, vehicleId]
  );

  return (
    <main
      className="garage-dark-surface-text min-h-screen"
      style={{ width: "100%", backgroundColor: productSemanticColors.canvas }}
    >
      <div
        style={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: `${sidebarCollapsed ? 64 : 204}px minmax(0, 1fr)`,
          alignItems: "start",
          transition: "grid-template-columns 0.18s ease",
          minHeight: "100vh",
        }}
      >
        <GarageSidebar
          collapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
        />
        <section
          className="flex min-h-0 min-w-0 flex-col"
          style={{
            maxWidth: "none",
            width: "100%",
            justifySelf: "stretch",
            minHeight: "100vh",
            backgroundColor: "#070B10",
          }}
        >
        {loadError ? (
          <p className="text-sm" style={{ color: productSemanticColors.error }}>
            {loadError}
          </p>
        ) : null}
        {!loadError && !isLoading && initialForm ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <ServiceEventForm
              resetKey={resetKey}
              initialForm={initialForm}
              vehicleId={vehicleId}
              nodeTree={nodeTree}
              vehicleOdometer={vehicleOdometer}
              vehicleEngineHours={vehicleEngineHours}
              todayDateYmd={todayDateYmd}
              editingServiceEventId={eventId}
              submitError={submitError}
              onClearSubmitError={() => setSubmitError("")}
              isSubmitting={isSubmitting}
              onSubmit={onSubmit}
              onCancel={onCancel}
              eventDateMaxYmd={todayDateYmd}
              odometerInputMax={vehicleOdometer}
              pageChrome="partsCart"
              pageSubtitle="Измените данные события и сохраните обновлённую запись в журнале."
              pageBreadcrumbs={serviceEventPageBreadcrumbs}
            />
          </div>
        ) : null}
        {!loadError && isLoading ? (
          <p className="text-sm" style={{ color: productSemanticColors.textSecondary }}>
            Загрузка…
          </p>
        ) : null}
        </section>
      </div>
    </main>
  );
}
