import {
  buildAbsoluteAppUrl,
  getAppBaseUrl,
  maskEmailAddress,
  sendTransactionalEmail,
} from "@/lib/email/send-email";

export function buildPasswordResetUrl(rawToken: string): string {
  const q = new URLSearchParams({ token: rawToken });
  return `${getAppBaseUrl()}/reset-password?${q.toString()}`;
}

export async function sendPasswordResetEmail(input: { to: string; rawToken: string }): Promise<void> {
  const resetUrl = buildPasswordResetUrl(input.rawToken);
  const resetLink = buildAbsoluteAppUrl(resetUrl) ?? resetUrl;

  await sendTransactionalEmail({
    to: input.to,
    subject: "Сброс пароля MotoTwin",
    html: `
      <p>Вы запросили сброс пароля для MotoTwin.</p>
      <p><a href="${resetLink}">Сбросить пароль</a></p>
      <p>Ссылка действует 60 минут и может быть использована один раз.</p>
    `,
    text: `Сброс пароля MotoTwin\n\n${resetLink}\n\nСсылка действует 60 минут.`,
  }).catch((error) => {
    console.error("[auth] password reset email failed", {
      to: maskEmailAddress(input.to),
      error,
    });
    throw error;
  });
}
