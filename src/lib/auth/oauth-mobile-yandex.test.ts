import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import { AuthServiceError } from "./session-service";
import { resolveMobileOAuthProfile } from "./oauth-mobile";

describe("resolveMobileOAuthProfile yandex", () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = { ...originalEnv };
    mock.restoreAll();
  });

  it("accepts token when login.yandex.ru/info client_id matches YANDEX_OAUTH_CLIENT_ID", async () => {
    process.env.YANDEX_OAUTH_CLIENT_ID = "mototwin-client";
    process.env.YANDEX_CLIENT_ID = "mototwin-client";
    process.env.YANDEX_CLIENT_SECRET = "secret";

    globalThis.fetch = mock.fn(async (url: string) => {
      if (url === "https://oauth.yandex.ru/token") {
        return Response.json({ access_token: "ya-access-token", token_type: "bearer" });
      }
      if (url.startsWith("https://login.yandex.ru/info")) {
        return Response.json({
          id: "1001",
          client_id: "mototwin-client",
          default_email: "user@yandex.ru",
          real_name: "Test User",
        });
      }
      throw new Error(`unexpected fetch: ${url}`);
    }) as typeof fetch;

    const profile = await resolveMobileOAuthProfile({
      provider: "yandex",
      code: "auth-code",
      redirectUri: "https://mototwin.space/api/auth/callback/yandex",
      codeVerifier: "pkce-verifier",
    });

    assert.equal(profile.provider, "yandex");
    assert.equal(profile.providerAccountId, "1001");
    assert.equal(profile.email, "user@yandex.ru");
  });

  it("rejects token when login.yandex.ru/info client_id mismatches", async () => {
    process.env.YANDEX_OAUTH_CLIENT_ID = "mototwin-client";
    process.env.YANDEX_CLIENT_ID = "mototwin-client";
    process.env.YANDEX_CLIENT_SECRET = "secret";

    globalThis.fetch = mock.fn(async (url: string) => {
      if (url === "https://oauth.yandex.ru/token") {
        return Response.json({ access_token: "ya-access-token", token_type: "bearer" });
      }
      if (url.startsWith("https://login.yandex.ru/info")) {
        return Response.json({
          id: "1001",
          client_id: "other-app",
          default_email: "user@yandex.ru",
        });
      }
      throw new Error(`unexpected fetch: ${url}`);
    }) as typeof fetch;

    await assert.rejects(
      () =>
        resolveMobileOAuthProfile({
          provider: "yandex",
          code: "auth-code",
          redirectUri: "https://mototwin.space/api/auth/callback/yandex",
          codeVerifier: "pkce-verifier",
        }),
      (error: unknown) => {
        assert.ok(error instanceof AuthServiceError);
        assert.equal(error.code, "INVALID_OAUTH_TOKEN");
        return true;
      }
    );
  });
});
