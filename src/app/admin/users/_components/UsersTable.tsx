"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { AdminUserListItemWire, AdminUserListResponse } from "@mototwin/types";
import { productSemanticColors } from "@mototwin/design-tokens";
import { AdminDataTable } from "../../_components/AdminDataTable";
import { formatDateRu, formatNumberRu, formatRelativeRu } from "../../_components/format";
import { ruAdmin } from "../../_locales/ru";

const columns: ColumnDef<AdminUserListItemWire, unknown>[] = [
  {
    id: "user",
    header: "Пользователь",
    cell: ({ row }) => {
      const user = row.original;
      const display = user.displayName ?? user.email ?? "—";
      const initials = display
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((s) => s[0]?.toUpperCase() ?? "")
        .join("") || "U";
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={avatarStyle}>{initials}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: productSemanticColors.textPrimary }}>
              {display}
            </div>
            <div style={{ fontSize: 12, color: productSemanticColors.textMuted }}>
              {user.email ?? "—"}
            </div>
          </div>
        </div>
      );
    },
  },
  {
    id: "plan",
    header: "План",
    cell: ({ row }) => (
      <span style={planChipStyle(row.original.plan)}>{row.original.plan ?? "—"}</span>
    ),
  },
  {
    id: "role",
    header: "Роль",
    cell: ({ row }) =>
      row.original.adminRole ? (
        <span style={{ ...planChipStyle("PRO"), borderColor: "rgba(99,102,241,0.3)" }}>
          {ruAdmin.topbar.role[row.original.adminRole] ?? row.original.adminRole}
        </span>
      ) : (
        <span style={{ color: productSemanticColors.textMuted }}>—</span>
      ),
  },
  {
    id: "vehicles",
    header: "Мотоциклы",
    cell: ({ row }) => formatNumberRu(row.original.vehicleCount),
  },
  {
    id: "fitment",
    header: "Fitment-отчеты",
    cell: ({ row }) => formatNumberRu(row.original.fitmentReportCount),
  },
  {
    id: "createdAt",
    header: "Зарегистрирован",
    cell: ({ row }) => formatDateRu(row.original.createdAt),
  },
  {
    id: "lastActivityAt",
    header: "Активность",
    cell: ({ row }) => (
      <span style={{ color: productSemanticColors.textSecondary, fontSize: 12 }}>
        {formatRelativeRu(row.original.lastActivityAt)}
      </span>
    ),
  },
];

interface UsersTableProps {
  data: AdminUserListResponse;
}

export function UsersTable({ data }: UsersTableProps) {
  return (
    <AdminDataTable
      data={data.items}
      columns={columns}
      getRowHref={(row) => `/admin/users/${row.id}`}
      total={data.total}
      pageInfo={{ page: data.page, pageSize: data.pageSize, pageCount: data.pageCount }}
    />
  );
}

const avatarStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 999,
  background: "linear-gradient(140deg, rgba(56,189,248,0.85) 0%, rgba(99,102,241,0.85) 100%)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#FFFFFF",
  fontSize: 12,
  fontWeight: 700,
  flexShrink: 0,
};

function planChipStyle(plan: AdminUserListItemWire["plan"]): React.CSSProperties {
  if (plan === "PRO") {
    return chipBase("#FBBF24", "rgba(251,191,36,0.16)", "rgba(251,191,36,0.32)");
  }
  if (plan === "FREE") {
    return chipBase("#94A3B8", "rgba(148,163,184,0.12)", "rgba(148,163,184,0.24)");
  }
  return chipBase("#6B7280", "transparent", "rgba(148,163,184,0.18)");
}

function chipBase(fg: string, bg: string, border: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    height: 22,
    padding: "0 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    color: fg,
    backgroundColor: bg,
    border: `1px solid ${border}`,
  };
}
