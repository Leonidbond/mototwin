"use client";

import type { CSSProperties } from "react";
import { pickerColors } from "./picker-styles";

export type PickerCatalogFiltersPanelProps = {
  /** Краткое имя выбранного листа или null. */
  selectedLeafName: string | null;
  hasSelectedNode: boolean;
  onOpenNodePicker: () => void;
  /** Искать в API без nodeId, хотя узел выбран для рекомендаций. */
  searchWithoutNodeScope: boolean;
  onSearchWithoutNodeScopeChange: (value: boolean) => void;
  includeInactiveSkus: boolean;
  onIncludeInactiveSkusChange: (value: boolean) => void;
  /** Число в строке, пусто = без ограничения (фильтр на уже загруженной выдаче). */
  maxPriceRub: string;
  onMaxPriceRubChange: (value: string) => void;
};

export function PickerCatalogFiltersPanel(props: PickerCatalogFiltersPanelProps) {
  return (
    <div style={rootStyle}>
      <p style={introStyle}>
        Здесь настраивается только <strong>поиск по каталогу</strong> (от 2 символов). Узел для
        рекомендаций и комплектов — в чипах выше.
      </p>

      <div style={blockStyle}>
        <div style={blockTitleStyle}>Узел</div>
        <div style={nodeRowStyle}>
          <span style={nodeLabelStyle}>
            {props.hasSelectedNode ? props.selectedLeafName ?? "Выбран" : "Не выбран"}
          </span>
          <button type="button" onClick={props.onOpenNodePicker} style={linkButtonStyle}>
            Изменить
          </button>
        </div>
        {props.hasSelectedNode ? (
          <label style={checkRowStyle}>
            <input
              type="checkbox"
              checked={props.searchWithoutNodeScope}
              onChange={(e) => props.onSearchWithoutNodeScopeChange(e.target.checked)}
              style={checkboxStyle}
            />
            <span style={checkLabelStyle}>
              Искать по всему каталогу, без ограничения выбранным узлом
            </span>
          </label>
        ) : (
          <p style={hintStyle}>Выберите узел в чипе «Узел», чтобы сузить поиск по привязке в дереве.</p>
        )}
      </div>

      <div style={blockStyle}>
        <div style={blockTitleStyle}>Выдача каталога</div>
        <label style={checkRowStyle}>
          <input
            type="checkbox"
            checked={props.includeInactiveSkus}
            onChange={(e) => props.onIncludeInactiveSkusChange(e.target.checked)}
            style={checkboxStyle}
          />
          <span style={checkLabelStyle}>Показывать неактивные SKU</span>
        </label>
        <p style={finePrintStyle}>
          По умолчанию API отдаёт только активные позиции. Неактивные — снятые с производства и т.п.
        </p>
      </div>

      <div style={{ ...blockStyle, borderBottom: "none", paddingBottom: 0 }}>
        <div style={blockTitleStyle}>Стоимость в выдаче</div>
        <p style={hintStyle}>
          Ограничение по цене применяется к уже загруженным результатам поиска (до 100 строк), без
          отдельного запроса к серверу.
        </p>
        <div style={priceRowStyle}>
          <label htmlFor="picker-catalog-max-price" style={priceLabelStyle}>
            Не дороже, ₽
          </label>
          <input
            id="picker-catalog-max-price"
            type="text"
            inputMode="numeric"
            placeholder="например 15000"
            value={props.maxPriceRub}
            onChange={(e) => props.onMaxPriceRubChange(e.target.value.replace(/[^\d]/g, ""))}
            style={priceInputStyle}
          />
        </div>
      </div>
    </div>
  );
}

const rootStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const introStyle: CSSProperties = {
  margin: 0,
  fontSize: 12,
  color: pickerColors.textMuted,
  lineHeight: 1.45,
};

const blockStyle: CSSProperties = {
  paddingBottom: 12,
  borderBottom: `1px solid ${pickerColors.border}`,
};

const blockTitleStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: 0.6,
  textTransform: "uppercase",
  color: pickerColors.textSecondary,
  marginBottom: 8,
};

const nodeRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap",
  marginBottom: 8,
};

const nodeLabelStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: pickerColors.text,
  minWidth: 0,
};

const linkButtonStyle: CSSProperties = {
  padding: "6px 12px",
  borderRadius: 10,
  border: `1px solid ${pickerColors.borderStrong}`,
  background: "transparent",
  color: pickerColors.primary,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  flexShrink: 0,
};

const checkRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  cursor: "pointer",
};

const checkLabelStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: pickerColors.text,
  lineHeight: 1.35,
  paddingTop: 1,
};

const checkboxStyle: CSSProperties = {
  width: 18,
  height: 18,
  marginTop: 2,
  accentColor: pickerColors.primary,
  cursor: "pointer",
  flexShrink: 0,
};

const hintStyle: CSSProperties = {
  margin: "4px 0 0 0",
  fontSize: 12,
  color: pickerColors.textMuted,
  lineHeight: 1.4,
};

const finePrintStyle: CSSProperties = {
  ...hintStyle,
  marginTop: 8,
};

const priceRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 10,
  marginTop: 8,
};

const priceLabelStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: pickerColors.text,
};

const priceInputStyle: CSSProperties = {
  minWidth: 140,
  flex: 1,
  maxWidth: 220,
  padding: "8px 12px",
  borderRadius: 10,
  border: `1px solid ${pickerColors.border}`,
  backgroundColor: pickerColors.surfaceMuted,
  color: pickerColors.text,
  fontSize: 14,
};
