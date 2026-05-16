import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ImageSourcePropType,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import {
  RIDE_LOAD_TYPE_OPTIONS,
  RIDE_RIDING_STYLE_OPTIONS,
  RIDE_USAGE_INTENSITY_OPTIONS,
  RIDE_USAGE_TYPE_OPTIONS,
  filterLeafOptionsUnderTopNodeAncestors,
  getLeafNodeOptions,
  getOrderedTopNodeIdsPresentInNodeTree,
  nodeAncestorPathLabelRu,
  vehicleDetailFromApiRecord,
} from "@mototwin/domain";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import type {
  FitmentReportResultWire,
  NodeTreeItem,
  PartRecommendationViewModel,
  TopServiceNodeItem,
  VehicleDetail,
  VehicleDetailApiRecord,
  VehicleRideProfile,
} from "@mototwin/types";
import { getApiBaseUrl } from "../../src/api-base-url";
import { getNodeTreeIconAsset } from "../../../../src/node-tree-icons";
import { InternalScreenChrome } from "../expo-shell/internal-screen-chrome";
import { GarageVehicleContextPlaque } from "../garage/GarageVehicleContextPlaque";
import { MobileNodePickerModal } from "../vehicle-detail/mobile-node-picker-modal";
import {
  buildVehicleWishlistItemHighlightHref,
  buildVehicleWishlistNewHref,
} from "./hrefs";

type PartLifeStatus = "plan" | "purchased" | "installed" | "rejected";
type FitmentChoiceInstalled =
  | "DIRECT_FIT"
  | "FIT_WITH_MODIFICATION"
  | "PARTIAL_FIT"
  | "OEM_REPLACEMENT";

const MOD_MAX = 500;
const COMMENT_MAX = 1000;

const REF = {
  cardBg: "#1A1F28",
  panelBorder: "#252A34",
  primary: "#2563EB",
  primarySoft: "rgba(37,99,235,0.15)",
  warnBorder: "#D4A017",
  warnBg: "rgba(212,160,23,0.12)",
  greenHint: "#34D399",
} as const;

function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function isSafetyCriticalNodeCode(code: string | undefined): boolean {
  if (!code) return false;
  const u = code.toUpperCase();
  if (u.includes("BRAKE") || u.includes("SUSPENSION") || u.includes("SHOCK") || u.includes("FORK")) {
    return true;
  }
  if (u.startsWith("ENGINE.") || u.includes(".ENGINE.")) {
    return true;
  }
  return false;
}

function SectionHeading(props: {
  n: number;
  title: string;
  hint?: string;
  alwaysVisible?: boolean;
  dimmed?: boolean;
}) {
  return (
    <View style={[styles.sectionHeading, props.dimmed && styles.sectionDimmed]}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepBadgeText}>{props.n}</Text>
      </View>
      <View style={styles.sectionHeadingCol}>
        <Text style={styles.sectionTitle}>{props.title}</Text>
        {props.hint ? <Text style={styles.sectionHint}>{props.hint}</Text> : null}
      </View>
    </View>
  );
}

function RideProfileField<T extends string>(props: {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.rideField}>
      <Text style={styles.rideFieldLabel}>{props.label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.rideOptionsRow}>
          {props.options.map((opt) => {
            const active = props.value === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => props.onChange(opt.value)}
                style={[styles.rideOption, active && styles.rideOptionActive]}
              >
                <Text style={[styles.rideOptionText, active && styles.rideOptionTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

export function CommunityPartScreen(props: {
  vehicleId: string;
  initialNodeId: string;
  initialPartMasterId: string;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const apiBaseUrl = getApiBaseUrl();
  const endpoints = useMemo(
    () => createMotoTwinEndpoints(createApiClient({ baseUrl: apiBaseUrl })),
    [apiBaseUrl]
  );

  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [vehicleError, setVehicleError] = useState("");
  const [nodeTree, setNodeTree] = useState<NodeTreeItem[]>([]);
  const [topServiceNodes, setTopServiceNodes] = useState<TopServiceNodeItem[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState(props.initialNodeId.trim());
  const [nodeModalOpen, setNodeModalOpen] = useState(false);
  const [recs, setRecs] = useState<PartRecommendationViewModel[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);

  const [brandName, setBrandName] = useState("");
  const [sku, setSku] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [existingMasterId, setExistingMasterId] = useState<string | null>(
    props.initialPartMasterId.trim() || null
  );

  const [dupLoading, setDupLoading] = useState(false);
  const [dupCandidates, setDupCandidates] = useState<
    Array<{ id: string; brandName: string; sku: string; title: string }>
  >([]);

  const [lifeStatus, setLifeStatus] = useState<PartLifeStatus>("plan");
  const [fitmentChoice, setFitmentChoice] = useState<FitmentChoiceInstalled>("DIRECT_FIT");
  const [modificationDetails, setModificationDetails] = useState("");

  const [reportRideProfile, setReportRideProfile] = useState<VehicleRideProfile>({
    usageType: "MIXED",
    ridingStyle: "ACTIVE",
    loadType: "SOLO",
    usageIntensity: "MEDIUM",
  });

  const [photoPackagingUrl, setPhotoPackagingUrl] = useState("");
  const [photoInstalledUrl, setPhotoInstalledUrl] = useState("");
  const [photoReceiptUrl, setPhotoReceiptUrl] = useState("");
  const [comment, setComment] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [successOpen, setSuccessOpen] = useState(false);

  const dupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearDuplicate = useCallback(() => {
    setExistingMasterId(null);
  }, []);

  const pickDuplicate = useCallback(
    (row: { id: string; brandName: string; sku: string; title: string }) => {
      setExistingMasterId(row.id);
      setBrandName(row.brandName);
      setSku(row.sku);
      setTitle(row.title);
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setVehicleError("");
      try {
        const res = await endpoints.getVehicleDetail(props.vehicleId);
        if (cancelled) return;
        const raw = res.vehicle as unknown as VehicleDetailApiRecord | null;
        if (raw) {
          setVehicle(vehicleDetailFromApiRecord(raw));
        }
      } catch (e) {
        if (!cancelled) {
          setVehicleError(e instanceof Error ? e.message : "Не удалось загрузить мотоцикл");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [endpoints, props.vehicleId]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      endpoints.getNodeTree(props.vehicleId),
      endpoints.getTopServiceNodes(),
    ])
      .then(([treeRes, topRes]) => {
        if (!cancelled) {
          setNodeTree(treeRes.nodeTree ?? []);
          setTopServiceNodes(topRes.nodes ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNodeTree([]);
          setTopServiceNodes([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [endpoints, props.vehicleId]);

  useEffect(() => {
    if (!props.initialPartMasterId.trim()) return;
    let cancelled = false;
    void (async () => {
      try {
        const prefill = await endpoints.getPartMaster(props.initialPartMasterId, {
          nodeId: props.initialNodeId || selectedNodeId || undefined,
        });
        if (cancelled) return;
        setExistingMasterId(prefill.partMaster.id);
        setBrandName(prefill.partMaster.brandName);
        setSku(prefill.partMaster.sku);
        setTitle(prefill.partMaster.title);
        if (prefill.suggestedCategory) {
          setCategory(prefill.suggestedCategory);
        }
      } catch {
        // ignore — user can fill manually
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [endpoints, props.initialNodeId, props.initialPartMasterId, selectedNodeId]);

  useEffect(() => {
    if (!vehicle?.rideProfile) return;
    setReportRideProfile({
      usageType: vehicle.rideProfile.usageType,
      ridingStyle: vehicle.rideProfile.ridingStyle,
      loadType: vehicle.rideProfile.loadType,
      usageIntensity: vehicle.rideProfile.usageIntensity,
    });
  }, [vehicle]);

  useEffect(() => {
    if (!selectedNodeId.trim()) {
      setRecs([]);
      return;
    }
    let cancelled = false;
    setRecsLoading(true);
    void endpoints
      .getRecommendedSkusForNode(props.vehicleId, selectedNodeId)
      .then((data) => {
        if (!cancelled) {
          setRecs(data.recommendations ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) setRecs([]);
      })
      .finally(() => {
        if (!cancelled) setRecsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [endpoints, props.vehicleId, selectedNodeId]);

  useEffect(() => {
    if (dupTimer.current) clearTimeout(dupTimer.current);
    const b = brandName.trim();
    const s = sku.trim();
    if (b.length < 1 || s.length < 1) {
      setDupCandidates([]);
      return;
    }
    dupTimer.current = setTimeout(() => {
      void (async () => {
        setDupLoading(true);
        try {
          const res = await endpoints.checkPartMasterDuplicates({ brandName: b, sku: s });
          setDupCandidates(res.candidates ?? []);
        } catch {
          setDupCandidates([]);
        } finally {
          setDupLoading(false);
        }
      })();
    }, 420);
    return () => {
      if (dupTimer.current) clearTimeout(dupTimer.current);
    };
  }, [brandName, sku, endpoints]);

  const leafOptions = useMemo(() => getLeafNodeOptions(nodeTree), [nodeTree]);

  const leafRowsForModal = useMemo(
    () =>
      leafOptions.map((leaf) => ({
        ...leaf,
        pathLabel: nodeAncestorPathLabelRu(nodeTree, leaf.id),
      })),
    [leafOptions, nodeTree]
  );

  const orderedTopNodeIdsForPicker = useMemo(
    () => getOrderedTopNodeIdsPresentInNodeTree(nodeTree, topServiceNodes),
    [nodeTree, topServiceNodes]
  );

  const topLeafRowsForModal = useMemo(
    () =>
      filterLeafOptionsUnderTopNodeAncestors(
        nodeTree,
        leafRowsForModal,
        orderedTopNodeIdsForPicker
      ),
    [nodeTree, leafRowsForModal, orderedTopNodeIdsForPicker]
  );

  const selectedLeaf = useMemo(
    () => leafRowsForModal.find((o) => o.id === selectedNodeId),
    [leafRowsForModal, selectedNodeId]
  );

  const selectedNodeName = selectedLeaf?.name?.trim() ?? "";
  const selectedNodePath = selectedLeaf?.pathLabel?.replace(/ › /g, " → ") ?? "";
  const selectedNodeIcon = useMemo((): ImageSourcePropType | null => {
    if (!selectedLeaf) return null;
    return getNodeTreeIconAsset(selectedLeaf.code, selectedLeaf.name) as ImageSourcePropType | null;
  }, [selectedLeaf]);

  const categoryOptions = useMemo(() => {
    const fromRecs = [...new Set(recs.map((r) => r.partType?.trim()).filter(Boolean))] as string[];
    const nodeName = selectedNodeName;
    const merged =
      nodeName && !fromRecs.includes(nodeName) ? [nodeName, ...fromRecs] : [...fromRecs];
    if (merged.length === 0 && nodeName) return [nodeName];
    if (merged.length === 0) return ["ЗАПЧАСТЬ"];
    return merged;
  }, [recs, selectedNodeName]);

  useEffect(() => {
    if (!category && categoryOptions.length > 0) {
      setCategory(categoryOptions[0] ?? "");
    }
  }, [category, categoryOptions]);

  useEffect(() => {
    if (categoryOptions.length > 0 && category && !categoryOptions.includes(category)) {
      setCategory(categoryOptions[0] ?? "");
    }
  }, [category, categoryOptions, selectedNodeId]);

  const showFitmentBlock = lifeStatus === "installed" || lifeStatus === "rejected";
  const hasNode = Boolean(selectedNodeId.trim());
  const showDupSection = hasNode && brandName.trim().length > 0 && sku.trim().length > 0;

  const primaryCtaLabel = useMemo(() => {
    if (lifeStatus === "plan" || lifeStatus === "purchased") return "Добавить в корзину";
    if (lifeStatus === "installed") return "Добавить и опубликовать опыт";
    return "Сохранить как не подошла";
  }, [lifeStatus]);

  const footerHint = useMemo(() => {
    if (!hasNode || !brandName.trim() || !sku.trim() || !title.trim() || !category.trim()) {
      return "Заполните обязательные поля";
    }
    return null;
  }, [brandName, category, hasNode, sku, title]);

  const canSubmit =
    hasNode &&
    Boolean(brandName.trim()) &&
    Boolean(sku.trim()) &&
    Boolean(title.trim()) &&
    Boolean(category.trim()) &&
    (!showFitmentBlock ||
      lifeStatus === "rejected" ||
      (fitmentChoice !== "FIT_WITH_MODIFICATION" || modificationDetails.trim().length > 0));

  const submit = useCallback(async () => {
    setError("");
    if (!canSubmit) return;
    setBusy(true);
    try {
      let partMasterId = existingMasterId;
      let skuId: string | null = null;

      if (existingMasterId) {
        const ensured = await endpoints.ensurePartMasterSku({
          partMasterId: existingMasterId,
          nodeId: selectedNodeId.trim(),
          vehicleId: props.vehicleId,
          partType: category.trim(),
        });
        skuId = ensured.skuId;
      } else {
        try {
          const created = await endpoints.createPartMaster({
            brandName: brandName.trim(),
            sku: sku.trim(),
            title: title.trim(),
            category: category.trim(),
            description: null,
            vehicleId: props.vehicleId,
            nodeId: selectedNodeId.trim(),
            attachSkuToNode: true,
          });
          partMasterId = created.partMaster?.id ?? null;
          skuId = created.skuId ?? null;
        } catch (e) {
          const msg = e instanceof Error ? e.message : "";
          if (msg.includes("уже есть") || msg.includes("каталоге")) {
            setError("Такая деталь уже есть — выберите её в блоке «Похожие детали в базе».");
            return;
          }
          setError(msg || "Не удалось сохранить деталь");
          return;
        }
      }

      if (!partMasterId || !skuId) {
        setError("Не удалось получить каталожную строку (SKU).");
        return;
      }

      const wishlistStatus =
        lifeStatus === "plan"
          ? "NEEDED"
          : lifeStatus === "purchased"
            ? "BOUGHT"
            : lifeStatus === "installed"
              ? "INSTALLED"
              : "REJECTED";

      const wl = await endpoints.createWishlistItem(props.vehicleId, {
        skuId,
        nodeId: selectedNodeId.trim(),
        title: title.trim(),
        quantity: 1,
        status: wishlistStatus,
        source: "USER_ADDED",
        comment: comment.trim() || null,
      });

      if (showFitmentBlock && partMasterId) {
        const fitmentResult: FitmentReportResultWire =
          lifeStatus === "rejected"
            ? "DOES_NOT_FIT"
            : fitmentChoice === "OEM_REPLACEMENT"
              ? "OEM_REPLACEMENT"
              : fitmentChoice;
        const fr = await endpoints.createFitmentReport(props.vehicleId, {
          partMasterId,
          nodeId: selectedNodeId.trim(),
          fitmentResult,
          installationStatus:
            lifeStatus === "rejected" ? "TESTED_NOT_INSTALLED" : "INSTALLED",
          modificationRequired:
            lifeStatus === "installed" && fitmentChoice === "FIT_WITH_MODIFICATION",
          modificationDetails:
            lifeStatus === "installed" && fitmentChoice === "FIT_WITH_MODIFICATION"
              ? modificationDetails.trim() || null
              : null,
          comment: comment.trim() || null,
          rideProfile: reportRideProfile,
        });
        const reportId = fr.report?.id;
        if (reportId) {
          const evidenceRows: Array<{
            type: "PACKAGING_PHOTO" | "INSTALLED_PHOTO" | "RECEIPT";
            url: string;
          }> = [];
          if (isValidHttpUrl(photoPackagingUrl)) {
            evidenceRows.push({ type: "PACKAGING_PHOTO", url: photoPackagingUrl.trim() });
          }
          if (isValidHttpUrl(photoInstalledUrl)) {
            evidenceRows.push({ type: "INSTALLED_PHOTO", url: photoInstalledUrl.trim() });
          }
          if (isValidHttpUrl(photoReceiptUrl)) {
            evidenceRows.push({ type: "RECEIPT", url: photoReceiptUrl.trim() });
          }
          for (const row of evidenceRows) {
            await endpoints.createFitmentEvidence({
              reportId,
              type: row.type,
              fileUrl: row.url,
            });
          }
        }
      }

      setSuccessOpen(true);
      const itemId = wl.item?.id;
      if (itemId) {
        setTimeout(() => {
          router.replace(
            buildVehicleWishlistItemHighlightHref(props.vehicleId, itemId, {
              partsStatus: wishlistStatus,
            })
          );
        }, 1800);
      } else {
        setTimeout(() => {
          router.replace(`/vehicles/${props.vehicleId}/wishlist`);
        }, 1800);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Сеть недоступна");
    } finally {
      setBusy(false);
    }
  }, [
    brandName,
    canSubmit,
    category,
    comment,
    endpoints,
    existingMasterId,
    fitmentChoice,
    lifeStatus,
    modificationDetails,
    photoInstalledUrl,
    photoPackagingUrl,
    photoReceiptUrl,
    props.vehicleId,
    reportRideProfile,
    router,
    selectedNodeId,
    showFitmentBlock,
    sku,
    title,
  ]);

  const closeScreen = () => {
    router.replace(buildVehicleWishlistNewHref(props.vehicleId, selectedNodeId || undefined));
  };

  const lifeCards: Array<{
    key: PartLifeStatus;
    label: string;
    icon: keyof typeof MaterialIcons.glyphMap;
  }> = [
    { key: "plan", label: "Планирую купить", icon: "shopping-cart" },
    { key: "purchased", label: "Купил, не установил", icon: "inventory-2" },
    { key: "installed", label: "Установил", icon: "build" },
    { key: "rejected", label: "Не подошла", icon: "cancel" },
  ];

  const fitmentPills: Array<{
    key: FitmentChoiceInstalled;
    label: string;
    icon: keyof typeof MaterialIcons.glyphMap;
  }> = [
    { key: "DIRECT_FIT", label: "Подошла без доработок", icon: "check-circle" },
    { key: "FIT_WITH_MODIFICATION", label: "Подошла с доработкой", icon: "build" },
    { key: "PARTIAL_FIT", label: "Частично / не уверен", icon: "help-outline" },
    { key: "OEM_REPLACEMENT", label: "OEM-замена", icon: "verified" },
  ];

  const crumbs = [
    { label: "Мой гараж", href: "/" },
    {
      label: vehicle?.nickname?.trim() || "Мотоцикл",
      href: `/vehicles/${props.vehicleId}`,
    },
    { label: "Корзина замен", href: `/vehicles/${props.vehicleId}/wishlist` },
    { label: "Своя деталь" },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <InternalScreenChrome
        crumbs={crumbs}
        title="Добавить свою деталь"
        subtitle="Добавьте деталь в корзину замен. Если вы уже установили её, MotoTwin поможет поделиться совместимостью с владельцами такой же модели."
        onBack={closeScreen}
        showHelp={false}
        belowNavRow={
          vehicle ? (
            <GarageVehicleContextPlaque vehicle={vehicle} currentVehicleId={props.vehicleId} />
          ) : undefined
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 120 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        {vehicleError ? <Text style={styles.errorText}>{vehicleError}</Text> : null}

        <Pressable
          onPress={() => setNodeModalOpen(true)}
          style={({ pressed }) => [styles.contextPlate, pressed && { opacity: 0.92 }]}
        >
          {selectedNodeIcon ? (
            <Image source={selectedNodeIcon} style={styles.nodeIcon} resizeMode="contain" />
          ) : (
            <MaterialIcons name="device-hub" size={22} color={c.primaryAction} />
          )}
          <View style={styles.contextPlateCol}>
            <Text style={styles.contextPlateLabel}>Узел</Text>
            <Text style={styles.contextPlateValue} numberOfLines={2}>
              {selectedNodeName || "Выберите конечный узел"}
            </Text>
            {selectedNodePath ? (
              <Text style={styles.contextPlatePath} numberOfLines={2}>
                {selectedNodePath}
              </Text>
            ) : null}
          </View>
          <Text style={styles.contextPlateAction}>Изменить</Text>
          <MaterialIcons name="chevron-right" size={22} color={c.textMuted} />
        </Pressable>

        <SectionHeading n={1} title="Деталь" />
        <View style={[styles.card, !hasNode && styles.cardDisabled]} pointerEvents={hasNode ? "auto" : "none"}>
          <Text style={styles.fieldLabel}>
            Бренд детали <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            value={brandName}
            onChangeText={(v) => {
              setBrandName(v);
              if (existingMasterId) clearDuplicate();
            }}
            placeholder="Например: EBC, Brembo"
            placeholderTextColor={c.textMuted}
            style={styles.input}
            editable={!existingMasterId}
          />
          <Text style={styles.fieldLabel}>
            Артикул / SKU <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            value={sku}
            onChangeText={(v) => {
              setSku(v);
              if (existingMasterId) clearDuplicate();
            }}
            placeholder="Например: FA209HH"
            placeholderTextColor={c.textMuted}
            style={styles.input}
            editable={!existingMasterId}
          />
          <Text style={styles.fieldLabel}>
            Название <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            value={title}
            onChangeText={(v) => {
              setTitle(v);
              if (existingMasterId) clearDuplicate();
            }}
            placeholder="Например: Передние тормозные колодки EBC FA209HH"
            placeholderTextColor={c.textMuted}
            style={styles.input}
          />
          <Text style={styles.fieldLabel}>Категория (тип детали)</Text>
          <Text style={styles.fieldHint}>
            Предлагается по узлу; при необходимости выберите другой тип.
          </Text>
          {recsLoading ? (
            <Text style={styles.fieldHint}>Подбираем категории по узлу…</Text>
          ) : null}
          <View style={styles.categoryGrid}>
            {categoryOptions.map((cat) => {
              const active = category === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[styles.categoryChip, active && styles.categoryChipActive]}
                >
                  <Text
                    style={[styles.categoryChipText, active && styles.categoryChipTextActive]}
                    numberOfLines={2}
                  >
                    {cat.replaceAll("_", " ")}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {showDupSection ? (
          <View style={styles.card}>
            <Text style={styles.blockTitle}>Похожие детали в базе</Text>
            {dupLoading ? (
              <Text style={styles.fieldHint}>Поиск…</Text>
            ) : dupCandidates.length === 0 ? (
              <View style={styles.emptyDup}>
                <MaterialIcons name="search" size={28} color={c.textMuted} />
                <Text style={styles.emptyDupText}>
                  Похожих деталей не найдено. Будет создана новая карточка детали.
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.fieldHint}>Возможно, эта деталь уже есть в базе</Text>
                {dupCandidates.map((row) => (
                  <View key={row.id} style={styles.dupRow}>
                    <View style={styles.dupRowText}>
                      <Text style={styles.dupRowTitle}>
                        {row.brandName} {row.sku}
                      </Text>
                      <Text style={styles.dupRowSub} numberOfLines={2}>
                        {row.title}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => pickDuplicate(row)}
                      style={[
                        styles.dupUseBtn,
                        existingMasterId === row.id && styles.dupUseBtnActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dupUseBtnText,
                          existingMasterId === row.id && styles.dupUseBtnTextActive,
                        ]}
                      >
                        Использовать
                      </Text>
                    </Pressable>
                  </View>
                ))}
                {existingMasterId ? (
                  <Pressable onPress={clearDuplicate}>
                    <Text style={styles.clearDupLink}>Создать новую карточку вместо выбранной</Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </View>
        ) : null}

        <SectionHeading n={2} title="Что вы сделали с деталью?" />
        <View style={styles.lifeGrid}>
          {lifeCards.map((card) => {
            const active = lifeStatus === card.key;
            return (
              <Pressable
                key={card.key}
                onPress={() => setLifeStatus(card.key)}
                style={[styles.lifeCard, active && styles.lifeCardActive]}
              >
                <MaterialIcons
                  name={card.icon}
                  size={24}
                  color={active ? REF.primary : c.textMuted}
                />
                <Text style={[styles.lifeCardText, active && styles.lifeCardTextActive]}>
                  {card.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <SectionHeading
          n={3}
          title="Совместимость с вашей моделью"
          hint="Показывается при установке или несовместимости"
          dimmed={!showFitmentBlock}
        />
        <View style={[styles.card, !showFitmentBlock && styles.cardDisabled]}>
          {!showFitmentBlock ? (
            <Text style={styles.fieldHint}>
              Выберите «Установил» или «Не подошла», чтобы заполнить отчёт.
            </Text>
          ) : lifeStatus === "rejected" ? (
            <View style={styles.rejectedRow}>
              <MaterialIcons name="cancel" size={22} color={c.error} />
              <Text style={styles.rejectedText}>
                Не подошла — зафиксируем как несовместимую с узлом
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.pillGrid}>
                {fitmentPills.map((p) => (
                  <Pressable
                    key={p.key}
                    onPress={() => setFitmentChoice(p.key)}
                    style={[styles.fitmentPill, fitmentChoice === p.key && styles.fitmentPillActive]}
                  >
                    <MaterialIcons
                      name={p.icon}
                      size={18}
                      color={fitmentChoice === p.key ? REF.primary : c.textMuted}
                    />
                    <Text
                      style={[
                        styles.fitmentPillText,
                        fitmentChoice === p.key && styles.fitmentPillTextActive,
                      ]}
                    >
                      {p.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {fitmentChoice === "FIT_WITH_MODIFICATION" ? (
                <>
                  <Text style={styles.fieldLabel}>Что пришлось доработать?</Text>
                  <TextInput
                    value={modificationDetails}
                    onChangeText={setModificationDetails}
                    placeholder="Например: потребовалась замена проставки."
                    placeholderTextColor={c.textMuted}
                    style={[styles.input, styles.textArea]}
                    multiline
                    maxLength={MOD_MAX}
                  />
                  <Text style={styles.counter}>
                    {modificationDetails.length}/{MOD_MAX}
                  </Text>
                </>
              ) : null}
            </>
          )}

          {showFitmentBlock ? (
            <View style={styles.rideProfileBlock}>
              <Text style={styles.blockTitle}>Профиль езды для сообщества</Text>
              <Text style={styles.fieldHint}>
                Сохраняется в отчёт. По умолчанию совпадает с карточкой мотоцикла — уточните при
                необходимости.
              </Text>
              <RideProfileField
                label="Тип использования"
                value={reportRideProfile.usageType}
                options={RIDE_USAGE_TYPE_OPTIONS}
                onChange={(v) => setReportRideProfile((p) => ({ ...p, usageType: v }))}
              />
              <RideProfileField
                label="Стиль езды"
                value={reportRideProfile.ridingStyle}
                options={RIDE_RIDING_STYLE_OPTIONS}
                onChange={(v) => setReportRideProfile((p) => ({ ...p, ridingStyle: v }))}
              />
              <RideProfileField
                label="Нагрузка"
                value={reportRideProfile.loadType}
                options={RIDE_LOAD_TYPE_OPTIONS}
                onChange={(v) => setReportRideProfile((p) => ({ ...p, loadType: v }))}
              />
              <RideProfileField
                label="Интенсивность"
                value={reportRideProfile.usageIntensity}
                options={RIDE_USAGE_INTENSITY_OPTIONS}
                onChange={(v) => setReportRideProfile((p) => ({ ...p, usageIntensity: v }))}
              />
            </View>
          ) : null}
        </View>

        <SectionHeading n={4} title="Фото и подтверждение" dimmed={!showFitmentBlock} />
        <View style={[styles.card, !showFitmentBlock && styles.cardDisabled]}>
          <View style={styles.photoGrid}>
            {(
              [
                ["Фото детали или упаковки", "photo-camera", photoPackagingUrl, setPhotoPackagingUrl],
                ["Фото установленной детали", "photo-camera", photoInstalledUrl, setPhotoInstalledUrl],
                ["Чек или заказ", "receipt", photoReceiptUrl, setPhotoReceiptUrl],
              ] as const
            ).map(([label, iconName, val, setVal]) => (
              <View key={label} style={styles.photoSlot}>
                <MaterialIcons name={iconName} size={22} color={c.textMuted} />
                <Text style={styles.photoSlotLabel}>{label}</Text>
                <TextInput
                  value={val}
                  onChangeText={setVal}
                  placeholder="https://…"
                  placeholderTextColor={c.textMuted}
                  style={styles.photoInput}
                  autoCapitalize="none"
                  editable={showFitmentBlock}
                />
              </View>
            ))}
          </View>
          {isSafetyCriticalNodeCode(selectedLeaf?.code) ? (
            <View style={styles.warnBox}>
              <MaterialIcons name="shield" size={22} color="#EAB308" />
              <Text style={styles.warnText}>
                Для тормозов, подвески и двигателя фото установки особенно важно. Такие отчёты могут
                проверяться вручную.
              </Text>
            </View>
          ) : null}
        </View>

        <SectionHeading n={5} title="Комментарий" />
        <View style={styles.card}>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Расскажите коротко: как встала деталь, были ли нюансы, сколько проехали после установки."
            placeholderTextColor={c.textMuted}
            style={[styles.input, styles.textAreaLarge]}
            multiline
            maxLength={COMMENT_MAX}
          />
          <Text style={styles.counter}>
            {comment.length}/{COMMENT_MAX}
          </Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable onPress={closeScreen} style={styles.footerCancel}>
          <Text style={styles.footerCancelText}>Отмена</Text>
        </Pressable>
        <View style={styles.footerRight}>
          {footerHint ? <Text style={styles.footerHint}>{footerHint}</Text> : null}
          <Pressable
            onPress={() => void submit()}
            disabled={!canSubmit || busy}
            style={({ pressed }) => [
              styles.footerSubmit,
              (!canSubmit || busy) && styles.footerSubmitDisabled,
              pressed && canSubmit && !busy && { opacity: 0.9 },
            ]}
          >
            {busy ? (
              <ActivityIndicator color={c.onPrimaryAction} />
            ) : (
              <Text style={styles.footerSubmitText}>{primaryCtaLabel}</Text>
            )}
          </Pressable>
        </View>
      </View>

      <MobileNodePickerModal
        visible={nodeModalOpen}
        title="Выберите узел"
        options={leafRowsForModal}
        topOptions={topLeafRowsForModal.length > 0 ? topLeafRowsForModal : undefined}
        selectedId={selectedNodeId}
        onClose={() => setNodeModalOpen(false)}
        onSelect={setSelectedNodeId}
      />

      <Modal visible={successOpen} transparent animationType="fade">
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <Text style={styles.successTitle}>Готово. Деталь сохранена по вашему сценарию.</Text>
            <Text style={styles.successText}>
              Новые детали и отчёты по ответственным узлам могут проходить проверку перед
              публикацией.
            </Text>
            <Pressable onPress={closeScreen} style={styles.successBtn}>
              <Text style={styles.successBtnText}>Вернуться к подбору</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.canvas },
  scroll: { padding: 16, gap: 14 },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 4,
  },
  sectionDimmed: { opacity: 0.45 },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: REF.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadgeText: { fontSize: 15, fontWeight: "800", color: REF.primary },
  sectionHeadingCol: { flex: 1, minWidth: 0 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: c.textPrimary },
  sectionHint: { marginTop: 4, fontSize: 12, color: REF.greenHint },
  contextPlate: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: REF.panelBorder,
    backgroundColor: REF.cardBg,
  },
  nodeIcon: { width: 28, height: 28 },
  contextPlateCol: { flex: 1, minWidth: 0 },
  contextPlateLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: c.textMuted,
    textTransform: "uppercase",
  },
  contextPlateValue: { marginTop: 2, fontSize: 14, fontWeight: "700", color: c.textPrimary },
  contextPlatePath: { marginTop: 2, fontSize: 11, color: c.textMuted },
  contextPlateAction: { fontSize: 12, fontWeight: "700", color: REF.primary },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: REF.panelBorder,
    backgroundColor: REF.cardBg,
    padding: 14,
    gap: 10,
  },
  cardDisabled: { opacity: 0.4 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: c.textPrimary },
  required: { color: c.error },
  fieldHint: { fontSize: 12, color: c.textMuted, lineHeight: 17 },
  blockTitle: { fontSize: 14, fontWeight: "700", color: c.textPrimary },
  input: {
    borderWidth: 1,
    borderColor: REF.panelBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: c.textPrimary,
    backgroundColor: "#0f1218",
  },
  textArea: { minHeight: 88, textAlignVertical: "top" },
  textAreaLarge: { minHeight: 120, textAlignVertical: "top" },
  counter: { fontSize: 12, color: c.textMuted, textAlign: "right" },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: REF.panelBorder,
    maxWidth: "48%",
  },
  categoryChipActive: {
    borderColor: REF.primary,
    backgroundColor: REF.primarySoft,
  },
  categoryChipText: { fontSize: 12, color: c.textSecondary },
  categoryChipTextActive: { color: REF.primary, fontWeight: "700" },
  emptyDup: { alignItems: "center", gap: 10, paddingVertical: 12 },
  emptyDupText: { fontSize: 13, color: c.textMuted, textAlign: "center", lineHeight: 18 },
  dupRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: REF.panelBorder,
  },
  dupRowText: { flex: 1, minWidth: 0 },
  dupRowTitle: { fontSize: 14, fontWeight: "800", color: c.textPrimary },
  dupRowSub: { marginTop: 2, fontSize: 12, color: c.textMuted },
  dupUseBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: REF.cardBg,
    borderWidth: 1,
    borderColor: REF.panelBorder,
  },
  dupUseBtnActive: { backgroundColor: REF.primary, borderColor: REF.primary },
  dupUseBtnText: { fontSize: 12, fontWeight: "700", color: c.textPrimary },
  dupUseBtnTextActive: { color: "#FFFFFF" },
  clearDupLink: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "600",
    color: REF.primary,
    textAlign: "center",
  },
  lifeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  lifeCard: {
    width: "47%",
    flexGrow: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: REF.panelBorder,
    backgroundColor: REF.cardBg,
    alignItems: "center",
    gap: 8,
  },
  lifeCardActive: {
    borderColor: REF.primary,
    backgroundColor: REF.primarySoft,
  },
  lifeCardText: {
    fontSize: 12,
    fontWeight: "700",
    color: c.textMuted,
    textAlign: "center",
    lineHeight: 16,
  },
  lifeCardTextActive: { color: c.textPrimary },
  pillGrid: { gap: 8 },
  fitmentPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: REF.panelBorder,
  },
  fitmentPillActive: {
    borderColor: REF.primary,
    backgroundColor: REF.primarySoft,
  },
  fitmentPillText: { flex: 1, fontSize: 13, fontWeight: "600", color: c.textSecondary },
  fitmentPillTextActive: { color: c.textPrimary },
  rejectedRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  rejectedText: { flex: 1, fontSize: 14, fontWeight: "700", color: c.textPrimary },
  rideProfileBlock: { marginTop: 16, gap: 10 },
  rideField: { gap: 6 },
  rideFieldLabel: { fontSize: 12, color: c.textMuted },
  rideOptionsRow: { flexDirection: "row", gap: 8, paddingRight: 8 },
  rideOption: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: REF.panelBorder,
  },
  rideOptionActive: { borderColor: REF.primary, backgroundColor: REF.primarySoft },
  rideOptionText: { fontSize: 12, color: c.textMuted },
  rideOptionTextActive: { color: REF.primary, fontWeight: "700" },
  photoGrid: { gap: 10 },
  photoSlot: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#3D4656",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  photoSlotLabel: { fontSize: 12, fontWeight: "600", color: c.textMuted, textAlign: "center" },
  photoInput: {
    width: "100%",
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 11,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: REF.panelBorder,
    backgroundColor: "#0f1218",
    color: c.textPrimary,
  },
  warnBox: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: REF.warnBorder,
    backgroundColor: REF.warnBg,
    alignItems: "flex-start",
  },
  warnText: { flex: 1, fontSize: 13, color: c.textPrimary, lineHeight: 18 },
  errorText: { fontSize: 13, color: c.error },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: REF.panelBorder,
    backgroundColor: c.card,
  },
  footerCancel: { paddingVertical: 12, paddingHorizontal: 4 },
  footerCancelText: { fontSize: 14, fontWeight: "700", color: c.textMuted },
  footerRight: { flex: 1, alignItems: "flex-end", gap: 6 },
  footerHint: { fontSize: 12, color: c.textMuted },
  footerSubmit: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: REF.primary,
    minWidth: 160,
    alignItems: "center",
  },
  footerSubmitDisabled: { opacity: 0.5 },
  footerSubmitText: { fontSize: 14, fontWeight: "800", color: "#FFFFFF" },
  successOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.78)",
    justifyContent: "center",
    padding: 20,
  },
  successCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: REF.panelBorder,
    backgroundColor: REF.cardBg,
    padding: 22,
    gap: 12,
  },
  successTitle: { fontSize: 16, fontWeight: "700", color: c.successText },
  successText: { fontSize: 14, color: c.textMuted, lineHeight: 20 },
  successBtn: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: REF.primary,
    alignItems: "center",
  },
  successBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
});
