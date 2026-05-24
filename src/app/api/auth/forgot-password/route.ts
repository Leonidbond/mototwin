import { NextResponse } from "next/server";
import { issuePasswordResetToken } from "@/lib/auth/session-service";
import { buildPasswordResetUrl, sendPasswordResetEmail } from "@/lib/auth/password-reset-email";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (!email) {
      return NextResponse.json({ error: "Укажите email." }, { status: 400 });
    }

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
    console.error("Forgot password failed:", error);
    return NextResponse.json({ error: "Не удалось обработать запрос." }, { status: 500 });
  }
}
