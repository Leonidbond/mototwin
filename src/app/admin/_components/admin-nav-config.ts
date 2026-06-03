import type { AdminSectionKey } from "@mototwin/types";

export interface AdminNavItem {
  key: AdminSectionKey;
  label: string;
  href: string;
  /** Lucide icon name (resolved on the client). */
  icon: string;
  /** When true, item shows a small unread dot on the right. */
  hasAlertDot?: boolean;
}

/**
 * Single source of truth for sidebar order, hrefs and breadcrumbs.
 * Order mirrors docs/mototwin_admin_panel_spec.md §4.
 */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { key: "dashboard", label: "Дашборд", href: "/admin", icon: "LayoutDashboard" },
  { key: "reports", label: "Отчеты", href: "/admin/reports", icon: "BarChart3" },
  { key: "users", label: "Пользователи", href: "/admin/users", icon: "Users" },
  { key: "vehicles", label: "Мотоциклы", href: "/admin/vehicles", icon: "Bike" },
  { key: "models", label: "Модели и поддержка", href: "/admin/models", icon: "Layers" },
  { key: "catalog", label: "Каталог деталей", href: "/admin/catalog", icon: "Boxes" },
  { key: "fitment", label: "Совместимость", href: "/admin/fitment", icon: "Combine" },
  { key: "moderation", label: "Модерация", href: "/admin/moderation", icon: "ShieldCheck" },
  { key: "imports", label: "Массовые загрузки", href: "/admin/imports", icon: "Upload" },
  { key: "service-rules", label: "Регламенты ТО", href: "/admin/service-rules", icon: "Wrench" },
  { key: "dictionaries", label: "Справочники", href: "/admin/dictionaries", icon: "Library" },
  { key: "notifications", label: "Уведомления", href: "/admin/notifications", icon: "Bell" },
  { key: "subscriptions", label: "Подписки", href: "/admin/subscriptions", icon: "CreditCard", hasAlertDot: true },
  { key: "audit", label: "Аудит", href: "/admin/audit", icon: "ScrollText" },
  { key: "settings", label: "Настройки", href: "/admin/settings", icon: "Settings" },
];

/** Resolve the active navigation key from a pathname. */
export function resolveActiveSection(pathname: string): AdminSectionKey {
  if (pathname === "/admin" || pathname === "/admin/") return "dashboard";
  const match = ADMIN_NAV_ITEMS.find(
    (item) => item.href !== "/admin" && pathname.startsWith(item.href)
  );
  return match ? match.key : "dashboard";
}

export function findNavItem(key: AdminSectionKey): AdminNavItem | undefined {
  return ADMIN_NAV_ITEMS.find((item) => item.key === key);
}
