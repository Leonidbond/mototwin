/**
 * SMTP smoke test — sends one message via sendTransactionalEmail.
 *
 * Usage:
 *   npx tsx scripts/qa-email-smtp-smoke.ts
 *   TEST_EMAIL=you@example.com npx tsx scripts/qa-email-smtp-smoke.ts
 */
import "dotenv/config";
import { isEmailTransportConfigured, sendTransactionalEmail } from "../src/lib/email/send-email";

async function main() {
  const to =
    process.env.TEST_EMAIL?.trim() ||
    process.env.SMTP_USER?.trim() ||
    process.env.AUTH_EMAIL_FROM?.match(/<([^>]+)>/)?.[1]?.trim();

  if (!to) {
    console.error("Set TEST_EMAIL or SMTP_USER in .env");
    process.exit(1);
  }

  if (!isEmailTransportConfigured()) {
    console.error("SMTP is not configured (SMTP_HOST, SMTP_USER, SMTP_PASS)");
    process.exit(1);
  }

  console.info("[qa-email-smtp] sending test to", to.replace(/(.{2}).*(@.*)/, "$1***$2"));

  const result = await sendTransactionalEmail({
    to,
    subject: "MotoTwin SMTP smoke test",
    html: "<p>Если вы видите это письмо, SMTP настроен корректно.</p>",
    text: "Если вы видите это письмо, SMTP настроен корректно.",
  });

  console.info("[qa-email-smtp] ok", { messageId: result.messageId });
}

main().catch((error) => {
  console.error("[qa-email-smtp] failed", error);
  process.exit(1);
});
