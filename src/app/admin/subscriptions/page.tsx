import Link from "next/link";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";
import { AdminPageChrome } from "../_components/AdminPageChrome";
import { loadAdminSelf } from "@/lib/admin-self";
import { prisma } from "@/lib/prisma";
import { formatNumberRu } from "../_components/format";
import { ruAdmin } from "../_locales/ru";

export default async function AdminSubscriptionsPage() {
  const self = await loadAdminSelf();
  const subs = await prisma.subscription.groupBy({
    by: ["planType", "status"],
    _count: { _all: true },
  });

  const totalUsers = await prisma.user.count();
  const subsByPlan = new Map<string, number>();
  for (const row of subs) {
    subsByPlan.set(row.planType, (subsByPlan.get(row.planType) ?? 0) + row._count._all);
  }
  const free = totalUsers - (subsByPlan.get("PRO") ?? 0);

  return (
    <AdminPageChrome title={ruAdmin.nav.subscriptions} self={self}>
      <p style={{ margin: 0, color: productSemanticColors.textMuted, fontSize: 13 }}>
        Сводка по подпискам. Управление платежами и Stripe webhooks появится в следующей итерации.
      </p>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 14,
        }}
      >
        <Stat label="Всего пользователей" value={formatNumberRu(totalUsers)} />
        <Stat
          label="PRO активные"
          value={formatNumberRu(
            subs
              .filter((row) => row.planType === "PRO" && row.status === "ACTIVE")
              .reduce((acc, row) => acc + row._count._all, 0)
          )}
          tone="ok"
        />
        <Stat label="FREE" value={formatNumberRu(Math.max(0, free))} tone="muted" />
      </section>

      <section
        style={{
          backgroundColor: productSemanticColors.card,
          border: `1px solid ${productSemanticColors.border}`,
          borderRadius: radiusScale.lg,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Plan</th>
              <th style={thStyle}>Status</th>
              <th style={thStyleNumeric}>Кол-во</th>
            </tr>
          </thead>
          <tbody>
            {subs.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  style={{
                    padding: 32,
                    textAlign: "center",
                    color: productSemanticColors.textMuted,
                    fontSize: 13,
                  }}
                >
                  Пока нет ни одной подписки
                </td>
              </tr>
            ) : (
              subs.map((row) => (
                <tr
                  key={`${row.planType}-${row.status}`}
                  style={{ borderTop: `1px solid ${productSemanticColors.border}` }}
                >
                  <td style={tdStyle}>{row.planType}</td>
                  <td style={tdStyle}>{row.status}</td>
                  <td style={tdStyleNumeric}>{formatNumberRu(row._count._all)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <p style={{ margin: 0, fontSize: 12, color: productSemanticColors.textMuted }}>
        Список PRO-пользователей доступен на странице{" "}
        <Link
          href="/admin/users?plan=PRO"
          prefetch={false}
          style={{ color: productSemanticColors.primaryAction }}
        >
          Пользователи
        </Link>
        .
      </p>
    </AdminPageChrome>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "muted";
}) {
  const color =
    tone === "ok"
      ? "#86EFAC"
      : tone === "muted"
      ? productSemanticColors.textSecondary
      : productSemanticColors.textPrimary;
  return (
    <div
      style={{
        backgroundColor: productSemanticColors.card,
        border: `1px solid ${productSemanticColors.border}`,
        borderRadius: radiusScale.lg,
        padding: "16px 18px",
      }}
    >
      <div style={{ fontSize: 12, color: productSemanticColors.textMuted, fontWeight: 600 }}>
        {label}
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: 26,
          fontWeight: 700,
          color,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
    </div>
  );
}

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
  padding: "10px 14px",
  fontSize: 13,
  color: productSemanticColors.textPrimary,
};
const tdStyleNumeric: React.CSSProperties = {
  ...tdStyle,
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
};
