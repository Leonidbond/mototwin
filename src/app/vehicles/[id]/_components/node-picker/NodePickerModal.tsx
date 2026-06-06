"use client";

import {
  groupNodePickerOptionsByTopLevel,
  NODE_TREE_PLAN_LOCKED_HINT_RU,
  nodePickerGroupHeadingRu,
} from "@mototwin/domain";
import { SubscriptionLock } from "@/components/subscription/SubscriptionLock";
import { productSemanticColors } from "@mototwin/design-tokens";
import Image from "next/image";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { getNodeTreeIconWebSrc } from "@/node-tree-icons";

export type SharedNodePickerOption = {
  id: string;
  name: string;
  pathLabel?: string;
  level?: number;
  /** Catalog code — when set, row shows tree icon */
  code?: string;
  /** Free/Rider: лист вне топ-набора — только просмотр в полном списке. */
  planLocked?: boolean;
};

export type NodePickerModalProps = {
  open: boolean;
  title?: string;
  options: SharedNodePickerOption[];
  /** Optional subset for the «Топ-узлы» toggle, matching the part picker UX. */
  topOptions?: SharedNodePickerOption[];
  mode?: "single" | "multi";
  selectedIds?: Set<string>;
  disabledIds?: Set<string>;
  confirmLabel?: string;
  emptyLabel?: string;
  searchPlaceholder?: string;
  onClose: () => void;
  onSelect?: (nodeId: string) => void;
  onConfirm?: (nodeIds: string[]) => void;
};

export function NodePickerModal({
  open,
  title = "Выберите узел",
  options,
  topOptions,
  mode = "single",
  selectedIds,
  disabledIds,
  confirmLabel = "Добавить",
  emptyLabel = "Узлы не найдены",
  searchPlaceholder = "Поиск по названию узла",
  onClose,
  onSelect,
  onConfirm,
}: NodePickerModalProps) {
  const [query, setQuery] = useState("");
  const [topNodesOnly, setTopNodesOnly] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [localSelected, setLocalSelected] = useState<Set<string>>(() => {
    const next = new Set<string>();
    if (selectedIds) {
      for (const id of selectedIds) next.add(id);
    }
    return next;
  });

  const baseOptions = useMemo(() => {
    if (topNodesOnly && topOptions && topOptions.length > 0) {
      return topOptions;
    }
    return options;
  }, [options, topNodesOnly, topOptions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return baseOptions;
    return baseOptions.filter((opt) => {
      const label = `${opt.name} ${opt.pathLabel ?? ""} ${opt.id}`.toLowerCase();
      return label.includes(q);
    });
  }, [baseOptions, query]);

  const groupedList = useMemo(() => groupNodePickerOptionsByTopLevel(filtered), [filtered]);

  const showTopToggle = Boolean(topOptions && topOptions.length > 0);
  const hasPlanLockedLeaves = useMemo(
    () => options.some((option) => option.planLocked),
    [options]
  );

  useEffect(() => {
    if (!open) return;
    if (hasPlanLockedLeaves && showTopToggle) {
      setTopNodesOnly(true);
    }
  }, [hasPlanLockedLeaves, open, showTopToggle]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const sync = () => setIsCompactViewport(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (!open) return null;

  const resetAndClose = () => {
    setQuery("");
    setTopNodesOnly(false);
    setLocalSelected(new Set());
    onClose();
  };

  const toggle = (id: string) => {
    setLocalSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const submitMulti = () => {
    if (localSelected.size === 0) {
      resetAndClose();
      return;
    }
    onConfirm?.(Array.from(localSelected));
    setLocalSelected(new Set());
    resetAndClose();
  };

  return (
    <div
      style={{
        ...overlayStyle,
        padding: isCompactViewport ? 10 : 16,
      }}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          resetAndClose();
        }
      }}
    >
      <div
        style={{
          ...dialogStyle,
          maxWidth: isCompactViewport ? "calc(100vw - 20px)" : 520,
          padding: isCompactViewport ? 12 : 16,
          borderRadius: isCompactViewport ? 14 : 18,
          gap: isCompactViewport ? 10 : 12,
        }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header style={headerStyle}>
          <h2 style={{ ...titleStyle, fontSize: isCompactViewport ? 15 : 16 }}>{title}</h2>
          <button type="button" onClick={resetAndClose} aria-label="Закрыть" style={closeButtonStyle}>
            ×
          </button>
        </header>
        <div style={searchRowStyle}>
          <input
            autoFocus
            type="search"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            style={{
              ...searchInputFlexStyle,
              padding: isCompactViewport ? "8px 10px" : "10px 12px",
              fontSize: isCompactViewport ? 12 : 13,
              borderRadius: isCompactViewport ? 10 : 12,
            }}
          />
          {showTopToggle ? (
            <button
              type="button"
              aria-pressed={topNodesOnly}
              onClick={() => setTopNodesOnly((value) => !value)}
              style={topToggleStyle(topNodesOnly, isCompactViewport)}
            >
              Топ-узлы
            </button>
          ) : null}
        </div>
        {mode === "multi" ? (
          <p className="text-xs" style={{ color: productSemanticColors.textMuted }}>
            {`Выбрано: ${localSelected.size}`}
          </p>
        ) : null}
        {showTopToggle && !topNodesOnly && hasPlanLockedLeaves ? (
          <SubscriptionLock
            variant="surface"
            title="Полное дерево (просмотр)"
            description={NODE_TREE_PLAN_LOCKED_HINT_RU}
            requiredPlan="PRO"
          />
        ) : null}
        <div
          style={{
            ...listStyle,
            maxHeight: isCompactViewport ? "min(52vh, 300px)" : 380,
          }}
        >
          {filtered.length === 0 ? (
            <div style={emptyStyle}>{emptyLabel}</div>
          ) : (
            groupedList.map(({ groupKey, items }, groupIndex) => (
              <div key={groupKey} style={groupIndex > 0 ? groupWrapStyle : undefined}>
                <div style={groupHeadingStyle}>{nodePickerGroupHeadingRu(groupKey)}</div>
                {items.map((opt) => {
                  const planLocked = Boolean(opt.planLocked);
                  const disabled = (disabledIds?.has(opt.id) ?? false) || planLocked;
                  const active = mode === "multi" ? localSelected.has(opt.id) : (selectedIds?.has(opt.id) ?? false);
                  const rowIconSrc = opt.code ? getNodeTreeIconWebSrc(opt.code, opt.name) : "";
                  const iconSize = isCompactViewport ? 22 : 28;
                  const imageSize = isCompactViewport ? 20 : 24;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        if (disabled) return;
                        if (mode === "multi") {
                          toggle(opt.id);
                          return;
                        }
                        onSelect?.(opt.id);
                        resetAndClose();
                      }}
                      style={listItemStyle(active, disabled, planLocked, isCompactViewport)}
                    >
                      {mode === "multi" ? (
                        <span style={checkboxStyle(active)} aria-hidden>
                          {active ? "✓" : ""}
                        </span>
                      ) : null}
                      {rowIconSrc ? (
                        <span
                          style={{
                            flex: "0 0 auto",
                            width: iconSize,
                            height: iconSize,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          aria-hidden
                        >
                          <Image
                            src={rowIconSrc}
                            alt=""
                            width={imageSize}
                            height={imageSize}
                            className="object-contain"
                          />
                        </span>
                      ) : null}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: isCompactViewport ? 12 : 13,
                            fontWeight: 600,
                            color: planLocked
                              ? productSemanticColors.textMuted
                              : productSemanticColors.textPrimary,
                          }}
                        >
                          {opt.name}
                        </div>
                        {opt.pathLabel ? (
                          <div
                            style={{
                              fontSize: isCompactViewport ? 10 : 11,
                              color: productSemanticColors.textMuted,
                              marginTop: 2,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {opt.pathLabel}
                          </div>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        {mode === "multi" ? (
          <footer style={footerStyle}>
            <button
              type="button"
              onClick={resetAndClose}
              style={secondaryButtonStyle(isCompactViewport)}
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={submitMulti}
              disabled={localSelected.size === 0}
              style={{
                ...primaryButtonStyle(isCompactViewport),
                opacity: localSelected.size === 0 ? 0.45 : 1,
                cursor: localSelected.size === 0 ? "not-allowed" : "pointer",
              }}
            >
              {`${confirmLabel}${localSelected.size > 0 ? ` (${localSelected.size})` : ""}`}
            </button>
          </footer>
        ) : null}
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
  maxWidth: "min(520px, calc(100vw - 32px))",
  maxHeight: "calc(100vh - 32px)",
  borderRadius: 18,
  padding: 16,
  backgroundColor: productSemanticColors.card,
  border: `1px solid ${productSemanticColors.border}`,
  display: "flex",
  flexDirection: "column",
  gap: 12,
  color: productSemanticColors.textPrimary,
  boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
  overflowX: "hidden",
  boxSizing: "border-box",
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 16,
  fontWeight: 700,
  color: productSemanticColors.textPrimary,
};

const closeButtonStyle: CSSProperties = {
  background: "transparent",
  border: "none",
  color: productSemanticColors.textMuted,
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
  flex: "1 1 0",
  minWidth: 0,
  padding: "10px 12px",
  borderRadius: 12,
  backgroundColor: productSemanticColors.cardMuted,
  border: `1px solid ${productSemanticColors.border}`,
  color: productSemanticColors.textPrimary,
  fontSize: 13,
  outline: "none",
};

function topToggleStyle(active: boolean, compact = false): CSSProperties {
  return {
    flex: "0 0 auto",
    padding: compact ? "6px 10px" : "8px 12px",
    borderRadius: compact ? 10 : 12,
    fontSize: compact ? 12 : 13,
    fontWeight: 600,
    cursor: "pointer",
    border: `1px solid ${active ? productSemanticColors.textPrimary : productSemanticColors.border}`,
    backgroundColor: active ? productSemanticColors.cardMuted : "transparent",
    color: productSemanticColors.textPrimary,
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

const groupWrapStyle: CSSProperties = {
  marginTop: 6,
};

const groupHeadingStyle: CSSProperties = {
  padding: "4px 2px 2px",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: productSemanticColors.textMuted,
};

function listItemStyle(
  active: boolean,
  disabled: boolean,
  planLocked: boolean,
  compact = false
): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: compact ? 6 : 8,
    padding: compact ? "8px 10px" : "10px 12px",
    borderRadius: compact ? 8 : 10,
    backgroundColor: planLocked
      ? productSemanticColors.cardSubtle
      : active
        ? "rgba(249, 115, 22, 0.08)"
        : "transparent",
    border: `1px solid ${active && !planLocked ? productSemanticColors.primaryAction : productSemanticColors.border}`,
    color: productSemanticColors.textPrimary,
    textAlign: "left",
    cursor: disabled ? "not-allowed" : "pointer",
    width: "100%",
    opacity: planLocked ? 0.38 : disabled ? 0.45 : 1,
    boxSizing: "border-box",
  };
}

function checkboxStyle(active: boolean): CSSProperties {
  return {
    width: 18,
    height: 18,
    borderRadius: 6,
    border: `1px solid ${active ? productSemanticColors.primaryAction : productSemanticColors.border}`,
    color: productSemanticColors.primaryAction,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flex: "0 0 auto",
    fontSize: 12,
    fontWeight: 800,
  };
}

const emptyStyle: CSSProperties = {
  padding: 24,
  textAlign: "center",
  color: productSemanticColors.textMuted,
  fontSize: 12,
};

const footerStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "flex-end",
  gap: 8,
  borderTop: `1px solid ${productSemanticColors.border}`,
  paddingTop: 12,
};

const secondaryButtonStyle = (compact = false): CSSProperties => ({
  height: compact ? 36 : 40,
  borderRadius: compact ? 10 : 12,
  border: `1px solid ${productSemanticColors.border}`,
  backgroundColor: productSemanticColors.cardMuted,
  color: productSemanticColors.textPrimary,
  padding: compact ? "0 12px" : "0 16px",
  fontSize: compact ? 12 : 13,
  fontWeight: 700,
});

const primaryButtonStyle = (compact = false): CSSProperties => ({
  height: compact ? 36 : 40,
  borderRadius: compact ? 10 : 12,
  border: `1px solid ${productSemanticColors.primaryAction}`,
  backgroundColor: productSemanticColors.primaryAction,
  color: productSemanticColors.onPrimaryAction,
  padding: compact ? "0 14px" : "0 18px",
  fontSize: compact ? 12 : 13,
  fontWeight: 700,
});
