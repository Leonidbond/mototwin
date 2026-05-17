"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";
import type {
  AdminWorkQueueResponse,
  AdminWorkQueueRowWire,
  AdminWorkQueueTabKey,
} from "@mototwin/types";
import { ruAdmin, formatNumber } from "../../_locales/ru";
import { DashboardSection } from "./DashboardSection";
import { WorkQueueStatusChip } from "./StatusChip";

const TAB_ORDER: AdminWorkQueueTabKey[] = ["all", "new-parts", "fitment", "conflicts", "safety"];

const PRIORITY_DOT: Record<string, { color: string; label: string }> = {
  critical: { color: "#F87171", label: "Critical" },
  high: { color: "#F97316", label: "High" },
  normal: { color: "#FBBF24", label: "Normal" },
  low: { color: "#6B7280", label: "Low" },
};

interface WorkQueueCardProps {
  initialData: AdminWorkQueueResponse;
}

export function WorkQueueCard({ initialData }: WorkQueueCardProps) {
  const [tab, setTab] = useState<AdminWorkQueueTabKey>(initialData.tab);
  const [data, setData] = useState<AdminWorkQueueResponse>(initialData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tab === initialData.tab) {
      setData(initialData);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/admin/dashboard/work-queue?tab=${tab}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const next = (await res.json()) as AdminWorkQueueResponse;
        if (!cancelled) setData(next);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, initialData]);

  return (
    <DashboardSection
      title={ruAdmin.dashboard.workQueue.title}
      seeAllLabel={ruAdmin.dashboard.workQueue.seeAll}
      seeAllHref="/admin/moderation"
      rightSlot={
        <WorkQueueTabs
          totals={data.totals}
          activeTab={tab}
          onChange={(next) => setTab(next)}
        />
      }
    >
      {data.rows.length === 0 ? (
        <div style={emptyStyle}>{ruAdmin.dashboard.workQueue.empty}</div>
      ) : (
        <WorkQueueTable rows={data.rows} loading={loading} />
      )}
    </DashboardSection>
  );
}

function WorkQueueTabs({
  totals,
  activeTab,
  onChange,
}: {
  totals: AdminWorkQueueResponse["totals"];
  activeTab: AdminWorkQueueTabKey;
  onChange: (tab: AdminWorkQueueTabKey) => void;
}) {
  return (
    <div style={{ display: "inline-flex", gap: 4 }}>
      {TAB_ORDER.map((key) => {
        const isActive = key === activeTab;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            style={{
              ...tabStyle,
              backgroundColor: isActive ? productSemanticColors.cardMuted : "transparent",
              borderColor: isActive
                ? productSemanticColors.borderStrong
                : productSemanticColors.border,
              color: isActive
                ? productSemanticColors.textPrimary
                : productSemanticColors.textSecondary,
            }}
            aria-pressed={isActive}
          >
            <span>{ruAdmin.dashboard.workQueue.tabs[key]}</span>
            {key !== "all" ? (
              <span
                style={{
                  marginLeft: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  color: productSemanticColors.textMuted,
                }}
              >
                {formatNumber(totals[key] ?? 0)}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function WorkQueueTable({
  rows,
  loading,
}: {
  rows: AdminWorkQueueRowWire[];
  loading: boolean;
}) {
  const columns: ColumnDef<AdminWorkQueueRowWire>[] = [
    {
      id: "priority",
      header: ruAdmin.dashboard.workQueue.columns.priority,
      cell: ({ row }) => {
        const dot = PRIORITY_DOT[row.original.priority] ?? PRIORITY_DOT.low;
        return (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span
              aria-label={dot.label}
              style={{ width: 8, height: 8, borderRadius: 999, background: dot.color }}
            />
          </span>
        );
      },
    },
    {
      id: "part",
      header: ruAdmin.dashboard.workQueue.columns.partLabel,
      cell: ({ row }) => (
        <span style={{ color: productSemanticColors.textPrimary, fontWeight: 600 }}>
          {row.original.partLabel}
        </span>
      ),
    },
    {
      id: "model",
      header: ruAdmin.dashboard.workQueue.columns.modelLabel,
      cell: ({ row }) => (
        <span style={{ color: productSemanticColors.textSecondary }}>{row.original.modelLabel}</span>
      ),
    },
    {
      id: "node",
      header: ruAdmin.dashboard.workQueue.columns.nodeLabel,
      cell: ({ row }) => (
        <span style={{ color: productSemanticColors.textSecondary }}>{row.original.nodeLabel}</span>
      ),
    },
    {
      id: "status",
      header: ruAdmin.dashboard.workQueue.columns.status,
      cell: ({ row }) => <WorkQueueStatusChip statusKey={row.original.statusKey} />,
    },
    {
      id: "confirmations",
      header: ruAdmin.dashboard.workQueue.columns.confirmations,
      cell: ({ row }) => (
        <span
          style={{
            color: productSemanticColors.textPrimary,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {formatNumber(row.original.confirmations)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div style={{ display: "inline-flex", gap: 8 }}>
          <Link href={row.original.reviewHref} prefetch={false} style={primaryAction}>
            {ruAdmin.dashboard.workQueue.columns.review}
          </Link>
          <Link href={row.original.detailsHref} prefetch={false} style={secondaryAction}>
            {ruAdmin.dashboard.workQueue.columns.details}
          </Link>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div style={{ overflowX: "auto", opacity: loading ? 0.6 : 1, transition: "opacity 120ms ease" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => (
                <th key={header.id} style={thStyle}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} style={trStyle}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} style={tdStyle}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const tabStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 28,
  padding: "0 12px",
  borderRadius: 999,
  border: "1px solid",
  background: "transparent",
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
};

const emptyStyle: React.CSSProperties = {
  padding: "32px 18px",
  textAlign: "center",
  color: productSemanticColors.textMuted,
  fontSize: 13,
};

const thStyle: React.CSSProperties = {
  padding: "10px 12px",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 0.5,
  textTransform: "uppercase",
  color: productSemanticColors.textMuted,
  borderBottom: `1px solid ${productSemanticColors.border}`,
  whiteSpace: "nowrap",
};

const trStyle: React.CSSProperties = {
  borderBottom: `1px solid ${productSemanticColors.border}`,
};

const tdStyle: React.CSSProperties = {
  padding: "12px 12px",
  fontSize: 13,
  color: productSemanticColors.textPrimary,
  verticalAlign: "middle",
};

const primaryAction: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  height: 28,
  padding: "0 12px",
  borderRadius: radiusScale.sm,
  backgroundColor: productSemanticColors.primaryAction,
  color: productSemanticColors.onPrimaryAction,
  fontSize: 12,
  fontWeight: 600,
  textDecoration: "none",
};

const secondaryAction: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  height: 28,
  padding: "0 12px",
  borderRadius: radiusScale.sm,
  backgroundColor: productSemanticColors.cardMuted,
  border: `1px solid ${productSemanticColors.border}`,
  color: productSemanticColors.textPrimary,
  fontSize: 12,
  fontWeight: 500,
  textDecoration: "none",
};
