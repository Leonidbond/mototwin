import type { ReactNode } from "react";
import { productSemanticColors } from "@mototwin/design-tokens";
import type { AdminSelfWire } from "@mototwin/types";
import { CommandPalette } from "./CommandPalette";
import { PeriodPicker } from "./PeriodPicker";
import { AlertsBell } from "./AlertsBell";
import { AdminUserMenu } from "./AdminUserMenu";

interface AdminTopBarProps {
  title: string;
  self: AdminSelfWire;
  /** When true, the right-aligned PeriodPicker renders. Dashboard / reports use it. */
  showPeriodPicker?: boolean;
  /** Optional trailing actions before the bell (e.g. Refresh button on dashboard). */
  rightSlot?: ReactNode;
}

export function AdminTopBar({
  title,
  self,
  showPeriodPicker = false,
  rightSlot,
}: AdminTopBarProps) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        rowGap: 10,
        flexWrap: "wrap",
        padding: "16px 28px",
        borderBottom: `1px solid ${productSemanticColors.border}`,
        backgroundColor: productSemanticColors.canvas,
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: 22,
          fontWeight: 700,
          color: productSemanticColors.textPrimary,
          letterSpacing: -0.2,
          minWidth: 0,
          whiteSpace: "normal",
          overflowWrap: "anywhere",
        }}
      >
        {title}
      </h1>
      <div style={{ flex: "1 1 320px", minWidth: 0, display: "flex", justifyContent: "center" }}>
        <CommandPalette />
      </div>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 12,
          flexWrap: "wrap",
          minWidth: 0,
          maxWidth: "100%",
        }}
      >
        {rightSlot}
        {showPeriodPicker ? <PeriodPicker /> : null}
        <AlertsBell />
        <AdminUserMenu self={self} />
      </div>
    </header>
  );
}
