import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NextRequest } from "next/server";
import {
  hasNextAuthOAuthCookies,
  isYandexOAuthCallbackPath,
  maybeRedirectMobileYandexOAuth,
} from "./yandex-callback-bridge";

describe("yandex-callback-bridge", () => {
  it("detects Yandex callback path segments", () => {
    assert.equal(isYandexOAuthCallbackPath(["callback", "yandex"]), true);
    assert.equal(isYandexOAuthCallbackPath(["signin", "yandex"]), false);
  });

  it("redirects mobile PKCE callback without NextAuth cookies", () => {
    const request = new NextRequest(
      "https://mototwin.space/api/auth/callback/yandex?code=abc&state=xyz"
    );
    const response = maybeRedirectMobileYandexOAuth(request, ["callback", "yandex"]);
    assert.ok(response);
    assert.equal(response.status, 307);
    assert.equal(response.headers.get("location"), "mototwin://oauth/yandex?code=abc&state=xyz");
  });

  it("passes through web callback when NextAuth state cookie is present", () => {
    const request = new NextRequest(
      "https://mototwin.space/api/auth/callback/yandex?code=abc&state=xyz",
      {
        headers: {
          cookie: "__Secure-next-auth.state=abc123",
        },
      }
    );
    assert.equal(hasNextAuthOAuthCookies(request), true);
    assert.equal(maybeRedirectMobileYandexOAuth(request, ["callback", "yandex"]), null);
  });

  it("ignores non-yandex paths", () => {
    const request = new NextRequest("https://mototwin.space/api/auth/signin/yandex");
    assert.equal(maybeRedirectMobileYandexOAuth(request, ["signin", "yandex"]), null);
  });
});
