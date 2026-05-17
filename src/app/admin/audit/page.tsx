import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";
import Link from "next/link";
import { AdminPageChrome } from "../_components/AdminPageChrome";
import { AdminFilterBar } from "../_components/AdminFilterBar";
import { loadAdminSelf } from "@/lib/admin-self";
import { loadAdminAuditLog } from "@/lib/admin-audit-list";
import { formatDateTimeRu } from "../_components/format";
import { ruAdmin } from "../_locales/ru";

interface AdminAuditPageProps {
  searchParams: Promise<{
    actorId?: string;
    action?: string;
    entityType?: string;
    page?: string;
  }>;
}

export default async function AdminAuditPage({ searchParams }: AdminAuditPageProps) {
  const params = await searchParams;
  const [self, list] = await Promise.all([
    loadAdminSelf(),
    loadAdminAuditLog({
      page: Number(params.page ?? 1),
      filters: {
        actorId: params.actorId || undefined,
        action: params.action || undefined,
        entityType: params.entityType || undefined,
      },
    }),
  ]);

  return (
    <AdminPageChrome title={ruAdmin.nav.audit} self={self}>
      <AdminFilterBar
        fields={[
          { key: "action", label: "Действие", search: true, placeholder: "напр. support.change" },
          {
            key: "entityType",
            label: "Тип сущности",
            options: [
              { value: "PartMaster", label: "PartMaster" },
              { value: "ModelVariant", label: "ModelVariant" },
              { value: "FitmentReport", label: "FitmentReport" },
              { value: "FitmentConfidence", label: "FitmentConfidence" },
              { value: "ImportBatch", label: "ImportBatch" },
              { value: "User", label: "User" },
            ],
          },
        ]}
      />
      <div style={tableCardStyle}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Когда</th>
              <th style={thStyle}>Кто</th>
              <th style={thStyle}>Действие</th>
              <th style={thStyle}>Сущность</th>
              <th style={thStyle}>Обоснование</th>
            </tr>
          </thead>
          <tbody>
            {list.items.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: 32,
                    textAlign: "center",
                    color: productSemanticColors.textMuted,
                    fontSize: 13,
                  }}
                >
                  Нет записей в аудите
                </td>
              </tr>
            ) : (
              list.items.map((row) => (
                <tr
                  key={row.id}
                  style={{ borderTop: `1px solid ${productSemanticColors.border}` }}
                >
                  <td style={tdStyle}>{formatDateTimeRu(row.createdAt)}</td>
                  <td style={tdStyle}>
                    <Link
                      href={`/admin/users/${row.actorId}`}
                      prefetch={false}
                      style={{ color: productSemanticColors.textPrimary, textDecoration: "none" }}
                    >
                      {row.actorLabel}
                    </Link>
                  </td>
                  <td style={tdStyle}>
                    <code style={codeStyle}>{row.action}</code>
                  </td>
                  <td style={tdStyle}>
                    <Link
                      href={entityHref(row.entityType, row.entityId)}
                      prefetch={false}
                      style={{ color: productSemanticColors.primaryAction, textDecoration: "none" }}
                    >
                      {row.entityType} · {row.entityId.slice(0, 8)}…
                    </Link>
                    {row.importBatchId ? (
                      <Link
                        href={`/admin/imports/${row.importBatchId}`}
                        prefetch={false}
                        style={{
                          marginLeft: 8,
                          color: productSemanticColors.textMuted,
                          textDecoration: "none",
                          fontSize: 11,
                        }}
                      >
                        импорт →
                      </Link>
                    ) : null}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      color: productSemanticColors.textSecondary,
                      maxWidth: 360,
                    }}
                  >
                    {row.reason ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div style={pagerStyle}>
          <span style={{ fontSize: 12, color: productSemanticColors.textMuted }}>
            Найдено:{" "}
            <strong style={{ color: productSemanticColors.textPrimary }}>{list.total}</strong>
          </span>
          <span style={{ fontSize: 12, color: productSemanticColors.textMuted }}>
            Страница {list.page} из {list.pageCount}
          </span>
        </div>
      </div>
    </AdminPageChrome>
  );
}

function entityHref(entityType: string, entityId: string): string {
  switch (entityType) {
    case "PartMaster":
      return `/admin/catalog/${entityId}`;
    case "ModelVariant":
      return `/admin/models/${entityId}`;
    case "ImportBatch":
      return `/admin/imports/${entityId}`;
    case "User":
      return `/admin/users/${entityId}`;
    default:
      return "/admin/audit";
  }
}

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

const tdStyle: React.CSSProperties = {
  padding: "12px 14px",
  fontSize: 13,
  color: productSemanticColors.textPrimary,
};

const codeStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono), monospace",
  fontSize: 12,
  padding: "2px 6px",
  borderRadius: radiusScale.sm,
  backgroundColor: productSemanticColors.cardSubtle,
  color: productSemanticColors.textSecondary,
};

const pagerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 18px",
  borderTop: `1px solid ${productSemanticColors.border}`,
  backgroundColor: productSemanticColors.cardSubtle,
};
