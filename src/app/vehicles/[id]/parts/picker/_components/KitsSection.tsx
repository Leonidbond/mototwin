"use client";

import type { CSSProperties } from "react";
import { forwardRef, useState } from "react";
import type { ServiceKitViewModel } from "@mototwin/types";
import { ServiceKitRow } from "./ServiceKitRow";
import { pickerColors, pickerSectionSubtitleStyle, pickerSectionTitleStyle } from "./picker-styles";

const VISIBLE_LIMIT = 3;

export const KitsSection = forwardRef<HTMLElement, KitsSectionProps>(function KitsSection(
  { kits, draftKitCodes, addingKitCode, onAddKit, isLoading },
  ref
) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? kits : kits.slice(0, VISIBLE_LIMIT);
  const remaining = Math.max(0, kits.length - VISIBLE_LIMIT);

  return (
    <section style={sectionStyle} ref={ref}>
      <header style={headerStyle}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2 style={pickerSectionTitleStyle}>Комплекты обслуживания</h2>
          <p style={pickerSectionSubtitleStyle}>
            Готовые наборы для обслуживания узлов вашего мотоцикла. Экономия времени и денег.
          </p>
        </div>
        {!expanded && remaining > 0 ? (
          <button type="button" onClick={() => setExpanded(true)} style={showMoreLinkStyle}>
            Показать ещё ({remaining})
          </button>
        ) : null}
      </header>

      {isLoading ? (
        <div style={loadingStyle}>Загружаем комплекты...</div>
      ) : kits.length === 0 ? (
        <div style={emptyStyle}>
          Для текущего контекста нет подходящих комплектов.
        </div>
      ) : (
        <div style={listStyle}>
          {visible.map((kit) => (
            <ServiceKitRow
              key={kit.code}
              kit={kit}
              isInDraft={draftKitCodes.has(kit.code)}
              isAdding={addingKitCode === kit.code}
              onAddKit={() => onAddKit(kit)}
            />
          ))}
        </div>
      )}
    </section>
  );
});

type KitsSectionProps = {
  kits: ServiceKitViewModel[];
  draftKitCodes: Set<string>;
  addingKitCode: string | null;
  onAddKit: (kit: ServiceKitViewModel) => void;
  isLoading: boolean;
};

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

const listStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const loadingStyle: CSSProperties = {
  padding: 24,
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

const showMoreLinkStyle: CSSProperties = {
  background: "transparent",
  border: "none",
  color: pickerColors.textSecondary,
  fontSize: 12,
  cursor: "pointer",
  padding: 0,
  flexShrink: 0,
};
