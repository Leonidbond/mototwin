"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminPartDetailWire } from "@mototwin/types";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";

interface PartDeletePanelProps {
  part: AdminPartDetailWire;
  canDelete: boolean;
}

export function PartDeletePanel({ part, canDelete }: PartDeletePanelProps) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!canDelete) return null;

  const submit = () => {
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      setError("Укажите обоснование минимум из 3 символов");
      return;
    }
    if (
      !confirm(
        `Удалить ${part.brandName} ${part.sku} из каталога? Будут удалены SKU, fitment-правила и community-отчёты (${part.reportsCount}).`
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/parts/bulk-delete", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ids: [part.id], reason: trimmed }),
        });
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        if (!res.ok) {
          setError(json?.error ?? "Не удалось удалить деталь");
          return;
        }
        router.push("/admin/catalog");
        router.refresh();
      } catch (err) {
        console.error(err);
        setError("Сетевая ошибка");
      }
    });
  };

  return (
    <div style={cardStyle}>
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#FCA5A5" }}>
        Удалить из каталога
      </h3>
      <p style={{ margin: "8px 0 0", fontSize: 12, color: productSemanticColors.textSecondary }}>
        Полное удаление PartMaster, связанных SKU, fitment-правил и community-отчётов. Действие
        записывается в audit log.
      </p>
      <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Обоснование удаления (audit log)"
          style={inputStyle}
        />
        <button type="button" onClick={submit} disabled={pending} style={dangerButtonStyle}>
          {pending ? "Удаляем…" : "Удалить деталь"}
        </button>
      </div>
      {error ? <div style={{ marginTop: 8, color: "#FCA5A5", fontSize: 12 }}>{error}</div> : null}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  backgroundColor: productSemanticColors.card,
  border: `1px solid rgba(248,113,113,0.30)`,
  borderRadius: radiusScale.lg,
  padding: 18,
};

const inputStyle: React.CSSProperties = {
  height: 34,
  borderRadius: radiusScale.sm,
  border: `1px solid ${productSemanticColors.border}`,
  backgroundColor: productSemanticColors.cardMuted,
  color: productSemanticColors.textPrimary,
  padding: "0 10px",
  fontSize: 12,
};

const dangerButtonStyle: React.CSSProperties = {
  height: 34,
  border: "none",
  borderRadius: radiusScale.sm,
  backgroundColor: productSemanticColors.error,
  color: "#fff",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};
