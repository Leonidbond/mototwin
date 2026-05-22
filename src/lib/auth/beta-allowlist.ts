import { normalizeEmail } from "./tokens";

function parseAllowlist(): Set<string> {
  const raw = process.env.MOTOTWIN_BETA_ALLOWED_EMAILS?.trim() ?? "";
  if (!raw) {
    return new Set();
  }
  return new Set(
    raw
      .split(",")
      .map((item) => normalizeEmail(item))
      .filter((item) => item.length > 0)
  );
}

/** In development, registration is open unless production-style allowlist is enforced. */
export function isRegistrationAllowed(email: string): boolean {
  const normalized = normalizeEmail(email);
  const allowlist = parseAllowlist();

  if (process.env.NODE_ENV !== "production") {
    if (allowlist.size === 0) {
      return true;
    }
    return allowlist.has(normalized);
  }

  if (allowlist.size === 0) {
    return false;
  }
  return allowlist.has(normalized);
}

export function registrationBlockedMessage(): string {
  return "Регистрация закрыта. Ваш email не в списке закрытой беты.";
}
