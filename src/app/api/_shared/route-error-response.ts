import { NextResponse } from "next/server";

type PrismaLikeError = {
  code?: string;
  message?: string;
};

function asPrismaLikeError(error: unknown): PrismaLikeError | null {
  if (!error || typeof error !== "object") {
    return null;
  }
  const record = error as Record<string, unknown>;
  const code = typeof record.code === "string" ? record.code : undefined;
  const message = typeof record.message === "string" ? record.message : undefined;
  if (!code && !message) {
    return null;
  }
  return { code, message };
}

/**
 * Превращает неожиданные ошибки API-маршрута в JSON с безопасным текстом для UI.
 * Типичные коды Prisma: https://www.prisma.io/docs/reference/api-reference/error-reference
 */
export function nextResponseFromUnexpectedRouteError(
  error: unknown,
  args: { fallbackMessage: string; logLabel: string }
): NextResponse {
  console.error(args.logLabel, error);

  const prisma = asPrismaLikeError(error);
  if (prisma?.code === "P1001") {
    return NextResponse.json(
      {
        error:
          "Не удалось подключиться к базе данных. Запустите PostgreSQL и проверьте DATABASE_URL (Prisma P1001).",
      },
      { status: 503 }
    );
  }
  if (prisma?.code === "P1000" || prisma?.code === "P1017") {
    return NextResponse.json(
      {
        error:
          "Ошибка доступа к базе данных (неверные учётные данные или отказ сервера). Проверьте DATABASE_URL.",
      },
      { status: 503 }
    );
  }

  const msg = prisma?.message ?? (error instanceof Error ? error.message : "");
  if (
    msg.includes("ECONNREFUSED") ||
    msg.includes("ENOTFOUND") ||
    msg.toLowerCase().includes("can't reach database")
  ) {
    return NextResponse.json(
      {
        error:
          "База данных недоступна по сети. Убедитесь, что PostgreSQL запущен и хост в DATABASE_URL доступен.",
      },
      { status: 503 }
    );
  }

  const isDev = process.env.NODE_ENV !== "production";
  if (isDev && msg.length > 0) {
    const tail = msg.length > 220 ? `${msg.slice(0, 220)}…` : msg;
    return NextResponse.json({ error: `${args.fallbackMessage}: ${tail}` }, { status: 500 });
  }

  return NextResponse.json({ error: args.fallbackMessage }, { status: 500 });
}
