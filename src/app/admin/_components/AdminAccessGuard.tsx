import Link from "next/link";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";
import { ruAdmin } from "../_locales/ru";

interface AdminAccessGuardProps {
  message?: string;
}

/**
 * Friendly fallback when the current user has no admin role.
 * Shown by `src/app/admin/layout.tsx` when `getAdminContext()` rejects.
 */
export function AdminAccessGuard({ message }: AdminAccessGuardProps) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: productSemanticColors.canvas,
        padding: 32,
      }}
    >
      <div
        style={{
          maxWidth: 420,
          width: "100%",
          backgroundColor: productSemanticColors.card,
          border: `1px solid ${productSemanticColors.border}`,
          borderRadius: radiusScale.lg,
          padding: 28,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1.6,
            textTransform: "uppercase",
            color: productSemanticColors.primaryAction,
          }}
        >
          MOTOTWIN ADMIN
        </div>
        <h2
          style={{
            margin: "12px 0",
            fontSize: 22,
            fontWeight: 700,
            color: productSemanticColors.textPrimary,
          }}
        >
          {ruAdmin.access.forbidden}
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: 14,
            color: productSemanticColors.textSecondary,
          }}
        >
          {message ?? ""}
        </p>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 24,
            height: 40,
            padding: "0 18px",
            borderRadius: radiusScale.md,
            backgroundColor: productSemanticColors.primaryAction,
            color: productSemanticColors.onPrimaryAction,
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          {ruAdmin.access.backToApp}
        </Link>
      </div>
    </div>
  );
}
