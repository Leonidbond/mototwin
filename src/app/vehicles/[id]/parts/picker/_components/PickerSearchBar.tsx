"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef } from "react";
import { pickerColors } from "./picker-styles";

export function PickerSearchBar(props: {
  query: string;
  onQueryChange: (value: string) => void;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  /** Закрытие по клику вне блока (поиск + фильтры + панель). */
  onCloseFilters?: () => void;
  filtersActiveCount?: number;
  filtersPanel: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!props.filtersOpen || !props.onCloseFilters) {
      return;
    }
    const onPointerDown = (e: PointerEvent) => {
      const el = rootRef.current;
      if (!el || !(e.target instanceof Node)) {
        return;
      }
      if (!el.contains(e.target)) {
        props.onCloseFilters?.();
      }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [props.filtersOpen, props.onCloseFilters]);

  return (
    <div ref={rootRef} style={wrapperStyle}>
      <div style={containerStyle}>
        <div style={searchInputWrapStyle}>
          <SearchIcon />
          <input
            type="search"
            placeholder="Поиск по SKU, названию или бренду"
            value={props.query}
            onChange={(e) => props.onQueryChange(e.target.value)}
            style={inputStyle}
          />
          {props.query ? (
            <button
              type="button"
              onClick={() => props.onQueryChange("")}
              aria-label="Очистить поиск"
              style={clearButtonStyle}
            >
              ×
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={props.onToggleFilters}
          aria-expanded={props.filtersOpen}
          aria-controls="picker-catalog-filters-region"
          style={{
            ...filtersButtonStyle,
            ...(props.filtersOpen ? filtersButtonOpenStyle : {}),
          }}
        >
          <FiltersIcon />
          <span>Фильтры</span>
          {props.filtersActiveCount && props.filtersActiveCount > 0 ? (
            <span style={badgeStyle}>{props.filtersActiveCount}</span>
          ) : null}
        </button>
      </div>
      {props.filtersOpen ? (
        <div id="picker-catalog-filters-region" style={dropdownStyle}>
          {props.filtersPanel}
        </div>
      ) : null}
    </div>
  );
}

const wrapperStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  minWidth: 0,
  position: "relative",
  zIndex: 25,
};

const containerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
};

const searchInputWrapStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "0 14px",
  borderRadius: 14,
  backgroundColor: pickerColors.surface,
  border: `1px solid ${pickerColors.border}`,
  height: 48,
};

const inputStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  background: "transparent",
  border: "none",
  outline: "none",
  color: pickerColors.text,
  fontSize: 14,
  height: "100%",
};

const clearButtonStyle: CSSProperties = {
  background: "transparent",
  border: "none",
  color: pickerColors.textMuted,
  fontSize: 18,
  cursor: "pointer",
  padding: "0 4px",
};

const filtersButtonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  height: 48,
  padding: "0 16px",
  borderRadius: 14,
  backgroundColor: pickerColors.surface,
  border: `1px solid ${pickerColors.border}`,
  color: pickerColors.text,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  flexShrink: 0,
};

const filtersButtonOpenStyle: CSSProperties = {
  borderColor: pickerColors.primary,
  boxShadow: `0 0 0 1px ${pickerColors.primary}`,
};

const dropdownStyle: CSSProperties = {
  marginTop: 8,
  padding: 14,
  borderRadius: 14,
  backgroundColor: pickerColors.surface,
  border: `1px solid ${pickerColors.borderStrong}`,
  boxShadow: "0 14px 40px rgba(0,0,0,0.55)",
  boxSizing: "border-box",
};

const badgeStyle: CSSProperties = {
  marginLeft: 4,
  padding: "1px 6px",
  borderRadius: 999,
  backgroundColor: pickerColors.primary,
  color: pickerColors.onPrimary,
  fontSize: 11,
  fontWeight: 700,
};

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke={pickerColors.textMuted}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function FiltersIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke={pickerColors.text}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="6" y1="12" x2="18" y2="12" />
      <line x1="9" y1="18" x2="15" y2="18" />
    </svg>
  );
}
