import Link from "next/link";
import { AdminPageChrome } from "../_components/AdminPageChrome";
import { ServiceRulesPanel } from "./_components/ServiceRulesPanel";
import { loadAdminSelf } from "@/lib/admin-self";
import { ruAdmin } from "../_locales/ru";

export default async function AdminServiceRulesPage() {
  const self = await loadAdminSelf();
  return (
    <AdminPageChrome title={ruAdmin.nav.serviceRules} self={self}>
      <ServiceRulesPanel />
    </AdminPageChrome>
  );
}
