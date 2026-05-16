import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import {
  deriveDominantFitmentResult,
  evidenceTypeShortRu,
  fitmentReportResultHeadlineRu,
  fitmentReportResultLabelRu,
  formatFitmentConfidenceStatusRu,
  installationStatusLabelRu,
  isBrakesSafetyContext,
  isSafetyCriticalNodeContext,
  ownerCountLabelRu,
  sourcePriorityVariantLabelRu,
  verdictSupportParagraphsRu,
} from "@mototwin/domain";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import type {
  FitmentReportResultWire,
  PartCompatibilityReportWire,
} from "@mototwin/types";
import { getApiBaseUrl } from "../../src/api-base-url";
import { InternalScreenChrome } from "../expo-shell/internal-screen-chrome";
import {
  buildVehicleWishlistCommunityHref,
  buildVehicleWishlistNewHref,
} from "./hrefs";

const RESULT_ORDER: FitmentReportResultWire[] = [
  "DIRECT_FIT",
  "FIT_WITH_MODIFICATION",
  "PARTIAL_FIT",
  "DOES_NOT_FIT",
  "OEM_REPLACEMENT",
];

const BAR_COLORS: Record<FitmentReportResultWire, string> = {
  DIRECT_FIT: "#22C55E",
  FIT_WITH_MODIFICATION: "#EAB308",
  PARTIAL_FIT: "#F97316",
  DOES_NOT_FIT: "#EF4444",
  OEM_REPLACEMENT: "#3B82F6",
};

function countFor(
  bd: PartCompatibilityReportWire["breakdown"],
  key: FitmentReportResultWire
): number {
  switch (key) {
    case "DIRECT_FIT":
      return bd.directFitCount;
    case "FIT_WITH_MODIFICATION":
      return bd.fitWithModificationCount;
    case "PARTIAL_FIT":
      return bd.partialFitCount;
    case "DOES_NOT_FIT":
      return bd.doesNotFitCount;
    case "OEM_REPLACEMENT":
      return bd.oemReplacementCount;
    default:
      return 0;
  }
}

export function FitmentReportScreen(props: {
  vehicleId: string;
  nodeId: string;
  partMasterId: string;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const apiBaseUrl = getApiBaseUrl();
  const endpoints = useMemo(
    () => createMotoTwinEndpoints(createApiClient({ baseUrl: apiBaseUrl })),
    [apiBaseUrl]
  );

  const [data, setData] = useState<PartCompatibilityReportWire | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reportFilter, setReportFilter] = useState<"ALL" | FitmentReportResultWire>("ALL");

  const missingParams = !props.nodeId.trim() || !props.partMasterId.trim();

  const crumbs = [
    { label: "Мой гараж", href: "/" },
    { label: "Мотоцикл", href: `/vehicles/${props.vehicleId}` },
    { label: "Корзина замен", href: `/vehicles/${props.vehicleId}/wishlist` },
    { label: "Совместимость" },
  ];

  useEffect(() => {
    if (missingParams) {
      setLoading(false);
      setLoadError("Укажите параметры partMasterId и nodeId.");
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setLoadError("");
      try {
        const report = await endpoints.getPartCompatibilityReport(props.vehicleId, {
          partMasterId: props.partMasterId,
          nodeId: props.nodeId,
        });
        if (!cancelled) setData(report);
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Не удалось загрузить отчёт.");
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [endpoints, missingParams, props.nodeId, props.partMasterId, props.vehicleId]);

  const backToPicker = useCallback(() => {
    router.replace(
      buildVehicleWishlistNewHref(props.vehicleId, props.nodeId || undefined)
    );
  }, [props.nodeId, props.vehicleId, router]);

  const communityHref = buildVehicleWishlistCommunityHref(props.vehicleId, {
    nodeId: props.nodeId,
    partMasterId: props.partMasterId,
  });

  const processedReports = useMemo(() => {
    if (!data) return [];
    return reportFilter === "ALL"
      ? data.reports
      : data.reports.filter((r) => r.fitmentResult === reportFilter);
  }, [data, reportFilter]);

  const verdictTitle =
    data?.confidence != null
      ? formatFitmentConfidenceStatusRu(data.confidence.status)
      : data?.sourcePriority.titleRu ?? "Совместимость";

  const verdictTierLine =
    data?.confidence != null
      ? data.confidence.tierLabelRu
      : data && data.breakdown.totalReports === 0
        ? "Нет отчётов владельцев"
        : "Оценка по отчётам владельцев";

  const supportParagraphs = data ? verdictSupportParagraphsRu(data) : [];
  const dominant = data ? deriveDominantFitmentResult(data.breakdown) : null;

  const safety = data
    ? isSafetyCriticalNodeContext({
        serviceGroup: data.node.serviceGroup,
        nodeCode: data.node.code,
      })
    : false;
  const brakesExtra = data
    ? isBrakesSafetyContext(data.node.code, data.node.serviceGroup)
    : false;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <InternalScreenChrome
          crumbs={crumbs}
          title="Совместимость"
          onBack={backToPicker}
          showHelp={false}
        />
        <View style={styles.centered}>
          <ActivityIndicator color={c.primaryAction} size="large" />
          <Text style={styles.muted}>Загрузка отчёта…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loadError || !data) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <InternalScreenChrome
          crumbs={crumbs}
          title="Совместимость"
          onBack={backToPicker}
          showHelp={false}
        />
        <View style={styles.centered}>
          <Text style={styles.error}>{loadError || "Нет данных"}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const partTitle = `${data.partMaster.brandName} · ${data.partMaster.title}`.trim();
  const vehicleLabel = `${data.vehicle.brandName} ${data.vehicle.modelName} ${data.vehicle.variantYear}`;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <InternalScreenChrome
        crumbs={crumbs}
        title="Отчёт о совместимости"
        onBack={backToPicker}
        showHelp={false}
      />
      <View style={styles.flex}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: 100 + insets.bottom },
          ]}
        >
          <View style={styles.heroCard}>
            <Text style={styles.heroPart}>{partTitle}</Text>
            <Text style={styles.heroSub}>{vehicleLabel}</Text>
            <Text style={styles.heroNode}>
              Узел: {data.node.name} ({data.node.code})
            </Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Итог по совместимости</Text>
            <Text style={styles.verdict}>{verdictTitle}</Text>
            <Text style={styles.verdictSub}>{verdictTierLine}</Text>
            {dominant ? (
              <Text style={styles.verdictHint}>
                Преобладающий результат: {fitmentReportResultHeadlineRu(dominant)}
              </Text>
            ) : null}
            {supportParagraphs.map((p, i) => (
              <Text key={i} style={styles.bodyMuted}>
                {p}
              </Text>
            ))}
            {safety ? (
              <Text style={styles.warn}>
                {brakesExtra
                  ? "Критичный узел тормозной системы — проверяйте совместимость особенно тщательно."
                  : "Критичный узел — ориентируйтесь на сервисную документацию и отчёты владельцев."}
              </Text>
            ) : null}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Распределение отчётов владельцев</Text>
            {RESULT_ORDER.map((key) => {
              const n = countFor(data.breakdown, key);
              const pct =
                data.breakdown.totalReports > 0
                  ? Math.round((n / data.breakdown.totalReports) * 100)
                  : 0;
              return (
                <View key={key} style={styles.barRow}>
                  <Text style={styles.barLabel}>{fitmentReportResultLabelRu(key)}</Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${pct}%`, backgroundColor: BAR_COLORS[key] },
                      ]}
                    />
                  </View>
                  <Text style={styles.barCount}>
                    {n} ({pct}%)
                  </Text>
                </View>
              );
            })}
            <Text style={styles.bodyMuted}>
              {ownerCountLabelRu(data.uniqueAuthorCount)} · всего записей{" "}
              {data.breakdown.totalReports}
            </Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Источник совместимости</Text>
            <Text style={styles.body}>{data.sourcePriority.titleRu}</Text>
            <Text style={styles.bodyMuted}>
              {sourcePriorityVariantLabelRu(data.sourcePriority.kind)}
            </Text>
            {data.sourcePriority.detailRu ? (
              <Text style={styles.bodyMuted}>{data.sourcePriority.detailRu}</Text>
            ) : null}
            {data.structured.catalogLineRu ? (
              <Text style={styles.bodyMuted}>Каталог: {data.structured.catalogLineRu}</Text>
            ) : null}
          </View>

          {data.rideProfileInsight ? (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Профиль езды в отчётах</Text>
              <Text style={styles.body}>{data.rideProfileInsight.headlineRu}</Text>
              {data.rideProfileInsight.topTags.map((t) => (
                <Text key={t.labelRu} style={styles.bodyMuted}>
                  {t.labelRu} — {t.percent}%
                </Text>
              ))}
            </View>
          ) : null}

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Отчёты владельцев</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              <Pressable
                onPress={() => setReportFilter("ALL")}
                style={[styles.filterChip, reportFilter === "ALL" && styles.filterChipActive]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    reportFilter === "ALL" && styles.filterChipTextActive,
                  ]}
                >
                  Все
                </Text>
              </Pressable>
              {RESULT_ORDER.map((key) => (
                <Pressable
                  key={key}
                  onPress={() => setReportFilter(key)}
                  style={[styles.filterChip, reportFilter === key && styles.filterChipActive]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      reportFilter === key && styles.filterChipTextActive,
                    ]}
                  >
                    {fitmentReportResultLabelRu(key)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            {processedReports.length === 0 ? (
              <Text style={styles.bodyMuted}>Нет отчётов для выбранного фильтра.</Text>
            ) : (
              processedReports.slice(0, 20).map((r) => (
                <View key={r.id} style={styles.reportRow}>
                  <Text style={styles.reportResult}>
                    {fitmentReportResultLabelRu(r.fitmentResult)}
                  </Text>
                  <Text style={styles.reportMeta}>
                    {installationStatusLabelRu(r.installationStatus)} · {r.createdByLabel}
                  </Text>
                  {r.comment ? (
                    <Text style={styles.reportComment} numberOfLines={4}>
                      {r.comment}
                    </Text>
                  ) : null}
                  {r.evidence.length > 0 ? (
                    <Text style={styles.reportMeta}>
                      Вложения:{" "}
                      {r.evidence.map((e) => evidenceTypeShortRu(e.type)).join(", ")}
                    </Text>
                  ) : null}
                </View>
              ))
            )}
          </View>

          {data.relatedParts.length > 0 ? (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Похожие детали</Text>
              {data.relatedParts.slice(0, 6).map((p) => (
                <Text key={p.partMasterId} style={styles.bodyMuted}>
                  {p.brandName} · {p.title} — {p.summaryLineRu}
                </Text>
              ))}
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.stickyBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <Pressable
            onPress={() => router.push(communityHref)}
            style={({ pressed }) => [styles.stickyPrimary, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.stickyPrimaryText}>Добавить свой опыт</Text>
          </Pressable>
          <Pressable
            onPress={backToPicker}
            style={({ pressed }) => [styles.stickySecondary, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.stickySecondaryText}>К подбору</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.canvas },
  flex: { flex: 1 },
  scroll: { padding: 16, gap: 12 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  muted: { fontSize: 14, color: c.textMuted },
  error: { fontSize: 14, color: c.error, textAlign: "center" },
  heroCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
    gap: 4,
  },
  heroPart: { fontSize: 17, fontWeight: "800", color: c.textPrimary },
  heroSub: { fontSize: 13, color: c.textSecondary },
  heroNode: { fontSize: 12, color: c.textMuted, marginTop: 4 },
  sectionCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
    gap: 8,
  },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: c.textPrimary },
  verdict: { fontSize: 16, fontWeight: "800", color: c.successText },
  verdictSub: { fontSize: 13, color: c.textSecondary },
  verdictHint: { fontSize: 12, color: c.textMuted },
  body: { fontSize: 14, color: c.textPrimary, lineHeight: 20 },
  bodyMuted: { fontSize: 12, color: c.textMuted, lineHeight: 18 },
  warn: { fontSize: 12, color: "#FBBF24", lineHeight: 18 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  barLabel: { width: 110, fontSize: 11, color: c.textSecondary },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.cardMuted,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 4 },
  barCount: { width: 52, fontSize: 11, color: c.textMuted, textAlign: "right" },
  filterScroll: { marginVertical: 4 },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border,
    marginRight: 8,
    backgroundColor: c.cardSubtle,
  },
  filterChipActive: { borderColor: c.primaryAction, backgroundColor: "rgba(255,90,0,0.12)" },
  filterChipText: { fontSize: 11, fontWeight: "600", color: c.textMuted },
  filterChipTextActive: { color: c.primaryAction, fontWeight: "800" },
  reportRow: {
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    gap: 4,
  },
  reportResult: { fontSize: 13, fontWeight: "800", color: c.textPrimary },
  reportMeta: { fontSize: 11, color: c.textMuted },
  reportComment: { fontSize: 12, color: c.textSecondary, lineHeight: 17 },
  stickyBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: c.border,
    backgroundColor: c.card,
  },
  stickyPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: c.primaryAction,
    alignItems: "center",
  },
  stickyPrimaryText: { fontSize: 13, fontWeight: "800", color: c.onPrimaryAction },
  stickySecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: "center",
    backgroundColor: c.cardSubtle,
  },
  stickySecondaryText: { fontSize: 13, fontWeight: "700", color: c.textSecondary },
});
