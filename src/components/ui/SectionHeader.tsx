import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { productSemanticColors, typeScale } from "@mototwin/design-tokens";

export type SectionHeaderTitleVisual = "page" | "section";

export interface SectionHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** `page` = larger H1-style title (garage reference); default section H2. */
  titleVisual?: SectionHeaderTitleVisual;
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  titleVisual = "section",
  style,
  ...rest
}: SectionHeaderProps) {
  /** Web page title uses 36px (reference "Мой гараж" is visibly larger than section headings). */
  const titleTs = titleVisual === "page"
    ? { fontSize: 36, lineHeight: 44, weight: "700" }
    : typeScale.h2;
  const wrapper: CSSProperties = {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    ...style,
  };
  const titleCol: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    minWidth: 0,
  };
  const eyebrowStyle: CSSProperties = {
    fontSize: typeScale.overline.fontSize,
    lineHeight: `${typeScale.overline.lineHeight}px`,
    fontWeight: 600,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: productSemanticColors.textMuted,
  };
  const titleStyle: CSSProperties = {
    margin: 0,
    fontSize: titleTs.fontSize,
    lineHeight: `${titleTs.lineHeight}px`,
    fontWeight: Number(titleTs.weight),
    color: productSemanticColors.textPrimary,
    letterSpacing: titleVisual === "page" ? -0.35 : -0.2,
  };
  const subtitleStyle: CSSProperties = {
    margin: 0,
    fontSize: typeScale.caption.fontSize,
    lineHeight: `${typeScale.caption.lineHeight}px`,
    color: productSemanticColors.textMuted,
  };
  const actionsStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  };
  return (
    <div {...rest} style={wrapper}>
      <div style={titleCol}>
        {eyebrow ? <span style={eyebrowStyle}>{eyebrow}</span> : null}
        {titleVisual === "page"
          ? <h1 style={titleStyle}>{title}</h1>
          : <h2 style={titleStyle}>{title}</h2>
        }
        {subtitle ? <p style={subtitleStyle}>{subtitle}</p> : null}
      </div>
      {actions ? <div style={actionsStyle}>{actions}</div> : null}
    </div>
  );
}
