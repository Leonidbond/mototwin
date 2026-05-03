import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import {
  PART_WISHLIST_STATUS_ORDER,
  applyPartSkuViewModelToPartWishlistFormValues,
  clearPartWishlistFormSkuSelection,
  createInitialPartWishlistFormValues,
  flattenNodeTreeToSelectOptions,
  buildPartRecommendationGroupsForDisplay,
  formatExpenseAmountRu,
  formatPartSkuSearchResultMetaLineRu,
  getPartRecommendationGroupTitle,
  getPartRecommendationWarningLabel,
  getPartSkuViewModelDisplayLines,
  getWishlistItemSkuDisplayLines,
  normalizeUpdatePartWishlistPayload,
  partWishlistFormValuesFromItem,
  partWishlistStatusLabelsRu,
  validatePartWishlistFormValues,
  isWishlistTransitionToInstalled,
  WISHLIST_INSTALLED_NO_NODE_SERVICE_HINT,
} from "@mototwin/domain";
import type {
  FlattenedNodeSelectOption,
  PartRecommendationGroup,
  PartRecommendationViewModel,
  PartSkuViewModel,
  PartWishlistFormValues,
  PartWishlistItem,
  PartWishlistItemStatus,
} from "@mototwin/types";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import { getApiBaseUrl } from "../../../../src/api-base-url";
import { ScreenHeader } from "../../../components/screen-header";
import { buildServiceEventNewFromWishlistHref } from "./hrefs";

type WishlistItemEditorProps = {
  vehicleId: string;
  itemId: string;
};

function findOptionById(
  options: FlattenedNodeSelectOption[],
  nodeId: string
): FlattenedNodeSelectOption | undefined {
  return options.find((o) => o.id === nodeId);
}

export function WishlistItemEditor({ vehicleId, itemId }: WishlistItemEditorProps) {
  const router = useRouter();
  const apiBaseUrl = getApiBaseUrl();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [nodeTreeOptions, setNodeTreeOptions] = useState<FlattenedNodeSelectOption[]>([]);
  const [form, setForm] = useState<PartWishlistFormValues>(() => createInitialPartWishlistFormValues());
  const [nodePickerOpen, setNodePickerOpen] = useState(false);
  const statusWhenLoadedRef = useRef<PartWishlistItemStatus | null>(null);
  const [wishlistSkuQuery, setWishlistSkuQuery] = useState("");
  const [wishlistSkuDebouncedQuery, setWishlistSkuDebouncedQuery] = useState("");
  const [wishlistSkuResults, setWishlistSkuResults] = useState<PartSkuViewModel[]>([]);
  const [wishlistSkuLoading, setWishlistSkuLoading] = useState(false);
  const [wishlistSkuFetchError, setWishlistSkuFetchError] = useState("");
  const [wishlistSkuPickedPreview, setWishlistSkuPickedPreview] = useState<PartSkuViewModel | null>(
    null
  );
  const [recommendations, setRecommendations] = useState<PartRecommendationViewModel[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState("");
  const wishlistSkuSearchGen = useRef(0);
  const [loadedWishlistItem, setLoadedWishlistItem] = useState<PartWishlistItem | null>(null);

  const selectedNodeLabel = useMemo(() => {
    const raw = form.nodeId.trim();
    if (!raw) {
      return "Выберите узел мотоцикла";
    }
    const opt = findOptionById(nodeTreeOptions, raw);
    return opt?.name ?? raw;
  }, [form.nodeId, nodeTreeOptions]);
  const nodeRequiredError = saveError.includes("Выберите узел мотоцикла");

  const recommendationGroups = useMemo(
    (): PartRecommendationGroup[] => buildPartRecommendationGroupsForDisplay(recommendations),
    [recommendations]
  );

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
      const itemIdSafe = itemId.trim();
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
        setLoadedWishlistItem(null);
      } else {
        setForm(partWishlistFormValuesFromItem(row));
        statusWhenLoadedRef.current = row.status;
        setLoadedWishlistItem(row);
      }
    } catch (e) {
      console.error(e);
      setLoadError("Не удалось загрузить данные.");
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl, vehicleId, itemId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = setTimeout(() => {
      setWishlistSkuDebouncedQuery(wishlistSkuQuery.trim());
    }, 350);
    return () => clearTimeout(id);
  }, [wishlistSkuQuery]);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    const q = wishlistSkuDebouncedQuery;
    const nodeFilter = form.nodeId.trim();
    const canFetch = q.length >= 2 || (q.length === 0 && nodeFilter.length > 0);
    if (!canFetch) {
      setWishlistSkuResults([]);
      setWishlistSkuFetchError("");
      setWishlistSkuLoading(false);
      return;
    }
    const gen = wishlistSkuSearchGen.current + 1;
    wishlistSkuSearchGen.current = gen;
    setWishlistSkuLoading(true);
    setWishlistSkuFetchError("");
    const client = createApiClient({ baseUrl: apiBaseUrl });
    const endpoints = createMotoTwinEndpoints(client);
    void endpoints
      .getPartSkus({
        search: q.length >= 2 ? q : undefined,
        nodeId: nodeFilter || undefined,
      })
      .then((res) => {
        if (wishlistSkuSearchGen.current !== gen) {
          return;
        }
        setWishlistSkuResults(res.skus ?? []);
      })
      .catch(() => {
        if (wishlistSkuSearchGen.current !== gen) {
          return;
        }
        setWishlistSkuResults([]);
        setWishlistSkuFetchError("Не удалось выполнить поиск в каталоге.");
      })
      .finally(() => {
        if (wishlistSkuSearchGen.current !== gen) {
          return;
        }
        setWishlistSkuLoading(false);
      });
  }, [apiBaseUrl, isLoading, wishlistSkuDebouncedQuery, form.nodeId]);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    const nodeId = form.nodeId.trim();
    if (!nodeId) {
      setRecommendations([]);
      setRecommendationsError("");
      setRecommendationsLoading(false);
      return;
    }
    setRecommendationsLoading(true);
    setRecommendationsError("");
    const client = createApiClient({ baseUrl: apiBaseUrl });
    const endpoints = createMotoTwinEndpoints(client);
    void endpoints
      .getRecommendedSkusForNode(vehicleId, nodeId)
      .then((res) => {
        setRecommendations(res.recommendations ?? []);
      })
      .catch(() => {
        setRecommendations([]);
        setRecommendationsError("Не удалось загрузить рекомендации по узлу.");
      })
      .finally(() => {
        setRecommendationsLoading(false);
      });
  }, [apiBaseUrl, form.nodeId, isLoading, vehicleId]);

  const applyRecommendedSkuToForm = (rec: PartRecommendationViewModel) => {
    const skuFromRecommendation: PartSkuViewModel = {
      id: rec.skuId,
      seedKey: null,
      primaryNodeId: rec.primaryNode?.id ?? null,
      brandName: rec.brandName,
      canonicalName: rec.canonicalName,
      partType: rec.partType,
      description: null,
      category: null,
      priceAmount: rec.priceAmount,
      currency: rec.currency,
      sourceUrl: null,
      isOem: false,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      primaryNode: rec.primaryNode,
      nodeLinks: [],
      fitments: [],
      offers: [],
      partNumbers: rec.partNumbers.map((number, idx) => ({
        id: `${rec.skuId}-${idx}`,
        skuId: rec.skuId,
        number,
        normalizedNumber: number,
        numberType: "MANUFACTURER",
        brandName: rec.brandName,
        createdAt: new Date().toISOString(),
      })),
    };
    setWishlistSkuPickedPreview(skuFromRecommendation);
    setForm((f) => applyPartSkuViewModelToPartWishlistFormValues(f, skuFromRecommendation));
  };

  function addRecommendedSku(rec: PartRecommendationViewModel) {
    applyRecommendedSkuToForm(rec);
  }

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
      const shouldDeferInstalledStatus = isWishlistTransitionToInstalled(prevStatus, form.status);

      const itemIdSafe = itemId.trim();
      if (!itemIdSafe) {
        setSaveError("Не указана позиция списка.");
        return;
      }
      const input = normalizeUpdatePartWishlistPayload(
        shouldDeferInstalledStatus ? { ...form, status: prevStatus } : form
      );
      const res = await endpoints.updateWishlistItem(vehicleId, itemIdSafe, input);
      if (shouldDeferInstalledStatus) {
        if (res.item.nodeId) {
          router.replace(buildServiceEventNewFromWishlistHref(vehicleId, res.item));
        } else {
          Alert.alert("Список покупок", WISHLIST_INSTALLED_NO_NODE_SERVICE_HINT);
          router.replace(`/vehicles/${vehicleId}/wishlist`);
        }
      } else {
        router.replace(`/vehicles/${vehicleId}/wishlist`);
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
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <Text style={styles.errorText}>Не удалось определить ID мотоцикла.</Text>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <ActivityIndicator size="large" color={c.textPrimary} />
        <Text style={styles.muted}>Загрузка…</Text>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
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
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title="Редактирование позиции" />
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

          <Text style={styles.label}>
            Узел мотоцикла <Text style={styles.requiredMark}>*</Text>
          </Text>
          <Pressable
            onPress={() => setNodePickerOpen(true)}
            style={({ pressed }) => [styles.nodePickBtn, pressed && styles.nodePickBtnPressed]}
          >
            <Text style={styles.nodePickBtnText}>{selectedNodeLabel}</Text>
            <Text style={styles.nodePickChevron}>▾</Text>
          </Pressable>
          {nodeRequiredError ? <Text style={styles.inlineError}>Выберите узел мотоцикла</Text> : null}

          <View style={styles.skuBox}>
            <Text style={styles.skuBoxTitle}>SKU из каталога</Text>
            <Text style={styles.skuBoxHint}>
              Необязательно. От 2 символов в поиске; если выбран узел — можно искать без текста.
            </Text>
            {form.nodeId.trim() ? (
              <View style={styles.recommendationsBox}>
                <Text style={styles.labelCompact}>Рекомендации по узлу</Text>
                {recommendationsError ? <Text style={styles.inlineError}>{recommendationsError}</Text> : null}
                {recommendationsLoading ? <Text style={styles.mutedSmall}>Загружаем рекомендации…</Text> : null}
                {!recommendationsLoading && recommendations.length === 0 ? (
                  <Text style={styles.mutedSmall}>
                    Для этого узла пока нет рекомендаций из каталога
                  </Text>
                ) : null}
                {!recommendationsLoading && recommendationGroups.length > 0
                  ? recommendationGroups.map((group) => (
                      <View key={group.recommendationType} style={styles.recommendationGroup}>
                        <Text style={styles.recommendationGroupTitle}>
                          {getPartRecommendationGroupTitle(group.recommendationType)}
                        </Text>
                        {group.items.map((rec) => {
                          const primaryNo = rec.partNumbers[0]?.trim() || "";
                          const warn = getPartRecommendationWarningLabel(rec);
                          const isVerify = rec.recommendationType === "VERIFY_REQUIRED";
                          return (
                            <View
                              key={rec.skuId}
                              style={[
                                styles.recommendationCard,
                                isVerify && styles.recommendationCardVerify,
                              ]}
                            >
                              <Text style={styles.recName}>{rec.canonicalName}</Text>
                              <Text style={styles.skuResultMeta}>{rec.brandName}</Text>
                              {primaryNo ? (
                                <Text style={styles.skuResultMeta}>Арт.: {primaryNo}</Text>
                              ) : null}
                              {rec.partType.trim() ? (
                                <Text style={styles.skuResultMeta}>{rec.partType}</Text>
                              ) : null}
                              {rec.priceAmount != null ? (
                                <Text style={styles.skuResultMeta}>
                                  {`${formatExpenseAmountRu(rec.priceAmount)} ${
                                    rec.currency?.trim() || ""
                                  }`.trim()}
                                </Text>
                              ) : null}
                              <Text style={styles.recommendationLabel}>{rec.recommendationLabel}</Text>
                              <Text style={styles.skuResultMeta}>{rec.whyRecommended}</Text>
                              {rec.fitmentNote ? (
                                <Text style={styles.skuResultMeta}>{rec.fitmentNote}</Text>
                              ) : null}
                              {warn ? (
                                <Text
                                  style={[
                                    styles.recommendationWarning,
                                    isVerify && styles.recommendationWarningVerify,
                                  ]}
                                >
                                  {warn}
                                </Text>
                              ) : null}
                              <Pressable
                                onPress={() => addRecommendedSku(rec)}
                                style={({ pressed }) => [
                                  styles.recommendationBtn,
                                  pressed && styles.recommendationBtnPressed,
                                ]}
                              >
                                <Text style={styles.recommendationBtnText}>Применить SKU</Text>
                              </Pressable>
                            </View>
                          );
                        })}
                      </View>
                    ))
                  : null}
              </View>
            ) : null}
            <Text style={styles.labelCompact}>Найти в каталоге</Text>
            <TextInput
              value={wishlistSkuQuery}
              onChangeText={setWishlistSkuQuery}
              placeholder="Бренд, название, артикул…"
              placeholderTextColor={c.textMuted}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {wishlistSkuFetchError ? (
              <Text style={styles.inlineError}>{wishlistSkuFetchError}</Text>
            ) : null}
            {wishlistSkuLoading ? <Text style={styles.mutedSmall}>Поиск…</Text> : null}
            {wishlistSkuResults.length > 0 ? (
              <View style={styles.skuResults}>
                {wishlistSkuResults.map((sku) => (
                  <Pressable
                    key={sku.id}
                    onPress={() => {
                      setWishlistSkuPickedPreview(sku);
                      setForm((f) => applyPartSkuViewModelToPartWishlistFormValues(f, sku));
                    }}
                    style={({ pressed }) => [styles.skuResultRow, pressed && styles.skuResultPressed]}
                  >
                    <Text style={styles.skuResultPrimary}>
                      {getPartSkuViewModelDisplayLines(sku).primaryLine}
                    </Text>
                    <Text style={styles.skuResultMeta}>
                      {formatPartSkuSearchResultMetaLineRu(sku)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            {form.skuId.trim() ? (
              <View style={styles.skuSelected}>
                <Text style={styles.labelCompact}>Выбранный SKU</Text>
                {wishlistSkuPickedPreview?.id === form.skuId.trim() ? (
                  <>
                    <Text style={styles.skuSelectedPrimary}>
                      {getPartSkuViewModelDisplayLines(wishlistSkuPickedPreview).primaryLine}
                    </Text>
                    <Text style={styles.skuSelectedMeta}>
                      {getPartSkuViewModelDisplayLines(wishlistSkuPickedPreview).secondaryLine}
                    </Text>
                  </>
                ) : loadedWishlistItem?.sku?.id === form.skuId.trim() ? (
                  <>
                    <Text style={styles.skuSelectedPrimary}>
                      {getWishlistItemSkuDisplayLines(loadedWishlistItem.sku).primaryLine}
                    </Text>
                    <Text style={styles.skuSelectedMeta}>
                      {getWishlistItemSkuDisplayLines(loadedWishlistItem.sku).secondaryLine}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.mutedSmall}>SKU привязан</Text>
                )}
                <Pressable
                  onPress={() => {
                    setWishlistSkuPickedPreview(null);
                    setForm((f) => clearPartWishlistFormSkuSelection(f));
                  }}
                  style={({ pressed }) => [styles.clearSkuBtn, pressed && styles.clearSkuBtnPressed]}
                >
                  <Text style={styles.clearSkuBtnText}>Очистить SKU</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          <Text style={styles.label}>Количество</Text>
          <TextInput
            value={form.quantity}
            onChangeText={(quantity) => setForm((f) => ({ ...f, quantity }))}
            placeholder="1"
            placeholderTextColor={c.textMuted}
            keyboardType="number-pad"
            style={styles.input}
          />

          <Text style={styles.label}>Стоимость (необязательно)</Text>
          <TextInput
            value={form.costAmount}
            onChangeText={(costAmount) => setForm((f) => ({ ...f, costAmount }))}
            placeholder="Например: 1500"
            placeholderTextColor={c.textMuted}
            keyboardType="decimal-pad"
            style={styles.input}
          />

          <Text style={styles.label}>Валюта</Text>
          <TextInput
            value={form.currency}
            onChangeText={(currency) => setForm((f) => ({ ...f, currency }))}
            placeholder="RUB"
            placeholderTextColor={c.textMuted}
            autoCapitalize="characters"
            style={styles.input}
            maxLength={8}
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
              <ActivityIndicator size="small" color={c.onPrimaryAction} />
            ) : (
              <Text style={styles.saveBtnText}>Сохранить</Text>
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
  scroll: { padding: 16, paddingBottom: 28 },
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
  requiredMark: { color: c.error },
  labelCompact: {
    fontSize: 11,
    fontWeight: "600",
    color: c.textMuted,
    marginBottom: 4,
    marginTop: 10,
  },
  skuBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.cardMuted,
  },
  skuBoxTitle: { fontSize: 12, fontWeight: "700", color: c.textPrimary },
  skuBoxHint: { marginTop: 4, fontSize: 11, color: c.textMuted, lineHeight: 15 },
  recommendationsBox: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    backgroundColor: c.card,
    padding: 10,
  },
  recommendationGroup: {
    marginTop: 10,
  },
  recommendationGroupTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: c.textPrimary,
  },
  recommendationCard: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    padding: 8,
    backgroundColor: c.cardMuted,
  },
  recommendationCardVerify: {
    borderLeftWidth: 3,
    borderLeftColor: "#d97706",
    backgroundColor: "rgba(251, 191, 36, 0.12)",
  },
  recName: { fontSize: 13, fontWeight: "600", color: c.textPrimary },
  recommendationLabel: { marginTop: 4, fontSize: 11, color: c.textSecondary, fontWeight: "600" },
  recommendationWarning: { marginTop: 2, fontSize: 11, color: c.textSecondary },
  recommendationWarningVerify: { fontWeight: "600", color: c.textPrimary },
  recommendationBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: c.card,
  },
  recommendationBtnPressed: { opacity: 0.9 },
  recommendationBtnText: { fontSize: 12, fontWeight: "600", color: c.textPrimary },
  skuResults: {
    marginTop: 8,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    backgroundColor: c.card,
    overflow: "hidden",
  },
  skuResultRow: { paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.divider },
  skuResultPressed: { backgroundColor: c.divider },
  skuResultPrimary: { fontSize: 13, fontWeight: "600", color: c.textPrimary },
  skuResultMeta: { marginTop: 2, fontSize: 11, color: c.textMuted },
  skuSelected: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
  },
  skuSelectedPrimary: { marginTop: 4, fontSize: 13, fontWeight: "600", color: c.textPrimary },
  skuSelectedMeta: { marginTop: 2, fontSize: 11, color: c.textMuted },
  clearSkuBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.card,
  },
  clearSkuBtnPressed: { opacity: 0.9 },
  clearSkuBtnText: { fontSize: 12, fontWeight: "600", color: c.textPrimary },
  mutedSmall: { marginTop: 6, fontSize: 12, color: c.textMuted },
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
  saveBtnText: { fontSize: 16, fontWeight: "700", color: c.onPrimaryAction },
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
