import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import { AuthServiceError } from "./session-service";
import { exchangeYandexAuthorizationCode } from "./yandex-oauth-exchange";

describe("exchangeYandexAuthorizationCode", () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = { ...originalEnv };
    mock.restoreAll();
  });

  it("returns access_token on successful code exchange", async () => {
    process.env.YANDEX_OAUTH_CLIENT_ID = "mobile-client";
    process.env.YANDEX_CLIENT_SECRET = "secret";
    globalThis.fetch = mock.fn(async () =>
      Response.json({ access_token: "ya-access-token", token_type: "bearer" })
    ) as typeof fetch;

    const token = await exchangeYandexAuthorizationCode({
      code: "auth-code",
      redirectUri: "https://mototwin.space/oauth/yandex/callback",
      codeVerifier: "pkce-verifier",
    });

    assert.equal(token, "ya-access-token");
    const call = (globalThis.fetch as ReturnType<typeof mock.fn>).mock.calls[0];
    assert.equal(call?.arguments[0], "https://oauth.yandex.ru/token");
    const body = String((call?.arguments[1] as RequestInit)?.body);
    assert.match(body, /grant_type=authorization_code/);
    assert.match(body, /code=auth-code/);
    assert.match(body, /code_verifier=pkce-verifier/);
  });

  it("throws INVALID_OAUTH_CODE when token endpoint fails", async () => {
    process.env.YANDEX_OAUTH_CLIENT_ID = "mobile-client";
    process.env.YANDEX_CLIENT_SECRET = "secret";
    globalThis.fetch = mock.fn(async () =>
      Response.json({ error: "invalid_grant" }, { status: 400 })
    ) as typeof fetch;

    await assert.rejects(
      () =>
        exchangeYandexAuthorizationCode({
          code: "bad-code",
          redirectUri: "https://mototwin.space/oauth/yandex/callback",
        }),
      (error: unknown) => {
        assert.ok(error instanceof AuthServiceError);
        assert.equal(error.code, "INVALID_OAUTH_CODE");
        return true;
      }
    );
  });
});
