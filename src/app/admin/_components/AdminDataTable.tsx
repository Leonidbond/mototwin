"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
} from "@tanstack/react-table";
import Link from "next/link";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";

interface AdminDataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  /** Optional row link href; produces full-row click target. */
  getRowHref?: (row: T) => string | undefined;
  emptyLabel?: string;
  /** When true, shows a faint progress shimmer on top of rows. */
  loading?: boolean;
  /** Total result count for the pager footer (when paginated server-side). */
  total?: number;
  pageInfo?: { page: number; pageSize: number; pageCount: number };
}

export function AdminDataTable<T>({
  data,
  columns,
  getRowHref,
  emptyLabel = "Ничего не найдено",
  loading = false,
  total,
  pageInfo,
}: AdminDataTableProps<T>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div
      style={{
        backgroundColor: productSemanticColors.card,
        border: `1px solid ${productSemanticColors.border}`,
        borderRadius: radiusScale.lg,
        overflow: "hidden",
      }}
    >
      <div style={{ overflowX: "auto", opacity: loading ? 0.6 : 1 }}>
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
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    padding: "32px 18px",
                    textAlign: "center",
                    color: productSemanticColors.textMuted,
                    fontSize: 13,
                  }}
                >
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <DataRow key={row.id} row={row} getRowHref={getRowHref} />
              ))
            )}
          </tbody>
        </table>
      </div>
      {pageInfo && total !== undefined ? (
        <div style={pagerStyle}>
          <span style={{ color: productSemanticColors.textMuted, fontSize: 12 }}>
            Найдено: <strong style={{ color: productSemanticColors.textPrimary }}>{total}</strong>
          </span>
          <span style={{ color: productSemanticColors.textMuted, fontSize: 12 }}>
            Страница {pageInfo.page} из {Math.max(1, pageInfo.pageCount)}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function DataRow<T>({ row, getRowHref }: { row: Row<T>; getRowHref?: (row: T) => string | undefined }) {
  const href = getRowHref?.(row.original);
  const cells = row.getVisibleCells();
  if (!href) {
    return (
      <tr style={trStyle}>
        {cells.map((cell) => (
          <td key={cell.id} style={tdStyle}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        ))}
      </tr>
    );
  }
  return (
    <tr style={{ ...trStyle, cursor: "pointer" }}>
      {cells.map((cell, idx) => (
        <td key={cell.id} style={tdStyle}>
          {idx === 0 ? (
            <Link
              href={href}
              prefetch={false}
              style={{ color: "inherit", textDecoration: "none", display: "block" }}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </Link>
          ) : (
            flexRender(cell.column.columnDef.cell, cell.getContext())
          )}
        </td>
      ))}
    </tr>
  );
}

const thStyle: React.CSSProperties = {
  padding: "12px 14px",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 0.6,
  textTransform: "uppercase",
  color: productSemanticColors.textMuted,
  borderBottom: `1px solid ${productSemanticColors.border}`,
  whiteSpace: "nowrap",
};

const trStyle: React.CSSProperties = {
  borderBottom: `1px solid ${productSemanticColors.border}`,
};

const tdStyle: React.CSSProperties = {
  padding: "12px 14px",
  fontSize: 13,
  color: productSemanticColors.textPrimary,
  verticalAlign: "middle",
};

const pagerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 18px",
  borderTop: `1px solid ${productSemanticColors.border}`,
  backgroundColor: productSemanticColors.cardSubtle,
};
