import { createHash, randomBytes } from "node:crypto";

/**
 * AUTH_SECRET is required in production (see boot-time validator in
 * `src/lib/env/server-env.ts` — MT-SEC-021). In dev/test we fall back to a
 * fixed deterministic secret so localhost flows continue to work, but the
 * value is clearly tagged so it cannot be mistaken for a real secret.
 */
function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (secret && secret.length >= 32) {
    return secret;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET is missing or too short (>= 32 chars required)");
  }
  return "mototwin-dev-auth-secret-do-not-use-in-prod";
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
