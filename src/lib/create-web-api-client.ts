import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";

/** Same-origin API client with session cookies (web). */
export function createWebApiClient() {
  const client = createApiClient({
    baseUrl: "",
    credentials: "include",
    onUnauthorized: () => {
      if (typeof window !== "undefined") {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?next=${next}`;
      }
    },
  });
  return createMotoTwinEndpoints(client);
}
