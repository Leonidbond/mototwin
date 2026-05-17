import type { AdminRoleWire, AdminTeamMemberWire } from "@mototwin/types";
import { prisma } from "@/lib/prisma";

/** Roster of accounts with any admin/moderator privileges. */
export async function loadAdminTeam(): Promise<AdminTeamMemberWire[]> {
  const rows = await prisma.user.findMany({
    where: {
      OR: [{ adminRole: { not: null } }, { isModerator: true }],
    },
    orderBy: [{ adminRole: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      email: true,
      displayName: true,
      adminRole: true,
      isModerator: true,
      createdAt: true,
    },
  });
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    adminRole: (row.adminRole as AdminRoleWire | null) ?? null,
    isModerator: row.isModerator,
    createdAt: row.createdAt.toISOString(),
  }));
}
