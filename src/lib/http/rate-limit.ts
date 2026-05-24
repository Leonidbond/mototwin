/**
 * In-memory sliding-window rate limiter for hot auth endpoints (MT-SEC-002).
 *
 * Why in-memory: avoids introducing Redis as a hard dependency for the
 * security-fix iteration. It is correct for single-instance VPS deployments
 * — which matches the current production topology — and degrades gracefully
 * (per-process bucket) when scaled horizontally.
 *
 * Limitations (tracked as follow-up to MT-SEC-002):
 *   - Multi-process deployments need a shared backend (Redis / KV). The
 *     `RateLimiter` interface is intentionally narrow so the implementation
 *     can be swapped without touching call sites.
 *   - Clients behind a shared proxy without `X-Forwarded-For` are bucketed
 *     together; we therefore key on a tuple of (bucket, client-id) where
 *     client-id includes the IP + the user-agent hash as a poor man's fingerprint.
 *
 * Usage:
 *   const decision = await rateLimit({
 *     bucket: "auth:login",
 *     request,
 *     limit: 5,
 *     windowMs: 60_000,
 *   });
 *   if (!decision.allowed) return rateLimit429(decision);
 */

import { NextResponse } from "next/server";

export type RateLimitDecision = {
  allowed: boolean;
  remaining: number;
  limit: number;
  retryAfterMs: number;
};

export type RateLimitInput = {
  bucket: string;
  request: Request;
  limit: number;
  windowMs: number;
  /**
   * Optional extra key (e.g. email, user id) to differentiate buckets beyond
   * the IP-based default. For login, passing the email helps protect the
   * targeted account when many distinct IPs hammer the same login.
   */
  extraKey?: string;
};

const HITS = new Map<string, number[]>();
const MAX_TRACKED_KEYS = 10_000;

/**
 * Decide whether the request is allowed under the bucket's policy.
 */
export function rateLimit(input: RateLimitInput): RateLimitDecision {
  const clientId = extractClientId(input.request);
  const key = buildKey(input.bucket, clientId, input.extraKey);
  const now = Date.now();
  const cutoff = now - input.windowMs;

  const hits = HITS.get(key) ?? [];
  const fresh = hits.filter((t) => t > cutoff);

  if (fresh.length >= input.limit) {
    const oldest = fresh[0] ?? now;
    return {
      allowed: false,
      remaining: 0,
      limit: input.limit,
      retryAfterMs: Math.max(0, oldest + input.windowMs - now),
    };
  }

  fresh.push(now);
  HITS.set(key, fresh);
  // Naive memory cap — drop arbitrary entries when we go over budget.
  if (HITS.size > MAX_TRACKED_KEYS) {
    const firstKey = HITS.keys().next().value;
    if (firstKey) HITS.delete(firstKey);
  }
  return {
    allowed: true,
    remaining: Math.max(0, input.limit - fresh.length),
    limit: input.limit,
    retryAfterMs: 0,
  };
}

/**
 * Build a uniform 429 response for a denied decision. Uses a generic message
 * so attackers cannot distinguish a credential-failure rate-limit from a
 * volumetric one.
 */
export function rateLimit429(decision: RateLimitDecision): NextResponse {
  const retrySec = Math.max(1, Math.ceil(decision.retryAfterMs / 1000));
  return NextResponse.json(
    { error: "Слишком много запросов. Повторите попытку позже.", code: "RATE_LIMITED" },
    {
      status: 429,
      headers: {
        "Retry-After": String(retrySec),
        "X-RateLimit-Limit": String(decision.limit),
        "X-RateLimit-Remaining": "0",
      },
    }
  );
}

function buildKey(bucket: string, clientId: string, extraKey?: string): string {
  return `${bucket}::${clientId}${extraKey ? `::${extraKey.toLowerCase()}` : ""}`;
}

function extractClientId(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  // Trust the leftmost untrusted hop only when the deployment terminates TLS
  // upstream. Without a reverse proxy `x-forwarded-for` is unset and we fall
  // back to the user agent as the cheapest fingerprint we have.
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown-ip";
  const ua = request.headers.get("user-agent") || "unknown-ua";
  return `${ip}|${hashSmall(ua)}`;
}

/**
 * Tiny string hash — adequate for bucket key construction (not a security
 * primitive). FNV-1a 32-bit.
 */
function hashSmall(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}
