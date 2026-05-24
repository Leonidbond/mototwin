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

export async function sendPasswordResetEmail(input: { to: string; rawToken: string }): Promise<void> {
  const resetUrl = buildPasswordResetUrl(input.rawToken);
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const fromAddress = process.env.AUTH_EMAIL_FROM?.trim() || "MotoTwin <no-reply@mototwin.local>";

  if (!resendApiKey) {
    console.info(`[auth] Password reset for ${input.to}: ${resetUrl}`);
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
