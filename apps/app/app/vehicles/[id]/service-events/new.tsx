import { useCallback, useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import {
  createInitialAddServiceEventFormValues,
  createInitialAddServiceEventFromNode,
  createInitialAddServiceEventFromWishlistItem,
  createInitialEditServiceEventValues,
  createInitialRepeatServiceEventValues,
  getDefaultCurrencyFromSettings,
  getNodePathById,
  getSelectedNodeFromPath,
  getTodayDateYmdLocal,
  normalizeAddServiceEventPayload,
  normalizeEditServiceEventPayload,
  parseExpenseAmountInputToNumberOrNull,
} from "@mototwin/domain";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import type { AddServiceEventFormValues, NodeTreeItem, PartWishlistItem } from "@mototwin/types";
import { getApiBaseUrl } from "../../../../src/api-base-url";
import { KeyboardAwareScrollScreen } from "../../../components/keyboard-aware-scroll-screen";
import { ScreenHeader } from "../../../components/screen-header";
import { readUserLocalSettings } from "../../../../src/ui-user-local-settings";
import { BasicServiceEventBundleForm } from "../_components/basic-service-event-bundle-form";

export default function NewServiceEventScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    nodeId?: string;
    eventId?: string;
    repeatFrom?: string;
    source?: string;
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
  const wlId = typeof params.wlId === "string" ? params.wlId : "";
  const wlComment =
    typeof params.wlComment === "string" && params.wlComment.trim()
      ? params.wlComment.trim()
      : null;
  const wlCostStr = typeof params.wlCost === "string" ? params.wlCost.trim() : "";
  const wlCurrency =
    typeof params.wlCurrency === "string" && params.wlCurrency.trim()
      ? params.wlCurrency.trim()
      : null;
  const apiBaseUrl = getApiBaseUrl();

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

  const isEditMode = editingEventId.length > 0;
  const isRepeatMode = !isEditMode && repeatFromId.length > 0;

  const clearError = useCallback(() => setError(""), []);

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
        const localSettings = await readUserLocalSettings();
        const defaultCurrency = getDefaultCurrencyFromSettings(localSettings);
        const client = createApiClient({ baseUrl: apiBaseUrl });
        const endpoints = createMotoTwinEndpoints(client);
        const needsServiceEventsForForm = isEditMode || isRepeatMode;
        const [vehicleData, treeData, eventsData] = await Promise.all([
          endpoints.getVehicleDetail(vehicleId),
          endpoints.getNodeTree(vehicleId),
          needsServiceEventsForForm ? endpoints.getServiceEvents(vehicleId) : Promise.resolve(null),
        ]);
        const nextTree = treeData.nodeTree ?? [];
        setNodeTree(nextTree);

        const v = vehicleData.vehicle;
        const vehicleOdometer = v?.odometer ?? null;
        const vehicleEngineHours = v?.engineHours ?? null;
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
            { todayDateYmd: getTodayDateYmdLocal() }
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
            { todayDateYmd: getTodayDateYmdLocal() }
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
              currentDateYmd: getTodayDateYmdLocal(),
            });
            nextForm.currency = defaultCurrency;
          } else {
            nextForm = createInitialAddServiceEventFormValues();
            nextForm.currency = defaultCurrency;
            nextForm.odometer = vehicleOdometer != null ? String(vehicleOdometer) : "";
            nextForm.engineHours = vehicleEngineHours != null ? String(vehicleEngineHours) : "";
          }
        } else {
          nextForm = createInitialAddServiceEventFormValues();
          nextForm.currency = defaultCurrency;
          if (!isEditMode && v) {
            nextForm.odometer = vehicleOdometer != null ? String(vehicleOdometer) : "";
            nextForm.engineHours = vehicleEngineHours != null ? String(vehicleEngineHours) : "";
          }
        }

        setBundleInitial(nextForm);
        setBundleSessionKey((k) => k + 1);
      } catch (requestError) {
        console.error(requestError);
        setError("Не удалось загрузить данные для формы.");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [
    apiBaseUrl,
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

    const client = createApiClient({ baseUrl: apiBaseUrl });
    const endpoints = createMotoTwinEndpoints(client);
    const input = normalizeAddServiceEventPayload(form);

    try {
      setIsSaving(true);
      setError("");
      if (isEditMode) {
        await endpoints.updateServiceEvent(
          vehicleId,
          editingEventId,
          normalizeEditServiceEventPayload(form)
        );
      } else {
        await endpoints.createServiceEvent(vehicleId, input);
        if (source === "wishlist" && wlId.trim()) {
          await endpoints.updateWishlistItem(vehicleId, wlId.trim(), {
            status: "INSTALLED",
            nodeId: anchorNodeId,
          });
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
        router.replace(`/vehicles/${vehicleId}/service-log?feedback=${feedback}&refreshed=1`);
      }
    } catch (requestError) {
      console.error(requestError);
      setError("Не удалось сохранить сервисное событие.");
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
      <ScreenHeader title={isEditMode ? "Редактировать обслуживание" : "Новое обслуживание"} />
      <KeyboardAwareScrollScreen contentContainerStyle={styles.content}>
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
