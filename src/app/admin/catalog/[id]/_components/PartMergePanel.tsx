"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminPartDetailWire } from "@mototwin/types";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";
import { Combine } from "../../../_components/icons";

interface PartMergePanelProps {
  part: AdminPartDetailWire;
  canMutate: boolean;
}

export function PartMergePanel({ part, canMutate }: PartMergePanelProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleMerge = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canMutate || !selected) return;
    if (reason.trim().length < 3) {
      setError("Укажите краткое обоснование merge");
      return;
    }
    if (!confirm("Вы уверены? Эта операция необратима без админа БД.")) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/parts/${part.id}/merge`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ intoPartMasterId: selected, reason: reason.trim() }),
        });
        if (!res.ok) {
          const json = (await res.json().catch(() => null)) as { error?: string } | null;
          setError(json?.error ?? "Не удалось выполнить merge");
          return;
        }
        router.push(`/admin/catalog/${selected}`);
      } catch (err) {
        console.error(err);
        setError("Сетевая ошибка");
      }
    });
  };

  if (part.duplicates.length === 0) {
    return (
      <div style={cardStyle}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Дубликаты</h3>
        <p style={{ margin: 0, color: productSemanticColors.textMuted, fontSize: 13 }}>
          Похожих деталей не найдено.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleMerge} style={cardStyle}>
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Дубликаты и merge</h3>
      <p style={{ margin: 0, color: productSemanticColors.textMuted, fontSize: 12 }}>
        Если эта деталь дубликат — выберите запись, в которую её слить. Все fitment-отчеты
        и aliases переедут к выбранной.
      </p>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {part.duplicates.map((dup) => (
          <li key={dup.id} style={dupRowStyle(selected === dup.id)}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input
                type="radio"
                name="merge-target"
                value={dup.id}
                checked={selected === dup.id}
                onChange={() => setSelected(dup.id)}
                disabled={!canMutate}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {dup.brandName} {dup.sku}
                </div>
                <div style={{ fontSize: 12, color: productSemanticColors.textMuted }}>
                  {dup.title} · совпадение {dup.score}%
                </div>
              </div>
            </label>
          </li>
        ))}
      </ul>
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 12, color: productSemanticColors.textMuted, fontWeight: 600 }}>
          Обоснование (audit log)
        </span>
        <textarea
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={!canMutate}
          style={textareaStyle}
        />
      </label>
      {error ? <div style={errorBox}>{error}</div> : null}
      <div>
        <button type="submit" disabled={!canMutate || !selected || pending} style={primaryButton}>
          <Combine size={14} />
          <span>{pending ? "Сливаем…" : "Слить в выбранную"}</span>
        </button>
      </div>
    </form>
  );
}

const cardStyle: React.CSSProperties = {
  backgroundColor: productSemanticColors.card,
  border: `1px solid ${productSemanticColors.border}`,
  borderRadius: radiusScale.lg,
  padding: 18,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

function dupRowStyle(active: boolean): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: radiusScale.sm,
    border: `1px solid ${active ? productSemanticColors.primaryAction : productSemanticColors.border}`,
    backgroundColor: active ? "rgba(56,189,248,0.08)" : productSemanticColors.cardSubtle,
    marginBottom: 6,
  };
}

const textareaStyle: React.CSSProperties = {
  resize: "vertical",
  padding: "10px 12px",
  backgroundColor: productSemanticColors.cardMuted,
  border: `1px solid ${productSemanticColors.border}`,
  color: productSemanticColors.textPrimary,
  borderRadius: radiusScale.sm,
  fontSize: 13,
};

const errorBox: React.CSSProperties = {
  color: "#FCA5A5",
  backgroundColor: "rgba(248,113,113,0.10)",
  border: `1px solid rgba(248,113,113,0.30)`,
  padding: "8px 10px",
  borderRadius: radiusScale.sm,
  fontSize: 12,
};

const primaryButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 34,
  padding: "0 14px",
  borderRadius: radiusScale.sm,
  backgroundColor: productSemanticColors.primaryAction,
  color: productSemanticColors.onPrimaryAction,
  border: "none",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};
