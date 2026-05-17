"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { AdminPartListItemWire, AdminPartListResponse } from "@mototwin/types";
import { productSemanticColors } from "@mototwin/design-tokens";
import { AdminDataTable } from "../../_components/AdminDataTable";
import { formatDateRu, formatNumberRu } from "../../_components/format";

const STATUS_PAINT: Record<AdminPartListItemWire["status"], { fg: string; bg: string; label: string }> = {
  ACTIVE: { fg: "#86EFAC", bg: "rgba(34,197,94,0.14)", label: "Active" },
  DRAFT: { fg: "#A5B4FC", bg: "rgba(99,102,241,0.16)", label: "Draft" },
  PENDING_REVIEW: { fg: "#FBBF24", bg: "rgba(251,191,36,0.14)", label: "Pending" },
  MERGED: { fg: "#94A3B8", bg: "rgba(148,163,184,0.14)", label: "Merged" },
  REJECTED: { fg: "#F87171", bg: "rgba(248,113,113,0.14)", label: "Rejected" },
};

const columns: ColumnDef<AdminPartListItemWire, unknown>[] = [
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
}

export function PartsTable({ data }: PartsTableProps) {
  return (
    <AdminDataTable
      data={data.items}
      columns={columns}
      getRowHref={(row) => `/admin/catalog/${row.id}`}
      total={data.total}
      pageInfo={{ page: data.page, pageSize: data.pageSize, pageCount: data.pageCount }}
    />
  );
}
