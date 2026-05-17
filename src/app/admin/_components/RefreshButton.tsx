"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";
import { RefreshCcw } from "./icons";
import { revalidateAdminAction } from "../actions";

interface RefreshButtonProps {
  /** Path slice that should be revalidated (relative to /admin). */
  path?: string;
  label?: string;
}

/**
 * Compact "обновить данные" button for admin pages. Calls a server action that
 * invokes `revalidatePath('/admin' + path)` and then triggers `router.refresh()`
 * so the active route re-renders with fresh server data.
 */
export function RefreshButton({ path = "", label = "Обновить" }: RefreshButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() =>
        startTransition(async () => {
          await revalidateAdminAction(path);
          router.refresh();
        })
      }
      disabled={pending}
      style={buttonStyle}
      title="Сбросить кэш и перезагрузить"
    >
      <RefreshCcw size={14} style={{ opacity: pending ? 0.5 : 1 }} />
      <span>{pending ? "Обновляем…" : label}</span>
    </button>
  );
}

const buttonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 32,
  padding: "0 12px",
  borderRadius: radiusScale.sm,
  backgroundColor: productSemanticColors.cardMuted,
  border: `1px solid ${productSemanticColors.border}`,
  color: productSemanticColors.textPrimary,
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
};
