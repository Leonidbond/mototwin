import { notFound } from "next/navigation";
import Link from "next/link";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";
import { AdminPageChrome } from "../../_components/AdminPageChrome";
import { loadAdminSelf } from "@/lib/admin-self";
import { canMutate } from "@/lib/admin-auth";
import { loadImportBatchDetail } from "@/lib/admin-imports";
import { formatDateTimeRu } from "../../_components/format";
import { ImportActions } from "./_components/ImportActions";

interface AdminImportDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminImportDetailPage({ params }: AdminImportDetailPageProps) {
  const { id } = await params;
  const [self, detail] = await Promise.all([loadAdminSelf(), loadImportBatchDetail(id)]);
  if (!detail) notFound();

  return (
    <AdminPageChrome title={detail.fileName} self={self}>
      <Link
        href="/admin/imports"
        prefetch={false}
        style={{ color: productSemanticColors.textMuted, fontSize: 12, textDecoration: "none" }}
      >
        ← К списку импортов
      </Link>

      <section style={cardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: 13, color: productSemanticColors.textMuted }}>
              {detail.type} · автор {detail.createdByLabel}
            </div>
            <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Tag label={`Создан · ${formatDateTimeRu(detail.createdAt)}`} />
              {detail.dryRunAt ? (
                <Tag label={`Dry-run · ${formatDateTimeRu(detail.dryRunAt)}`} />
              ) : null}
              {detail.committedAt ? (
                <Tag label={`Зафиксирован · ${formatDateTimeRu(detail.committedAt)}`} tone="ok" />
              ) : null}
              {detail.rolledBackAt ? (
                <Tag label={`Откачен · ${formatDateTimeRu(detail.rolledBackAt)}`} tone="warn" />
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <ImportActions
        batch={detail}
        canCommit={canMutate(self.role)}
        canRollback={self.role === "SUPER_ADMIN"}
      />

      <section style={tableCardStyle}>
        <h3 style={{ margin: 0, padding: "12px 18px", fontSize: 14, fontWeight: 600 }}>
          Строки ({detail.rows.length})
        </h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>#</th>
                <th style={thStyle}>Действие</th>
                <th style={thStyle}>Статус</th>
                <th style={thStyle}>Сообщение / превью</th>
              </tr>
            </thead>
            <tbody>
              {detail.rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      padding: 32,
                      textAlign: "center",
                      color: productSemanticColors.textMuted,
                      fontSize: 13,
                    }}
                  >
                    В файле не найдено строк
                  </td>
                </tr>
              ) : (
                detail.rows.map((row) => (
                  <tr
                    key={row.id}
                    style={{ borderTop: `1px solid ${productSemanticColors.border}` }}
                  >
                    <td style={tdStyle}>{row.rowIndex + 1}</td>
                    <td style={tdStyle}>{row.action ?? "—"}</td>
                    <td style={tdStyle}>
                      <RowStatus status={row.status} />
                    </td>
                    <td style={tdStyle}>
                      {row.errorMessage ? (
                        <span style={{ color: "#FCA5A5" }}>{row.errorMessage}</span>
                      ) : (
                        <span style={{ color: productSemanticColors.textMuted }}>
                          {previewRaw(row.raw)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AdminPageChrome>
  );
}

function Tag({ label, tone }: { label: string; tone?: "ok" | "warn" }) {
  const palette =
    tone === "ok"
      ? { fg: "#86EFAC", bg: "rgba(34,197,94,0.14)" }
      : tone === "warn"
      ? { fg: "#FBBF24", bg: "rgba(251,191,36,0.14)" }
      : { fg: productSemanticColors.textSecondary, bg: productSemanticColors.cardSubtle };
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
      {label}
    </span>
  );
}

function RowStatus({ status }: { status: "ok" | "warning" | "error" }) {
  const palette =
    status === "ok"
      ? { fg: "#86EFAC", bg: "rgba(34,197,94,0.14)" }
      : status === "warning"
      ? { fg: "#FBBF24", bg: "rgba(251,191,36,0.14)" }
      : { fg: "#FCA5A5", bg: "rgba(248,113,113,0.14)" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 20,
        padding: "0 8px",
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

function previewRaw(raw: Record<string, string>): string {
  const entries = Object.entries(raw).slice(0, 3);
  return entries.map(([k, v]) => `${k}=${v}`).join(" · ");
}

const cardStyle: React.CSSProperties = {
  backgroundColor: productSemanticColors.card,
  border: `1px solid ${productSemanticColors.border}`,
  borderRadius: radiusScale.lg,
  padding: 18,
};

const tableCardStyle: React.CSSProperties = {
  backgroundColor: productSemanticColors.card,
  border: `1px solid ${productSemanticColors.border}`,
  borderRadius: radiusScale.lg,
  overflow: "hidden",
};

const thStyle: React.CSSProperties = {
  padding: "10px 14px",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 0.5,
  textTransform: "uppercase",
  color: productSemanticColors.textMuted,
  borderBottom: `1px solid ${productSemanticColors.border}`,
};

const tdStyle: React.CSSProperties = {
  padding: "10px 14px",
  fontSize: 13,
  color: productSemanticColors.textPrimary,
  verticalAlign: "top",
};
