import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import {
  findNodePathById,
  getNodeSelectLevels,
  getSelectedNodeFromPath,
  getLeafStatusReasonShort,
} from "@mototwin/domain";
import type { CreateServiceEventInput, NodeTreeItem, SelectedNodePath } from "@mototwin/types";
import { getApiBaseUrl } from "../../../../src/api-base-url";

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default function NewServiceEventScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; nodeId?: string; source?: string }>();
  const vehicleId = typeof params.id === "string" ? params.id : "";
  const initialNodeId = typeof params.nodeId === "string" ? params.nodeId : "";
  const source = typeof params.source === "string" ? params.source : "service-log";
  const apiBaseUrl = getApiBaseUrl();

  const [nodeTree, setNodeTree] = useState<NodeTreeItem[]>([]);
  const [selectedPath, setSelectedPath] = useState<SelectedNodePath>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const [eventDate, setEventDate] = useState(toDateInputValue(new Date()));
  const [odometer, setOdometer] = useState("");
  const [engineHours, setEngineHours] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [costAmount, setCostAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [comment, setComment] = useState("");

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
        const [vehicleData, treeData] = await Promise.all([
          endpoints.getVehicleDetail(vehicleId),
          endpoints.getVehicleNodeTree(vehicleId),
        ]);
        const nextTree = treeData.nodeTree ?? [];
        setNodeTree(nextTree);
        if (initialNodeId) {
          const initialPath = findNodePathById(nextTree, initialNodeId);
          if (initialPath) {
            setSelectedPath(initialPath);
          }
        }
        setOdometer(
          vehicleData.vehicle?.odometer != null ? String(vehicleData.vehicle.odometer) : ""
        );
        setEngineHours(
          vehicleData.vehicle?.engineHours != null ? String(vehicleData.vehicle.engineHours) : ""
        );
      } catch (requestError) {
        console.error(requestError);
        setError("Не удалось загрузить данные для формы.");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [apiBaseUrl, vehicleId, initialNodeId]);

  const levels = getNodeSelectLevels(nodeTree, selectedPath);
  const selectedNode = getSelectedNodeFromPath(nodeTree, selectedPath);
  const isLeafSelected = Boolean(selectedNode && selectedNode.children.length === 0);

  async function save() {
    if (!vehicleId) {
      setError("Не удалось определить ID мотоцикла.");
      return;
    }

    if (!selectedNode || selectedNode.children.length > 0) {
      setError("Выберите конечный (leaf) узел.");
      return;
    }

    const parsedOdometer = Number.parseInt(odometer, 10);
    if (Number.isNaN(parsedOdometer) || parsedOdometer < 0) {
      setError("Введите корректный пробег.");
      return;
    }

    const parsedEngineHours = engineHours.trim() === "" ? null : Number.parseInt(engineHours, 10);
    if (
      parsedEngineHours !== null &&
      (Number.isNaN(parsedEngineHours) || parsedEngineHours < 0)
    ) {
      setError("Введите корректные моточасы.");
      return;
    }

    if (!serviceType.trim()) {
      setError("Укажите тип обслуживания.");
      return;
    }

    const parsedCostAmount =
      costAmount.trim() === "" ? null : Number.parseFloat(costAmount.replace(",", "."));
    if (parsedCostAmount !== null && (Number.isNaN(parsedCostAmount) || parsedCostAmount < 0)) {
      setError("Введите корректную стоимость.");
      return;
    }

    const parsedEventDate = new Date(eventDate);
    if (Number.isNaN(parsedEventDate.getTime())) {
      setError("Введите корректную дату в формате YYYY-MM-DD.");
      return;
    }

    const input: CreateServiceEventInput = {
      nodeId: selectedNode.id,
      eventDate: parsedEventDate.toISOString(),
      odometer: parsedOdometer,
      engineHours: parsedEngineHours,
      serviceType: serviceType.trim(),
      costAmount: parsedCostAmount,
      currency: parsedCostAmount !== null ? currency.trim().toUpperCase() || null : null,
      comment: comment.trim() || null,
    };

    try {
      setIsSaving(true);
      setError("");
      const client = createApiClient({ baseUrl: apiBaseUrl });
      const endpoints = createMotoTwinEndpoints(client);
      await endpoints.createVehicleServiceEvent(vehicleId, input);
      if (source === "tree") {
        router.replace(`/vehicles/${vehicleId}`);
      } else {
        router.replace(`/vehicles/${vehicleId}/service-log`);
      }
    } catch (requestError) {
      console.error(requestError);
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Не удалось создать сервисное событие.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color="#111827" />
          <Text style={styles.stateText}>Загрузка формы...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
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
              ? selectedNode.children.length > 0
                ? "Выберите конечный дочерний узел"
                : getLeafStatusReasonShort(selectedNode) || "Готово к созданию события"
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
                placeholder="USD"
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
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Сохранить событие</Text>
          )}
        </Pressable>
      </ScrollView>
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
    backgroundColor: "#F7F7F7",
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
    color: "#4B5563",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
    marginTop: 8,
  },
  levelBlock: {
    marginBottom: 8,
  },
  levelTitle: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 6,
  },
  optionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionChip: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  optionChipActive: {
    borderColor: "#111827",
    backgroundColor: "#111827",
  },
  optionChipText: {
    fontSize: 13,
    color: "#374151",
  },
  optionChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  selectedNodeCard: {
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  selectedNodeLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  selectedNodeValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginTop: 4,
  },
  selectedNodeHint: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  field: {
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "#D1D5DB",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
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
    color: "#B91C1C",
    fontSize: 13,
  },
  saveButton: {
    marginTop: 6,
    backgroundColor: "#111827",
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
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
