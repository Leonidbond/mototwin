"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import { buildWishlistDetailCompatibilitySummary } from "@mototwin/domain";
import type { PartCompatibilityReportWire } from "@mototwin/types";
import { buildFitmentReportHref } from "../picker/_components/PickerFitmentReportLink";
import styles from "./PartsCartPage.module.css";

const wishlistCompatibilityApi = createMotoTwinEndpoints(createApiClient({ baseUrl: "" }));

export function WishlistItemCompatibilityBlock(props: {
  vehicleId: string;
  nodeId: string | null;
  partMasterId: string | null;
  skuId: string | null;
}) {
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
        const { sku } = await wishlistCompatibilityApi.getPartSku(props.skuId!.trim());
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
  }, [props.partMasterId, props.skuId]);

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
        const data = await wishlistCompatibilityApi.getPartCompatibilityReport(props.vehicleId, {
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
  }, [canLoadReport, props.nodeId, props.vehicleId, resolvedPartMasterId]);

  const reportHref =
    canLoadReport && resolvedPartMasterId && props.nodeId
      ? buildFitmentReportHref(props.vehicleId, props.nodeId, resolvedPartMasterId)
      : null;

  const summary = report ? buildWishlistDetailCompatibilitySummary(report) : null;

  return (
    <div className={`${styles.kitBox} ${styles.compatibilityBox}`}>
      <p className={styles.sectionLabel}>Совместимость</p>

      {!props.nodeId ? (
        <p className={styles.compatibilityMuted}>Привяжите позицию к узлу мотоцикла.</p>
      ) : !props.skuId && !resolvedPartMasterId ? (
        <p className={styles.compatibilityMuted}>
          Нет каталожного SKU — отчёт доступен для деталей из каталога или своей карточки PartMaster.
        </p>
      ) : !resolvedPartMasterId && props.skuId ? (
        skuResolving ? (
          <p className={styles.compatibilityMuted}>Загрузка данных каталога…</p>
        ) : (
          <p className={styles.compatibilityMuted}>
            У этой позиции нет канонической карточки детали для отчёта совместимости.
          </p>
        )
      ) : loading ? (
        <p className={styles.compatibilityMuted}>Загрузка сводки совместимости…</p>
      ) : loadError ? (
        <p className={styles.compatibilityError}>{loadError}</p>
      ) : summary ? (
        <div className={styles.compatibilityBody}>
          <p className={styles.compatibilityVerdict}>{summary.verdictTitle}</p>
          <p className={styles.compatibilitySubline}>{summary.verdictSubline}</p>
          {summary.dominantLine ? (
            <p className={styles.compatibilityLine}>{summary.dominantLine}</p>
          ) : null}
          <p className={styles.compatibilityLine}>{summary.reportsLine}</p>
          <p className={styles.compatibilityLineMuted}>{summary.sourceLine}</p>
          {summary.catalogLine ? (
            <p className={styles.compatibilityLineMuted}>Каталог: {summary.catalogLine}</p>
          ) : null}
          {summary.supportLines.map((line) => (
            <p key={line} className={styles.compatibilityLineMuted}>
              {line}
            </p>
          ))}
        </div>
      ) : null}

      {reportHref ? (
        <Link href={reportHref} className={styles.compatibilityReportLink}>
          Отчёт о совместимости
          <span aria-hidden> →</span>
        </Link>
      ) : null}
    </div>
  );
}
