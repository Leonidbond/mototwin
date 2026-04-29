import type { CSSProperties } from "react";
import { productSemanticColors } from "@mototwin/design-tokens";

type BackButtonProps = {
  onClick: () => void;
  label?: string;
  style?: CSSProperties;
};

export function BackButton({ onClick, label = "Назад", style }: BackButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center justify-center rounded-lg border px-3.5 text-sm font-medium transition hover:opacity-90"
      style={{
        borderColor: productSemanticColors.borderStrong,
        backgroundColor: productSemanticColors.card,
        color: productSemanticColors.textPrimary,
        ...style,
      }}
    >
      {label}
    </button>
  );
}
