import { Resend } from "resend";

function getBaseUrl(): string {
  const explicit =
    process.env.AUTH_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.BASE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }
  return "http://127.0.0.1:3000";
}

export function buildPasswordResetUrl(rawToken: string): string {
  const q = new URLSearchParams({ token: rawToken });
  return `${getBaseUrl()}/reset-password?${q.toString()}`;
}

function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const head = local.slice(0, 1);
  const tail = local.length > 2 ? local.slice(-1) : "";
  return `${head}***${tail}@${domain}`;
}

export async function sendPasswordResetEmail(input: { to: string; rawToken: string }): Promise<void> {
  const resetUrl = buildPasswordResetUrl(input.rawToken);
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const fromAddress = process.env.AUTH_EMAIL_FROM?.trim() || "MotoTwin <no-reply@mototwin.local>";

  if (!resendApiKey) {
    if (process.env.NODE_ENV === "production") {
      // Hard-fail in production: silently dropping reset emails is a
      // worse outcome than a 500 — and we MUST NOT log the email + working
      // reset URL to console logs (MT-SEC-022). Operators see the error
      // and add RESEND_API_KEY.
      throw new Error(
        "Password reset email transport is not configured: RESEND_API_KEY is required in production"
      );
    }
    console.info(`[auth] Password reset (dev only) for ${maskEmail(input.to)}: ${resetUrl}`);
    return;
  }

  const resend = new Resend(resendApiKey);
  await resend.emails.send({
    from: fromAddress,
    to: [input.to],
    subject: "Сброс пароля MotoTwin",
    html: `
      <p>Вы запросили сброс пароля для MotoTwin.</p>
      <p><a href="${resetUrl}">Сбросить пароль</a></p>
      <p>Ссылка действует 60 минут и может быть использована один раз.</p>
    `,
  });
}
