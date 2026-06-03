"use client";

import type { CSSProperties, ReactNode } from "react";
import { productSemanticColors } from "@mototwin/design-tokens";

export const OPEN_APP_HELP_EVENT = "mototwin:open-help";

export function openAppHelp(): void {
  window.dispatchEvent(new CustomEvent(OPEN_APP_HELP_EVENT));
}

export function AppHelpTrigger({
  label,
  children,
  style,
}: {
  label: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => openAppHelp()}
      style={style ?? defaultTriggerStyle}
    >
      {children}
    </button>
  );
}

const defaultTriggerStyle: CSSProperties = {
  position: "relative",
  display: "inline-flex",
  width: 40,
  height: 40,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  border: `1px solid ${productSemanticColors.borderStrong}`,
  backgroundColor: productSemanticColors.card,
  color: productSemanticColors.textPrimary,
  cursor: "pointer",
  padding: 0,
};
