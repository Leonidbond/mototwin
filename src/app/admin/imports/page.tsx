import Link from "next/link";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";
import { AdminPageChrome } from "../_components/AdminPageChrome";
import { loadAdminSelf } from "@/lib/admin-self";
import { canMutate } from "@/lib/admin-auth";
import { loadImportBatchList } from "@/lib/admin-imports";
import { formatDateTimeRu, formatNumberRu } from "../_components/format";
import { ruAdmin } from "../_locales/ru";
import { Plus } from "../_components/icons";

export default async function AdminImportsPage() {
  const [self, list] = await Promise.all([loadAdminSelf(), loadImportBatchList({ page: 1 })]);
  const allowMutate = canMutate(self.role);
  return (
    <AdminPageChrome
      title={ruAdmin.nav.imports}
      self={self}
      rightSlot={
        allowMutate ? (
          <Link href="/admin/imports/new" prefetch={false} style={primaryButton}>
            <Plus size={14} />
            <span>Новый импорт</span>
          </Link>
        ) : null
      }
    >
      <div style={tableCardStyle}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Файл / тип</th>
              <th style={thStyle}>Статус</th>
              <th style={thStyle}>Создан</th>
              <th style={thStyleNumeric}>Всего</th>
              <th style={thStyleNumeric}>Создано</th>
              <th style={thStyleNumeric}>Обновлено</th>
              <th style={thStyleNumeric}>Ошибок</th>
            </tr>
          </thead>
          <tbody>
            {list.items.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: 32,
                    textAlign: "center",
                    color: productSemanticColors.textMuted,
                    fontSize: 13,
                  }}
                >
                  Импортов пока нет
                </td>
              </tr>
            ) : (
              list.items.map((batch) => (
                <tr
                  key={batch.id}
                  style={{ borderTop: `1px solid ${productSemanticColors.border}` }}
                >
                  <td style={tdStyle}>
                    <Link
                      href={`/admin/imports/${batch.id}`}
                      prefetch={false}
                      style={{ color: productSemanticColors.textPrimary, textDecoration: "none" }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{batch.fileName}</div>
                      <div style={{ fontSize: 12, color: productSemanticColors.textMuted }}>
                        {batch.type} · {batch.createdByLabel}
                      </div>
                    </Link>
                  </td>
                  <td style={tdStyle}>
                    <StatusChip status={batch.status} />
                  </td>
                  <td style={tdStyle}>{formatDateTimeRu(batch.createdAt)}</td>
                  <td style={tdStyleNumeric}>{formatNumberRu(batch.summary.total)}</td>
                  <td style={tdStyleNumeric}>{formatNumberRu(batch.summary.created)}</td>
                  <td style={tdStyleNumeric}>{formatNumberRu(batch.summary.updated)}</td>
                  <td style={tdStyleNumeric}>
                    {batch.summary.errors > 0 ? (
                      <span style={{ color: "#FCA5A5", fontWeight: 700 }}>
                        {formatNumberRu(batch.summary.errors)}
                      </span>
                    ) : (
                      formatNumberRu(0)
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminPageChrome>
  );
}

function StatusChip({ status }: { status: string }) {
  const palette = STATUS_COLORS[status] ?? { fg: "#94A3B8", bg: "rgba(148,163,184,0.14)" };
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
        color: palette.fg,
        backgroundColor: palette.bg,
      }}
    >
      {status}
    </span>
  );
}

const STATUS_COLORS: Record<string, { fg: string; bg: string }> = {
  DRAFT: { fg: "#A5B4FC", bg: "rgba(99,102,241,0.16)" },
  VALIDATING: { fg: "#FBBF24", bg: "rgba(251,191,36,0.14)" },
  READY: { fg: "#86EFAC", bg: "rgba(34,197,94,0.14)" },
  IMPORTING: { fg: "#7DD3FC", bg: "rgba(56,189,248,0.16)" },
  COMMITTED: { fg: "#86EFAC", bg: "rgba(34,197,94,0.20)" },
  ROLLED_BACK: { fg: "#94A3B8", bg: "rgba(148,163,184,0.20)" },
  FAILED: { fg: "#FCA5A5", bg: "rgba(248,113,113,0.14)" },
};

const tableCardStyle: React.CSSProperties = {
  backgroundColor: productSemanticColors.card,
  border: `1px solid ${productSemanticColors.border}`,
  borderRadius: radiusScale.lg,
  overflow: "hidden",
};

const thStyle: React.CSSProperties = {
  padding: "12px 14px",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 0.5,
  textTransform: "uppercase",
  color: productSemanticColors.textMuted,
  borderBottom: `1px solid ${productSemanticColors.border}`,
};
const thStyleNumeric: React.CSSProperties = { ...thStyle, textAlign: "right" };

const tdStyle: React.CSSProperties = {
  padding: "12px 14px",
  fontSize: 13,
  color: productSemanticColors.textPrimary,
};
const tdStyleNumeric: React.CSSProperties = {
  ...tdStyle,
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
};

const primaryButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 34,
  padding: "0 14px",
  borderRadius: radiusScale.sm,
  backgroundColor: productSemanticColors.primaryAction,
  color: productSemanticColors.onPrimaryAction,
  fontSize: 13,
  fontWeight: 600,
  textDecoration: "none",
};
