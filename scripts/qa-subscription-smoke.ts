import "dotenv/config";

const BASE = (process.env.BASE_URL ?? "http://127.0.0.1:3000").replace(/\/+$/, "");
const EMAIL = process.env.SMOKE_EMAIL ?? `smoke-subscription-${Date.now()}@mototwin.local`;
const PASSWORD = process.env.SMOKE_PASSWORD ?? "smoke-test-password-8";
const DEV_USER_EMAIL = process.env.MOTOTWIN_DEV_USER_EMAIL ?? "demo@mototwin.local";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function request(path: string, init: RequestInit = {}, cookie?: string, devUserEmail?: string) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  if (cookie) headers.set("cookie", cookie);
  if (devUserEmail) headers.set("x-mototwin-dev-user-email", devUserEmail);
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

async function loginCookie(): Promise<string> {
  let login = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (login.res.status === 401 || login.res.status === 404) {
    const register = await request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email: EMAIL, password: PASSWORD, displayName: "Subscription Smoke" }),
    });
    if (!(register.res.ok || register.res.status === 409 || register.res.status === 403)) {
      throw new Error(`register failed: ${register.res.status}`);
    }
    login = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
  }
  assert(login.res.ok, `login failed: ${login.res.status}`);
  const setCookie = login.res.headers.get("set-cookie") ?? "";
  const cookie = setCookie.split(";")[0] ?? "";
  assert(cookie.includes("mototwin_session"), "missing mototwin_session cookie");
  return cookie;
}

async function main() {
  console.log(`subscription smoke: ${BASE}`);
  let cookie = "";
  let devEmail: string | undefined;
  try {
    cookie = await loginCookie();
  } catch (error) {
    console.warn(`login flow unavailable, fallback to dev header: ${String(error)}`);
    devEmail = DEV_USER_EMAIL;
  }

  const current = await request("/api/subscription/current", {}, cookie, devEmail);
  assert(current.res.ok, `GET /api/subscription/current -> ${current.res.status}`);
  const currentBody = current.body as { plan?: string; capabilities?: { maxVehicles?: number | null } };
  assert(typeof currentBody.plan === "string", "subscription.current must return plan");

  const chooseRider = await request(
    "/api/subscription/plan",
    { method: "PATCH", body: JSON.stringify({ plan: "RIDER" }) },
    cookie,
    devEmail
  );
  assert(chooseRider.res.ok, `PATCH /api/subscription/plan RIDER -> ${chooseRider.res.status}`);

  const me = await request("/api/auth/me", {}, cookie, devEmail);
  assert(me.res.ok, `/api/auth/me -> ${me.res.status}`);
  const meBody = me.body as { planType?: string };
  assert(meBody.planType === "RIDER", "auth me should reflect selected plan");

  const chooseFree = await request(
    "/api/subscription/plan",
    { method: "PATCH", body: JSON.stringify({ plan: "FREE" }) },
    cookie,
    devEmail
  );
  assert(chooseFree.res.ok, `PATCH /api/subscription/plan FREE -> ${chooseFree.res.status}`);

  let garage = await request("/api/garage", {}, cookie, devEmail);
  assert(garage.res.ok, `/api/garage -> ${garage.res.status}`);
  let garageBody = garage.body as { vehicles?: Array<{ id: string }> };
  let vehicleId = garageBody.vehicles?.[0]?.id;
  if (!vehicleId) {
    garage = await request("/api/garage", {}, cookie, DEV_USER_EMAIL);
    assert(garage.res.ok, `/api/garage (dev user) -> ${garage.res.status}`);
    garageBody = garage.body as { vehicles?: Array<{ id: string }> };
    vehicleId = garageBody.vehicles?.[0]?.id;
    devEmail = DEV_USER_EMAIL;
  }
  assert(vehicleId, "garage must have at least one vehicle for node-tree smoke");

  function treeHasNestedBranches(
    nodes: Array<{ children?: Array<{ children?: unknown[] }> }>
  ): boolean {
    const walk = (list: typeof nodes): boolean =>
      list.some((n) => (n.children?.length ?? 0) > 0 && (walk(n.children ?? []) || true));
    return walk(nodes);
  }

  async function assertTopNodeTreeForPlan(plan: "FREE" | "RIDER") {
    const planRes = await request(
      "/api/subscription/plan",
      { method: "PATCH", body: JSON.stringify({ plan }) },
      cookie,
      devEmail
    );
    assert(planRes.res.ok, `PATCH plan ${plan} -> ${planRes.res.status}`);

    const treeRes = await request(`/api/vehicles/${vehicleId}/node-tree`, {}, cookie, devEmail);
    assert(treeRes.res.ok, `GET node-tree (${plan}) -> ${treeRes.res.status}`);
    const treeBody = treeRes.body as {
      nodeTree?: Array<{ code: string; children: unknown[]; selectable?: boolean }>;
    };
    const nodes = treeBody.nodeTree ?? [];
    assert(nodes.length > 0, `${plan}: node-tree must not be empty`);
    const collectCodes = (
      list: Array<{ code: string; children?: Array<{ code: string; children?: unknown[] }> }>
    ): string[] =>
      list.flatMap((n) => [n.code, ...collectCodes((n.children ?? []) as typeof list)]);
    const allCodes = collectCodes(nodes);
    assert(
      allCodes.some((code) => code.includes(".")),
      `${plan}: expected top-service leaf codes in tree, got: ${allCodes.join(", ")}`
    );
    assert(
      treeHasNestedBranches(nodes as Array<{ children?: Array<{ children?: unknown[] }> }>),
      `${plan}: expected nested tree (paths to top nodes), not flat root list`
    );
    assert(
      nodes.some((n) => !n.code.includes(".")),
      `${plan}: expected skeleton roots (e.g. ENGINE), got roots: ${nodes.map((n) => n.code).join(", ")}`
    );
    if (plan === "FREE") {
      assert(
        nodes.every((n) => n.selectable === false),
        "FREE: skeleton roots are read-only"
      );
      const leaves = allCodes.filter((code) => code.includes("."));
      assert(
        leaves.length > 0 && leaves.every((code) => {
          const find = (
            list: typeof nodes,
            target: string
          ): { selectable?: boolean } | null => {
            for (const item of list) {
              if (item.code === target) return item;
              const nested = find((item.children ?? []) as typeof nodes, target);
              if (nested) return nested;
            }
            return null;
          };
          return find(nodes, code)?.selectable === false;
        }),
        "FREE: curated top leaves are read-only"
      );
    }
    const findNode = (
      list: typeof nodes,
      target: string
    ): { selectable?: boolean; locked?: boolean } | null => {
      for (const item of list) {
        if (item.code === target) return item;
        const nested = findNode((item.children ?? []) as typeof nodes, target);
        if (nested) return nested;
      }
      return null;
    };
    assert.equal(findNode(nodes, "ENGINE")?.selectable, false);
    assert.equal(findNode(nodes, "ENGINE")?.locked, true);
    assert(
      allCodes.some((code) => findNode(nodes, code)?.locked === true),
      `${plan}: expected locked nodes outside top set`
    );
    if (plan === "RIDER") {
      const riderLeaf = allCodes.find(
        (code) => code.includes(".") && findNode(nodes, code)?.selectable
      );
      assert(riderLeaf, "RIDER: at least one curated top leaf must be selectable");
    }
  }

  await assertTopNodeTreeForPlan("FREE");
  await assertTopNodeTreeForPlan("RIDER");

  const choosePro = await request(
    "/api/subscription/plan",
    { method: "PATCH", body: JSON.stringify({ plan: "PRO" }) },
    cookie,
    devEmail
  );
  assert(choosePro.res.ok, `PATCH /api/subscription/plan PRO -> ${choosePro.res.status}`);

  const proTreeRes = await request(`/api/vehicles/${vehicleId}/node-tree`, {}, cookie, devEmail);
  assert(proTreeRes.res.ok, `GET node-tree (PRO) -> ${proTreeRes.res.status}`);
  const proNodes = (proTreeRes.body as { nodeTree?: Array<{ code: string; children: unknown[] }> })
    .nodeTree ?? [];
  assert(proNodes.length > 0, "PRO: node-tree must not be empty");
  assert(
    treeHasNestedBranches(proNodes as Array<{ children?: Array<{ children?: unknown[] }> }>),
    "PRO: expected full nested tree, not flat top-only list"
  );
  assert(
    proNodes.some((n) => !n.code.includes(".")),
    "PRO: expected skeleton roots (e.g. ENGINE), not only top leaf codes"
  );

  const proCurrent = await request("/api/subscription/current", {}, cookie, devEmail);
  const proCap = (proCurrent.body as { capabilities?: { nodeAccessLevel?: string; canSelectChildNode?: boolean } })
    .capabilities;
  assert(proCap?.nodeAccessLevel === "FULL_TREE", "PRO: nodeAccessLevel must be FULL_TREE");
  assert(proCap?.canSelectChildNode === true, "PRO: canSelectChildNode must be true");

  console.log("subscription smoke: OK");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
