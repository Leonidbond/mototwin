"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminPartAliasWire } from "@mototwin/types";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";
import { Plus, XOctagon } from "../../../_components/icons";
import { formatDateRu } from "../../../_components/format";

interface PartAliasesPanelProps {
  partId: string;
  aliases: AdminPartAliasWire[];
  canMutate: boolean;
}

export function PartAliasesPanel({ partId, aliases, canMutate }: PartAliasesPanelProps) {
  const router = useRouter();
  const [aliasInput, setAliasInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const addAlias = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canMutate) return;
    if (aliasInput.trim().length === 0) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/parts/${partId}/aliases`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ alias: aliasInput.trim() }),
        });
        if (!res.ok) {
          const json = (await res.json().catch(() => null)) as { error?: string } | null;
          setError(json?.error ?? "Не удалось добавить");
          return;
        }
        setAliasInput("");
        router.refresh();
      } catch (err) {
        console.error(err);
        setError("Сетевая ошибка");
      }
    });
  };

  const deleteAlias = (aliasId: string) => {
    if (!canMutate) return;
    if (!confirm("Удалить alias?")) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/parts/${partId}/aliases`, {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ aliasId }),
        });
        if (!res.ok) {
          setError("Не удалось удалить");
          return;
        }
        router.refresh();
      } catch (err) {
        console.error(err);
        setError("Сетевая ошибка");
      }
    });
  };

  return (
    <div style={cardStyle}>
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Aliases</h3>
      <p style={{ margin: 0, color: productSemanticColors.textMuted, fontSize: 12 }}>
        Альтернативные SKU и обозначения. Используются для поиска и автоматического сопоставления.
      </p>
      {canMutate ? (
        <form onSubmit={addAlias} style={{ display: "flex", gap: 8 }}>
          <input
            value={aliasInput}
            onChange={(e) => setAliasInput(e.target.value)}
            placeholder="например, MFE-205"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button type="submit" disabled={pending} style={primaryButton}>
            <Plus size={14} />
            <span>Добавить</span>
          </button>
        </form>
      ) : null}
      {error ? <div style={errorBox}>{error}</div> : null}
      {aliases.length === 0 ? (
        <div style={{ color: productSemanticColors.textMuted, fontSize: 13 }}>Aliases ещё нет</div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {aliases.map((alias) => (
            <li key={alias.id} style={listRowStyle}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{alias.alias}</div>
                <div style={{ fontSize: 11, color: productSemanticColors.textMuted }}>
                  {alias.source ?? "—"} · {formatDateRu(alias.createdAt)}
                </div>
              </div>
              {canMutate ? (
                <button
                  type="button"
                  onClick={() => deleteAlias(alias.id)}
                  style={iconButton}
                  aria-label="Удалить alias"
                >
                  <XOctagon size={14} />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  backgroundColor: productSemanticColors.card,
  border: `1px solid ${productSemanticColors.border}`,
  borderRadius: radiusScale.lg,
  padding: 18,
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const inputStyle: React.CSSProperties = {
  height: 34,
  padding: "0 10px",
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
  padding: "0 12px",
  borderRadius: radiusScale.sm,
  backgroundColor: productSemanticColors.primaryAction,
  color: productSemanticColors.onPrimaryAction,
  border: "none",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

const iconButton: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: radiusScale.sm,
  border: `1px solid ${productSemanticColors.border}`,
  backgroundColor: "transparent",
  color: productSemanticColors.textMuted,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const listRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px 0",
  borderBottom: `1px solid ${productSemanticColors.border}`,
  gap: 12,
};
