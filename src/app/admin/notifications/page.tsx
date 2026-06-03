import Link from "next/link";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";
import { AdminPageChrome } from "../_components/AdminPageChrome";
import { loadAdminSelf } from "@/lib/admin-self";
import { prisma } from "@/lib/prisma";
import { ruAdmin } from "../_locales/ru";

export default async function AdminNotificationsAdminPage() {
  const self = await loadAdminSelf();
  const deliveries = await prisma.notificationDelivery.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      notification: {
        select: { title: true, type: true, severity: true, userId: true },
      },
    },
  });

  return (
    <AdminPageChrome title={ruAdmin.nav.notifications} self={self}>
      <p style={{ margin: "0 0 12px", color: productSemanticColors.textMuted, fontSize: 14 }}>
        Журнал доставок (последние 100). Редактор шаблонов — в следующей итерации. Сводка алертов — на{" "}
        <Link href="/admin?period=30d" style={{ color: productSemanticColors.primaryAction }}>
          дашборде
        </Link>
        .
      </p>
      <div style={tableCardStyle}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Когда</th>
              <th style={thStyle}>Канал</th>
              <th style={thStyle}>Статус</th>
              <th style={thStyle}>Уведомление</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.length === 0 ? (
              <tr>
                <td colSpan={4} style={tdStyle}>
                  Доставок пока нет.
                </td>
              </tr>
            ) : (
              deliveries.map((row) => (
                <tr key={row.id}>
                  <td style={tdStyle}>{row.createdAt.toLocaleString("ru-RU")}</td>
                  <td style={tdStyle}>{row.channel}</td>
                  <td style={tdStyle}>{row.status}</td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600, color: productSemanticColors.textPrimary }}>
                      {row.notification.title}
                    </div>
                    <div style={{ fontSize: 12, color: productSemanticColors.textMuted }}>
                      {row.notification.type} · {row.notification.severity}
                    </div>
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

const tableCardStyle: React.CSSProperties = {
  borderRadius: radiusScale.lg,
  border: `1px solid ${productSemanticColors.border}`,
  backgroundColor: productSemanticColors.card,
  overflow: "hidden",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: 12,
  fontWeight: 600,
  color: productSemanticColors.textMuted,
  borderBottom: `1px solid ${productSemanticColors.border}`,
};

const tdStyle: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 13,
  color: productSemanticColors.textSecondary,
  borderBottom: `1px solid ${productSemanticColors.border}`,
  verticalAlign: "top",
};
