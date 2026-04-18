import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
  PART_WISHLIST_STATUS_ORDER,
  createInitialPartWishlistFormValues,
  flattenNodeTreeToSelectOptions,
  normalizeCreatePartWishlistPayload,
  normalizeUpdatePartWishlistPayload,
  partWishlistFormValuesFromItem,
  partWishlistStatusLabelsRu,
  validatePartWishlistFormValues,
  isWishlistTransitionToInstalled,
  WISHLIST_INSTALLED_NO_NODE_SERVICE_HINT,
} from "@mototwin/domain";
import type {
  FlattenedNodeSelectOption,
  PartWishlistFormValues,
  PartWishlistItemStatus,
} from "@mototwin/types";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import { getApiBaseUrl } from "../../../../src/api-base-url";
import { buildServiceEventNewFromWishlistHref } from "./hrefs";

type WishlistItemEditorProps = {
  mode: "create" | "edit";
  vehicleId: string;
  itemId?: string;
  presetNodeId?: string;
};

function findOptionById(
  options: FlattenedNodeSelectOption[],
  nodeId: string
): FlattenedNodeSelectOption | undefined {
  return options.find((o) => o.id === nodeId);
}

export function WishlistItemEditor({
  mode,
  vehicleId,
  itemId,
  presetNodeId,
}: WishlistItemEditorProps) {
  const router = useRouter();
  const apiBaseUrl = getApiBaseUrl();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [nodeTreeOptions, setNodeTreeOptions] = useState<FlattenedNodeSelectOption[]>([]);
  const [form, setForm] = useState<PartWishlistFormValues>(() =>
    createInitialPartWishlistFormValues({ nodeId: presetNodeId })
  );
  const [nodePickerOpen, setNodePickerOpen] = useState(false);
  const statusWhenLoadedRef = useRef<PartWishlistItemStatus | null>(null);

  const selectedNodeLabel = useMemo(() => {
    const raw = form.nodeId.trim();
    if (!raw) {
      return "Не привязано";
    }
    const opt = findOptionById(nodeTreeOptions, raw);
    return opt?.name ?? raw;
  }, [form.nodeId, nodeTreeOptions]);

  const load = useCallback(async () => {
    if (!vehicleId) {
      setLoadError("Не удалось определить ID мотоцикла.");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setLoadError("");
      const client = createApiClient({ baseUrl: apiBaseUrl });
      const endpoints = createMotoTwinEndpoints(client);

      if (mode === "create") {
        const tree = await endpoints.getNodeTree(vehicleId);
        const nodes = tree.nodeTree ?? [];
        setNodeTreeOptions(flattenNodeTreeToSelectOptions(nodes));
        const initial = createInitialPartWishlistFormValues({ nodeId: presetNodeId });
        setForm(initial);
        statusWhenLoadedRef.current = initial.status;
      } else {
        const itemIdSafe = itemId?.trim();
        if (!itemIdSafe) {
          setLoadError("Не указана позиция списка.");
          setIsLoading(false);
          return;
        }
        const [tree, wishlist] = await Promise.all([
          endpoints.getNodeTree(vehicleId),
          endpoints.getVehicleWishlist(vehicleId),
        ]);
        const nodes = tree.nodeTree ?? [];
        setNodeTreeOptions(flattenNodeTreeToSelectOptions(nodes));
        const row = wishlist.items.find((i) => i.id === itemIdSafe);
        if (!row) {
          setLoadError("Позиция не найдена.");
        } else {
          setForm(partWishlistFormValuesFromItem(row));
          statusWhenLoadedRef.current = row.status;
        }
      }
    } catch (e) {
      console.error(e);
      setLoadError("Не удалось загрузить данные.");
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl, vehicleId, mode, itemId, presetNodeId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!vehicleId) {
      setSaveError("Не удалось определить ID мотоцикла.");
      return;
    }

    const validation = validatePartWishlistFormValues(form);
    if (validation.errors.length > 0) {
      setSaveError(validation.errors[0]);
      return;
    }

    try {
      setIsSaving(true);
      setSaveError("");
      const client = createApiClient({ baseUrl: apiBaseUrl });
      const endpoints = createMotoTwinEndpoints(client);

      const prevStatus = statusWhenLoadedRef.current ?? "NEEDED";

      if (mode === "create") {
        const input = normalizeCreatePartWishlistPayload(form);
        const res = await endpoints.createWishlistItem(vehicleId, input);
        if (isWishlistTransitionToInstalled(prevStatus, res.item.status)) {
          if (res.item.nodeId) {
            router.replace(buildServiceEventNewFromWishlistHref(vehicleId, res.item));
          } else {
            Alert.alert("Список покупок", WISHLIST_INSTALLED_NO_NODE_SERVICE_HINT);
            router.replace(`/vehicles/${vehicleId}/wishlist`);
          }
        } else {
          router.replace(`/vehicles/${vehicleId}/wishlist`);
        }
      } else {
        const itemIdSafe = itemId?.trim();
        if (!itemIdSafe) {
          setSaveError("Не указана позиция списка.");
          return;
        }
        const input = normalizeUpdatePartWishlistPayload(form);
        const res = await endpoints.updateWishlistItem(vehicleId, itemIdSafe, input);
        if (isWishlistTransitionToInstalled(prevStatus, res.item.status)) {
          if (res.item.nodeId) {
            router.replace(buildServiceEventNewFromWishlistHref(vehicleId, res.item));
          } else {
            Alert.alert("Список покупок", WISHLIST_INSTALLED_NO_NODE_SERVICE_HINT);
            router.replace(`/vehicles/${vehicleId}/wishlist`);
          }
        } else {
          router.replace(`/vehicles/${vehicleId}/wishlist`);
        }
      }
    } catch (e) {
      console.error(e);
      const message =
        e instanceof Error ? e.message : "Не удалось сохранить. Попробуйте ещё раз.";
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  }

  if (!vehicleId) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorText}>Не удалось определить ID мотоцикла.</Text>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={c.textPrimary} />
        <Text style={styles.muted}>Загрузка…</Text>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorText}>{loadError}</Text>
        <Pressable
          onPress={() => void load()}
          style={({ pressed }) => [styles.retryBtn, pressed && styles.retryPressed]}
        >
          <Text style={styles.retryText}>Повторить</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Text style={styles.label}>Название</Text>
          <TextInput
            value={form.title}
            onChangeText={(title) => setForm((f) => ({ ...f, title }))}
            placeholder="Масло, фильтр, прокладка…"
            placeholderTextColor={c.textMuted}
            style={styles.input}
          />

          <Text style={styles.label}>Количество</Text>
          <TextInput
            value={form.quantity}
            onChangeText={(quantity) => setForm((f) => ({ ...f, quantity }))}
            placeholder="1"
            placeholderTextColor={c.textMuted}
            keyboardType="number-pad"
            style={styles.input}
          />

          <Text style={styles.label}>Статус</Text>
          <View style={styles.statusRow}>
            {PART_WISHLIST_STATUS_ORDER.map((status) => {
              const active = form.status === status;
              return (
                <Pressable
                  key={status}
                  onPress={() => setForm((f) => ({ ...f, status }))}
                  style={({ pressed }) => [
                    styles.statusChip,
                    active && styles.statusChipActive,
                    pressed && styles.statusChipPressed,
                  ]}
                >
                  <Text
                    style={[styles.statusChipText, active && styles.statusChipTextActive]}
                    numberOfLines={2}
                  >
                    {partWishlistStatusLabelsRu[status]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Узел (необязательно)</Text>
          <Pressable
            onPress={() => setNodePickerOpen(true)}
            style={({ pressed }) => [styles.nodePickBtn, pressed && styles.nodePickBtnPressed]}
          >
            <Text style={styles.nodePickBtnText}>{selectedNodeLabel}</Text>
            <Text style={styles.nodePickChevron}>▾</Text>
          </Pressable>

          <Text style={styles.label}>Комментарий</Text>
          <TextInput
            value={form.comment}
            onChangeText={(comment) => setForm((f) => ({ ...f, comment }))}
            placeholder="Артикул, магазин, ссылка…"
            placeholderTextColor={c.textMuted}
            style={[styles.input, styles.inputMultiline]}
            multiline
          />

          {saveError ? <Text style={styles.inlineError}>{saveError}</Text> : null}

          <Pressable
            onPress={() => void save()}
            disabled={isSaving}
            style={({ pressed }) => [
              styles.saveBtn,
              pressed && !isSaving && styles.saveBtnPressed,
              isSaving && styles.saveBtnDisabled,
            ]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={c.textInverse} />
            ) : (
              <Text style={styles.saveBtnText}>{mode === "create" ? "Добавить" : "Сохранить"}</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={nodePickerOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setNodePickerOpen(false)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Выберите узел</Text>
            <Pressable
              onPress={() => setNodePickerOpen(false)}
              hitSlop={10}
              style={({ pressed }) => pressed && styles.modalClosePressed}
            >
              <Text style={styles.modalClose}>Готово</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <Pressable
              onPress={() => {
                setForm((f) => ({ ...f, nodeId: "" }));
                setNodePickerOpen(false);
              }}
              style={({ pressed }) => [styles.modalRow, pressed && styles.modalRowPressed]}
            >
              <Text style={styles.modalRowTextMuted}>Не привязано</Text>
            </Pressable>
            {nodeTreeOptions.map((opt) => (
              <Pressable
                key={opt.id}
                onPress={() => {
                  setForm((f) => ({ ...f, nodeId: opt.id }));
                  setNodePickerOpen(false);
                }}
                style={({ pressed }) => [styles.modalRow, pressed && styles.modalRowPressed]}
              >
                <Text
                  style={[styles.modalRowText, { paddingLeft: 8 + opt.level * 12 }]}
                  numberOfLines={2}
                >
                  {opt.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.canvas },
  keyboardAvoiding: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 120 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: c.canvas,
  },
  muted: { marginTop: 10, fontSize: 14, color: c.textMuted },
  errorText: { color: c.error, fontSize: 14, textAlign: "center" },
  inlineError: { marginTop: 12, color: c.error, fontSize: 14 },
  retryBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.borderStrong,
  },
  retryPressed: { opacity: 0.88 },
  retryText: { fontSize: 14, fontWeight: "600", color: c.textPrimary },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: c.textMuted,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: c.textPrimary,
    backgroundColor: c.card,
  },
  inputMultiline: { minHeight: 88, textAlignVertical: "top" },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusChip: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
    maxWidth: "48%",
  },
  statusChipActive: {
    borderColor: c.indigoSoftBorder,
    backgroundColor: c.indigoSoftBg,
  },
  statusChipPressed: { opacity: 0.9 },
  statusChipText: { fontSize: 12, fontWeight: "600", color: c.textSecondary },
  statusChipTextActive: { color: c.textPrimary },
  nodePickBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: c.card,
  },
  nodePickBtnPressed: { opacity: 0.92 },
  nodePickBtnText: { fontSize: 15, color: c.textPrimary, flex: 1, marginRight: 8 },
  nodePickChevron: { fontSize: 14, color: c.textMuted },
  saveBtn: {
    marginTop: 24,
    backgroundColor: c.primaryAction,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnPressed: { opacity: 0.92 },
  saveBtnDisabled: { opacity: 0.65 },
  saveBtnText: { fontSize: 16, fontWeight: "700", color: c.textInverse },
  modalSafe: { flex: 1, backgroundColor: c.canvas },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: c.textPrimary },
  modalClose: { fontSize: 16, fontWeight: "600", color: c.primaryAction },
  modalClosePressed: { opacity: 0.8 },
  modalScroll: { paddingBottom: 32 },
  modalRow: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.divider,
  },
  modalRowPressed: { backgroundColor: c.divider },
  modalRowText: { fontSize: 15, color: c.textPrimary },
  modalRowTextMuted: { fontSize: 15, color: c.textMuted },
});
