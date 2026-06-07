import { buildAbsoluteAppUrl, sendTransactionalEmail } from "./send-email";

export async function sendNotificationEmail(input: {
  to: string;
  title: string;
  body: string;
  actionLabel?: string | null;
  actionUrl?: string | null;
}): Promise<{ messageId: string }> {
  const actionHref = buildAbsoluteAppUrl(input.actionUrl);
  const actionBlock =
    actionHref && input.actionLabel?.trim()
      ? `<p><a href="${actionHref}">${escapeHtml(input.actionLabel.trim())}</a></p>`
      : actionHref
        ? `<p><a href="${actionHref}">Открыть в MotoTwin</a></p>`
        : "";

  const html = `
    <p>${escapeHtml(input.title)}</p>
    <p>${escapeHtml(input.body)}</p>
    ${actionBlock}
    <p style="color:#666;font-size:12px;">Вы получили это письмо, потому что включили email-оповещения в MotoTwin.</p>
  `.trim();

  const text = [input.title, input.body, actionHref ? `Ссылка: ${actionHref}` : ""]
    .filter(Boolean)
    .join("\n\n");

  return sendTransactionalEmail({
    to: input.to,
    subject: input.title,
    html,
    text,
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
