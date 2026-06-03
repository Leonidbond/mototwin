import { Suspense } from "react";
import Link from "next/link";
import { AdminPageChrome } from "../../_components/AdminPageChrome";
import { NewServiceRuleForm } from "../_components/NewServiceRuleForm";
import { loadAdminSelf } from "@/lib/admin-self";
import { ruAdmin } from "../../_locales/ru";
import { productSemanticColors } from "@mototwin/design-tokens";

export default async function AdminNewServiceRulePage() {
  const self = await loadAdminSelf();
  return (
    <AdminPageChrome title={`${ruAdmin.nav.serviceRules} — новый`} self={self}>
      <p style={{ margin: "0 0 12px", fontSize: 14 }}>
        <Link href="/admin/service-rules" style={{ color: productSemanticColors.primaryAction }}>
          ← К списку регламентов
        </Link>
      </p>
      <Suspense fallback={<p style={{ color: productSemanticColors.textMuted }}>Загрузка…</p>}>
        <NewServiceRuleForm />
      </Suspense>
    </AdminPageChrome>
  );
}
