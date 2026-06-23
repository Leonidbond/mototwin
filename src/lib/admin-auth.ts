import { NextResponse } from "next/server";
import type { AdminRole } from "@prisma/client";
import {
  CurrentUserContextError,
  getCurrentUserContext,
  toCurrentUserContextErrorResponse,
} from "@/app/api/_shared/current-user-context";
import { prisma } from "@/lib/prisma";

export type AdminContext = {
  userId: string;
  email: string | null;
  displayName: string | null;
  role: AdminRole;
  isModerator: boolean;
};

export class AdminAccessError extends Error {
  readonly code: "ADMIN_ROLE_REQUIRED" | "ADMIN_FORBIDDEN";
  readonly status: number;

  constructor(code: "ADMIN_ROLE_REQUIRED" | "ADMIN_FORBIDDEN", status: number, message: string) {
    super(message);
    this.name = "AdminAccessError";
    this.code = code;
    this.status = status;
  }
}

/**
 * Resolve the admin context for the current request.
 *
 * Until real auth ships, the underlying user is the demo/dev user from
 * `getCurrentUserContext`; we additionally require an `adminRole` on the User
 * row. `MODERATOR` ≡ `User.isModerator: true` for back-compat.
 */
export async function getAdminContext(): Promise<AdminContext> {
  const userCtx = await getCurrentUserContext();
  const user = await prisma.user.findUnique({
    where: { id: userCtx.userId },
    select: {
      id: true,
      email: true,
      displayName: true,
      adminRole: true,
      isModerator: true,
    },
  });
  if (!user) {
    throw new AdminAccessError(
      "ADMIN_ROLE_REQUIRED",
      403,
      "Учётная запись не найдена."
    );
  }
  const role = resolveAdminRole(user.adminRole, user.isModerator);
  if (!role) {
    throw new AdminAccessError(
      "ADMIN_ROLE_REQUIRED",
      403,
      "Недостаточно прав для админ-панели."
    );
  }
  return {
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    role,
    isModerator: user.isModerator,
  };
}

/**
 * Throws unless the current admin has at least one of the allowed roles.
 * `SUPER_ADMIN` is implicitly authorized for every requirement.
 */
export async function requireAdminRole(
  allowed: AdminRole | AdminRole[]
): Promise<AdminContext> {
  const ctx = await getAdminContext();
  const roles = Array.isArray(allowed) ? allowed : [allowed];
  if (ctx.role === "SUPER_ADMIN" || roles.includes(ctx.role)) {
    return ctx;
  }
  throw new AdminAccessError(
    "ADMIN_FORBIDDEN",
    403,
    `Этот раздел доступен только ролям: ${roles.join(", ")}.`
  );
}

export async function requireAnyAdmin(): Promise<AdminContext> {
  return getAdminContext();
}

/**
 * Non-throwing version of `getAdminContext` — returns null when the current
 * user has no admin role (e.g. for hybrid "owner OR moderator" checks). Used
 * by routes that want to fall back to an ownership check without surfacing a
 * 403 to legitimate non-admin users (MT-SEC-024).
 */
export async function tryGetAdminContext(): Promise<AdminContext | null> {
  try {
    return await getAdminContext();
  } catch (error) {
    if (error instanceof AdminAccessError) return null;
    if (error instanceof CurrentUserContextError) return null;
    throw error;
  }
}

/** Convert thrown errors from admin auth/context into NextResponses. */
export function toAdminErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof AdminAccessError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  if (error instanceof CurrentUserContextError) {
    return toCurrentUserContextErrorResponse(error);
  }
  return null;
}

function resolveAdminRole(
  adminRole: AdminRole | null,
  isModerator: boolean
): AdminRole | null {
  if (adminRole) return adminRole;
  if (isModerator) return "MODERATOR";
  return null;
}

const READ_ONLY_ROLE: AdminRole = "ANALYST";

/** Permission helper for UI gating; mirrors backend `requireAdminRole`. */
export function canMutate(role: AdminRole): boolean {
  return role !== READ_ONLY_ROLE;
}

/** Destructive catalog deletes — same roles as merge/import commit. */
export function canDeleteCatalogParts(role: AdminRole): boolean {
  return role === "SUPER_ADMIN" || role === "CATALOG_MANAGER";
}
