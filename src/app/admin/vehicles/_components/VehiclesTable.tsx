"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { AdminVehicleListItemWire, AdminVehicleListResponse } from "@mototwin/types";
import { productSemanticColors } from "@mototwin/design-tokens";
import { AdminDataTable } from "../../_components/AdminDataTable";
import { formatDateRu, formatNumberRu } from "../../_components/format";

const columns: ColumnDef<AdminVehicleListItemWire, unknown>[] = [
  {
    id: "vehicle",
    header: "Мотоцикл",
    cell: ({ row }) => {
      const v = row.original;
      return (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: productSemanticColors.textPrimary }}>
            {v.brandLabel} {v.modelLabel}
          </div>
          <div style={{ fontSize: 12, color: productSemanticColors.textMuted }}>
            {v.year} · {v.versionName}
            {v.nickname ? ` · «${v.nickname}»` : ""}
          </div>
        </div>
      );
    },
  },
  {
    id: "owner",
    header: "Владелец",
    cell: ({ row }) => (
      <Link
        href={`/admin/users/${row.original.ownerId}`}
        prefetch={false}
        style={{ color: productSemanticColors.textPrimary, textDecoration: "none" }}
        onClick={(event) => event.stopPropagation()}
      >
        {row.original.ownerLabel}
      </Link>
    ),
  },
  {
    id: "vin",
    header: "VIN",
    cell: ({ row }) =>
      row.original.vinLast ? (
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 12 }}>
          …{row.original.vinLast}
        </span>
      ) : (
        <span style={{ color: productSemanticColors.textMuted }}>—</span>
      ),
  },
  {
    id: "odometer",
    header: "Пробег",
    cell: ({ row }) => (
      <span style={{ fontVariantNumeric: "tabular-nums" }}>
        {formatNumberRu(row.original.odometer)} км
      </span>
    ),
  },
  {
    id: "engineHours",
    header: "Моточасы",
    cell: ({ row }) => formatNumberRu(row.original.engineHours),
  },
  {
    id: "events",
    header: "Service events",
    cell: ({ row }) => formatNumberRu(row.original.serviceEventCount),
  },
  {
    id: "lastService",
    header: "Последнее ТО",
    cell: ({ row }) => formatDateRu(row.original.lastServiceAt),
  },
  {
    id: "createdAt",
    header: "Добавлен",
    cell: ({ row }) => formatDateRu(row.original.createdAt),
  },
];

interface VehiclesTableProps {
  data: AdminVehicleListResponse;
}

export function VehiclesTable({ data }: VehiclesTableProps) {
  return (
    <AdminDataTable
      data={data.items}
      columns={columns}
      getRowHref={(row) => `/admin/vehicles/${row.id}`}
      total={data.total}
      pageInfo={{ page: data.page, pageSize: data.pageSize, pageCount: data.pageCount }}
    />
  );
}
