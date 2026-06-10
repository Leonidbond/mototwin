import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  createInitialAddServiceEventFormValues,
  createInitialAddServiceEventFromNode,
  createInitialAddServiceEventFromWishlistItem,
  createInitialEditServiceEventValues,
  createInitialRepeatServiceEventValues,
  DEFAULT_ADD_SERVICE_EVENT_CURRENCY,
  buildVehicleDetailViewModel,
  getNodePathById,
  getSelectedNodeFromPath,
  getTodayDateYmdLocal,
  normalizeAddServiceEventPayload,
  normalizeEditServiceEventPayload,
  parseExpenseAmountInputToNumberOrNull,
  vehicleDetailFromApiRecord,
} from "@mototwin/domain";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import type {
  AddServiceEventFormValues,
  NodeTreeItem,
  PartWishlistItem,
  VehicleDetail,
  VehicleDetailApiRecord,
} from "@mototwin/types";
import { getApiBaseUrl } from "../../../../src/api-base-url";
import { createMobileApiClient } from "../../../../src/create-mobile-api-client";
import { withAuthGuard } from "../../../../src/mobile-auth-guard";
import {
  clearPendingWishlistServiceEvent,
  peekPendingWishlistServiceEvent,
} from "../../../../src/pending-wishlist-service-event";
import { readSearchParam } from "../../../../src/read-search-param";
import { logServiceEventFormDiag } from "../../../../src/service-event-form-diag";
import { useMobileSubscription } from "../../../../src/use-mobile-subscription";
import { KeyboardAwareScrollScreen } from "../../../../components/expo-shell/keyboard-aware-scroll-screen";
import {
  InternalScreenChrome,
  type InternalScreenCrumb,
} from "../../../../components/expo-shell/internal-screen-chrome";
import { BasicServiceEventBundleForm } from "../../../../components/vehicle-detail/basic-service-event-bundle-form";
import { GarageVehicleContextPlaque } from "../../../../components/garage/GarageVehicleContextPlaque";

function resolveWishlistItemNodeId(item: Pick<PartWishlistItem, "nodeId" | "node">): string {
  return (item.nodeId ?? item.node?.id ?? "").trim();
}

function buildWishlistItemFromRouteParams(
  vehicleId: string,
  args: {
    wlId: string;
    initialNodeId: string;
    wlTitle: string;
    wlQty: string;
    wlComment: string | null;
    wlCostStr: string;
    wlCurrency: string | null;
  }
): PartWishlistItem | null {
  const nodeId = args.initialNodeId.trim();
  const title = args.wlTitle.trim();
  if (!nodeId || !title) {
    return null;
  }
  const parsedWlCost =
    args.wlCostStr !== "" ? parseExpenseAmountInputToNumberOrNull(args.wlCostStr) : null;
  const wishlistCostAmount =
    args.wlCostStr !== "" && parsedWlCost != null ? parsedWlCost : null;
  const wishlistCurrency = wishlistCostAmount != null ? args.wlCurrency || "RUB" : null;
  return {
    id: args.wlId.trim() || "wishlist-query-prefill",
    vehicleId,
    skuId: null,
    nodeId,
    title,
    quantity: args.wlQty ? Number.parseInt(args.wlQty, 10) || 1 : 1,
    status: "BOUGHT",
    comment: args.wlComment,
    costAmount: wishlistCostAmount,
    currency: wishlistCurrency,
    createdAt: "",
    updatedAt: "",
    node: null,
    sku: null,
  };
}

export default function NewServiceEventScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    nodeId?: string;
    eventId?: string;
    repeatFrom?: string;
    source?: string;
    wishlistItemId?: string;
    pendingInstall?: string;
    wlTitle?: string;
    wlQty?: string;
    wlId?: string;
    wlComment?: string;
    wlCost?: string;
    wlCurrency?: string;
  }>();
  const vehicleId = readSearchParam(params.id) ?? "";
  const initialNodeId = readSearchParam(params.nodeId) ?? "";
  const editingEventId = readSearchParam(params.eventId) ?? "";
  const repeatFromId = (readSearchParam(params.repeatFrom) ?? "").trim();
  const source = readSearchParam(params.source) ?? "service-log";
  const wlTitle = (readSearchParam(params.wlTitle) ?? "").trim();
  const wlQty = readSearchParam(params.wlQty) ?? "";
  const wlIdFromQuery = readSearchParam(params.wlId) ?? "";
  const wishlistItemIdParam = readSearchParam(params.wishlistItemId) ?? "";
  const wlId = wishlistItemIdParam || wlIdFromQuery;
  const wlCommentRaw = readSearchParam(params.wlComment);
  const wlComment =
    typeof wlCommentRaw === "string" && wlCommentRaw.trim() ? wlCommentRaw.trim() : null;
  const wlCostStr = (readSearchParam(params.wlCost) ?? "").trim();
  const wlCurrencyRaw = readSearchParam(params.wlCurrency);
  const wlCurrency =
    typeof wlCurrencyRaw === "string" && wlCurrencyRaw.trim() ? wlCurrencyRaw.trim() : null;
  const pendingInstallRaw = readSearchParam(params.pendingInstall) ?? "";
  const wishlistPendingInstall =
    pendingInstallRaw === "1" || pendingInstallRaw.toLowerCase() === "true";
  const pendingWishlistHandoff = peekPendingWishlistServiceEvent(vehicleId);
  const wishlistPrefillRequested =
    source === "wishlist" ||
    wishlistItemIdParam.trim().length > 0 ||
    wlIdFromQuery.trim().length > 0 ||
    wishlistPendingInstall ||
    pendingWishlistHandoff != null;
  const apiBaseUrl = getApiBaseUrl();
  const { capabilities: subscriptionCapabilities } = useMobileSubscription();
  const [nodeTree, setNodeTree] = useState<NodeTreeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [bundleInitial, setBundleInitial] = useState<AddServiceEventFormValues>(() =>
    createInitialAddServiceEventFormValues()
  );
  const [bundleSessionKey, setBundleSessionKey] = useState(0);
  const [currentVehicleOdometer, setCurrentVehicleOdometer] = useState<number | null>(null);
  const [currentVehicleEngineHours, setCurrentVehicleEngineHours] = useState<number | null>(null);
  const [vehicleDisplayName, setVehicleDisplayName] = useState("");
  const [contextVehicleDetail, setContextVehicleDetail] = useState<VehicleDetail | null>(null);
  const [headerScrollY, setHeaderScrollY] = useState(0);
  const [wishlistInstallMeta, setWishlistInstallMeta] = useState<{
    itemId: string;
    pendingInstall: boolean;
  } | null>(null);

  const isEditMode = editingEventId.length > 0;
  const isRepeatMode = !isEditMode && repeatFromId.length > 0;

  const clearError = useCallback(() => setError(""), []);

  const headerCrumbs = useMemo((): InternalScreenCrumb[] => {
    const bike = vehicleDisplayName || "Мотоцикл";
    const crumbs: InternalScreenCrumb[] = [
      { label: "Мой гараж", href: "/garage" },
      { label: bike, href: `/vehicles/${vehicleId}` },
    ];
    const fromWishlist =
      source === "wishlist" ||
      wishlistItemIdParam.length > 0 ||
      wlIdFromQuery.trim().length > 0;
    if (fromWishlist) {
      crumbs.push({ label: "Корзина", href: `/vehicles/${vehicleId}/wishlist` });
    } else if (source === "service-log") {
      crumbs.push({ label: "Журнал", href: `/vehicles/${vehicleId}/service-log` });
    }
    crumbs.push({
      label: isEditMode ? "Редактирование" : isRepeatMode ? "Повтор записи" : "Новое событие",
    });
    return crumbs;
  }, [
    vehicleDisplayName,
    vehicleId,
    source,
    wishlistItemIdParam,
    wlIdFromQuery,
    isEditMode,
    isRepeatMode,
  ]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!vehicleId) {
        if (!cancelled) {
          setError("Не удалось определить ID мотоцикла.");
          setIsLoading(false);
        }
        return;
      }

      if (
        (wishlistPendingInstall || source === "wishlist") &&
        !wlId.trim() &&
        !initialNodeId.trim() &&
        !wlTitle.trim() &&
        !peekPendingWishlistServiceEvent(vehicleId)
      ) {
        return;
      }

      try {
        if (!cancelled) {
          setIsLoading(true);
          setError("");
          setContextVehicleDetail(null);
          setWishlistInstallMeta(null);
        }
        const defaultCurrency = DEFAULT_ADD_SERVICE_EVENT_CURRENCY;
        const endpoints = createMobileApiClient();
        const needsServiceEventsForForm = isEditMode || isRepeatMode;
        const payload = await withAuthGuard(
          () =>
            Promise.all([
              endpoints.getVehicleDetail(vehicleId),
              endpoints.getNodeTree(vehicleId),
              needsServiceEventsForForm
                ? endpoints.getServiceEvents(vehicleId)
                : Promise.resolve(null),
            ]),
          () => router.replace("/login")
        );
        if (cancelled) {
          return;
        }
        if (!payload) {
          setIsLoading(false);
          return;
        }
        const [vehicleData, treeData, eventsData] = payload;
        const nextTree = treeData.nodeTree ?? [];
        setNodeTree(nextTree);

        const v = vehicleData.vehicle;
        const rawV = v as VehicleDetailApiRecord | null | undefined;
        let detail: VehicleDetail | null = null;
        if (rawV) {
          try {
            detail = vehicleDetailFromApiRecord(rawV);
          } catch {
            detail = null;
          }
        }
        setContextVehicleDetail(detail);
        setVehicleDisplayName(detail ? buildVehicleDetailViewModel(detail).displayName : "Мотоцикл");
        const vehicleOdometer = detail?.odometer ?? v?.odometer ?? null;
        const vehicleEngineHours = detail?.engineHours ?? v?.engineHours ?? null;
        const todayYmd = getTodayDateYmdLocal();
        setCurrentVehicleOdometer(vehicleOdometer);
        setCurrentVehicleEngineHours(vehicleEngineHours ?? null);

        let nextForm: AddServiceEventFormValues;

        if (isEditMode && eventsData) {
          const editableEvent = (eventsData.serviceEvents ?? []).find((e) => e.id === editingEventId);
          if (!editableEvent) {
            setError("Сервисное событие не найдено.");
            setIsLoading(false);
            return;
          }
          if (editableEvent.eventKind === "STATE_UPDATE") {
            setError("События обновления состояния нельзя редактировать в этой форме.");
            setIsLoading(false);
            return;
          }
          nextForm = createInitialEditServiceEventValues(editableEvent);
        } else if (isRepeatMode && eventsData && v) {
          const sourceEvent = (eventsData.serviceEvents ?? []).find((e) => e.id === repeatFromId);
          if (!sourceEvent) {
            setError("Исходное событие не найдено.");
            setIsLoading(false);
            return;
          }
          if (sourceEvent.eventKind === "STATE_UPDATE") {
            setError("Это событие нельзя повторить.");
            setIsLoading(false);
            return;
          }
          nextForm = createInitialRepeatServiceEventValues(
            sourceEvent,
            { odometer: v.odometer, engineHours: v.engineHours ?? null },
            { todayDateYmd: todayYmd }
          );
        } else if (!isEditMode && !isRepeatMode && wishlistPrefillRequested) {
          const pendingHandoff = peekPendingWishlistServiceEvent(vehicleId);
          const queryItem = buildWishlistItemFromRouteParams(vehicleId, {
            wlId: wlId || pendingHandoff?.item.id || "",
            initialNodeId: initialNodeId || resolveWishlistItemNodeId(pendingHandoff?.item ?? { nodeId: null, node: null }),
            wlTitle: wlTitle || pendingHandoff?.item.title || "",
            wlQty: wlQty || (pendingHandoff?.item.quantity != null ? String(pendingHandoff.item.quantity) : ""),
            wlComment: wlComment ?? pendingHandoff?.item.comment ?? null,
            wlCostStr:
              wlCostStr ||
              (pendingHandoff?.item.costAmount != null && Number.isFinite(pendingHandoff.item.costAmount)
                ? String(pendingHandoff.item.costAmount)
                : ""),
            wlCurrency: wlCurrency ?? pendingHandoff?.item.currency ?? null,
          });
          let resolvedItem: PartWishlistItem | null = pendingHandoff?.item ?? null;
          const lookupId = (wlId || pendingHandoff?.item.id || "").trim();
          if (!resolvedItem && lookupId) {
            const wishPayload = await withAuthGuard(
              () => endpoints.getVehicleWishlist(vehicleId),
              () => router.replace("/login")
            );
            if (cancelled) {
              return;
            }
            if (wishPayload) {
              const apiItem = (wishPayload.items ?? []).find((w) => w.id === lookupId);
              if (apiItem) {
                const apiNodeId = resolveWishlistItemNodeId(apiItem);
                if (apiNodeId) {
                  resolvedItem = { ...apiItem, nodeId: apiNodeId };
                }
              }
            }
          }
          if (!resolvedItem) {
            resolvedItem = queryItem;
          }
          const resolvedNodeId = resolvedItem ? resolveWishlistItemNodeId(resolvedItem) : "";
          if (!resolvedItem || !resolvedNodeId) {
            setError("Позиция корзины не найдена или без узла.");
            setIsLoading(false);
            return;
          }
          const itemTitle = (resolvedItem.title ?? "").trim();
          if (!itemTitle) {
            setError("Позиция корзины без названия.");
            setIsLoading(false);
            return;
          }
          const nodePath = getNodePathById(nextTree, resolvedNodeId);
          if (!nodePath?.length && nextTree.length > 0) {
            setError("Не удалось определить путь узла для позиции корзины.");
            setIsLoading(false);
            return;
          }
          const installItemId = lookupId || resolvedItem.id;
          const installPending =
            wishlistPendingInstall || Boolean(pendingHandoff?.pendingInstall);
          if (installItemId) {
            setWishlistInstallMeta({ itemId: installItemId, pendingInstall: installPending });
          }
          nextForm = createInitialAddServiceEventFromWishlistItem(
            { ...resolvedItem, nodeId: resolvedNodeId, title: itemTitle },
            {
              odometer: vehicleOdometer ?? 0,
              engineHours: vehicleEngineHours ?? null,
            },
            { todayDateYmd: todayYmd }
          );
          logServiceEventFormDiag("wishlist prefill ok", {
            vehicleId,
            itemId: installItemId,
            nodeId: resolvedNodeId,
            title: itemTitle,
            source: pendingHandoff ? "handoff" : lookupId ? "api" : "query",
            treeLeaves: nextTree.length,
            pendingInstall: installPending,
          });
        } else if (
          !isEditMode &&
          !isRepeatMode &&
          initialNodeId &&
          (source === "tree" || source === "attention" || source === "search" || source === "node-context")
        ) {
          const path = getNodePathById(nextTree, initialNodeId) ?? [];
          const selectedInitialNode = getSelectedNodeFromPath(nextTree, path);
          if (selectedInitialNode && v) {
            nextForm = createInitialAddServiceEventFromNode({
              nodeId: selectedInitialNode.id,
              nodeCode: selectedInitialNode.code,
              nodeName: selectedInitialNode.name,
              vehicle: {
                odometer: v.odometer,
                engineHours: v.engineHours ?? null,
              },
              currentDateYmd: todayYmd,
            });
            nextForm.currency = defaultCurrency;
          } else {
            nextForm = createInitialAddServiceEventFormValues();
            nextForm.currency = defaultCurrency;
            nextForm.eventDate = todayYmd;
            nextForm.odometer = vehicleOdometer != null ? String(vehicleOdometer) : "";
            nextForm.engineHours = vehicleEngineHours != null ? String(vehicleEngineHours) : "";
          }
        } else {
          nextForm = createInitialAddServiceEventFormValues();
          nextForm.currency = defaultCurrency;
          if (!isEditMode && v) {
            nextForm.eventDate = todayYmd;
            nextForm.odometer = vehicleOdometer != null ? String(vehicleOdometer) : "";
            nextForm.engineHours = vehicleEngineHours != null ? String(vehicleEngineHours) : "";
          }
        }

        if (cancelled) {
          return;
        }
        setBundleInitial(nextForm);
        setBundleSessionKey((k) => k + 1);
        if (wishlistPrefillRequested) {
          clearPendingWishlistServiceEvent(vehicleId);
        }
      } catch (requestError) {
        if (!cancelled) {
          console.error("[service-events/new] load failed", requestError);
          const message =
            requestError instanceof Error
              ? requestError.message
              : "Не удалось загрузить данные для формы.";
          setError(message.trim() || "Не удалось загрузить данные для формы.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [
    vehicleId,
    initialNodeId,
    source,
    editingEventId,
    isEditMode,
    isRepeatMode,
    repeatFromId,
    wlTitle,
    wlQty,
    wlId,
    wishlistItemIdParam,
    wlComment,
    wlCostStr,
    wlCurrency,
    wishlistPrefillRequested,
    wishlistPendingInstall,
  ]);

  const handleSubmit = async (form: AddServiceEventFormValues) => {
    if (!vehicleId) {
      setError("Не удалось определить ID мотоцикла.");
      return;
    }

    const anchorNodeId = form.items[0]?.nodeId?.trim() ?? "";

    const endpoints = createMobileApiClient();
    const input = normalizeAddServiceEventPayload(form);
    let savedServiceEventId = editingEventId;

    try {
      setIsSaving(true);
      setError("");
      if (isEditMode) {
        const response = await withAuthGuard(
          () =>
            endpoints.updateServiceEvent(
              vehicleId,
              editingEventId,
              normalizeEditServiceEventPayload(form)
            ),
          () => router.replace("/login")
        );
        if (!response) {
          return;
        }
        savedServiceEventId = response.serviceEvent.id;
      } else {
        const response = await withAuthGuard(
          () => endpoints.createServiceEvent(vehicleId, input),
          () => router.replace("/login")
        );
        if (!response) {
          return;
        }
        savedServiceEventId = response.serviceEvent.id;
        const installItemId = wishlistInstallMeta?.itemId ?? wlId.trim();
        const shouldMarkWishlistInstalled =
          wishlistInstallMeta?.pendingInstall ?? wishlistPendingInstall;
        if (shouldMarkWishlistInstalled && installItemId) {
          const updated = await withAuthGuard(
            () =>
              endpoints.updateWishlistItem(vehicleId, installItemId, {
                status: "INSTALLED",
                nodeId: anchorNodeId,
              }),
            () => router.replace("/login")
          );
          if (!updated) {
            return;
          }
        }
      }
      const feedback = isEditMode ? "updated" : "created";
      if (source === "attention") {
        const q = new URLSearchParams({ returnFocus: "attention" });
        if (initialNodeId) q.set("attentionNodeId", initialNodeId);
        router.replace(`/vehicles/${vehicleId}?${q.toString()}`);
      } else if (source === "tree" || source === "search" || source === "node-context") {
        router.replace(`/vehicles/${vehicleId}`);
      } else if (source === "wishlist") {
        router.replace(
          wlId.trim()
            ? `/vehicles/${vehicleId}/wishlist?wishlistItemId=${encodeURIComponent(wlId.trim())}`
            : `/vehicles/${vehicleId}/wishlist`
        );
      } else {
        const q = new URLSearchParams({ feedback, refreshed: "1" });
        if (savedServiceEventId) {
          q.set("highlightServiceEventId", savedServiceEventId);
        }
        router.replace(`/vehicles/${vehicleId}/service-log?${q.toString()}`);
      }
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Не удалось сохранить сервисное событие.";
      const normalized = message.toLowerCase();
      if (
        normalized.includes("тариф") ||
        normalized.includes("rider") ||
        normalized.includes("подробн") ||
        normalized.includes("pro")
      ) {
        router.push("/subscription");
        return;
      }
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={c.textPrimary} />
          <Text style={styles.stateText}>Загрузка формы...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <InternalScreenChrome
        crumbs={headerCrumbs}
        title={
          isEditMode ? "Редактировать сервисное событие" : "Добавить сервисное событие"
        }
        declutterMobile
        scrollOffsetY={headerScrollY}
        belowNavRow={
          contextVehicleDetail ? (
            <GarageVehicleContextPlaque
              vehicle={contextVehicleDetail}
              currentVehicleId={vehicleId}
              compactByDefault
            />
          ) : null
        }
      />
      <KeyboardAwareScrollScreen
        contentContainerStyle={styles.content}
        scrollViewProps={{
          onScroll: (event) => setHeaderScrollY(event.nativeEvent.contentOffset.y),
          scrollEventThrottle: 16,
        }}
      >
        <BasicServiceEventBundleForm
          key={bundleSessionKey}
          vehicleId={vehicleId}
          apiBaseUrl={apiBaseUrl}
          nodeTree={nodeTree}
          vehicleOdometer={currentVehicleOdometer}
          vehicleEngineHours={currentVehicleEngineHours}
          todayDateYmd={getTodayDateYmdLocal()}
          initialForm={bundleInitial}
          isSubmitting={isSaving}
          submitError={error}
          onClearSubmitError={clearError}
          onSubmit={handleSubmit}
          isEditMode={isEditMode}
          contextHint={
            (wishlistInstallMeta?.pendingInstall ?? wishlistPendingInstall) &&
            (wishlistInstallMeta?.itemId ?? wlId.trim())
              ? "После сохранения позиция будет отмечена как установленная."
              : undefined
          }
          subscriptionCapabilities={subscriptionCapabilities}
        />
      </KeyboardAwareScrollScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: c.canvas,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  stateText: {
    marginTop: 12,
    fontSize: 14,
    color: c.textSecondary,
  },
});
