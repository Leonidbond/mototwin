import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import type { NodeStatus, StatusSemanticKey } from "@mototwin/types";
import {
  productSemanticColors,
  radiusScale,
  statusSemanticTokens,
} from "@mototwin/design-tokens";

export type StatusBadgeSize = "sm" | "md";

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Pass a concrete status, a semantic key (incl. "UNKNOWN"), or null for neutral. */
  status: NodeStatus | StatusSemanticKey | null | undefined;
  /**
   * Required text content. The playbook rule: status must never be communicated by color only.
   */
  label: ReactNode;
  size?: StatusBadgeSize;
  withDot?: boolean;
}

const SIZE_HEIGHT: Record<StatusBadgeSize, number> = { sm: 22, md: 26 };
const SIZE_FONT: Record<StatusBadgeSize, number> = { sm: 11, md: 12 };
const SIZE_PADDING: Record<StatusBadgeSize, string> = {
  sm: "0 8px",
  md: "0 10px",
};

function resolveTokens(status: StatusBadgeProps["status"]) {
  if (!status) return statusSemanticTokens.UNKNOWN;
  return statusSemanticTokens[status];
}

export function getStatusBadgeStyle(
  status: StatusBadgeProps["status"]
): Pick<CSSProperties, "backgroundColor" | "borderColor" | "color"> {
  const tokens = resolveTokens(status);
  return {
    backgroundColor: tokens.background,
    borderColor: tokens.border,
    color: tokens.foreground,
  };
}

/**
 * Status badge with mandatory text label. Surfaces status using background,
 * border and foreground from `statusSemanticTokens` and always renders a
 * readable label so colour is not the only carrier of meaning.
 */
export function StatusBadge({
  status,
  label,
  size = "md",
  withDot = true,
  style,
  ...rest
}: StatusBadgeProps) {
  const tokens = resolveTokens(status);
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    height: SIZE_HEIGHT[size],
    padding: SIZE_PADDING[size],
    borderRadius: radiusScale.pill,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: tokens.border,
    backgroundColor: tokens.background,
    color: tokens.foreground,
    fontSize: SIZE_FONT[size],
    fontWeight: 600,
    lineHeight: 1,
    whiteSpace: "nowrap",
    ...style,
  };
  const dotStyle: CSSProperties = {
    width: 6,
    height: 6,
    borderRadius: radiusScale.pill,
    backgroundColor: tokens.accent === "transparent" ? tokens.foreground : tokens.accent,
    flex: "0 0 auto",
  };
  return (
    <span {...rest} style={base}>
      {withDot ? <span aria-hidden style={dotStyle} /> : null}
      <span>{label}</span>
    </span>
  );
}

export { productSemanticColors as __statusBadgeTokens };
