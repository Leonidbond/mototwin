import { NextResponse } from "next/server";
import { AuthServiceError, resetPasswordWithToken } from "@/lib/auth/session-service";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { token?: string; password?: string };
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!token || !password) {
      return NextResponse.json({ error: "Укажите token и новый пароль." }, { status: 400 });
    }

    await resetPasswordWithToken({ token, password });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthServiceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("Reset password failed:", error);
    return NextResponse.json({ error: "Не удалось сбросить пароль." }, { status: 500 });
  }
}
