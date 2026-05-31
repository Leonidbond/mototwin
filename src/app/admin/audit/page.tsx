import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";
import Link from "next/link";
import { AdminPageChrome } from "../_components/AdminPageChrome";
import { AdminFilterBar } from "../_components/AdminFilterBar";
import { loadAdminSelf } from "@/lib/admin-self";
import { loadAdminAuditLog } from "@/lib/admin-audit-list";
import { loadAuthAuditLog } from "@/lib/auth-audit-list";
import { formatDateTimeRu } from "../_components/format";
import { ruAdmin } from "../_locales/ru";

interface AdminAuditPageProps {
  searchParams: Promise<{
    type?: string;
    actorId?: string;
    action?: string;
    entityType?: string;
    userId?: string;
    event?: string;
    page?: string;
  }>;
}

export default async function AdminAuditPage({ searchParams }: AdminAuditPageProps) {
  const params = await searchParams;
  const auditType = params.type === "auth" ? "auth" : "admin";
  const page = Number(params.page ?? 1);

  const self = await loadAdminSelf();
  const list =
    auditType === "auth"
      ? await loadAuthAuditLog({
          page,
          filters: {
            userId: params.userId || undefined,
            event: params.event || undefined,
          },
        })
      : await loadAdminAuditLog({
          page,
          filters: {
            actorId: params.actorId || undefined,
            action: params.action || undefined,
            entityType: params.entityType || undefined,
          },
        });

  return (
    <AdminPageChrome title={ruAdmin.nav.audit} self={self}>
      <div style={tabsStyle}>
        <AuditTabLink href="/admin/audit" active={auditType === "admin"} label="Админ-действия" />
        <AuditTabLink
          href="/admin/audit?type=auth"
          active={auditType === "auth"}
          label="Auth-события"
        />
      </div>

      {auditType === "auth" ? (
        <>
          <AdminFilterBar
            fields={[
              {
                key: "event",
                label: "Событие",
                search: true,
                placeholder: "напр. login.failure",
              },
              { key: "userId", label: "User ID", search: true, placeholder: "cuid…" },
            ]}
          />
          <div style={tableCardStyle}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Когда</th>
                  <th style={thStyle}>Пользователь</th>
                  <th style={thStyle}>Событие</th>
                  <th style={thStyle}>Код</th>
                  <th style={thStyle}>IP</th>
                  <th style={thStyle}>Детали</th>
                </tr>
              </thead>
              <tbody>
                {list.items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        padding: 32,
                        textAlign: "center",
                        color: productSemanticColors.textMuted,
                        fontSize: 13,
                      }}
                    >
                      Нет auth-событий
                    </td>
                  </tr>
                ) : (
                  list.items.map((row) => {
                    const authRow = row as (typeof list.items)[number] & {
                      userId?: string | null;
                      userLabel?: string;
                      event?: string;
                      reasonCode?: string | null;
                      metadata?: unknown;
                      ip?: string | null;
                    };
                    return (
                      <tr
                        key={authRow.id}
                        style={{ borderTop: `1px solid ${productSemanticColors.border}` }}
                      >
                        <td style={tdStyle}>{formatDateTimeRu(authRow.createdAt)}</td>
                        <td style={tdStyle}>
                          {authRow.userId ? (
                            <Link
                              href={`/admin/users/${authRow.userId}`}
                              prefetch={false}
                              style={{
                                color: productSemanticColors.textPrimary,
                                textDecoration: "none",
                              }}
                            >
                              {authRow.userLabel ?? authRow.userId.slice(0, 8)}
                            </Link>
                          ) : (
                            <span style={{ color: productSemanticColors.textMuted }}>
                              {authRow.userLabel ?? "неизвестен"}
                            </span>
                          )}
                        </td>
                        <td style={tdStyle}>
                          <code style={codeStyle}>{authRow.event}</code>
                        </td>
                        <td style={tdStyle}>
                          {authRow.reasonCode ? (
                            <code style={codeStyle}>{authRow.reasonCode}</code>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td style={{ ...tdStyle, fontFamily: "var(--font-mono), monospace", fontSize: 12 }}>
                          {authRow.ip ?? "—"}
                        </td>
                        <td
                          style={{
                            ...tdStyle,
                            color: productSemanticColors.textSecondary,
                            maxWidth: 280,
                            fontSize: 12,
                          }}
                        >
                          {formatMetadata(authRow.metadata)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            <AuditPager total={list.total} page={list.page} pageCount={list.pageCount} />
          </div>
        </>
      ) : (
        <>
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
                  list.items.map((row) => {
                    const adminRow = row as (typeof list.items)[number] & {
                      actorId?: string;
                      actorLabel?: string;
                      action?: string;
                      entityType?: string;
                      entityId?: string;
                      importBatchId?: string | null;
                      reason?: string | null;
                    };
                    return (
                      <tr
                        key={adminRow.id}
                        style={{ borderTop: `1px solid ${productSemanticColors.border}` }}
                      >
                        <td style={tdStyle}>{formatDateTimeRu(adminRow.createdAt)}</td>
                        <td style={tdStyle}>
                          <Link
                            href={`/admin/users/${adminRow.actorId}`}
                            prefetch={false}
                            style={{ color: productSemanticColors.textPrimary, textDecoration: "none" }}
                          >
                            {adminRow.actorLabel}
                          </Link>
                        </td>
                        <td style={tdStyle}>
                          <code style={codeStyle}>{adminRow.action}</code>
                        </td>
                        <td style={tdStyle}>
                          <Link
                            href={entityHref(adminRow.entityType ?? "", adminRow.entityId ?? "")}
                            prefetch={false}
                            style={{
                              color: productSemanticColors.primaryAction,
                              textDecoration: "none",
                            }}
                          >
                            {adminRow.entityType} · {(adminRow.entityId ?? "").slice(0, 8)}…
                          </Link>
                          {adminRow.importBatchId ? (
                            <Link
                              href={`/admin/imports/${adminRow.importBatchId}`}
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
                          {adminRow.reason ?? "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            <AuditPager total={list.total} page={list.page} pageCount={list.pageCount} />
          </div>
        </>
      )}
    </AdminPageChrome>
  );
}

function AuditTabLink({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      style={{
        padding: "8px 14px",
        borderRadius: radiusScale.md,
        fontSize: 13,
        fontWeight: 600,
        textDecoration: "none",
        color: active ? productSemanticColors.textPrimary : productSemanticColors.textMuted,
        backgroundColor: active ? productSemanticColors.card : "transparent",
        border: active ? `1px solid ${productSemanticColors.border}` : "1px solid transparent",
      }}
    >
      {label}
    </Link>
  );
}

function AuditPager({
  total,
  page,
  pageCount,
}: {
  total: number;
  page: number;
  pageCount: number;
}) {
  return (
    <div style={pagerStyle}>
      <span style={{ fontSize: 12, color: productSemanticColors.textMuted }}>
        Найдено: <strong style={{ color: productSemanticColors.textPrimary }}>{total}</strong>
      </span>
      <span style={{ fontSize: 12, color: productSemanticColors.textMuted }}>
        Страница {page} из {pageCount}
      </span>
    </div>
  );
}

function formatMetadata(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "object" && !Array.isArray(value)) {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return "—";
    return entries.map(([k, v]) => `${k}=${String(v)}`).join(", ");
  }
  return String(value);
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

const tabsStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  marginBottom: 16,
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
