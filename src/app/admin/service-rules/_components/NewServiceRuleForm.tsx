"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";

type ServiceNodeOption = {
  id: string;
  code: string;
  name: string;
  level: number;
  hasRule: boolean;
};

type TriggerMode = "WHICHEVER_COMES_FIRST" | "ANY" | "ALL";

export function NewServiceRuleForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const generationHint = searchParams.get("motorcycleGenerationId");

  const [nodes, setNodes] = useState<ServiceNodeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [nodeId, setNodeId] = useState("");
  const [intervalKm, setIntervalKm] = useState("");
  const [intervalHours, setIntervalHours] = useState("");
  const [intervalDays, setIntervalDays] = useState("");
  const [triggerMode, setTriggerMode] = useState<TriggerMode>("WHICHEVER_COMES_FIRST");

  const load = useCallback(async () => {
    try {
      setError("");
      const res = await fetch("/api/admin/service-rules");
      const json = (await res.json()) as {
        serviceNodes?: ServiceNodeOption[];
        error?: string;
      };
      if (!res.ok) {
        setError(json.error || "Не удалось загрузить узлы");
        return;
      }
      setNodes(json.serviceNodes ?? []);
    } catch {
      setError("Не удалось загрузить узлы");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const eligibleNodes = useMemo(
    () => nodes.filter((node) => !node.hasRule),
    [nodes]
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!nodeId) {
      setError("Выберите узел");
      return;
    }

    const payload = {
      nodeId,
      intervalKm: parseOptionalInt(intervalKm),
      intervalHours: parseOptionalInt(intervalHours),
      intervalDays: parseOptionalInt(intervalDays),
      triggerMode,
    };

    if (
      payload.intervalKm == null &&
      payload.intervalHours == null &&
      payload.intervalDays == null
    ) {
      setError("Укажите хотя бы один интервал");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/service-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error || "Не удалось создать регламент");
        return;
      }
      router.push("/admin/service-rules");
      router.refresh();
    } catch {
      setError("Не удалось создать регламент");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p style={{ color: productSemanticColors.textMuted }}>Загрузка…</p>;
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} style={{ display: "grid", gap: 14, maxWidth: 520 }}>
      <p style={{ margin: 0, color: productSemanticColors.textMuted, fontSize: 14 }}>
        Регламент привязан к узлу дерева обслуживания (глобально для всех мотоциклов).
        {generationHint ? (
          <>
            {" "}
            Подсказка с дашборда: поколение{" "}
            <code style={{ fontSize: 12 }}>{generationHint}</code> — выберите узел, для которого нет
            правила.
          </>
        ) : null}
      </p>

      {error ? <p style={{ margin: 0, color: productSemanticColors.error }}>{error}</p> : null}

      <label style={labelStyle}>
        Узел
        <select
          value={nodeId}
          onChange={(event) => setNodeId(event.target.value)}
          required
          style={inputStyle}
        >
          <option value="">Выберите узел…</option>
          {eligibleNodes.map((node) => (
            <option key={node.id} value={node.id}>
              {node.name} ({node.code})
            </option>
          ))}
        </select>
      </label>

      {eligibleNodes.length === 0 ? (
        <p style={{ margin: 0, color: productSemanticColors.textMuted, fontSize: 13 }}>
          Для всех сервисных узлов уже есть регламенты.{" "}
          <Link href="/admin/service-rules" style={{ color: productSemanticColors.primaryAction }}>
            Вернуться к списку
          </Link>
        </p>
      ) : null}

      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        <label style={labelStyle}>
          Интервал, км
          <input
            type="number"
            min={0}
            value={intervalKm}
            onChange={(event) => setIntervalKm(event.target.value)}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Моточасы
          <input
            type="number"
            min={0}
            value={intervalHours}
            onChange={(event) => setIntervalHours(event.target.value)}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Дни
          <input
            type="number"
            min={0}
            value={intervalDays}
            onChange={(event) => setIntervalDays(event.target.value)}
            style={inputStyle}
          />
        </label>
      </div>

      <label style={labelStyle}>
        Режим срабатывания
        <select
          value={triggerMode}
          onChange={(event) => setTriggerMode(event.target.value as TriggerMode)}
          style={inputStyle}
        >
          <option value="WHICHEVER_COMES_FIRST">Что наступит раньше</option>
          <option value="ANY">Любое условие</option>
          <option value="ALL">Все условия</option>
        </select>
      </label>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="submit" disabled={saving || eligibleNodes.length === 0} style={primaryBtnStyle}>
          {saving ? "Сохраняем…" : "Создать регламент"}
        </button>
        <Link href="/admin/service-rules" style={secondaryLinkStyle}>
          Отмена
        </Link>
      </div>
    </form>
  );
}

function parseOptionalInt(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const value = Number.parseInt(trimmed, 10);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  fontSize: 13,
  fontWeight: 600,
  color: productSemanticColors.textPrimary,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: radiusScale.md,
  border: `1px solid ${productSemanticColors.border}`,
  backgroundColor: productSemanticColors.card,
  color: productSemanticColors.textPrimary,
  fontSize: 14,
};

const primaryBtnStyle: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: radiusScale.md,
  border: "none",
  backgroundColor: productSemanticColors.primaryAction,
  color: productSemanticColors.onPrimaryAction,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

const secondaryLinkStyle: React.CSSProperties = {
  alignSelf: "center",
  color: productSemanticColors.textMuted,
  fontSize: 14,
  textDecoration: "none",
};
