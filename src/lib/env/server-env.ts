/**
 * Boot-time validation for server-side environment variables.
 *
 * Wired into Next.js via the root `instrumentation.ts` so the process refuses
 * to come up with a configuration that is unsafe for production. Addresses
 * MT-SEC-021, MT-SEC-023, and MT-SEC-043 in docs/security/findings.md.
 *
 * Rules:
 *   - In production: `AUTH_SECRET` must be set (≥ 32 chars after trim),
 *     `MOTOTWIN_ENABLE_DEV_USER_SWITCHER` must NOT be enabled, `DATABASE_URL`
 *     must be set, and `NODE_ENV` must be exactly "production".
 *   - In any environment: known boolean flags are coerced strictly so a typo
 *     like `MOTOTWIN_ENABLE_DEV_USER_SWITCHER=yes` does not silently disable.
 *
 * The validator is intentionally pure-Node and free of Next.js imports — it
 * can be called from instrumentation, scripts, and tests alike.
 */
import { z } from "zod";

const TRUTHY = new Set(["true", "1", "yes", "on"]);
const FALSY = new Set(["false", "0", "no", "off", ""]);

const booleanFlag = z
  .union([z.string(), z.boolean(), z.undefined()])
  .transform((raw, ctx) => {
    if (typeof raw === "boolean" || typeof raw === "undefined") return raw ?? false;
    const lowered = raw.trim().toLowerCase();
    if (TRUTHY.has(lowered)) return true;
    if (FALSY.has(lowered)) return false;
    ctx.addIssue({
      code: "custom",
      message: `expected a boolean-like value, got "${raw}"`,
    });
    return false;
  });

const baseSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL must be set").optional(),
  AUTH_SECRET: z
    .string()
    .trim()
    .min(32, "AUTH_SECRET must be at least 32 characters")
    .optional(),
  MOTOTWIN_ENABLE_DEV_USER_SWITCHER: booleanFlag,
  YANDEX_OAUTH_CLIENT_ID: z.string().trim().optional(),
  YANDEX_CLIENT_ID: z.string().trim().optional(),
  YANDEX_CLIENT_SECRET: z.string().trim().optional(),
  AUTH_GOOGLE_CLIENT_ID: z.string().trim().optional(),
  AUTH_GOOGLE_CLIENT_SECRET: z.string().trim().optional(),
  AUTH_APPLE_CLIENT_ID: z.string().trim().optional(),
  AUTH_APPLE_CLIENT_SECRET: z.string().trim().optional(),
});

export type ServerEnv = z.infer<typeof baseSchema>;

export class EnvValidationError extends Error {
  readonly issues: string[];
  constructor(issues: string[]) {
    super(`Invalid server env: ${issues.join("; ")}`);
    this.name = "EnvValidationError";
    this.issues = issues;
  }
}

/**
 * Validate the current `process.env` and return a typed view. Throws an
 * `EnvValidationError` listing every problem so the operator sees them all at
 * once instead of one-at-a-time.
 */
export function validateServerEnv(env: NodeJS.ProcessEnv = process.env): ServerEnv {
  const parsed = baseSchema.safeParse(env);
  const issues: string[] = parsed.success
    ? []
    : parsed.error.issues.map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`);

  const data: ServerEnv = parsed.success
    ? parsed.data
    : ({
        NODE_ENV: (env.NODE_ENV as ServerEnv["NODE_ENV"]) ?? "development",
        MOTOTWIN_ENABLE_DEV_USER_SWITCHER: false,
      } as ServerEnv);

  if (data.NODE_ENV === "production") {
    if (!data.AUTH_SECRET) {
      issues.push("AUTH_SECRET is required in production (>= 32 chars)");
    }
    if (data.MOTOTWIN_ENABLE_DEV_USER_SWITCHER) {
      issues.push(
        "MOTOTWIN_ENABLE_DEV_USER_SWITCHER must be unset/false in production — it bypasses authentication"
      );
    }
    if (!data.DATABASE_URL) {
      issues.push("DATABASE_URL is required in production");
    }
    const yandexConfigured = Boolean(data.YANDEX_CLIENT_ID || data.YANDEX_CLIENT_SECRET);
    if (yandexConfigured && !data.YANDEX_OAUTH_CLIENT_ID) {
      issues.push(
        "YANDEX_OAUTH_CLIENT_ID is required when Yandex OAuth is configured (mobile audience check, MT-SEC-001)"
      );
    }
  }

  if (issues.length > 0) {
    throw new EnvValidationError(issues);
  }
  return data;
}
