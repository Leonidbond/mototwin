import type { AdminRole } from "@prisma/client";
import type { AdminRoleWire, AdminSelfWire } from "@mototwin/types";
import { getAdminContext } from "@/lib/admin-auth";

export async function loadAdminSelf(): Promise<AdminSelfWire> {
  const ctx = await getAdminContext();
  return {
    userId: ctx.userId,
    email: ctx.email,
    displayName: ctx.displayName,
    role: roleToWire(ctx.role),
    isModerator: ctx.isModerator,
  };
}

function roleToWire(role: AdminRole): AdminRoleWire {
  return role as AdminRoleWire;
}
