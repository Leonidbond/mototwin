/**
 * Auth API smoke for staging/production.
 *
 * Env:
 *   BASE_URL — default http://127.0.0.1:3000
 *   SMOKE_EMAIL / SMOKE_PASSWORD — test account (register first or use existing)
 */
import "dotenv/config";

const BASE = (process.env.BASE_URL ?? "http://127.0.0.1:3000").replace(/\/+$/, "");
const EMAIL = process.env.SMOKE_EMAIL ?? `smoke-${Date.now()}@mototwin.local`;
const PASSWORD = process.env.SMOKE_PASSWORD ?? "smoke-test-password-8";
const DEV_ADMIN_EMAIL = process.env.MOTOTWIN_DEV_ADMIN_EMAIL?.trim() ?? "";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function request(path: string, init: RequestInit = {}, cookie?: string) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  if (cookie) {
    headers.set("cookie", cookie);
  }
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { res, body };
}

async function main() {
  console.log(`auth smoke: ${BASE}`);

  const register = await request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, displayName: "Smoke" }),
  });
  if (register.res.status === 403) {
    console.warn("Registration blocked (allowlist). Set SMOKE_EMAIL to an allowed address.");
  } else {
    assert(register.res.ok, `register -> ${register.res.status}`);
  }

  const login = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  assert(login.res.ok, `login -> ${login.res.status}`);
  const loginBody = login.body as { user?: { id?: string } };
  const userId = loginBody?.user?.id ?? "";
  assert(userId.length > 0, "login must return user.id");

  const setCookie = login.res.headers.get("set-cookie") ?? "";
  assert(setCookie.includes("mototwin_session"), "login must set mototwin_session cookie");

  const me = await request("/api/auth/me", {}, setCookie.split(";")[0]);
  assert(me.res.ok, `me -> ${me.res.status}`);

  const garage = await request("/api/garage", {}, setCookie.split(";")[0]);
  assert(garage.res.ok, `garage -> ${garage.res.status}`);

  if (DEV_ADMIN_EMAIL) {
    const block = await request(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      headers: {
        "x-mototwin-dev-user-email": DEV_ADMIN_EMAIL,
      },
      body: JSON.stringify({
        isBlocked: true,
        reason: "auth smoke temporary block",
      }),
    });
    assert(block.res.ok, `block user -> ${block.res.status}`);

    const meBlocked = await request("/api/auth/me", {}, setCookie.split(";")[0]);
    assert(meBlocked.res.status === 401, `me blocked should be 401, got ${meBlocked.res.status}`);

    const unblock = await request(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      headers: {
        "x-mototwin-dev-user-email": DEV_ADMIN_EMAIL,
      },
      body: JSON.stringify({
        isBlocked: false,
        reason: "auth smoke unblock",
      }),
    });
    assert(unblock.res.ok, `unblock user -> ${unblock.res.status}`);
  }

  const logout = await request(
    "/api/auth/logout",
    { method: "POST", body: "{}" },
    setCookie.split(";")[0]
  );
  assert(logout.res.ok, `logout -> ${logout.res.status}`);

  const meAfter = await request("/api/auth/me", {}, setCookie.split(";")[0]);
  assert(meAfter.res.status === 401, `me after logout should be 401, got ${meAfter.res.status}`);

  const forgot = await request("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email: EMAIL }),
  });
  assert(forgot.res.ok, `forgot-password -> ${forgot.res.status}`);

  const forgotBody = forgot.body as { debugResetUrl?: string };
  if (forgotBody?.debugResetUrl) {
    const url = new URL(forgotBody.debugResetUrl);
    const token = url.searchParams.get("token");
    assert(token, "debugResetUrl must contain token");

    const reset = await request("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({
        token,
        password: `${PASSWORD}-reset`,
      }),
    });
    assert(reset.res.ok, `reset-password -> ${reset.res.status}`);

    const loginAfterReset = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: EMAIL, password: `${PASSWORD}-reset` }),
    });
    assert(loginAfterReset.res.ok, `login after reset -> ${loginAfterReset.res.status}`);
  }

  console.log("auth smoke: OK");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
