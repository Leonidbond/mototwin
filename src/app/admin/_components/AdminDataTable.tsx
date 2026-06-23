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
  enableSelection?: boolean;
  getRowId?: (row: T) => string;
  selectedIds?: string[];
  onToggleRow?: (id: string, checked: boolean) => void;
  allSelected?: boolean;
  onToggleAll?: (checked: boolean) => void;
}

export function AdminDataTable<T>({
  data,
  columns,
  getRowHref,
  emptyLabel = "Ничего не найдено",
  loading = false,
  total,
  pageInfo,
  enableSelection = false,
  getRowId,
  selectedIds = [],
  onToggleRow,
  allSelected = false,
  onToggleAll,
}: AdminDataTableProps<T>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const colSpan = columns.length + (enableSelection ? 1 : 0);

  return (
    <div
      style={{
        backgroundColor: productSemanticColors.card,
        border: `1px solid ${productSemanticColors.border}`,
        borderRadius: radiusScale.lg,
        overflow: "hidden",
        minWidth: 0,
        maxWidth: "100%",
      }}
    >
      <div style={{ overflowX: "auto", opacity: loading ? 0.6 : 1 }}>
        <table style={{ width: "100%", minWidth: 680, borderCollapse: "collapse" }}>
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {enableSelection ? (
                  <th style={{ ...thStyle, width: 42 }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(event) => onToggleAll?.(event.target.checked)}
                      aria-label="Выбрать все на странице"
                    />
                  </th>
                ) : null}
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
                  colSpan={colSpan}
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
                <DataRow
                  key={row.id}
                  row={row}
                  getRowHref={getRowHref}
                  enableSelection={enableSelection}
                  rowId={getRowId?.(row.original)}
                  selected={getRowId ? selectedIds.includes(getRowId(row.original)) : false}
                  onToggleRow={onToggleRow}
                />
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

function DataRow<T>({
  row,
  getRowHref,
  enableSelection,
  rowId,
  selected,
  onToggleRow,
}: {
  row: Row<T>;
  getRowHref?: (row: T) => string | undefined;
  enableSelection?: boolean;
  rowId?: string;
  selected?: boolean;
  onToggleRow?: (id: string, checked: boolean) => void;
}) {
  const href = getRowHref?.(row.original);
  const cells = row.getVisibleCells();

  return (
    <tr style={{ ...trStyle, cursor: href ? "pointer" : undefined }}>
      {enableSelection && rowId ? (
        <td style={{ ...tdStyle, width: 42 }}>
          <input
            type="checkbox"
            checked={selected}
            onChange={(event) => onToggleRow?.(rowId, event.target.checked)}
            onClick={(event) => event.stopPropagation()}
            aria-label="Выбрать строку"
          />
        </td>
      ) : null}
      {cells.map((cell, idx) => (
        <td key={cell.id} style={tdStyle}>
          {href && idx === 0 ? (
            <Link
              href={href}
              prefetch={false}
              style={{
                color: "inherit",
                textDecoration: "none",
                display: "block",
                minWidth: 0,
                overflowWrap: "anywhere",
              }}
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
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

const pagerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: 8,
  padding: "12px 18px",
  borderTop: `1px solid ${productSemanticColors.border}`,
  backgroundColor: productSemanticColors.cardSubtle,
};
