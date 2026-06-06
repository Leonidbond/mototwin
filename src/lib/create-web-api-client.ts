import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";

export type CreateWebApiClientOptions = {
  /** Redirect to /login on HTTP 401. Default true. Use false for auth checks. */
  redirectOn401?: boolean;
};

/** Same-origin API client with session cookies (web). */
export function createWebApiClient(options?: CreateWebApiClientOptions) {
  const redirectOn401 = options?.redirectOn401 !== false;
  const client = createApiClient({
    baseUrl: "",
    credentials: "include",
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
