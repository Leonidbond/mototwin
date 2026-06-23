"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminImportBatchTypeWire } from "@mototwin/types";
import { PARTS_STAGING_COLUMNS } from "@mototwin/types";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";

const TYPE_OPTIONS: Array<{
  value: AdminImportBatchTypeWire;
  label: string;
  hint: string;
  supported: boolean;
  templateType?: "PARTS" | "PARTS_STAGING" | "PART_ALIASES" | "SERVICE_RULES";
}> = [
  {
    value: "PARTS",
    label: "Каталог деталей (PartMaster)",
    hint: "Колонки: brand, sku, title, subcategory?, description?, imageUrl?",
    supported: true,
    templateType: "PARTS",
  },
  {
    value: "PARTS_STAGING",
    label: "Parts staging (каталог v1.2)",
    hint: `${PARTS_STAGING_COLUMNS.length} колонок: brand…parsed_at + staging_row_key, source_key, evidence_level, import_batch, …`,
    supported: true,
    templateType: "PARTS_STAGING",
  },
  {
    value: "PART_ALIASES",
    label: "Альтернативные SKU (PartAlias)",
    hint: "Колонки: brand, sku, alias",
    supported: true,
    templateType: "PART_ALIASES",
  },
  {
    value: "SERVICE_RULES",
    label: "Регламенты ТО (NodeMaintenanceRule)",
    hint: "Колонки: nodeCode, intervalKm?, intervalDays?, intervalHours?, triggerMode?",
    supported: true,
    templateType: "SERVICE_RULES",
  },
  {
    value: "FITMENT_RULES",
    label: "Fitment rules",
    hint: "Появится в следующем релизе",
    supported: false,
  },
  {
    value: "MODELS",
    label: "Модели",
    hint: "Появится в следующем релизе",
    supported: false,
  },
  {
    value: "OEM_CROSS",
    label: "OEM cross-references",
    hint: "Появится в следующем релизе",
    supported: false,
  },
];

export function NewImportForm() {
  const router = useRouter();
  const [type, setType] = useState<AdminImportBatchTypeWire>("PARTS");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      setError("Выберите CSV или XLSX файл");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("type", type);
        const res = await fetch("/api/admin/imports", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) {
          setError((json as { error?: string }).error ?? "Не удалось создать импорт");
          return;
        }
        router.push(`/admin/imports/${(json as { id: string }).id}`);
      } catch (err) {
        console.error(err);
        setError("Сетевая ошибка");
      }
    });
  };

  const selectedOption = TYPE_OPTIONS.find((opt) => opt.value === type);
  const templateType = selectedOption?.templateType;

  return (
    <form onSubmit={submit} style={cardStyle}>
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>1. Тип импорта</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
        {TYPE_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            style={{
              ...optionStyle,
              borderColor:
                type === opt.value ? productSemanticColors.primaryAction : productSemanticColors.border,
              backgroundColor:
                type === opt.value ? "rgba(56,189,248,0.08)" : productSemanticColors.cardSubtle,
              opacity: opt.supported ? 1 : 0.6,
              cursor: opt.supported ? "pointer" : "not-allowed",
            }}
          >
            <input
              type="radio"
              name="import-type"
              value={opt.value}
              checked={type === opt.value}
              onChange={() => opt.supported && setType(opt.value)}
              disabled={!opt.supported}
              style={{ marginRight: 8 }}
            />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{opt.label}</div>
              <div style={{ fontSize: 12, color: productSemanticColors.textMuted }}>{opt.hint}</div>
            </div>
          </label>
        ))}
      </div>

      <h3 style={{ margin: "8px 0 0", fontSize: 14, fontWeight: 600 }}>2. Файл</h3>
      <div
        style={{
          border: `1px dashed ${productSemanticColors.border}`,
          borderRadius: radiusScale.md,
          padding: 18,
          backgroundColor: productSemanticColors.cardSubtle,
        }}
      >
        <input
          type="file"
          accept=".csv,.tsv,.xlsx,.xls"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          style={{ color: productSemanticColors.textPrimary }}
        />
        <div style={{ fontSize: 12, color: productSemanticColors.textMuted, marginTop: 8 }}>
          Поддерживаются CSV, TSV и XLSX (до 8 МБ).
          {selectedOption ? ` Ожидаемые колонки: ${selectedOption.hint}` : ""}
        </div>
        {templateType ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 12,
              alignItems: "center",
            }}
          >
            <a
              href={`/api/admin/imports/template?type=${templateType}`}
              style={templateButtonStyle}
            >
              Скачать шаблон CSV
            </a>
            <a
              href={`/api/admin/imports/template?type=${templateType}&headersOnly=1`}
              style={templateLinkStyle}
            >
              Только заголовки колонок
            </a>
          </div>
        ) : null}
      </div>

      {error ? <div style={errorBox}>{error}</div> : null}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button type="submit" disabled={pending} style={primaryButton}>
          {pending ? "Загрузка…" : "Создать импорт"}
        </button>
      </div>
      <p style={{ margin: 0, fontSize: 12, color: productSemanticColors.textMuted }}>
        После загрузки откроется страница импорта, где можно запустить dry-run и применить изменения.
      </p>
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

const optionStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 8,
  padding: 12,
  borderRadius: radiusScale.sm,
  border: `1px solid ${productSemanticColors.border}`,
};

const primaryButton: React.CSSProperties = {
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

const errorBox: React.CSSProperties = {
  color: "#FCA5A5",
  backgroundColor: "rgba(248,113,113,0.10)",
  border: `1px solid rgba(248,113,113,0.30)`,
  padding: "8px 10px",
  borderRadius: radiusScale.sm,
  fontSize: 12,
};

const templateButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  height: 32,
  padding: "0 12px",
  borderRadius: radiusScale.sm,
  backgroundColor: productSemanticColors.card,
  border: `1px solid ${productSemanticColors.border}`,
  color: productSemanticColors.textPrimary,
  fontSize: 12,
  fontWeight: 600,
  textDecoration: "none",
};

const templateLinkStyle: React.CSSProperties = {
  color: productSemanticColors.primaryAction,
  fontSize: 12,
  textDecoration: "none",
};
