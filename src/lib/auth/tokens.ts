import { createHash, randomBytes } from "node:crypto";

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (secret) {
    return secret;
  }
  if (process.env.NODE_ENV !== "production") {
    return "mototwin-dev-auth-secret-do-not-use-in-prod";
  }
  throw new Error("AUTH_SECRET is not set");
}

export function generateRawToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(rawToken: string): string {
  return createHash("sha256").update(`${getAuthSecret()}:${rawToken}`).digest("hex");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
