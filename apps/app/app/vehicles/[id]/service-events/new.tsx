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
import { useMobileSubscription } from "../../../../src/use-mobile-subscription";
import { KeyboardAwareScrollScreen } from "../../../../components/expo-shell/keyboard-aware-scroll-screen";
import {
  InternalScreenChrome,
  type InternalScreenCrumb,
} from "../../../../components/expo-shell/internal-screen-chrome";
import { BasicServiceEventBundleForm } from "../../../../components/vehicle-detail/basic-service-event-bundle-form";
import { GarageVehicleContextPlaque } from "../../../../components/garage/GarageVehicleContextPlaque";

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
  const vehicleId = typeof params.id === "string" ? params.id : "";
  const initialNodeId = typeof params.nodeId === "string" ? params.nodeId : "";
  const editingEventId = typeof params.eventId === "string" ? params.eventId : "";
  const repeatFromId = typeof params.repeatFrom === "string" ? params.repeatFrom.trim() : "";
  const source = typeof params.source === "string" ? params.source : "service-log";
  const wlTitle = typeof params.wlTitle === "string" ? params.wlTitle.trim() : "";
  const wlQty = typeof params.wlQty === "string" ? params.wlQty : "";
  const wlIdFromQuery = typeof params.wlId === "string" ? params.wlId : "";
  const wishlistItemIdParam =
    typeof params.wishlistItemId === "string" ? params.wishlistItemId : "";
  const wlId = wishlistItemIdParam || wlIdFromQuery;
  const wlComment =
    typeof params.wlComment === "string" && params.wlComment.trim()
      ? params.wlComment.trim()
      : null;
  const wlCostStr = typeof params.wlCost === "string" ? params.wlCost.trim() : "";
  const wlCurrency =
    typeof params.wlCurrency === "string" && params.wlCurrency.trim()
      ? params.wlCurrency.trim()
      : null;
  const pendingInstallRaw = typeof params.pendingInstall === "string" ? params.pendingInstall : "";
  const wishlistPendingInstall =
    pendingInstallRaw === "1" || pendingInstallRaw.toLowerCase() === "true";
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

  const isEditMode = editingEventId.length > 0;
  const isRepeatMode = !isEditMode && repeatFromId.length > 0;

  const clearError = useCallback(() => setError(""), []);

  const headerCrumbs = useMemo((): InternalScreenCrumb[] => {
    const bike = vehicleDisplayName || "Мотоцикл";
    const crumbs: InternalScreenCrumb[] = [
      { label: "Мой гараж", href: "/" },
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
    const load = async () => {
      if (!vehicleId) {
        setError("Не удалось определить ID мотоцикла.");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError("");
        setContextVehicleDetail(null);
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
        if (!payload) {
          return;
        }
        const [vehicleData, treeData, eventsData] = payload;
        const nextTree = treeData.nodeTree ?? [];
        setNodeTree(nextTree);

        const v = vehicleData.vehicle;
        setVehicleDisplayName(
          v?.nickname?.trim() || (v ? `${v.brandName} ${v.modelFamilyName}`.trim() : "") || "Мотоцикл"
        );
        const rawV = v as VehicleDetailApiRecord | null | undefined;
        setContextVehicleDetail(rawV ? vehicleDetailFromApiRecord(rawV) : null);
        const vehicleOdometer = v?.odometer ?? null;
        const vehicleEngineHours = v?.engineHours ?? null;
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
        } else if (!isEditMode && !isRepeatMode && source === "wishlist" && wlId.trim() && v) {
          const wish = await endpoints.getVehicleWishlist(vehicleId);
          const item = (wish.items ?? []).find((w) => w.id === wlId.trim());
          if (!item?.nodeId) {
            setError("Позиция корзины не найдена или без узла.");
            setIsLoading(false);
            return;
          }
          nextForm = createInitialAddServiceEventFromWishlistItem(
            item,
            { odometer: v.odometer, engineHours: v.engineHours ?? null },
            { todayDateYmd: todayYmd }
          );
        } else if (
          !isEditMode &&
          !isRepeatMode &&
          source === "wishlist" &&
          wlTitle.length > 0 &&
          v
        ) {
          const parsedWlCost =
            wlCostStr !== "" ? parseExpenseAmountInputToNumberOrNull(wlCostStr) : null;
          const wishlistCostAmount =
            wlCostStr !== "" && parsedWlCost != null ? parsedWlCost : null;
          const wishlistCurrency = wishlistCostAmount != null ? wlCurrency || "RUB" : null;
          const synthetic: PartWishlistItem = {
            id: wlId,
            vehicleId,
            skuId: null,
            nodeId: initialNodeId || null,
            title: wlTitle,
            quantity: wlQty ? Number.parseInt(wlQty, 10) || 1 : 1,
            status: "INSTALLED",
            comment: wlComment,
            costAmount: wishlistCostAmount,
            currency: wishlistCurrency,
            createdAt: "",
            updatedAt: "",
            node: null,
            sku: null,
          };
          nextForm = createInitialAddServiceEventFromWishlistItem(
            synthetic,
            { odometer: v.odometer, engineHours: v.engineHours ?? null },
            { todayDateYmd: todayYmd }
          );
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

        setBundleInitial(nextForm);
        setBundleSessionKey((k) => k + 1);
      } catch (requestError) {
        setError("Не удалось загрузить данные для формы.");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
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
        if (wishlistPendingInstall && wlId.trim()) {
          const updated = await withAuthGuard(
            () =>
              endpoints.updateWishlistItem(vehicleId, wlId.trim(), {
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
            wishlistPendingInstall && wlId.trim()
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
