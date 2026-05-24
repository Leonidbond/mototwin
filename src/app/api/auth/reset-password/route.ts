import { NextResponse } from "next/server";
import { AuthServiceError, resetPasswordWithToken } from "@/lib/auth/session-service";
import { BodyParseError, parseJsonBody } from "@/lib/http/parse-json-body";
import { rateLimit, rateLimit429 } from "@/lib/http/rate-limit";

export async function POST(request: Request) {
  try {
    // MT-SEC-002: bound brute-forcing of reset tokens.
    const decision = rateLimit({
      bucket: "auth:reset-password",
      request,
      limit: 10,
      windowMs: 60_000,
    });
    if (!decision.allowed) return rateLimit429(decision);

    const body = await parseJsonBody<{ token?: string; password?: string }>(request, {
      maxBytes: 4 * 1024,
    });
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!token || !password) {
      return NextResponse.json({ error: "Укажите token и новый пароль." }, { status: 400 });
    }

    await resetPasswordWithToken({ token, password });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof BodyParseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    if (error instanceof AuthServiceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    // MT-SEC-022: keep PII out of error logs (the raw error may include
    // password reset tokens or e-mails from Prisma constraint messages).
    console.error(
      "[auth] reset-password failed",
      JSON.stringify({
        name: (error as { name?: string })?.name,
        code: (error as { code?: string })?.code,
      })
    );
    return NextResponse.json({ error: "Не удалось сбросить пароль." }, { status: 500 });
  }
}
