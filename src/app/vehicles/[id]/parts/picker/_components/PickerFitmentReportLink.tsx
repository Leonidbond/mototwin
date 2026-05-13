"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import type { PartRecommendationViewModel, PartSkuViewModel } from "@mototwin/types";
import {
  getPickerFitmentShortLabelRu,
  getPickerSkuCatalogFitHintRu,
} from "@mototwin/domain";
import { pickerColors } from "./picker-styles";

export function buildFitmentReportHref(
  vehicleId: string,
  nodeId: string,
  partMasterId: string
): string {
  return `/vehicles/${encodeURIComponent(vehicleId)}/parts/fitment-report?partMasterId=${encodeURIComponent(partMasterId)}&nodeId=${encodeURIComponent(nodeId)}`;
}

export function PickerFitmentReportLink(props: {
  vehicleId: string;
  nodeId: string | null;
  partMasterId: string | null;
  label: string;
  variant?: "cardFooter" | "inlineMuted";
}) {
  const href =
    props.partMasterId && props.nodeId
      ? buildFitmentReportHref(props.vehicleId, props.nodeId, props.partMasterId)
      : null;
  const style: CSSProperties =
    props.variant === "inlineMuted"
      ? {
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          marginTop: 4,
          fontSize: 11,
          fontWeight: 600,
          color: href ? pickerColors.primary : pickerColors.textSecondary,
          textDecoration: "none",
          border: "none",
          background: "transparent",
          padding: 0,
          cursor: href ? "pointer" : "default",
          opacity: href ? 1 : 0.55,
        }
      : {
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginTop: 4,
          fontSize: 12,
          fontWeight: 700,
          color: href ? pickerColors.primary : pickerColors.textMuted,
          textDecoration: "none",
          cursor: href ? "pointer" : "default",
          minWidth: 0,
        };

  if (!href) {
    return (
      <span
        style={style}
        title={!props.partMasterId ? "Нет канонической карточки детали для отчёта" : "Выберите узел"}
      >
        <CheckIcon color={pickerColors.successStrong} />
        <span style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{props.label}</span>
      </span>
    );
  }

  return (
    <Link href={href} style={style} title="Открыть отчёт о совместимости">
      <CheckIcon color={pickerColors.successStrong} />
      <span style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{props.label}</span>
      <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 800, opacity: 0.85 }}>→</span>
    </Link>
  );
}

export function PickerFitmentReportLinkFromRecommendation(props: {
  vehicleId: string;
  nodeId: string | null;
  recommendation: PartRecommendationViewModel;
  variant?: "cardFooter" | "inlineMuted";
}) {
  return (
    <PickerFitmentReportLink
      vehicleId={props.vehicleId}
      nodeId={props.nodeId}
      partMasterId={props.recommendation.partMasterId}
      label={getPickerFitmentShortLabelRu(props.recommendation)}
      variant={props.variant}
    />
  );
}

export function PickerFitmentReportLinkFromSku(props: {
  vehicleId: string;
  nodeId: string | null;
  sku: PartSkuViewModel;
  variant?: "cardFooter" | "inlineMuted";
}) {
  return (
    <PickerFitmentReportLink
      vehicleId={props.vehicleId}
      nodeId={props.nodeId}
      partMasterId={props.sku.partMasterId}
      label={getPickerSkuCatalogFitHintRu(props.sku)}
      variant={props.variant}
    />
  );
}

function CheckIcon({ color }: { color: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ flexShrink: 0, marginTop: 2 }}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
