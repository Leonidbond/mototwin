import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import {
  createInitialEditServiceEventValues,
  createInitialAddServiceEventFromNode,
  createInitialAddServiceEventFormValues,
  createInitialAddServiceEventFromWishlistItem,
  getNodePathById,
  getNodeSelectLevels,
  getNodeShortExplanationLabel,
  getSelectedNodeFromPath,
  getTodayDateYmdLocal,
  isLeafNode,
  normalizeAddServiceEventPayload,
  normalizeEditServiceEventPayload,
  validateAddServiceEventFormValuesMobile,
} from "@mototwin/domain";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import type {
  AddServiceEventFormValues,
  NodeTreeItem,
  PartWishlistItem,
  SelectedNodePath,
} from "@mototwin/types";
import { getApiBaseUrl } from "../../../../src/api-base-url";
import { KeyboardAwareScrollScreen } from "../../../components/keyboard-aware-scroll-screen";

export default function NewServiceEventScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    nodeId?: string;
    eventId?: string;
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
  const [selectedPath, setSelectedPath] = useState<SelectedNodePath>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const [eventDate, setEventDate] = useState(() => getTodayDateYmdLocal());
  const [odometer, setOdometer] = useState("");
  const [engineHours, setEngineHours] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [costAmount, setCostAmount] = useState("");
  const [currency, setCurrency] = useState(
    () => createInitialAddServiceEventFormValues().currency
  );
  const [comment, setComment] = useState("");
  const [installedPartsJson, setInstalledPartsJson] = useState("");
  const [currentVehicleOdometer, setCurrentVehicleOdometer] = useState<number | null>(null);
  const isEditMode = editingEventId.length > 0;

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
        const client = createApiClient({ baseUrl: apiBaseUrl });
        const endpoints = createMotoTwinEndpoints(client);
        const [vehicleData, treeData, eventsData] = await Promise.all([
          endpoints.getVehicleDetail(vehicleId),
          endpoints.getNodeTree(vehicleId),
          isEditMode ? endpoints.getServiceEvents(vehicleId) : Promise.resolve(null),
        ]);
        const nextTree = treeData.nodeTree ?? [];
        setNodeTree(nextTree);
        let initialPath = initialNodeId ? getNodePathById(nextTree, initialNodeId) : null;
        if (isEditMode && eventsData) {
          const editableEvent = (eventsData.serviceEvents ?? []).find(
            (event) => event.id === editingEventId
          );
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
          initialPath = getNodePathById(nextTree, editableEvent.nodeId);
          const prefill = createInitialEditServiceEventValues(editableEvent);
          setServiceType(prefill.serviceType);
          setEventDate(prefill.eventDate);
          setOdometer(prefill.odometer);
          setEngineHours(prefill.engineHours);
          setCostAmount(prefill.costAmount);
          setCurrency(prefill.currency);
          setComment(prefill.comment);
          setInstalledPartsJson(prefill.installedPartsJson);
        } else if (initialNodeId) {
          initialPath = getNodePathById(nextTree, initialNodeId);
        }
        if (initialPath) {
          setSelectedPath(initialPath);
        }
        const vehicleOdometer = vehicleData.vehicle?.odometer;
        setCurrentVehicleOdometer(vehicleOdometer != null ? vehicleOdometer : null);
        if (!isEditMode) {
          setOdometer(vehicleOdometer != null ? String(vehicleOdometer) : "");
          setEngineHours(
            vehicleData.vehicle?.engineHours != null ? String(vehicleData.vehicle.engineHours) : ""
          );
        }

        const fromWishlist =
          !isEditMode && source === "wishlist" && wlTitle.length > 0 && vehicleData.vehicle;
        if (fromWishlist) {
          const v = vehicleData.vehicle!;
          const parsedWlCost =
            wlCostStr !== ""
              ? Number.parseFloat(wlCostStr.replace(",", "."))
              : Number.NaN;
          const wishlistCostAmount =
            wlCostStr !== "" && Number.isFinite(parsedWlCost) && parsedWlCost >= 0
              ? parsedWlCost
              : null;
          const wishlistCurrency =
            wishlistCostAmount != null ? wlCurrency || "RUB" : null;
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
          const prefill = createInitialAddServiceEventFromWishlistItem(
            synthetic,
            { odometer: v.odometer, engineHours: v.engineHours ?? null },
            { todayDateYmd: getTodayDateYmdLocal() }
          );
          setServiceType(prefill.serviceType);
          setEventDate(prefill.eventDate);
          setOdometer(prefill.odometer);
          setEngineHours(prefill.engineHours);
          setCostAmount(prefill.costAmount);
          setCurrency(prefill.currency);
          setComment(prefill.comment);
          setInstalledPartsJson(prefill.installedPartsJson);
        } else if (
          !isEditMode &&
          initialNodeId &&
          (source === "tree" || source === "attention" || source === "search" || source === "node-context")
        ) {
          const selectedInitialNode = getSelectedNodeFromPath(
            nextTree,
            getNodePathById(nextTree, initialNodeId) ?? []
          );
          if (selectedInitialNode && vehicleData.vehicle) {
            const prefill = createInitialAddServiceEventFromNode({
              nodeId: selectedInitialNode.id,
              nodeCode: selectedInitialNode.code,
              nodeName: selectedInitialNode.name,
              vehicle: {
                odometer: vehicleData.vehicle.odometer,
                engineHours: vehicleData.vehicle.engineHours ?? null,
              },
              currentDateYmd: getTodayDateYmdLocal(),
            });
            setServiceType(prefill.serviceType);
            setEventDate(prefill.eventDate);
            setOdometer(prefill.odometer);
            setEngineHours(prefill.engineHours);
            setCostAmount(prefill.costAmount);
            setCurrency(prefill.currency);
            setComment(prefill.comment);
            setInstalledPartsJson(prefill.installedPartsJson);
          } else {
            setInstalledPartsJson("");
          }
        } else {
          setInstalledPartsJson("");
        }
      } catch (requestError) {
        console.error(requestError);
        setError("Не удалось загрузить данные для формы.");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [
    apiBaseUrl,
    vehicleId,
    initialNodeId,
    source,
    editingEventId,
    isEditMode,
    wlTitle,
    wlQty,
    wlId,
    wlComment,
    wlCostStr,
    wlCurrency,
  ]);

  const levels = getNodeSelectLevels(nodeTree, selectedPath);
  const selectedNode = getSelectedNodeFromPath(nodeTree, selectedPath);
  const isLeafSelected = Boolean(selectedNode && isLeafNode(selectedNode));

  async function save() {
    if (!vehicleId) {
      setError("Не удалось определить ID мотоцикла.");
      return;
    }

    if (!selectedNode || !isLeafNode(selectedNode)) {
      setError("Выберите конечный (leaf) узел.");
      return;
    }

    const serviceFormValues: AddServiceEventFormValues = {
      nodeId: selectedNode.id,
      eventDate,
      serviceType,
      odometer,
      engineHours,
      costAmount,
      currency,
      comment,
      installedPartsJson,
    };

    const validation = validateAddServiceEventFormValuesMobile(serviceFormValues, {
      todayDateYmd: getTodayDateYmdLocal(),
      currentVehicleOdometer,
      isLeafNode: selectedNode ? isLeafSelected : undefined,
    });
    if (validation.errors.length > 0) {
      setError(validation.errors[0]);
      return;
    }

    const input = normalizeAddServiceEventPayload(serviceFormValues);

    try {
      setIsSaving(true);
      setError("");
      const client = createApiClient({ baseUrl: apiBaseUrl });
      const endpoints = createMotoTwinEndpoints(client);
      if (isEditMode) {
        await endpoints.updateServiceEvent(
          vehicleId,
          editingEventId,
          normalizeEditServiceEventPayload(serviceFormValues)
        );
      } else {
        await endpoints.createServiceEvent(vehicleId, input);
      }
      const feedback = isEditMode ? "updated" : "created";
      if (source === "tree" || source === "attention" || source === "search" || source === "node-context") {
        router.replace(`/vehicles/${vehicleId}`);
      } else if (source === "wishlist") {
        router.replace(`/vehicles/${vehicleId}/wishlist`);
      } else {
        router.replace(`/vehicles/${vehicleId}/service-log?feedback=${feedback}&refreshed=1`);
      }
    } catch (requestError) {
      console.error(requestError);
      setError("Не удалось сохранить сервисное событие.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={c.textPrimary} />
          <Text style={styles.stateText}>Загрузка формы...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAwareScrollScreen contentContainerStyle={styles.content}>
        <Text style={styles.screenTitle}>
          {isEditMode ? "Редактировать сервисное событие" : "Добавить сервисное событие"}
        </Text>
        <Text style={styles.sectionTitle}>Узел обслуживания</Text>
        {levels.map((levelNodes, levelIndex) => (
          <View key={`level-${levelIndex}`} style={styles.levelBlock}>
            <Text style={styles.levelTitle}>Уровень {levelIndex + 1}</Text>
            <View style={styles.optionWrap}>
              {levelNodes.map((node) => {
                const active = selectedPath[levelIndex] === node.id;
                return (
                  <Pressable
                    key={node.id}
                    style={[styles.optionChip, active && styles.optionChipActive]}
                    onPress={() => {
                      const nextPath = [...selectedPath.slice(0, levelIndex), node.id];
                      setSelectedPath(nextPath);
                    }}
                  >
                    <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>
                      {node.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        <View style={styles.selectedNodeCard}>
          <Text style={styles.selectedNodeLabel}>Выбранный узел</Text>
          <Text style={styles.selectedNodeValue}>
            {selectedNode ? selectedNode.name : "Не выбран"}
          </Text>
          <Text style={styles.selectedNodeHint}>
            {selectedNode
              ? !isLeafNode(selectedNode)
                ? "Выберите конечный дочерний узел"
                : getNodeShortExplanationLabel(selectedNode) || "Готово к созданию события"
              : "Выберите узел по уровням"}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Данные события</Text>
        <Field label="Дата (YYYY-MM-DD)">
          <TextInput
            value={eventDate}
            onChangeText={setEventDate}
            style={styles.input}
            autoCapitalize="none"
            placeholder="2026-04-17"
          />
        </Field>
        <Field label="Пробег, км">
          <TextInput
            value={odometer}
            onChangeText={setOdometer}
            style={styles.input}
            keyboardType="number-pad"
            placeholder="15000"
          />
        </Field>
        <Field label="Моточасы">
          <TextInput
            value={engineHours}
            onChangeText={setEngineHours}
            style={styles.input}
            keyboardType="number-pad"
            placeholder="Опционально"
          />
        </Field>
        <Field label="Тип обслуживания">
          <TextInput
            value={serviceType}
            onChangeText={setServiceType}
            style={styles.input}
            placeholder="Замена масла"
          />
        </Field>
        <View style={styles.row}>
          <View style={styles.rowField}>
            <Field label="Стоимость">
              <TextInput
                value={costAmount}
                onChangeText={setCostAmount}
                style={styles.input}
                keyboardType="decimal-pad"
                placeholder="Опционально"
              />
            </Field>
          </View>
          <View style={styles.currencyField}>
            <Field label="Валюта">
              <TextInput
                value={currency}
                onChangeText={setCurrency}
                style={styles.input}
                autoCapitalize="characters"
                placeholder="RUB"
              />
            </Field>
          </View>
        </View>
        <Field label="Комментарий">
          <TextInput
            value={comment}
            onChangeText={setComment}
            style={[styles.input, styles.multilineInput]}
            placeholder="Опционально"
            multiline
          />
        </Field>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          onPress={save}
          disabled={isSaving || !isLeafSelected}
          style={({ pressed }) => [
            styles.saveButton,
            (!isLeafSelected || isSaving) && styles.saveButtonDisabled,
            pressed && isLeafSelected && !isSaving && styles.saveButtonPressed,
          ]}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={c.textInverse} />
          ) : (
            <Text style={styles.saveButtonText}>
              {isEditMode ? "Сохранить изменения" : "Сохранить событие"}
            </Text>
          )}
        </Pressable>
      </KeyboardAwareScrollScreen>
    </SafeAreaView>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
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
    paddingBottom: 40,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: c.textMeta,
    marginBottom: 8,
    marginTop: 8,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: c.textPrimary,
    marginBottom: 6,
  },
  levelBlock: {
    marginBottom: 8,
  },
  levelTitle: {
    fontSize: 12,
    color: c.textMuted,
    marginBottom: 6,
  },
  optionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionChip: {
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.card,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  optionChipActive: {
    borderColor: c.primaryAction,
    backgroundColor: c.primaryAction,
  },
  optionChipText: {
    fontSize: 13,
    color: c.textMeta,
  },
  optionChipTextActive: {
    color: c.textInverse,
    fontWeight: "600",
  },
  selectedNodeCard: {
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: c.card,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  selectedNodeLabel: {
    fontSize: 12,
    color: c.textMuted,
  },
  selectedNodeValue: {
    fontSize: 15,
    fontWeight: "700",
    color: c.textPrimary,
    marginTop: 4,
  },
  selectedNodeHint: {
    fontSize: 12,
    color: c.textMuted,
    marginTop: 4,
  },
  field: {
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    color: c.textMuted,
    marginBottom: 6,
  },
  input: {
    backgroundColor: c.card,
    borderColor: c.borderStrong,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: c.textPrimary,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  rowField: {
    flex: 1,
  },
  currencyField: {
    width: 96,
  },
  errorText: {
    marginTop: 4,
    marginBottom: 8,
    color: c.error,
    fontSize: 13,
  },
  saveButton: {
    marginTop: 6,
    backgroundColor: c.primaryAction,
    borderRadius: 12,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonDisabled: {
    opacity: 0.45,
  },
  saveButtonPressed: {
    opacity: 0.9,
  },
  saveButtonText: {
    color: c.textInverse,
    fontSize: 14,
    fontWeight: "700",
  },
});
