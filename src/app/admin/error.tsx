"use client";

import { useEffect } from "react";
import Link from "next/link";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";

interface AdminErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminErrorBoundary({ error, reset }: AdminErrorBoundaryProps) {
  useEffect(() => {
    console.error("[admin] page error:", error);
  }, [error]);

  return (
    <div style={containerStyle} role="alert">
      <div style={cardStyle}>
        <div style={badgeStyle}>Что-то сломалось</div>
        <h2
          style={{
            margin: "10px 0 0",
            fontSize: 20,
            fontWeight: 600,
            color: productSemanticColors.textPrimary,
          }}
        >
          Не удалось отобразить раздел
        </h2>
        <p style={{ margin: "8px 0 0", color: productSemanticColors.textSecondary, fontSize: 13 }}>
          {error?.message ?? "Неизвестная ошибка."}
          {error?.digest ? (
            <span style={{ color: productSemanticColors.textMuted, marginLeft: 6 }}>
              (digest {error.digest})
            </span>
          ) : null}
        </p>
        <div style={{ marginTop: 18, display: "flex", gap: 8 }}>
          <button type="button" onClick={() => reset()} style={primaryButton}>
            Попробовать снова
          </button>
          <Link href="/admin" prefetch={false} style={secondaryButton}>
            На дашборд
          </Link>
        </div>
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 28,
};

const cardStyle: React.CSSProperties = {
  backgroundColor: productSemanticColors.card,
  border: `1px solid ${productSemanticColors.border}`,
  borderRadius: radiusScale.lg,
  padding: "26px 28px",
  maxWidth: 520,
  width: "100%",
};

const badgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  height: 22,
  padding: "0 10px",
  borderRadius: 999,
  backgroundColor: "rgba(248,113,113,0.16)",
  color: "#FCA5A5",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.4,
  textTransform: "uppercase",
};

const baseButton: React.CSSProperties = {
  height: 34,
  padding: "0 16px",
  borderRadius: radiusScale.sm,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  textDecoration: "none",
  border: "none",
  display: "inline-flex",
  alignItems: "center",
};

const primaryButton: React.CSSProperties = {
  ...baseButton,
  backgroundColor: productSemanticColors.primaryAction,
  color: productSemanticColors.onPrimaryAction,
};

const secondaryButton: React.CSSProperties = {
  ...baseButton,
  backgroundColor: productSemanticColors.cardMuted,
  color: productSemanticColors.textPrimary,
  border: `1px solid ${productSemanticColors.border}`,
};
