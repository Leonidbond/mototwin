import { NextResponse } from "next/server";
import { issuePasswordResetToken } from "@/lib/auth/session-service";
import { buildPasswordResetUrl, sendPasswordResetEmail } from "@/lib/auth/password-reset-email";
import { BodyParseError, parseJsonBody } from "@/lib/http/parse-json-body";
import { rateLimit, rateLimit429 } from "@/lib/http/rate-limit";

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody<{ email?: string }>(request, {
      maxBytes: 2 * 1024,
      allowEmpty: true,
    });
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    if (!email) {
      return NextResponse.json({ error: "Укажите email." }, { status: 400 });
    }

    // MT-SEC-002: per-IP + per-email cap so attackers can't enumerate via
    // timing differences and the email-transport cost is bounded.
    const decision = rateLimit({
      bucket: "auth:forgot-password",
      request,
      limit: 3,
      windowMs: 10 * 60_000,
      extraKey: email.toLowerCase(),
    });
    if (!decision.allowed) return rateLimit429(decision);

    const token = await issuePasswordResetToken(email);
    if (token) {
      await sendPasswordResetEmail({
        to: token.email,
        rawToken: token.rawToken,
      });
    }

    const debugResetUrl =
      process.env.NODE_ENV !== "production" && token ? buildPasswordResetUrl(token.rawToken) : undefined;

    return NextResponse.json({
      ok: true,
      message: "Если аккаунт с таким email существует, мы отправили ссылку для сброса.",
      ...(debugResetUrl ? { debugResetUrl } : {}),
    });
  } catch (error) {
    if (error instanceof BodyParseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    // MT-SEC-022: do not echo the requested email into logs.
    console.error(
      "[auth] forgot-password failed",
      JSON.stringify({
        name: (error as { name?: string })?.name,
        code: (error as { code?: string })?.code,
      })
    );
    return NextResponse.json({ error: "Не удалось обработать запрос." }, { status: 500 });
  }
}
