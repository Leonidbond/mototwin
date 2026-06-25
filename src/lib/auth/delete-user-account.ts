import { prisma } from "@/lib/prisma";
import { logAuthEvent } from "@/lib/auth-audit";
import { revokeAllUserSessions } from "./session-service";

export type DeleteUserAccountErrorCode =
  | "NOT_FOUND"
  | "ADMIN_ACCOUNT"
  | "DELETE_FAILED";

export class DeleteUserAccountError extends Error {
  readonly code: DeleteUserAccountErrorCode;

  constructor(code: DeleteUserAccountErrorCode, message: string) {
    super(message);
    this.name = "DeleteUserAccountError";
    this.code = code;
  }
}

/**
 * Permanently deletes the user and cascaded personal data (vehicles, garage,
 * settings, notifications, etc.). Community catalog rows created by the user
 * are detached (SetNull) or removed per schema onDelete rules.
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, adminRole: true, email: true },
  });
  if (!user) {
    throw new DeleteUserAccountError("NOT_FOUND", "Пользователь не найден.");
  }
  if (user.adminRole) {
    throw new DeleteUserAccountError(
      "ADMIN_ACCOUNT",
      "Аккаунт с правами админки не может быть удалён из приложения. Напишите на support@mototwin.online."
    );
  }

  await revokeAllUserSessions(userId, { cause: "account_deleted" });

  void logAuthEvent({
    event: "account.deleted",
    userId,
    metadata: { email: user.email },
  });

  try {
    await prisma.user.delete({ where: { id: userId } });
  } catch (error) {
    console.error("deleteUserAccount failed:", error);
    throw new DeleteUserAccountError("DELETE_FAILED", "Не удалось удалить аккаунт.");
  }
}
