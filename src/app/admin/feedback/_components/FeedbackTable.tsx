"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type {
  AdminFeedbackListItemWire,
  AdminFeedbackListResponse,
  FeedbackStatusWire,
} from "@mototwin/types";
import { getFeedbackTypeLabelRu, getFeedbackStatusLabelRu } from "@mototwin/domain";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";
import { AdminDataTable } from "../../_components/AdminDataTable";
import { formatDateTimeRu } from "../../_components/format";
import { ruAdmin } from "../../_locales/ru";

const STATUS_PAINT: Record<FeedbackStatusWire, { fg: string; bg: string }> = {
  NEW: { fg: "#93C5FD", bg: "rgba(96,165,250,0.16)" },
  IN_PROGRESS: { fg: "#FBBF24", bg: "rgba(251,191,36,0.16)" },
  RESOLVED: { fg: "#86EFAC", bg: "rgba(34,197,94,0.16)" },
  REJECTED: { fg: "#F87171", bg: "rgba(248,113,113,0.16)" },
};

function platformLabel(platform: string): string {
  if (platform === "web") return "Web";
  if (platform === "ios") return "iOS";
  if (platform === "android") return "Android";
  return platform;
}

const columns: ColumnDef<AdminFeedbackListItemWire, unknown>[] = [
  {
    id: "createdAt",
    header: ruAdmin.feedback.columns.createdAt,
    cell: ({ row }) => (
      <span style={{ whiteSpace: "nowrap", fontSize: 12, color: productSemanticColors.textSecondary }}>
        {formatDateTimeRu(row.original.createdAt)}
      </span>
    ),
  },
  {
    id: "type",
    header: ruAdmin.feedback.columns.type,
    cell: ({ row }) => getFeedbackTypeLabelRu(row.original.type),
  },
  {
    id: "page",
    header: ruAdmin.feedback.columns.page,
    cell: ({ row }) => (
      <span style={{ fontSize: 13, color: productSemanticColors.textPrimary }}>
        {row.original.pageTitle}
      </span>
    ),
  },
  {
    id: "platform",
    header: ruAdmin.feedback.columns.platform,
    cell: ({ row }) => platformLabel(row.original.platform),
  },
  {
    id: "status",
    header: ruAdmin.feedback.columns.status,
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
            whiteSpace: "nowrap",
          }}
        >
          {getFeedbackStatusLabelRu(row.original.status)}
        </span>
      );
    },
  },
  {
    id: "message",
    header: ruAdmin.feedback.columns.message,
    cell: ({ row }) => (
      <span
        style={{
          display: "block",
          maxWidth: 360,
          color: productSemanticColors.textSecondary,
          fontSize: 12,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {row.original.message}
      </span>
    ),
  },
  {
    id: "author",
    header: ruAdmin.feedback.columns.author,
    cell: ({ row }) => (
      <span style={{ fontSize: 12, color: productSemanticColors.textMuted }}>
        {row.original.authorLabel ?? "—"}
      </span>
    ),
  },
];

interface FeedbackTableProps {
  data: AdminFeedbackListResponse;
  currentSearch: Record<string, string | undefined>;
}

export function FeedbackTable({ data, currentSearch }: FeedbackTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const pageIds = useMemo(() => data.items.map((item) => item.id), [data.items]);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));

  const toggleRow = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...new Set([...prev, id])] : prev.filter((value) => value !== id)
    );
  };

  const toggleAll = (checked: boolean) => {
    setSelectedIds(checked ? pageIds : []);
  };

  const buildExportUrl = (ids?: string[]) => {
    const params = new URLSearchParams();
    for (const key of ["q", "status", "type", "platform", "pageKey"] as const) {
      const value = currentSearch[key];
      if (value) params.set(key, value);
    }
    if (ids && ids.length > 0) params.set("ids", ids.join(","));
    const qs = params.toString();
    return `/api/admin/feedback/export${qs ? `?${qs}` : ""}`;
  };

  const exportAll = () => {
    window.location.href = buildExportUrl();
  };

  const exportSelected = () => {
    if (selectedIds.length === 0) return;
    window.location.href = buildExportUrl(selectedIds);
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={toolbarStyle}>
        {selectedIds.length > 0 ? (
          <button type="button" onClick={exportSelected} style={primaryButtonStyle}>
            {ruAdmin.feedback.exportSelected(selectedIds.length)}
          </button>
        ) : null}
        <button type="button" onClick={exportAll} style={secondaryButtonStyle}>
          {ruAdmin.feedback.export}
        </button>
      </div>

      <AdminDataTable
        data={data.items}
        columns={columns}
        getRowHref={(row) => `/admin/feedback/${row.id}`}
        total={data.total}
        pageInfo={{ page: data.page, pageSize: data.pageSize, pageCount: data.pageCount }}
        emptyLabel={ruAdmin.feedback.empty}
        enableSelection
        getRowId={(row) => row.id}
        selectedIds={selectedIds}
        onToggleRow={toggleRow}
        allSelected={allPageSelected}
        onToggleAll={toggleAll}
      />
    </div>
  );
}

const toolbarStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  flexWrap: "wrap",
};

const secondaryButtonStyle: React.CSSProperties = {
  height: 34,
  padding: "0 14px",
  borderRadius: radiusScale.sm,
  border: `1px solid ${productSemanticColors.border}`,
  backgroundColor: productSemanticColors.card,
  color: productSemanticColors.textPrimary,
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

const primaryButtonStyle: React.CSSProperties = {
  height: 34,
  padding: "0 14px",
  borderRadius: radiusScale.sm,
  border: "none",
  backgroundColor: productSemanticColors.primaryAction,
  color: "#fff",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};
