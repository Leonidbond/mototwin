import Link from "next/link";
import { AdminPageChrome } from "../_components/AdminPageChrome";
import { ComingSoonPanel } from "../_components/ComingSoonPanel";
import { loadAdminSelf } from "@/lib/admin-self";
import { ruAdmin } from "../_locales/ru";

export default async function AdminServiceRulesPage() {
  const self = await loadAdminSelf();
  return (
    <AdminPageChrome title={ruAdmin.nav.serviceRules} self={self}>
      <ComingSoonPanel
        title="Регламенты ТО"
        description="Редактор предложенных регламентов с правилами наследования по бренду/модели/году. Появится в следующей итерации."
        bullets={[
          "Просмотр существующих NodeMaintenanceRule с фильтром по бренду и узлу",
          "Редактирование интервалов и условий замены, версия записывается в Audit log",
          "Bulk-импорт через /admin/imports (тип SERVICE_RULES)",
        ]}
        cta={<Link href="/admin/imports/new">→ создать импорт SERVICE_RULES</Link>}
      />
    </AdminPageChrome>
  );
}
