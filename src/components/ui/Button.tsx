"use client";

import type {
  ButtonHTMLAttributes,
  CSSProperties,
  ForwardedRef,
  ReactNode,
} from "react";
import { forwardRef } from "react";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md";

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  children?: ReactNode;
  block?: boolean;
}

const SIZE_HEIGHT: Record<ButtonSize, number> = { sm: 34, md: 42 };
const SIZE_PADDING_X: Record<ButtonSize, number> = { sm: 12, md: 16 };
const SIZE_FONT: Record<ButtonSize, number> = { sm: 13, md: 14 };

function variantStyle(variant: ButtonVariant): CSSProperties {
  switch (variant) {
    case "primary":
      return {
        backgroundColor: productSemanticColors.primaryAction,
        color: productSemanticColors.onPrimaryAction,
        border: "1px solid transparent",
      };
    case "secondary":
      return {
        backgroundColor: productSemanticColors.card,
        color: productSemanticColors.textPrimary,
        border: `1px solid ${productSemanticColors.borderStrong}`,
      };
    case "ghost":
    default:
      return {
        backgroundColor: "transparent",
        color: productSemanticColors.textPrimary,
        border: `1px solid ${productSemanticColors.border}`,
      };
  }
}

export const Button = forwardRef(function ButtonImpl(
  {
    variant = "secondary",
    size = "md",
    leadingIcon,
    trailingIcon,
    block = false,
    children,
    style,
    type = "button",
    ...rest
  }: ButtonProps,
  ref: ForwardedRef<HTMLButtonElement>
) {
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: SIZE_HEIGHT[size],
    padding: `0 ${SIZE_PADDING_X[size]}px`,
    borderRadius: radiusScale.md,
    fontWeight: 600,
    fontSize: SIZE_FONT[size],
    lineHeight: 1,
    cursor: rest.disabled ? "not-allowed" : "pointer",
    opacity: rest.disabled ? 0.55 : 1,
    transition: "opacity 120ms ease, transform 120ms ease",
    width: block ? "100%" : undefined,
    ...variantStyle(variant),
    ...style,
  };
  return (
    <button ref={ref} type={type} {...rest} style={base}>
      {leadingIcon ? <span aria-hidden>{leadingIcon}</span> : null}
      {children}
      {trailingIcon ? <span aria-hidden>{trailingIcon}</span> : null}
    </button>
  );
});
