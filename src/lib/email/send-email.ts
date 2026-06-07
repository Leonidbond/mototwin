import nodemailer from "nodemailer";

export function getAppBaseUrl(): string {
  const explicit =
    process.env.AUTH_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.BASE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }
  return "http://127.0.0.1:3000";
}

export function getEmailFromAddress(): string {
  return (
    process.env.AUTH_EMAIL_FROM?.trim() ||
    process.env.NOTIFICATIONS_EMAIL_FROM?.trim() ||
    "MotoTwin <no-reply@mototwin.local>"
  );
}

export function isEmailTransportConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim()
  );
}

export function maskEmailAddress(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const head = local.slice(0, 1);
  const tail = local.length > 2 ? local.slice(-1) : "";
  return `${head}***${tail}@${domain}`;
}

function smtpSecure(port: number): boolean {
  const raw = process.env.SMTP_SECURE?.trim().toLowerCase();
  if (raw === "true" || raw === "1" || raw === "yes") return true;
  if (raw === "false" || raw === "0" || raw === "no") return false;
  return port === 465;
}

function createSmtpTransport() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!host || !user || !pass) {
    throw new Error("SMTP is not configured: set SMTP_HOST, SMTP_USER, SMTP_PASS");
  }

  const port = Number(process.env.SMTP_PORT?.trim() || "465");
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("SMTP_PORT must be a positive number");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: smtpSecure(port),
    auth: { user, pass },
  });
}

export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ messageId: string }> {
  const to = input.to.trim();
  if (!to) {
    throw new Error("Email recipient is required");
  }

  if (!isEmailTransportConfigured()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Email transport is not configured: SMTP_HOST, SMTP_USER, SMTP_PASS are required in production"
      );
    }
    console.info("[email] dev skip send", {
      to: maskEmailAddress(to),
      subject: input.subject,
    });
    return { messageId: `dev:${Date.now()}` };
  }

  const transport = createSmtpTransport();
  const info = await transport.sendMail({
    from: getEmailFromAddress(),
    to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  const messageId =
    typeof info.messageId === "string" && info.messageId.trim()
      ? info.messageId.trim()
      : `smtp:${Date.now()}`;

  return { messageId };
}

export function buildAbsoluteAppUrl(pathOrUrl: string | null | undefined): string | null {
  if (!pathOrUrl?.trim()) return null;
  const value = pathOrUrl.trim();
  if (/^https?:\/\//i.test(value)) return value;
  const base = getAppBaseUrl();
  return `${base}${value.startsWith("/") ? value : `/${value}`}`;
}
