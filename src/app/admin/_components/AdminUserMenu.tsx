import { productSemanticColors } from "@mototwin/design-tokens";
import type { AdminSelfWire } from "@mototwin/types";
import { ruAdmin } from "../_locales/ru";

interface AdminUserMenuProps {
  self: AdminSelfWire;
}

export function AdminUserMenu({ self }: AdminUserMenuProps) {
  const display = self.displayName ?? self.email ?? "Admin";
  const initials = display
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const roleLabel = ruAdmin.topbar.role[self.role] ?? self.role;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "4px 12px 4px 4px",
        borderRadius: 999,
        backgroundColor: productSemanticColors.card,
        border: `1px solid ${productSemanticColors.border}`,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 30,
          height: 30,
          borderRadius: 999,
          background:
            "linear-gradient(140deg, rgba(56,189,248,0.85) 0%, rgba(99,102,241,0.85) 100%)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
          color: "#FFFFFF",
        }}
      >
        {initials || "MT"}
      </span>
      <div style={{ lineHeight: 1.2 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: productSemanticColors.textPrimary,
          }}
        >
          {display}
        </div>
        <div
          style={{
            fontSize: 11,
            color: productSemanticColors.textMuted,
          }}
        >
          {roleLabel}
        </div>
      </div>
    </div>
  );
}
