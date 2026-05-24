/**
 * Reusable zod helpers for hardened input validation across API route handlers.
 *
 * Rationale: most route handlers used `z.string()` / `z.number()` without
 * bounds, and many `z.object({...})` schemas were not marked `.strict()`, so
 * extra fields slipped through (mass-assignment risk). These helpers give
 * routes opinionated, conservative defaults so adding a new field cannot
 * regress security:
 *
 *   - `boundedText` — trimmed string with explicit min/max.
 *   - `boundedNumber` / `boundedInt` — finite, range-checked numbers.
 *   - `boundedArray` — array with max length to prevent DoS via huge inputs.
 *   - `safeUrl` — URL with HTTPS-only scheme allowlist + length cap.
 *   - `safePagination` — { limit, offset } with hard ceiling.
 *   - `strictObject` — alias for `z.object().strict()` so reviewers cannot miss it.
 *
 * See docs/security/findings.md MT-SEC-065 .. MT-SEC-072.
 */
import { z } from "zod";

/** Default upper bound for free-text fields (comment, notes, description). */
export const TEXT_MAX_DEFAULT = 2_000;
/** Upper bound for short identifiers (slug, title, displayName, vendor). */
export const SHORT_TEXT_MAX_DEFAULT = 200;
/** Upper bound for URLs we accept from clients. */
export const URL_MAX_DEFAULT = 2_048;
/** Upper bound for arrays accepted from clients (e.g. id lists). */
export const ARRAY_MAX_DEFAULT = 500;

export type BoundedTextOptions = {
  min?: number;
  max?: number;
  trim?: boolean;
};

/** Trimmed string with explicit min/max (defaults: min 1, max 2000). */
export function boundedText(options: BoundedTextOptions = {}) {
  const min = options.min ?? 1;
  const max = options.max ?? TEXT_MAX_DEFAULT;
  const trim = options.trim ?? true;
  let schema = z.string();
  if (trim) schema = schema.trim();
  return schema.min(min).max(max);
}

/** Like `boundedText` but allows null and undefined. Empty string becomes null. */
export function boundedTextOptional(options: BoundedTextOptions = {}) {
  const max = options.max ?? TEXT_MAX_DEFAULT;
  return z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
      if (value == null) return null;
      const trimmed = value.trim();
      return trimmed === "" ? null : trimmed;
    })
    .refine((value) => value === null || value.length <= max, {
      message: `must be ≤ ${max} characters`,
    });
}

export type BoundedNumberOptions = {
  min?: number;
  max?: number;
};

/** Finite number with explicit bounds — rejects NaN / Infinity. */
export function boundedNumber(options: BoundedNumberOptions = {}) {
  const min = options.min ?? Number.NEGATIVE_INFINITY;
  const max = options.max ?? Number.POSITIVE_INFINITY;
  return z
    .number()
    .refine((value) => Number.isFinite(value), { message: "must be a finite number" })
    .refine((value) => value >= min && value <= max, {
      message: `must be between ${min} and ${max}`,
    });
}

/** Finite integer with explicit bounds — rejects floats, NaN, Infinity. */
export function boundedInt(options: BoundedNumberOptions = {}) {
  return boundedNumber(options).refine((value) => Number.isInteger(value), {
    message: "must be an integer",
  });
}

/** Array with explicit max length (default 500). */
export function boundedArray<T extends z.ZodTypeAny>(
  itemSchema: T,
  options: { min?: number; max?: number } = {}
) {
  const min = options.min ?? 0;
  const max = options.max ?? ARRAY_MAX_DEFAULT;
  return z.array(itemSchema).min(min).max(max);
}

/**
 * URL string limited to `http://` / `https://`. `requireHttps` (default true)
 * additionally rejects plaintext URLs in production to prevent SSRF & MITM.
 * `allowedHosts` is an optional allowlist of exact hostnames.
 */
export function safeUrl(
  options: {
    max?: number;
    requireHttps?: boolean;
    allowedHosts?: string[];
  } = {}
) {
  const max = options.max ?? URL_MAX_DEFAULT;
  const requireHttps = options.requireHttps ?? true;
  return z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((value) => {
      try {
        const url = new URL(value);
        if (requireHttps) {
          if (url.protocol !== "https:" && url.protocol !== "http:") return false;
          // Accept http only in non-production for local dev assets.
          if (url.protocol === "http:" && process.env.NODE_ENV === "production") {
            return false;
          }
        }
        if (options.allowedHosts && options.allowedHosts.length > 0) {
          return options.allowedHosts.includes(url.hostname);
        }
        return true;
      } catch {
        return false;
      }
    }, { message: "must be a valid URL with an allowed scheme" });
}

/** Strict object schema — alias makes the security intent obvious at call sites. */
export function strictObject<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape).strict();
}

/** Pagination params (limit/offset) with hard ceiling. */
export const PAGINATION_LIMIT_MAX = 200;
export const PAGINATION_LIMIT_DEFAULT = 50;

export function safePagination(options: { maxLimit?: number; defaultLimit?: number } = {}) {
  const maxLimit = options.maxLimit ?? PAGINATION_LIMIT_MAX;
  const defaultLimit = options.defaultLimit ?? PAGINATION_LIMIT_DEFAULT;
  return strictObject({
    limit: boundedInt({ min: 1, max: maxLimit }).optional().default(defaultLimit),
    offset: boundedInt({ min: 0, max: 1_000_000 }).optional().default(0),
  });
}

/**
 * Parse a `URLSearchParams`-derived value as a bounded integer. Returns the
 * default when the value is missing or invalid (never throws — search params
 * come from untrusted sources).
 */
export function parseSearchParamInt(
  raw: string | null,
  options: { min?: number; max?: number; fallback: number }
): number {
  if (raw == null) return options.fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) return options.fallback;
  if (options.min != null && parsed < options.min) return options.fallback;
  if (options.max != null && parsed > options.max) return options.fallback;
  return parsed;
}

/**
 * Parse a `URLSearchParams`-derived value as a trimmed, length-bounded string.
 * Returns null when missing, empty, or above `max`.
 */
export function parseSearchParamText(
  raw: string | null,
  options: { max?: number } = {}
): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const max = options.max ?? SHORT_TEXT_MAX_DEFAULT;
  if (trimmed.length > max) return null;
  return trimmed;
}

/**
 * Open-structure JSON value (`unknown`) gated by a serialized-size cap.
 *
 * Use this when the underlying field is intentionally schemaless (e.g.
 * `installedPartsJson`, `formSnapshot`) but you still must reject pathologically
 * large or deeply-nested payloads that would bloat the DB or DoS the parser.
 *
 * Defaults: 32 KB serialized, 16 levels of nesting.
 */
export type BoundedJsonOptions = {
  maxSerializedBytes?: number;
  maxDepth?: number;
};

const DEFAULT_JSON_MAX_BYTES = 32 * 1024;
const DEFAULT_JSON_MAX_DEPTH = 16;

function jsonDepth(value: unknown, currentDepth = 0): number {
  if (value == null) return currentDepth;
  if (typeof value !== "object") return currentDepth;
  if (Array.isArray(value)) {
    let max = currentDepth;
    for (const item of value) {
      const childDepth = jsonDepth(item, currentDepth + 1);
      if (childDepth > max) max = childDepth;
    }
    return max;
  }
  let max = currentDepth;
  for (const child of Object.values(value as Record<string, unknown>)) {
    const childDepth = jsonDepth(child, currentDepth + 1);
    if (childDepth > max) max = childDepth;
  }
  return max;
}

export function boundedJsonValue(options: BoundedJsonOptions = {}) {
  const maxBytes = options.maxSerializedBytes ?? DEFAULT_JSON_MAX_BYTES;
  const maxDepth = options.maxDepth ?? DEFAULT_JSON_MAX_DEPTH;
  return z.unknown().superRefine((value, ctx) => {
    if (value == null) return;
    let serialized: string;
    try {
      serialized = JSON.stringify(value);
    } catch {
      ctx.addIssue({ code: "custom", message: "value is not serializable as JSON" });
      return;
    }
    if (serialized.length > maxBytes) {
      ctx.addIssue({
        code: "custom",
        message: `serialized JSON exceeds ${maxBytes}-byte limit`,
      });
      return;
    }
    if (jsonDepth(value) > maxDepth) {
      ctx.addIssue({
        code: "custom",
        message: `JSON nesting exceeds ${maxDepth} levels`,
      });
    }
  });
}

/** Convenience: convert a Zod parse failure to a 400 JSON-compatible payload. */
export function zodIssuesToResponse(issues: z.core.$ZodIssue[]): {
  error: string;
  code: "VALIDATION_FAILED";
  issues: Array<{ path: string; message: string }>;
} {
  return {
    error: "Validation failed",
    code: "VALIDATION_FAILED",
    issues: issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  };
}
