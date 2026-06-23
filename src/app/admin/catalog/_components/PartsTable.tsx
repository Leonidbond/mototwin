"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import type { AdminPartListItemWire, AdminPartListResponse } from "@mototwin/types";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";
import { AdminDataTable } from "../../_components/AdminDataTable";
import { formatDateRu, formatNumberRu } from "../../_components/format";

const STATUS_PAINT: Record<AdminPartListItemWire["status"], { fg: string; bg: string; label: string }> = {
  ACTIVE: { fg: "#86EFAC", bg: "rgba(34,197,94,0.14)", label: "Active" },
  DRAFT: { fg: "#A5B4FC", bg: "rgba(99,102,241,0.16)", label: "Draft" },
  PENDING_REVIEW: { fg: "#FBBF24", bg: "rgba(251,191,36,0.14)", label: "Pending" },
  MERGED: { fg: "#94A3B8", bg: "rgba(148,163,184,0.14)", label: "Merged" },
  REJECTED: { fg: "#F87171", bg: "rgba(248,113,113,0.14)", label: "Rejected" },
};

const dataColumns: ColumnDef<AdminPartListItemWire, unknown>[] = [
  {
    id: "part",
    header: "Деталь",
    cell: ({ row }) => {
      const p = row.original;
      return (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: productSemanticColors.textPrimary }}>
            {p.brandName} {p.sku}
          </div>
          <div style={{ fontSize: 12, color: productSemanticColors.textMuted }}>{p.title}</div>
        </div>
      );
    },
  },
  {
    id: "subcategory",
    header: "Категория",
    cell: ({ row }) => row.original.subcategory ?? "—",
  },
  {
    id: "status",
    header: "Статус",
    cell: ({ row }) => {
      const paint = STATUS_PAINT[row.original.status];
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            height: 22,
            padding: "0 10px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 600,
            color: paint.fg,
            backgroundColor: paint.bg,
          }}
        >
          {paint.label}
        </span>
      );
    },
  },
  {
    id: "source",
    header: "Источник",
    cell: ({ row }) => (row.original.source === "ADMIN" ? "Каталог" : "От пользователя"),
  },
  {
    id: "aliases",
    header: "Aliases",
    cell: ({ row }) => formatNumberRu(row.original.aliasCount),
  },
  {
    id: "reports",
    header: "Reports",
    cell: ({ row }) => formatNumberRu(row.original.reportsCount),
  },
  {
    id: "verified",
    header: "Verified",
    cell: ({ row }) => formatNumberRu(row.original.verifiedCount),
  },
  {
    id: "conflicts",
    header: "Конфликты",
    cell: ({ row }) =>
      row.original.conflictsCount > 0 ? (
        <span style={{ color: "#FBBF24", fontWeight: 600 }}>
          {formatNumberRu(row.original.conflictsCount)}
        </span>
      ) : (
        formatNumberRu(0)
      ),
  },
  {
    id: "updatedAt",
    header: "Изменено",
    cell: ({ row }) => formatDateRu(row.original.updatedAt),
  },
];

interface PartsTableProps {
  data: AdminPartListResponse;
  canDelete: boolean;
}

export function PartsTable({ data, canDelete }: PartsTableProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const pageIds = useMemo(() => data.items.map((item) => item.id), [data.items]);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));

  const toggleRow = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...new Set([...prev, id])] : prev.filter((value) => value !== id)
    );
    setResult(null);
  };

  const toggleAll = (checked: boolean) => {
    setSelectedIds(checked ? pageIds : []);
    setResult(null);
  };

  const bulkDelete = () => {
    const trimmed = reason.trim();
    if (selectedIds.length === 0) return;
    if (trimmed.length < 3) {
      setError("Укажите обоснование минимум из 3 символов");
      return;
    }
    const label =
      selectedIds.length === 1
        ? "Удалить выбранную деталь из каталога?"
        : `Удалить ${selectedIds.length} деталей из каталога? Будут удалены SKU, fitment-правила и community-отчёты.`;
    if (!confirm(label)) return;

    setError(null);
    setResult(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/parts/bulk-delete", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ids: selectedIds, reason: trimmed }),
        });
        const json = (await res.json().catch(() => null)) as {
          error?: string;
          deleted?: string[];
          skipped?: Array<{ id: string; message: string }>;
        } | null;
        if (!res.ok) {
          setError(json?.error ?? "Не удалось удалить детали");
          return;
        }
        const deletedCount = json?.deleted?.length ?? 0;
        const skippedCount = json?.skipped?.length ?? 0;
        setReason("");
        setSelectedIds([]);
        setResult(`Удалено: ${deletedCount}${skippedCount > 0 ? `, пропущено: ${skippedCount}` : ""}`);
        router.refresh();
      } catch (err) {
        console.error(err);
        setError("Сетевая ошибка");
      }
    });
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {canDelete && selectedIds.length > 0 ? (
        <div style={bulkBarStyle}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            Выбрано: {selectedIds.length}
          </div>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Обоснование удаления (audit log)"
            style={reasonInputStyle}
          />
          <button type="button" onClick={bulkDelete} disabled={pending} style={dangerButtonStyle}>
            {pending ? "Удаляем…" : "Удалить выбранные"}
          </button>
        </div>
      ) : null}
      {error ? <div style={errorStyle}>{error}</div> : null}
      {result ? <div style={successStyle}>{result}</div> : null}

      <AdminDataTable
        data={data.items}
        columns={dataColumns}
        getRowHref={(row) => `/admin/catalog/${row.id}`}
        total={data.total}
        pageInfo={{ page: data.page, pageSize: data.pageSize, pageCount: data.pageCount }}
        enableSelection={canDelete}
        getRowId={(row) => row.id}
        selectedIds={selectedIds}
        onToggleRow={toggleRow}
        allSelected={allPageSelected}
        onToggleAll={toggleAll}
      />
    </div>
  );
}

const bulkBarStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 10,
  padding: "12px 14px",
  borderRadius: radiusScale.lg,
  border: `1px solid rgba(248,113,113,0.30)`,
  backgroundColor: "rgba(248,113,113,0.08)",
};

const reasonInputStyle: React.CSSProperties = {
  flex: "1 1 240px",
  minWidth: 220,
  height: 34,
  padding: "0 10px",
  borderRadius: radiusScale.sm,
  border: `1px solid ${productSemanticColors.border}`,
  backgroundColor: productSemanticColors.card,
  color: productSemanticColors.textPrimary,
  fontSize: 12,
};

const dangerButtonStyle: React.CSSProperties = {
  height: 34,
  padding: "0 14px",
  borderRadius: radiusScale.sm,
  border: "none",
  backgroundColor: productSemanticColors.error,
  color: "#fff",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

const errorStyle: React.CSSProperties = {
  color: "#FCA5A5",
  fontSize: 12,
};

const successStyle: React.CSSProperties = {
  color: "#86EFAC",
  fontSize: 12,
};
