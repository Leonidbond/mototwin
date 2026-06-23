import type { AdminRole } from "@prisma/client";

/** Keep legacy `isModerator` in sync when admin roles change via the team API. */
export function resolveIsModeratorForAdminRole(adminRole: AdminRole | null): boolean {
  return adminRole === "MODERATOR" || adminRole === "SUPER_ADMIN";
}
