import type { CSSProperties } from "react";
import {
  TOP_NODE_ICON_LABELS_RU,
  TOP_NODE_SVG_BODIES,
  type TopNodeIconKey,
} from "@mototwin/icons";

export interface TopNodeIconProps {
  iconKey: TopNodeIconKey;
  size?: number;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Shared web renderer for top-node icons.
 * Uses the centralized path-data from `@mototwin/icons` and keeps
 * `stroke="currentColor"` so parent text color controls icon color.
 */
export function TopNodeIcon({
  iconKey,
  size = 20,
  strokeWidth = 1.75,
  className,
  style,
}: TopNodeIconProps) {
  const body = TOP_NODE_SVG_BODIES[iconKey];
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={TOP_NODE_ICON_LABELS_RU[iconKey]}
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: body }}
    />
  );
}
