import { AuthSessionKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ACCESS_TOKEN_TTL_MS,
  REFRESH_TOKEN_TTL_MS,
  WEB_SESSION_TTL_MS,
  PASSWORD_RESET_TOKEN_TTL_MS,
} from "./constants";
import { generateRawToken, hashToken, normalizeEmail } from "./tokens";
import { hashPassword, validatePassword, verifyPassword } from "./password";
import { isRegistrationAllowed, registrationBlockedMessage } from "./beta-allowlist";
import { ensureUserBootstrap } from "./user-bootstrap";

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: Date;
  refreshExpiresAt: Date;
};

export async function registerUser(input: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<{ userId: string; email: string; displayName: string | null; garageId: string }> {
  const email = normalizeEmail(input.email);
  if (!isRegistrationAllowed(email)) {
    throw new AuthServiceError("REGISTRATION_NOT_ALLOWED", 403, registrationBlockedMessage());
  }

  const passwordError = validatePassword(input.password);
  if (passwordError) {
    throw new AuthServiceError("INVALID_PASSWORD", 400, passwordError);
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    throw new AuthServiceError("EMAIL_TAKEN", 409, "Пользователь с таким email уже зарегистрирован.");
  }

  const passwordHash = await hashPassword(input.password);
  const displayName = input.displayName?.trim() || null;

  const user = await prisma.user.create({
    data: {
      email,
      displayName,
      passwordHash,
    },
    select: { id: true, email: true, displayName: true },
  });

  await ensureUserBootstrap(user.id);
  const garage = await prisma.garage.findFirst({
    where: { ownerUserId: user.id },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!garage) {
    throw new AuthServiceError("GARAGE_CREATE_FAILED", 500, "Не удалось создать гараж.");
  }

  return {
    userId: user.id,
    email,
    displayName: user.displayName,
    garageId: garage.id,
  };
}

export async function verifyUserCredentials(
  email: string,
  password: string
): Promise<{ userId: string; email: string; displayName: string | null }> {
  const normalized = normalizeEmail(email);
  const user = await prisma.user.findUnique({
    where: { email: normalized },
    select: {
      id: true,
      email: true,
      displayName: true,
      passwordHash: true,
      isBlocked: true,
    },
  });

  if (!user?.passwordHash) {
    throw new AuthServiceError("INVALID_CREDENTIALS", 401, "Неверный email или пароль.");
  }
  if (user.isBlocked) {
    throw new AuthServiceError("ACCOUNT_BLOCKED", 403, "Аккаунт заблокирован. Обратитесь в поддержку.");
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    throw new AuthServiceError("INVALID_CREDENTIALS", 401, "Неверный email или пароль.");
  }

  return {
    userId: user.id,
    email: user.email ?? normalized,
    displayName: user.displayName,
  };
}

export async function createWebSession(userId: string): Promise<{ rawToken: string; expiresAt: Date }> {
  await assertUserNotBlocked(userId);
  const rawToken = generateRawToken();
  const expiresAt = new Date(Date.now() + WEB_SESSION_TTL_MS);
  await prisma.authSession.create({
    data: {
      userId,
      kind: AuthSessionKind.WEB,
      tokenHash: hashToken(rawToken),
      expiresAt,
    },
  });
  return { rawToken, expiresAt };
}

export async function createMobileTokens(userId: string): Promise<AuthTokens> {
  await assertUserNotBlocked(userId);
  const accessToken = generateRawToken();
  const refreshToken = generateRawToken();
  const accessExpiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_MS);
  const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await prisma.$transaction([
    prisma.authSession.create({
      data: {
        userId,
        kind: AuthSessionKind.ACCESS,
        tokenHash: hashToken(accessToken),
        expiresAt: accessExpiresAt,
      },
    }),
    prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(refreshToken),
        expiresAt: refreshExpiresAt,
      },
    }),
  ]);

  return { accessToken, refreshToken, accessExpiresAt, refreshExpiresAt };
}

export async function resolveUserIdFromSessionToken(rawToken: string): Promise<string | null> {
  const tokenHash = hashToken(rawToken);
  const now = new Date();
  const session = await prisma.authSession.findFirst({
    where: {
      tokenHash,
      expiresAt: { gt: now },
    },
    select: { userId: true },
  });
  if (!session?.userId) {
    return null;
  }
  await assertUserNotBlocked(session.userId);
  return session.userId;
}

export async function resolveUserIdFromAccessToken(rawToken: string): Promise<string | null> {
  const tokenHash = hashToken(rawToken);
  const now = new Date();
  const session = await prisma.authSession.findFirst({
    where: {
      tokenHash,
      kind: AuthSessionKind.ACCESS,
      expiresAt: { gt: now },
    },
    select: { userId: true },
  });
  if (!session?.userId) {
    return null;
  }
  await assertUserNotBlocked(session.userId);
  return session.userId;
}

export async function revokeWebSession(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await prisma.authSession.deleteMany({ where: { tokenHash, kind: AuthSessionKind.WEB } });
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await prisma.refreshToken.deleteMany({ where: { tokenHash } });
}

export async function refreshMobileSession(refreshTokenRaw: string): Promise<AuthTokens> {
  const tokenHash = hashToken(refreshTokenRaw);
  const now = new Date();
  const existing = await prisma.refreshToken.findFirst({
    where: { tokenHash, expiresAt: { gt: now } },
    select: { userId: true, id: true },
  });

  if (!existing) {
    throw new AuthServiceError("INVALID_REFRESH_TOKEN", 401, "Сессия истекла. Войдите снова.");
  }
  await assertUserNotBlocked(existing.userId);

  await prisma.$transaction([
    prisma.refreshToken.delete({ where: { id: existing.id } }),
    prisma.authSession.deleteMany({
      where: { userId: existing.userId, kind: AuthSessionKind.ACCESS },
    }),
  ]);

  return createMobileTokens(existing.userId);
}

export async function resolveOrCreateOAuthUser(input: {
  provider: string;
  providerAccountId: string;
  email?: string | null;
  displayName?: string | null;
}): Promise<{ userId: string; email: string | null; displayName: string | null }> {
  const provider = input.provider.trim().toLowerCase();
  const providerAccountId = input.providerAccountId.trim();
  if (!provider || !providerAccountId) {
    throw new AuthServiceError("INVALID_OAUTH_ACCOUNT", 400, "Некорректные OAuth-данные.");
  }

  const normalizedEmail = input.email ? normalizeEmail(input.email) : null;

  const account = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider,
        providerAccountId,
      },
    },
    select: {
      user: {
        select: { id: true, email: true, displayName: true },
      },
    },
  });

  if (account?.user) {
    await assertUserNotBlocked(account.user.id);
    await ensureUserBootstrap(account.user.id);
    return {
      userId: account.user.id,
      email: account.user.email,
      displayName: account.user.displayName,
    };
  }

  const user = await prisma.$transaction(async (tx) => {
    const byEmail =
      normalizedEmail != null
        ? await tx.user.findUnique({
            where: { email: normalizedEmail },
            select: { id: true, email: true, displayName: true, isBlocked: true },
          })
        : null;

    if (byEmail?.isBlocked) {
      throw new AuthServiceError("ACCOUNT_BLOCKED", 403, "Аккаунт заблокирован. Обратитесь в поддержку.");
    }

    const baseUser =
      byEmail ??
      (await tx.user.create({
        data: {
          email: normalizedEmail,
          displayName: input.displayName?.trim() || null,
        },
        select: { id: true, email: true, displayName: true },
      }));

    await tx.account.upsert({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId,
        },
      },
      update: {
        userId: baseUser.id,
      },
      create: {
        userId: baseUser.id,
        type: "oauth",
        provider,
        providerAccountId,
      },
    });

    return baseUser;
  });

  await ensureUserBootstrap(user.id);
  return {
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
  };
}

export async function assertUserNotBlocked(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isBlocked: true },
  });
  if (user?.isBlocked) {
    throw new AuthServiceError("ACCOUNT_BLOCKED", 403, "Аккаунт заблокирован. Обратитесь в поддержку.");
  }
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await prisma.$transaction([
    prisma.authSession.deleteMany({ where: { userId } }),
    prisma.refreshToken.deleteMany({ where: { userId } }),
    prisma.session.deleteMany({ where: { userId } }),
  ]);
}

export async function issuePasswordResetToken(
  email: string
): Promise<{ email: string; rawToken: string } | null> {
  const normalized = normalizeEmail(email);
  const user = await prisma.user.findUnique({
    where: { email: normalized },
    select: { id: true, email: true, passwordHash: true },
  });
  if (!user?.email || !user.passwordHash) {
    return null;
  }

  const now = new Date();
  const recent = await prisma.passwordResetToken.findFirst({
    where: {
      userId: user.id,
      usedAt: null,
      createdAt: { gt: new Date(now.getTime() - 60_000) },
    },
    select: { id: true },
  });

  if (recent) {
    return null;
  }

  const rawToken = generateRawToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(now.getTime() + PASSWORD_RESET_TOKEN_TTL_MS),
    },
  });

  return { email: user.email, rawToken };
}

export async function resetPasswordWithToken(input: {
  token: string;
  password: string;
}): Promise<void> {
  const passwordError = validatePassword(input.password);
  if (passwordError) {
    throw new AuthServiceError("INVALID_PASSWORD", 400, passwordError);
  }

  const tokenHash = hashToken(input.token);
  const now = new Date();

  const token = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: now },
    },
    select: { id: true, userId: true },
  });

  if (!token) {
    throw new AuthServiceError("INVALID_RESET_TOKEN", 400, "Ссылка для сброса недействительна или истекла.");
  }

  const passwordHash = await hashPassword(input.password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: token.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: token.id },
      data: { usedAt: now },
    }),
    prisma.passwordResetToken.deleteMany({
      where: { userId: token.userId, usedAt: null },
    }),
    prisma.authSession.deleteMany({ where: { userId: token.userId } }),
    prisma.refreshToken.deleteMany({ where: { userId: token.userId } }),
    prisma.session.deleteMany({ where: { userId: token.userId } }),
  ]);
}

export class AuthServiceError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number, message: string) {
    super(message);
    this.name = "AuthServiceError";
    this.code = code;
    this.status = status;
  }
}

export function toAuthServiceErrorResponse(error: unknown) {
  if (!(error instanceof AuthServiceError)) {
    return null;
  }
  return Response.json({ error: error.message, code: error.code }, { status: error.status });
}
