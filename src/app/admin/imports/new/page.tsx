import { redirect } from "next/navigation";
import Link from "next/link";
import { productSemanticColors } from "@mototwin/design-tokens";
import { AdminPageChrome } from "../../_components/AdminPageChrome";
import { loadAdminSelf } from "@/lib/admin-self";
import { canMutate } from "@/lib/admin-auth";
import { NewImportForm } from "./_components/NewImportForm";

export default async function AdminNewImportPage() {
  const self = await loadAdminSelf();
  if (!canMutate(self.role)) redirect("/admin/imports");
  return (
    <AdminPageChrome title="Новый импорт" self={self}>
      <Link
        href="/admin/imports"
        prefetch={false}
        style={{ color: productSemanticColors.textMuted, fontSize: 12, textDecoration: "none" }}
      >
        ← К списку импортов
      </Link>
      <NewImportForm />
    </AdminPageChrome>
  );
}
