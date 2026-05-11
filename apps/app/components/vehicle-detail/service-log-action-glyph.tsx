import Svg, { Circle, Line, Path } from "react-native-svg";

/** Совпадает с web `ServiceTypeIcon` / `ServiceRowActionKind`. */
export type ServiceLogGlyphKind =
  | "REPLACE"
  | "SERVICE"
  | "INSPECT"
  | "CLEAN"
  | "ADJUST"
  | "STATE_UPDATE";

const vb = "0 0 24 24";

export function ServiceLogActionGlyph({
  kind,
  size = 11,
  color,
}: {
  kind: ServiceLogGlyphKind;
  size?: number;
  color: string;
}) {
  const s = color;
  const w = 2;
  const cap: "round" = "round";
  const join: "round" = "round";

  if (kind === "INSPECT") {
    return (
      <Svg width={size} height={size} viewBox={vb}>
        <Circle cx="11" cy="11" r="8" fill="none" stroke={s} strokeWidth={w} strokeLinecap={cap} strokeLinejoin={join} />
        <Path d="m21 21-4.35-4.35" fill="none" stroke={s} strokeWidth={w} strokeLinecap={cap} strokeLinejoin={join} />
      </Svg>
    );
  }
  if (kind === "STATE_UPDATE") {
    return (
      <Svg width={size} height={size} viewBox={vb}>
        <Path
          d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
          fill="none"
          stroke={s}
          strokeWidth={w}
          strokeLinecap={cap}
          strokeLinejoin={join}
        />
      </Svg>
    );
  }
  if (kind === "SERVICE") {
    return (
      <Svg width={size} height={size} viewBox={vb}>
        <Path d="M10 3h4v3h-4z" fill="none" stroke={s} strokeWidth={w} strokeLinecap={cap} strokeLinejoin={join} />
        <Path
          d="M8 6h10l1 4v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V10l1-4z"
          fill="none"
          stroke={s}
          strokeWidth={w}
          strokeLinecap={cap}
          strokeLinejoin={join}
        />
        <Path d="M18 8h2.5a1 1 0 0 1 1 1v2h-2" fill="none" stroke={s} strokeWidth={w} strokeLinecap={cap} strokeLinejoin={join} />
      </Svg>
    );
  }
  if (kind === "CLEAN") {
    return (
      <Svg width={size} height={size} viewBox={vb}>
        <Path
          d="M12 3v2.5M12 18.5V21M4.2 4.2l1.8 1.8M18 18l1.8 1.8M3 12h2.5M18.5 12H21M4.2 19.8l1.8-1.8M18 6l1.8-1.8"
          fill="none"
          stroke={s}
          strokeWidth={w}
          strokeLinecap={cap}
          strokeLinejoin={join}
        />
      </Svg>
    );
  }
  if (kind === "ADJUST") {
    return (
      <Svg width={size} height={size} viewBox={vb}>
        <Line x1="3" y1="8" x2="21" y2="8" stroke={s} strokeWidth={w} strokeLinecap={cap} strokeLinejoin={join} />
        <Circle cx="8" cy="8" r="2.5" fill={s} stroke="none" />
        <Line x1="3" y1="16" x2="21" y2="16" stroke={s} strokeWidth={w} strokeLinecap={cap} strokeLinejoin={join} />
        <Circle cx="16" cy="16" r="2.5" fill={s} stroke="none" />
      </Svg>
    );
  }
  /* REPLACE и прочее — ключ как на web `WrenchSvg` */
  return (
    <Svg width={size} height={size} viewBox={vb}>
      <Path
        d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
        fill="none"
        stroke={s}
        strokeWidth={w}
        strokeLinecap={cap}
        strokeLinejoin={join}
      />
    </Svg>
  );
}
