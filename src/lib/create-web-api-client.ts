import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";

export type CreateWebApiClientOptions = {
  /** Redirect to /login on HTTP 401. Default true. Use false for auth checks. */
  redirectOn401?: boolean;
  /** Select timeout/retry budget by request type. */
  profile?: "default" | "authProbe" | "heavyRead";
};

/** Same-origin API client with session cookies (web). */
export function createWebApiClient(options?: CreateWebApiClientOptions) {
  const redirectOn401 = options?.redirectOn401 !== false;
  const profile = options?.profile ?? "default";
  const profileConfig =
    profile === "authProbe"
      ? { requestTimeoutMs: 5_000, requestMaxAttempts: 1 }
      : profile === "heavyRead"
        ? { requestTimeoutMs: 25_000, requestMaxAttempts: 2 }
        : { requestTimeoutMs: 12_000, requestMaxAttempts: 2 };
  const client = createApiClient({
    baseUrl: "",
    credentials: "include",
    requestTimeoutMs: profileConfig.requestTimeoutMs,
    requestMaxAttempts: profileConfig.requestMaxAttempts,
    onUnauthorized: redirectOn401
      ? () => {
          if (typeof window !== "undefined") {
            const next = encodeURIComponent(window.location.pathname + window.location.search);
            window.location.href = `/login?next=${next}`;
          }
        }
      : undefined,
  });
  return createMotoTwinEndpoints(client);
}
