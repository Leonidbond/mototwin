import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import { buildWishlistDetailCompatibilitySummary } from "@mototwin/domain";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import type { PartCompatibilityReportWire } from "@mototwin/types";
import { getApiBaseUrl } from "../../src/api-base-url";
import { buildVehicleWishlistFitmentReportHref } from "./hrefs";

const REF = {
  panelBorder: "#1f2937",
  rowBg: "#0d141c",
  textMuted: "#9ca3af",
  metaLine: "#c4cbd4",
  primary: "#ff7a00",
};

export function WishlistItemCompatibilityBlock(props: {
  vehicleId: string;
  nodeId: string | null;
  partMasterId: string | null;
  skuId: string | null;
}) {
  const router = useRouter();
  const apiBaseUrl = getApiBaseUrl();
  const endpoints = useMemo(
    () => createMotoTwinEndpoints(createApiClient({ baseUrl: apiBaseUrl })),
    [apiBaseUrl]
  );

  const [resolvedPartMasterId, setResolvedPartMasterId] = useState<string | null>(
    props.partMasterId
  );
  const [skuResolving, setSkuResolving] = useState(false);
  const [report, setReport] = useState<PartCompatibilityReportWire | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    setResolvedPartMasterId(props.partMasterId);
  }, [props.partMasterId]);

  useEffect(() => {
    if (props.partMasterId || !props.skuId?.trim()) {
      setSkuResolving(false);
      return;
    }
    let cancelled = false;
    setSkuResolving(true);
    void (async () => {
      try {
        const { sku } = await endpoints.getPartSku(props.skuId!.trim());
        if (!cancelled) {
          setResolvedPartMasterId(sku.partMasterId ?? null);
        }
      } catch {
        if (!cancelled) {
          setResolvedPartMasterId(null);
        }
      } finally {
        if (!cancelled) {
          setSkuResolving(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [endpoints, props.partMasterId, props.skuId]);

  const canLoadReport = Boolean(props.vehicleId && props.nodeId && resolvedPartMasterId);

  useEffect(() => {
    if (!canLoadReport) {
      setReport(null);
      setLoadError("");
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setLoadError("");
      try {
        const data = await endpoints.getPartCompatibilityReport(props.vehicleId, {
          partMasterId: resolvedPartMasterId!,
          nodeId: props.nodeId!,
        });
        if (!cancelled) {
          setReport(data);
        }
      } catch (e) {
        if (!cancelled) {
          setReport(null);
          setLoadError(e instanceof Error ? e.message : "Не удалось загрузить сводку.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canLoadReport, endpoints, props.nodeId, props.vehicleId, resolvedPartMasterId]);

  const reportHref =
    canLoadReport && resolvedPartMasterId && props.nodeId
      ? buildVehicleWishlistFitmentReportHref(props.vehicleId, {
          nodeId: props.nodeId,
          partMasterId: resolvedPartMasterId,
        })
      : null;

  const summary = report ? buildWishlistDetailCompatibilitySummary(report) : null;

  return (
    <View style={styles.box}>
      <Text style={styles.sectionLabel}>Совместимость</Text>

      {!props.nodeId ? (
        <Text style={styles.muted}>Привяжите позицию к узлу мотоцикла.</Text>
      ) : !props.skuId && !resolvedPartMasterId ? (
        <Text style={styles.muted}>
          Нет каталожного SKU — отчёт доступен для деталей из каталога или своей карточки PartMaster.
        </Text>
      ) : !resolvedPartMasterId && props.skuId ? (
        skuResolving ? (
          <Text style={styles.muted}>Загрузка данных каталога…</Text>
        ) : (
          <Text style={styles.muted}>
            У этой позиции нет канонической карточки детали для отчёта совместимости.
          </Text>
        )
      ) : loading ? (
        <Text style={styles.muted}>Загрузка сводки совместимости…</Text>
      ) : loadError ? (
        <Text style={styles.error}>{loadError}</Text>
      ) : summary ? (
        <View style={styles.body}>
          <Text style={styles.verdict}>{summary.verdictTitle}</Text>
          <Text style={styles.subline}>{summary.verdictSubline}</Text>
          {summary.dominantLine ? <Text style={styles.line}>{summary.dominantLine}</Text> : null}
          <Text style={styles.line}>{summary.reportsLine}</Text>
          <Text style={styles.lineMuted}>{summary.sourceLine}</Text>
          {summary.catalogLine ? (
            <Text style={styles.lineMuted}>Каталог: {summary.catalogLine}</Text>
          ) : null}
          {summary.supportLines.map((line) => (
            <Text key={line} style={styles.lineMuted}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}

      {reportHref ? (
        <Pressable
          onPress={() => router.push(reportHref)}
          style={({ pressed }) => [styles.reportLink, pressed && styles.reportLinkPressed]}
          accessibilityRole="button"
          accessibilityLabel="Открыть отчёт о совместимости"
        >
          <Text style={styles.reportLinkText}>Отчёт о совместимости →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginHorizontal: 16,
    marginTop: 6,
    borderWidth: 1,
    borderColor: REF.panelBorder,
    borderRadius: 8,
    backgroundColor: REF.rowBg,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sectionLabel: {
    marginBottom: 7,
    fontSize: 12,
    fontWeight: "800",
    color: REF.textMuted,
    lineHeight: 16,
  },
  body: {
    gap: 4,
    marginBottom: 8,
  },
  verdict: {
    fontSize: 13,
    fontWeight: "800",
    color: c.textPrimary,
    lineHeight: 18,
  },
  subline: {
    fontSize: 11,
    fontWeight: "700",
    color: REF.primary,
    lineHeight: 15,
  },
  line: {
    fontSize: 11,
    fontWeight: "600",
    color: REF.metaLine,
    lineHeight: 15,
  },
  lineMuted: {
    fontSize: 11,
    fontWeight: "500",
    color: REF.textMuted,
    lineHeight: 15,
  },
  muted: {
    marginBottom: 8,
    fontSize: 11,
    fontWeight: "500",
    color: REF.textMuted,
    lineHeight: 15,
  },
  error: {
    marginBottom: 8,
    fontSize: 11,
    fontWeight: "600",
    color: c.error,
    lineHeight: 15,
  },
  reportLink: {
    alignSelf: "flex-start",
    marginTop: 2,
    paddingVertical: 4,
  },
  reportLinkPressed: {
    opacity: 0.85,
  },
  reportLinkText: {
    fontSize: 12,
    fontWeight: "800",
    color: REF.primary,
  },
});
