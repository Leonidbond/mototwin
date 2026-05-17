import Link from "next/link";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";
import { AdminPageChrome } from "../_components/AdminPageChrome";
import { loadAdminSelf } from "@/lib/admin-self";
import { ruAdmin } from "../_locales/ru";
import {
  ListTodo,
  Bike,
  Wrench,
  Boxes,
  ShieldCheck,
  Combine,
  CalendarDays,
  Upload,
} from "../_components/icons";

interface ReportCard {
  title: string;
  description: string;
  href: string;
  Icon: typeof ListTodo;
}

const REPORTS: ReportCard[] = [
  {
    title: "Активность пользователей",
    description:
      "Динамика регистраций, новых мотоциклов, fitment-отчетов и service events.",
    href: "/admin?period=30d#activity",
    Icon: CalendarDays,
  },
  {
    title: "Топ моделей",
    description: "Самые быстрорастущие модели в гаражах с уровнями поддержки.",
    href: "/admin/models?supportLevel=COMMUNITY_SUPPORT",
    Icon: Bike,
  },
  {
    title: "Состояние каталога",
    description: "Заполненность каталога деталей, дубликаты, aliases.",
    href: "/admin/catalog?status=ACTIVE",
    Icon: Boxes,
  },
  {
    title: "Покрытие fitment",
    description: "Матрица бренд × узел, конфликтующие fitments и низкая уверенность.",
    href: "/admin/fitment",
    Icon: ShieldCheck,
  },
  {
    title: "Очереди модерации",
    description: "Сводка по 7 очередям модерации с историей действий.",
    href: "/admin/moderation",
    Icon: Wrench,
  },
  {
    title: "Bulk import",
    description: "Все массовые загрузки и их статус.",
    href: "/admin/imports",
    Icon: Upload,
  },
  {
    title: "Audit log",
    description: "Все мутирующие действия админов с обоснованиями.",
    href: "/admin/audit",
    Icon: ListTodo,
  },
  {
    title: "Слияния и дубликаты",
    description: "Детали со статусом MERGED и записанные обоснования.",
    href: "/admin/catalog?status=MERGED",
    Icon: Combine,
  },
];

export default async function AdminReportsPage() {
  const self = await loadAdminSelf();
  return (
    <AdminPageChrome title={ruAdmin.nav.reports} self={self}>
      <p style={{ margin: 0, color: productSemanticColors.textMuted, fontSize: 13 }}>
        Отчёты — быстрые ссылки в существующие разделы с пред-настроенными фильтрами. Полноценные
        выгрузки CSV/XLSX появятся в следующей итерации.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 14,
        }}
      >
        {REPORTS.map((report) => (
          <Link
            key={report.title}
            href={report.href}
            prefetch={false}
            style={cardLinkStyle}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: radiusScale.sm,
                backgroundColor: "rgba(56,189,248,0.10)",
                color: productSemanticColors.primaryAction,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <report.Icon size={18} />
            </div>
            <div style={{ marginTop: 10, fontSize: 14, fontWeight: 600 }}>{report.title}</div>
            <div
              style={{
                marginTop: 4,
                fontSize: 12,
                color: productSemanticColors.textMuted,
                lineHeight: 1.5,
              }}
            >
              {report.description}
            </div>
          </Link>
        ))}
      </div>
    </AdminPageChrome>
  );
}

const cardLinkStyle: React.CSSProperties = {
  display: "block",
  padding: 18,
  backgroundColor: productSemanticColors.card,
  border: `1px solid ${productSemanticColors.border}`,
  borderRadius: radiusScale.lg,
  color: productSemanticColors.textPrimary,
  textDecoration: "none",
  transition: "border-color 120ms ease",
};
