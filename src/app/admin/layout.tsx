import type { ReactNode } from "react";
import { productSemanticColors } from "@mototwin/design-tokens";
import { AdminAccessError, getAdminContext } from "@/lib/admin-auth";
import { AdminSidebar } from "./_components/AdminSidebar";
import { AdminAccessGuard } from "./_components/AdminAccessGuard";

export const metadata = {
  title: "MotoTwin Admin",
};

/*
 * Admin shell: sidebar + content column. Gating happens here (Next.js 16
 * recommends layouts for auth instead of proxy.ts because data fetching is
 * unsafe in the edge proxy). Each /api/admin/* route enforces its own role
 * via `requireAdminRole()`.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  let access: Awaited<ReturnType<typeof getAdminContext>> | null = null;
  try {
    access = await getAdminContext();
  } catch (error) {
    const message =
      error instanceof AdminAccessError
        ? error.message
        : "Не удалось получить контекст администратора.";
    return <AdminAccessGuard message={message} />;
  }
  return (
    <div
      data-admin-user={access?.userId}
      style={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: productSemanticColors.canvas,
        color: productSemanticColors.textPrimary,
      }}
    >
      <AdminSidebar />
      <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {children}
      </main>
    </div>
  );
}
