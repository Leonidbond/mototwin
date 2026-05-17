import { redirect } from "next/navigation";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";
import { AdminPageChrome } from "../_components/AdminPageChrome";
import { loadAdminSelf } from "@/lib/admin-self";
import { loadAdminTeam } from "@/lib/admin-settings";
import { TeamRoleEditor } from "./_components/TeamRoleEditor";
import { ruAdmin } from "../_locales/ru";

export default async function AdminSettingsPage() {
  const self = await loadAdminSelf();
  if (self.role !== "SUPER_ADMIN") {
    redirect("/admin");
  }
  const team = await loadAdminTeam();

  return (
    <AdminPageChrome title={ruAdmin.nav.settings} self={self}>
      <section
        style={{
          backgroundColor: productSemanticColors.card,
          border: `1px solid ${productSemanticColors.border}`,
          borderRadius: radiusScale.lg,
          padding: 18,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Команда админки</h2>
        <p style={{ margin: "6px 0 0", color: productSemanticColors.textMuted, fontSize: 13 }}>
          Управление ролями. Изменения логируются в Audit log с указанием обоснования.
        </p>
      </section>

      <TeamRoleEditor currentUserId={self.userId} members={team} />
    </AdminPageChrome>
  );
}
