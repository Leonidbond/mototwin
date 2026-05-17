import Link from "next/link";
import { AdminPageChrome } from "../_components/AdminPageChrome";
import { ComingSoonPanel } from "../_components/ComingSoonPanel";
import { loadAdminSelf } from "@/lib/admin-self";
import { ruAdmin } from "../_locales/ru";

export default async function AdminNotificationsAdminPage() {
  const self = await loadAdminSelf();
  return (
    <AdminPageChrome title={ruAdmin.nav.notifications} self={self}>
      <ComingSoonPanel
        title="Управление уведомлениями"
        description="Шаблоны системных уведомлений, ручная отправка и журнал доставок появятся в следующей итерации. Текущие алерты для админа доступны через колокольчик в правом верхнем углу."
        bullets={[
          "Редактор шаблонов notification.* с превью и таргетингом",
          "Ручная рассылка обновлений каталога / fitments / safety",
          "Журнал доставок с фильтрами по каналу (push / email / in-app)",
        ]}
        cta={<Link href="/admin?period=30d">→ сводка алертов на дашборде</Link>}
      />
    </AdminPageChrome>
  );
}
