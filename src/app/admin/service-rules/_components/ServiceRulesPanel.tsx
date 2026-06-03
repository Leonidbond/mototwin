"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";

type ServiceRuleRow = {
  id: string;
  nodeId: string;
  nodeCode: string;
  nodeName: string;
  intervalKm: number | null;
  intervalDays: number | null;
  triggerMode: string;
  isActive: boolean;
  updatedAt: string;
};

export function ServiceRulesPanel() {
  const [rules, setRules] = useState<ServiceRuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingNodeId, setSavingNodeId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError("");
      const res = await fetch("/api/admin/service-rules");
      const json = (await res.json()) as { rules?: ServiceRuleRow[]; error?: string };
      if (!res.ok) {
        setError(json.error || "Не удалось загрузить регламенты");
        return;
      }
      setRules(json.rules ?? []);
    } catch {
      setError("Не удалось загрузить регламенты");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleActive(rule: ServiceRuleRow) {
    setSavingNodeId(rule.nodeId);
    try {
      const res = await fetch(`/api/admin/service-rules/${encodeURIComponent(rule.nodeId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !rule.isActive }),
      });
      if (!res.ok) {
        setError("Не удалось сохранить изменение");
        return;
      }
      await load();
    } finally {
      setSavingNodeId(null);
    }
  }

  if (loading) {
    return <p style={{ color: productSemanticColors.textMuted }}>Загрузка регламентов…</p>;
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <p style={{ margin: 0, color: productSemanticColors.textMuted, fontSize: 14 }}>
        Редактирование интервалов обслуживания по узлам дерева.{" "}
        <Link href="/admin/service-rules/new" style={{ color: productSemanticColors.primaryAction }}>
          Создать регламент
        </Link>
        {" · "}
        Массовая загрузка — через{" "}
        <Link href="/admin/imports/new" style={{ color: productSemanticColors.primaryAction }}>
          импорт SERVICE_RULES
        </Link>
        .
      </p>
      {error ? <p style={{ color: productSemanticColors.error, margin: 0 }}>{error}</p> : null}
      <div style={tableCardStyle}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Узел</th>
              <th style={thStyle}>Интервал км</th>
              <th style={thStyle}>Интервал дней</th>
              <th style={thStyle}>Режим</th>
              <th style={thStyle}>Активен</th>
            </tr>
          </thead>
          <tbody>
            {rules.length === 0 ? (
              <tr>
                <td colSpan={5} style={tdStyle}>
                  Регламенты не найдены. Загрузите через seed или импорт.
                </td>
              </tr>
            ) : (
              rules.map((rule) => (
                <tr key={rule.id}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600, color: productSemanticColors.textPrimary }}>{rule.nodeName}</div>
                    <div style={{ fontSize: 12, color: productSemanticColors.textMuted }}>{rule.nodeCode}</div>
                  </td>
                  <td style={tdStyle}>{rule.intervalKm ?? "—"}</td>
                  <td style={tdStyle}>{rule.intervalDays ?? "—"}</td>
                  <td style={tdStyle}>{rule.triggerMode}</td>
                  <td style={tdStyle}>
                    <button
                      type="button"
                      disabled={savingNodeId === rule.nodeId}
                      onClick={() => void toggleActive(rule)}
                      style={toggleBtnStyle(rule.isActive)}
                    >
                      {rule.isActive ? "Да" : "Нет"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const tableCardStyle: React.CSSProperties = {
  borderRadius: radiusScale.lg,
  border: `1px solid ${productSemanticColors.border}`,
  backgroundColor: productSemanticColors.card,
  overflow: "hidden",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: 12,
  fontWeight: 600,
  color: productSemanticColors.textMuted,
  borderBottom: `1px solid ${productSemanticColors.border}`,
};

const tdStyle: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 13,
  color: productSemanticColors.textSecondary,
  borderBottom: `1px solid ${productSemanticColors.border}`,
  verticalAlign: "top",
};

function toggleBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: "4px 10px",
    borderRadius: radiusScale.sm,
    border: `1px solid ${productSemanticColors.border}`,
    backgroundColor: active ? "rgba(34,197,94,0.12)" : productSemanticColors.cardMuted,
    color: active ? "#22C55E" : productSemanticColors.textMuted,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  };
}
