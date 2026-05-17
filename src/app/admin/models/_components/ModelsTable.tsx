"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { AdminModelListItemWire, AdminModelListResponse } from "@mototwin/types";
import { productSemanticColors } from "@mototwin/design-tokens";
import { AdminDataTable } from "../../_components/AdminDataTable";
import { SupportLevelChip } from "../../_components/dashboard/StatusChip";
import { formatNumberRu } from "../../_components/format";

const columns: ColumnDef<AdminModelListItemWire, unknown>[] = [
  {
    id: "model",
    header: "Модель",
    cell: ({ row }) => {
      const v = row.original;
      return (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: productSemanticColors.textPrimary }}>
            {v.brandLabel} {v.modelLabel}
          </div>
          <div style={{ fontSize: 12, color: productSemanticColors.textMuted }}>
            {v.year} · {v.versionName}
          </div>
        </div>
      );
    },
  },
  {
    id: "garages",
    header: "В гаражах",
    cell: ({ row }) => formatNumberRu(row.original.garageCount),
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
    id: "support",
    header: "Support level",
    cell: ({ row }) => (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <SupportLevelChip level={row.original.supportLevel} />
        {row.original.supportLevelOverride ? (
          <span
            title="Установлено вручную"
            style={{ fontSize: 10, color: productSemanticColors.textMuted }}
          >
            ручной
          </span>
        ) : null}
      </div>
    ),
  },
];

interface ModelsTableProps {
  data: AdminModelListResponse;
}

export function ModelsTable({ data }: ModelsTableProps) {
  return (
    <AdminDataTable
      data={data.items}
      columns={columns}
      getRowHref={(row) => `/admin/models/${row.modelVariantId}`}
      total={data.total}
      pageInfo={{ page: data.page, pageSize: data.pageSize, pageCount: data.pageCount }}
    />
  );
}
