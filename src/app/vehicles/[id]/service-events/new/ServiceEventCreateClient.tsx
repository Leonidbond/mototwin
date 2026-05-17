"use client";

import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import {
  createInitialAddServiceEventFormValues,
  createInitialAddServiceEventFromNode,
  createInitialAddServiceEventFromWishlistItem,
  createInitialRepeatServiceEventValues,
  DEFAULT_ADD_SERVICE_EVENT_CURRENCY,
  findNodePathById,
  findNodeTreeItemById,
  getTodayDateYmdLocal,
  normalizeAddServiceEventPayload,
} from "@mototwin/domain";
import { productSemanticColors } from "@mototwin/design-tokens";
import { GarageSidebar } from "@/app/garage/_components/GarageSidebar";
import { useSidebarCollapsed } from "@/lib/use-sidebar-collapsed";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AddServiceEventFormValues, NodeTreeItem, ServiceEventItem } from "@mototwin/types";
import { ServiceEventForm } from "../../_components/service-event-form";

const api = createMotoTwinEndpoints(createApiClient({ baseUrl: "" }));

function withHighlightReturnTo(returnToDecoded: string, eventId: string): string {
  const [path, query = ""] = returnToDecoded.split("?");
  const q = new URLSearchParams(query);
  q.set("highlightServiceEventId", eventId);
  const qs = q.toString();
  return qs ? `${path}?${qs}` : `${path}?highlightServiceEventId=${encodeURIComponent(eventId)}`;
}

export function ServiceEventCreateClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const vehicleId = params.id;
  const [sidebarCollapsed, toggleSidebar] = useSidebarCollapsed();

  const repeatOf = searchParams.get("repeatOf");
  const fromNodeId = searchParams.get("fromNodeId");
  const wishlistItemId = searchParams.get("wishlistItemId");
  const pendingInstallRaw = searchParams.get("pendingInstall");
  const wishlistPendingInstall = pendingInstallRaw === "1" || pendingInstallRaw === "true";
  const returnToEncoded = searchParams.get("returnTo");

  const todayDateYmd = useMemo(() => getTodayDateYmdLocal(), []);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [nodeTree, setNodeTree] = useState<NodeTreeItem[]>([]);
  const [vehicleOdometer, setVehicleOdometer] = useState<number | null>(null);
  const [vehicleEngineHours, setVehicleEngineHours] = useState<number | null>(null);
  const [initialForm, setInitialForm] = useState<AddServiceEventFormValues>(() =>
    createInitialAddServiceEventFormValues()
  );
  const [resetKey, setResetKey] = useState(0);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vehicleDisplayName, setVehicleDisplayName] = useState("Мотоцикл");

  const bumpForm = useCallback((next: AddServiceEventFormValues) => {
    setInitialForm(next);
    setResetKey((k) => k + 1);
  }, []);

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
            `${vehicle.brand.name} ${vehicle.model.name}`.trim() ||
            "Мотоцикл";
          setVehicleDisplayName(nm);
        }
        setVehicleOdometer(vehicle?.odometer ?? null);
        setVehicleEngineHours(vehicle?.engineHours ?? null);
        const treeItems = tree.nodeTree ?? [];
        setNodeTree(treeItems);
        const events = serviceRes.serviceEvents ?? [];

        const odo = vehicle?.odometer ?? null;
        const eng = vehicle?.engineHours ?? null;
        const currencyDefault = DEFAULT_ADD_SERVICE_EVENT_CURRENCY;

        if (repeatOf) {
          const ev = events.find((e: ServiceEventItem) => e.id === repeatOf);
          if (!ev || ev.eventKind === "STATE_UPDATE") {
            setLoadError("Не удалось подготовить повтор события.");
            return;
          }
          const odometerForForm = odo ?? ev.odometer ?? 0;
          bumpForm(
            createInitialRepeatServiceEventValues(
              ev,
              { odometer: odometerForForm, engineHours: eng },
              { todayDateYmd }
            )
          );
          return;
        }

        if (fromNodeId) {
          const leaf = findNodeTreeItemById(treeItems, fromNodeId);
          const path = findNodePathById(treeItems, fromNodeId);
          if (!leaf || !path) {
            setLoadError("Не удалось определить узел для события.");
            return;
          }
          const values = createInitialAddServiceEventFromNode({
            nodeId: leaf.id,
            nodeCode: leaf.code,
            nodeName: leaf.name,
            vehicle: { odometer: odo ?? 0, engineHours: eng },
            currentDateYmd: todayDateYmd,
          });
          values.currency = currencyDefault;
          bumpForm(values);
          return;
        }

        if (wishlistItemId) {
          const wish = await api.getVehicleWishlist(vehicleId);
          if (cancelled) return;
          const item = (wish.items ?? []).find((w) => w.id === wishlistItemId);
          if (!item?.nodeId) {
            setLoadError("Позиция списка не найдена или без узла.");
            return;
          }
          if (!findNodePathById(treeItems, item.nodeId)) {
            setLoadError("Не удалось определить путь узла для позиции списка.");
            return;
          }
          const values = createInitialAddServiceEventFromWishlistItem(
            item,
            { odometer: odo ?? 0, engineHours: eng },
            { todayDateYmd }
          );
          bumpForm(values);
          return;
        }

        const empty = createInitialAddServiceEventFormValues();
        empty.eventDate = todayDateYmd;
        empty.odometer = odo != null ? String(odo) : "";
        empty.engineHours = eng != null ? String(eng) : "";
        empty.currency = currencyDefault;
        bumpForm(empty);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Не удалось загрузить данные.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [bumpForm, fromNodeId, repeatOf, todayDateYmd, vehicleId, wishlistItemId]);

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
      { label: "Новое ТО" },
    ],
    [vehicleDisplayName, vehicleId]
  );

  const onSubmit = useCallback(
    async (form: AddServiceEventFormValues) => {
      try {
        setIsSubmitting(true);
        setSubmitError("");
        const res = await api.createServiceEvent(vehicleId, normalizeAddServiceEventPayload(form));
        const newId = res.serviceEvent.id;
        if (wishlistPendingInstall && wishlistItemId) {
          const anchorNodeId = form.items[0]?.nodeId?.trim() ?? "";
          await api.updateWishlistItem(vehicleId, wishlistItemId, {
            status: "INSTALLED",
            nodeId: anchorNodeId,
          });
        }
        let dest = withHighlightReturnTo(decodedReturnTo, newId);
        if (res.suggestFitmentReport?.suggestions?.length) {
          try {
            const u = new URL(dest, typeof window !== "undefined" ? window.location.origin : "http://local");
            u.searchParams.set("fitmentReportHint", "1");
            dest = `${u.pathname}${u.search}${u.hash}`;
          } catch {
            // ignore malformed returnTo
          }
        }
        router.replace(dest);
      } catch (e) {
        console.error(e);
        setSubmitError(e instanceof Error ? e.message : "Не удалось сохранить сервисное событие.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [decodedReturnTo, router, vehicleId, wishlistItemId, wishlistPendingInstall]
  );

  const contextHint = wishlistPendingInstall && wishlistItemId ? (
    <span>После сохранения позиция будет отмечена как установленная.</span>
  ) : null;

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
        {!loadError && !isLoading ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <ServiceEventForm
              resetKey={resetKey}
              initialForm={initialForm}
              vehicleId={vehicleId}
              nodeTree={nodeTree}
              vehicleOdometer={vehicleOdometer}
              vehicleEngineHours={vehicleEngineHours}
              todayDateYmd={todayDateYmd}
              editingServiceEventId={null}
              submitError={submitError}
              onClearSubmitError={() => setSubmitError("")}
              isSubmitting={isSubmitting}
              onSubmit={onSubmit}
              onCancel={onCancel}
              eventDateMaxYmd={todayDateYmd}
              odometerInputMax={vehicleOdometer}
              contextHint={contextHint}
              pageChrome="partsCart"
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
