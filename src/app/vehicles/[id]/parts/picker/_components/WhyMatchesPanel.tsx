"use client";

import type { CSSProperties } from "react";
import { pickerColors } from "./picker-styles";

export function WhyMatchesPanel(props: { reasons: string[] }) {
  if (props.reasons.length === 0) return null;
  return (
    <aside style={panelStyle}>
      <h3 style={titleStyle}>Почему это подходит</h3>
      <ul style={listStyle}>
        {props.reasons.map((reason, i) => (
          <li key={i} style={itemStyle}>
            <CheckIcon />
            <span style={{ minWidth: 0, flex: 1, overflowWrap: "anywhere" }}>{reason}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke={pickerColors.successStrong}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ flexShrink: 0, marginTop: 3 }}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

const panelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: 14,
  borderRadius: 14,
  backgroundColor: pickerColors.surface,
  border: `1px solid ${pickerColors.border}`,
  minWidth: 0,
  maxWidth: "100%",
  boxSizing: "border-box",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 14,
  fontWeight: 700,
  color: pickerColors.text,
};

const listStyle: CSSProperties = {
  margin: 0,
  padding: 0,
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const itemStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 6,
  fontSize: 12,
  color: pickerColors.textSecondary,
  lineHeight: 1.4,
  minWidth: 0,
};
