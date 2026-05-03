"use client";

import type { CSSProperties } from "react";
import type {
  PartRecommendationViewModel,
  PickerMerchandiseRecommendations,
  VehicleRideProfile,
} from "@mototwin/types";
import { formatRideStyleChipLabelRu } from "@mototwin/domain";
import { RecommendationCard } from "./RecommendationCard";
import { pickerColors, pickerSectionSubtitleStyle, pickerSectionTitleStyle } from "./picker-styles";

export function RecommendationsSection(props: {
  nodeName: string | null;
  rideProfile: VehicleRideProfile | null;
  recommendations: PickerMerchandiseRecommendations;
  draftSkuIds: Set<string>;
  onAddSku: (rec: PartRecommendationViewModel) => void;
  onEditRideProfile?: () => void;
  onShowMore?: () => void;
  alternativesVisible?: boolean;
  isLoading: boolean;
}) {
  const { bestFit, bestValue, forYourRide, alternatives } = props.recommendations;
  const cards: Array<{ label: "BEST_FIT" | "BEST_VALUE" | "FOR_YOUR_RIDE"; rec: PartRecommendationViewModel }> = [];
  if (bestFit) cards.push({ label: "BEST_FIT", rec: bestFit });
  if (bestValue) cards.push({ label: "BEST_VALUE", rec: bestValue });
  if (forYourRide) cards.push({ label: "FOR_YOUR_RIDE", rec: forYourRide });

  return (
    <section style={sectionStyle}>
      <header style={headerStyle}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2
            style={{
              ...pickerSectionTitleStyle,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {props.nodeName
              ? `Рекомендации для узла «${props.nodeName}»`
              : "Рекомендации"}
          </h2>
          <p style={pickerSectionSubtitleStyle}>
            Подобрано на основе вашего мотоцикла, профиля езды и условий эксплуатации
          </p>
        </div>
        <button
          type="button"
          onClick={props.onEditRideProfile}
          style={rideStyleChipStyle}
          title="Изменить профиль езды"
        >
          <span style={{ fontSize: 12, color: pickerColors.textMuted }}>
            {formatRideStyleChipLabelRu(props.rideProfile)}
          </span>
          <PencilIcon />
        </button>
      </header>

      {props.isLoading ? (
        <div style={loadingStyle}>Загружаем рекомендации...</div>
      ) : cards.length === 0 ? (
        <div style={emptyStyle}>
          {props.nodeName
            ? "Для выбранного узла рекомендаций пока нет."
            : "Выберите узел, чтобы увидеть рекомендации."}
        </div>
      ) : (
        <div style={cardsGridStyle}>
          {cards.map(({ label, rec }) => (
            <RecommendationCard
              key={`${label}_${rec.skuId}`}
              label={label}
              recommendation={rec}
              isInDraft={props.draftSkuIds.has(rec.skuId)}
              onAdd={() => props.onAddSku(rec)}
            />
          ))}
        </div>
      )}

      {!props.isLoading && alternatives.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button type="button" onClick={props.onShowMore} style={showMoreButtonStyle}>
              {props.alternativesVisible
                ? "Свернуть дополнительные рекомендации"
                : `Показать ещё рекомендации (${alternatives.length})`}
            </button>
          </div>
          {props.alternativesVisible ? (
            <div style={alternativesListStyle}>
              {alternatives.map((rec) => (
                <div key={rec.skuId} style={altRowStyle}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: pickerColors.text }}>
                      {rec.brandName} {rec.canonicalName}
                    </div>
                    <div style={{ fontSize: 11, color: pickerColors.textMuted, marginTop: 2 }}>
                      {rec.recommendationLabel}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => props.onAddSku(rec)}
                    disabled={props.draftSkuIds.has(rec.skuId)}
                    style={{
                      ...altAddStyle,
                      opacity: props.draftSkuIds.has(rec.skuId) ? 0.5 : 1,
                      cursor: props.draftSkuIds.has(rec.skuId) ? "default" : "pointer",
                    }}
                  >
                    {props.draftSkuIds.has(rec.skuId) ? "✓" : "+"}
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

const sectionStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  minWidth: 0,
  width: "100%",
  boxSizing: "border-box",
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  minWidth: 0,
  width: "100%",
};

const rideStyleChipStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 12px",
  borderRadius: 999,
  background: "transparent",
  border: `1px solid ${pickerColors.border}`,
  color: pickerColors.textMuted,
  fontSize: 12,
  cursor: "pointer",
  whiteSpace: "nowrap",
  flexShrink: 0,
};

const cardsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
  gap: 12,
  width: "100%",
  minWidth: 0,
};

const loadingStyle: CSSProperties = {
  padding: 32,
  textAlign: "center",
  color: pickerColors.textMuted,
  fontSize: 13,
  border: `1px dashed ${pickerColors.border}`,
  borderRadius: 14,
};

const emptyStyle: CSSProperties = {
  padding: 24,
  textAlign: "center",
  color: pickerColors.textMuted,
  fontSize: 13,
  border: `1px dashed ${pickerColors.border}`,
  borderRadius: 14,
};

const showMoreButtonStyle: CSSProperties = {
  padding: "8px 14px",
  borderRadius: 999,
  background: "transparent",
  border: `1px solid ${pickerColors.border}`,
  color: pickerColors.textSecondary,
  fontSize: 12,
  cursor: "pointer",
};

const alternativesListStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const altRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 12px",
  borderRadius: 12,
  backgroundColor: pickerColors.surface,
  border: `1px solid ${pickerColors.border}`,
};

const altAddStyle: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 10,
  border: "none",
  backgroundColor: pickerColors.primary,
  color: pickerColors.onPrimary,
  fontSize: 18,
  fontWeight: 700,
  flexShrink: 0,
};

function PencilIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke={pickerColors.textMuted}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}
