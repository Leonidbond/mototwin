"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import type { PartRecommendationViewModel, PartSkuViewModel } from "@mototwin/types";
import {
  getPickerFitmentShortLabelRu,
  getPickerSkuCatalogFitHintRu,
} from "@mototwin/domain";
import { pickerColors } from "./picker-styles";

const REPORT_LINK_TITLE = "Отчёт о совместимости";

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
  /** Короткая подпись уровня совместимости (каталог / сообщество). */
  label: string;
  variant?: "cardFooter" | "inlineMuted";
}) {
  const href =
    props.partMasterId && props.nodeId
      ? buildFitmentReportHref(props.vehicleId, props.nodeId, props.partMasterId)
      : null;

  const isMuted = props.variant === "inlineMuted";
  const disabledHint = !props.partMasterId
    ? "Нет канонической карточки детали"
    : !props.nodeId
      ? "Выберите узел мотоцикла"
      : null;

  const wrapStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: isMuted ? 1 : 2,
    marginTop: isMuted ? 4 : 4,
    minWidth: 0,
    textDecoration: "none",
    cursor: href ? "pointer" : "default",
    opacity: href ? 1 : 0.7,
  };

  const titleRowStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
  };

  const reportTitleStyle: CSSProperties = {
    flex: 1,
    minWidth: 0,
    overflowWrap: "anywhere",
    fontSize: isMuted ? 11 : 12,
    fontWeight: 800,
    color: href ? pickerColors.primary : pickerColors.textMuted,
    lineHeight: 1.3,
  };

  const fitHintStyle: CSSProperties = {
    paddingLeft: 20,
    fontSize: 11,
    lineHeight: 1.35,
    fontWeight: 600,
    color: href ? pickerColors.textSecondary : pickerColors.textMuted,
    overflowWrap: "anywhere",
  };

  const disabledHintStyle: CSSProperties = {
    paddingLeft: 20,
    fontSize: 10,
    lineHeight: 1.35,
    fontStyle: "italic",
    color: pickerColors.textMuted,
    overflowWrap: "anywhere",
  };

  const content = (
    <>
      <span style={titleRowStyle}>
        <CheckIcon color={href ? pickerColors.successStrong : pickerColors.textMuted} />
        <span style={reportTitleStyle}>{REPORT_LINK_TITLE}</span>
        {href ? (
          <span
            style={{
              flexShrink: 0,
              fontSize: 11,
              fontWeight: 800,
              color: pickerColors.primary,
              opacity: 0.9,
            }}
            aria-hidden
          >
            →
          </span>
        ) : null}
      </span>
      {props.label.trim() ? <span style={fitHintStyle}>{props.label}</span> : null}
      {!href && disabledHint ? <span style={disabledHintStyle}>{disabledHint}</span> : null}
    </>
  );

  if (!href) {
    return (
      <span
        style={wrapStyle}
        title={disabledHint ?? REPORT_LINK_TITLE}
        aria-label={disabledHint ?? REPORT_LINK_TITLE}
      >
        {content}
      </span>
    );
  }

  return (
    <Link
      href={href}
      style={wrapStyle}
      title="Открыть отчёт о совместимости"
      aria-label={REPORT_LINK_TITLE}
    >
      {content}
    </Link>
  );
}

export function PickerFitmentReportLinkFromRecommendation(props: {
  vehicleId: string;
  nodeId: string | null;
  recommendation: PartRecommendationViewModel;
  variant?: "cardFooter" | "inlineMuted";
}) {
  const rec = props.recommendation;
  const nodeId = props.nodeId ?? rec.primaryNode?.id ?? null;
  return (
    <PickerFitmentReportLink
      vehicleId={props.vehicleId}
      nodeId={nodeId}
      partMasterId={rec.partMasterId}
      label={getPickerFitmentShortLabelRu(rec)}
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
  const sku = props.sku;
  const nodeId = props.nodeId ?? sku.primaryNodeId ?? sku.nodeLinks[0]?.nodeId ?? null;
  return (
    <PickerFitmentReportLink
      vehicleId={props.vehicleId}
      nodeId={nodeId}
      partMasterId={sku.partMasterId}
      label={getPickerSkuCatalogFitHintRu(sku)}
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
      style={{ flexShrink: 0 }}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
