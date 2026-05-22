import { AuthSessionKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DEMO_GARAGE_TITLE } from "@/app/api/_shared/current-user-context";
import {
  ACCESS_TOKEN_TTL_MS,
  REFRESH_TOKEN_TTL_MS,
  WEB_SESSION_TTL_MS,
} from "./constants";
import { generateRawToken, hashToken, normalizeEmail } from "./tokens";
import { hashPassword, validatePassword, verifyPassword } from "./password";
import { isRegistrationAllowed, registrationBlockedMessage } from "./beta-allowlist";
import { getOrCreateUserNotificationSettings } from "@/lib/notifications";

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
      garages: {
        create: { title: DEMO_GARAGE_TITLE },
      },
      settings: {
        create: {},
      },
    },
    include: {
      garages: { orderBy: { createdAt: "asc" }, take: 1 },
    },
  });

  await getOrCreateUserNotificationSettings(user.id);

  const garage = user.garages[0];
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
    select: { id: true, email: true, displayName: true, passwordHash: true },
  });

  if (!user?.passwordHash) {
    throw new AuthServiceError("INVALID_CREDENTIALS", 401, "Неверный email или пароль.");
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
  return session?.userId ?? null;
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
  return session?.userId ?? null;
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

  await prisma.$transaction([
    prisma.refreshToken.delete({ where: { id: existing.id } }),
    prisma.authSession.deleteMany({
      where: { userId: existing.userId, kind: AuthSessionKind.ACCESS },
    }),
  ]);

  return createMobileTokens(existing.userId);
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
