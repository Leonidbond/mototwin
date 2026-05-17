import type { ReactNode } from "react";
import { productSemanticColors } from "@mototwin/design-tokens";
import type { AdminSelfWire } from "@mototwin/types";
import { AdminTopBar } from "./AdminTopBar";

interface AdminPageChromeProps {
  title: string;
  self: AdminSelfWire;
  /** When true, renders the period picker in the top bar. */
  showPeriodPicker?: boolean;
  /** Optional content placed before the bell in the top bar. */
  rightSlot?: ReactNode;
  children: ReactNode;
  /** Padding around <main> content. Defaults to standard spacing. */
  padded?: boolean;
}

/** Standard chrome for non-dashboard admin pages: TopBar + scrollable content. */
export function AdminPageChrome({
  title,
  self,
  showPeriodPicker = false,
  rightSlot,
  children,
  padded = true,
}: AdminPageChromeProps) {
  return (
    <>
      <AdminTopBar
        title={title}
        self={self}
        showPeriodPicker={showPeriodPicker}
        rightSlot={rightSlot}
      />
      <div
        style={{
          flex: 1,
          padding: padded ? "20px 28px 32px" : 0,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          backgroundColor: productSemanticColors.canvas,
          minWidth: 0,
        }}
      >
        {children}
      </div>
    </>
  );
}
