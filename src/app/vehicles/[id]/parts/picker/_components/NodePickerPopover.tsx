"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { pickerColors } from "./picker-styles";

export type NodePickerOption = {
  id: string;
  name: string;
  pathLabel: string;
};

export function NodePickerPopover(props: {
  isOpen: boolean;
  options: NodePickerOption[];
  /** When set and non-empty, shows «Топ-узлы» toggle filtered to this list. */
  topLeafOptions?: NodePickerOption[];
  onSelect: (nodeId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [topNodesOnly, setTopNodesOnly] = useState(false);

  const baseOptions = useMemo(() => {
    if (topNodesOnly && props.topLeafOptions && props.topLeafOptions.length > 0) {
      return props.topLeafOptions;
    }
    return props.options;
  }, [topNodesOnly, props.options, props.topLeafOptions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return baseOptions;
    return baseOptions.filter((opt) => {
      const label = `${opt.name} ${opt.pathLabel}`.toLowerCase();
      return label.includes(q);
    });
  }, [query, baseOptions]);

  const showTopToggle = Boolean(props.topLeafOptions && props.topLeafOptions.length > 0);

  if (!props.isOpen) return null;

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-label="Выберите узел">
      <div style={dialogStyle}>
        <header style={headerStyle}>
          <h2 style={titleStyle}>Выберите узел</h2>
          <button type="button" onClick={props.onClose} aria-label="Закрыть" style={closeButtonStyle}>
            ×
          </button>
        </header>
        <div style={searchRowStyle}>
          <input
            autoFocus
            type="search"
            placeholder="Поиск по названию узла"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={searchInputFlexStyle}
          />
          {showTopToggle ? (
            <button
              type="button"
              aria-pressed={topNodesOnly}
              onClick={() => setTopNodesOnly((v) => !v)}
              style={topToggleStyle(topNodesOnly)}
            >
              Топ-узлы
            </button>
          ) : null}
        </div>
        <div style={listStyle}>
          {filtered.length === 0 ? (
            <div style={emptyStyle}>Узлы не найдены</div>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  props.onSelect(opt.id);
                  props.onClose();
                }}
                style={listItemStyle}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: pickerColors.text }}>
                    {opt.name}
                  </div>
                  {opt.pathLabel ? (
                    <div style={{ fontSize: 11, color: pickerColors.textMuted, marginTop: 2 }}>
                      {opt.pathLabel}
                    </div>
                  ) : null}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  zIndex: 60,
};

const dialogStyle: CSSProperties = {
  width: "100%",
  maxWidth: 520,
  maxHeight: "calc(100vh - 32px)",
  borderRadius: 18,
  padding: 16,
  backgroundColor: pickerColors.surface,
  border: `1px solid ${pickerColors.border}`,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 16,
  fontWeight: 700,
  color: pickerColors.text,
};

const closeButtonStyle: CSSProperties = {
  background: "transparent",
  border: "none",
  color: pickerColors.textMuted,
  fontSize: 22,
  cursor: "pointer",
};

const searchRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "center",
};

const searchInputFlexStyle: CSSProperties = {
  flex: "1 1 200px",
  minWidth: 0,
  padding: "10px 12px",
  borderRadius: 12,
  backgroundColor: pickerColors.surfaceMuted,
  border: `1px solid ${pickerColors.border}`,
  color: pickerColors.text,
  fontSize: 13,
  outline: "none",
};

function topToggleStyle(active: boolean): CSSProperties {
  return {
    flex: "0 0 auto",
    padding: "8px 12px",
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    border: `1px solid ${active ? pickerColors.text : pickerColors.border}`,
    backgroundColor: active ? pickerColors.surfaceMuted : "transparent",
    color: pickerColors.text,
    whiteSpace: "nowrap",
  };
}

const listStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  maxHeight: 380,
  overflow: "auto",
};

const listItemStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 12px",
  borderRadius: 10,
  backgroundColor: "transparent",
  border: `1px solid ${pickerColors.border}`,
  color: pickerColors.text,
  textAlign: "left",
  cursor: "pointer",
  width: "100%",
};

const emptyStyle: CSSProperties = {
  padding: 24,
  textAlign: "center",
  color: pickerColors.textMuted,
  fontSize: 12,
};
