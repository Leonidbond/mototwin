/**
 * Smoke test: user catalog request → vehicle with placeholder → admin moderation queue.
 *
 * Env:
 *   BASE_URL — default http://127.0.0.1:3000
 *   MOTOTWIN_DEV_USER_EMAIL — user for catalog request (default demo@mototwin.local)
 *   MOTOTWIN_DEV_ADMIN_EMAIL — admin for moderation APIs (default super@mototwin.local)
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const BASE = (process.env.BASE_URL ?? "http://127.0.0.1:3000").replace(/\/+$/, "");
const USER_EMAIL = process.env.MOTOTWIN_DEV_USER_EMAIL?.trim() || "demo@mototwin.local";
const ADMIN_EMAIL = process.env.MOTOTWIN_DEV_ADMIN_EMAIL?.trim() || "super@mototwin.local";
const USE_DEV_HEADERS =
  process.env.MOTOTWIN_ENABLE_DEV_USER_SWITCHER === "true" ||
  process.env.MOTOTWIN_ENABLE_DEV_USER_SWITCHER === "1" ||
  process.env.MOTOTWIN_ENABLE_DEV_USER_SWITCHER === "yes";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function request(
  path: string,
  init: RequestInit = {},
  asEmail?: string
): Promise<{ res: Response; body: unknown }> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  if (asEmail) {
    headers.set("x-mototwin-dev-user-email", asEmail);
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

async function ensureDemoCanAddVehicle() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return;
  }
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    const demo = await prisma.user.findUnique({
      where: { email: "demo@mototwin.local" },
      select: { id: true },
    });
    if (!demo) {
      return;
    }
    await prisma.subscription.upsert({
      where: { userId: demo.id },
      update: { planType: "PRO", status: "ACTIVE" },
      create: { userId: demo.id, planType: "PRO", status: "ACTIVE" },
    });
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await ensureDemoCanAddVehicle();
  console.log(`catalog-request smoke: ${BASE}`);
  console.log(
    `  user=${USER_EMAIL} admin=${ADMIN_EMAIL} devHeaders=${USE_DEV_HEADERS ? "on" : "off (default demo user)"}`
  );

  const asUser = USE_DEV_HEADERS ? USER_EMAIL : undefined;
  const asAdmin = USE_DEV_HEADERS ? ADMIN_EMAIL : undefined;

  const suffix = Date.now();
  const variantName = `Smoke Variant ${suffix}`;

  const createVehicle = await request(
    "/api/vehicles",
    {
      method: "POST",
      body: JSON.stringify({
        catalogRequest: {
          brandName: `Smoke Brand ${suffix}`,
          familyName: `Smoke Family ${suffix}`,
          variantName,
          yearFrom: 2024,
          userComment: "qa-catalog-request-smoke",
        },
        odometer: 1000,
        engineHours: null,
        rideProfile: {
          usageType: "MIXED",
          ridingStyle: "ACTIVE",
          loadType: "SOLO",
          usageIntensity: "MEDIUM",
        },
      }),
    },
    asUser
  );
  assert(
    createVehicle.res.status === 201,
    `create vehicle with inline catalogRequest -> ${createVehicle.res.status} ${JSON.stringify(createVehicle.body)}`
  );
  const vehicleBody = createVehicle.body as {
    vehicle?: {
      id?: string;
      catalogRequest?: { id?: string; status?: string } | null;
    };
  };
  const vehicleId = vehicleBody.vehicle?.id;
  const requestId = vehicleBody.vehicle?.catalogRequest?.id;
  assert(vehicleId, "vehicle create must return vehicle.id");
  assert(requestId, "vehicle must expose catalogRequest.id");
  assert(
    vehicleBody.vehicle?.catalogRequest?.status === "PENDING",
    "vehicle must expose pending catalogRequest"
  );
  console.log(`  ✓ created vehicle ${vehicleId} with inline catalog request ${requestId}`);

  const listReq = await request("/api/motorcycle-catalog-requests", {}, asUser);
  assert(listReq.res.ok, `list catalog requests -> ${listReq.res.status}`);
  const listBody = listReq.body as { requests?: Array<{ id: string }> };
  assert(
    listBody.requests?.some((row) => row.id === requestId),
    "list must include created request"
  );
  console.log("  ✓ list own requests");

  const detailReq = await request(`/api/motorcycle-catalog-requests/${requestId}`, {}, asUser);
  assert(detailReq.res.ok, `get catalog request -> ${detailReq.res.status}`);
  console.log("  ✓ get request detail");

  const adminQueue = await request(
    "/api/admin/moderation/queue?queue=pendingCatalogRequests",
    {},
    asAdmin
  );
  assert(adminQueue.res.ok, `admin moderation queue -> ${adminQueue.res.status}`);
  const queueBody = adminQueue.body as {
    queue?: string;
    counts?: { pendingCatalogRequests?: number };
    items?: Array<{ id: string; kind: string }>;
  };
  assert(queueBody.queue === "pendingCatalogRequests", "queue key must match");
  assert(
    typeof queueBody.counts?.pendingCatalogRequests === "number",
    "counts must include pendingCatalogRequests"
  );
  assert(
    queueBody.items?.some((item) => item.id === requestId && item.kind === "CATALOG_REQUEST"),
    "admin queue must list created request"
  );
  console.log("  ✓ admin pendingCatalogRequests queue");

  const inspector = await request(
    `/api/admin/moderation/inspector?kind=CATALOG_REQUEST&id=${requestId}`,
    {},
    asAdmin
  );
  assert(inspector.res.ok, `admin inspector -> ${inspector.res.status}`);
  const inspectorBody = inspector.body as {
    kind?: string;
    editableFields?: Array<{ key: string }>;
    actions?: Array<{ id: string }>;
  };
  assert(inspectorBody.kind === "CATALOG_REQUEST", "inspector kind must be CATALOG_REQUEST");
  assert(
    inspectorBody.editableFields?.some((field) => field.key === "variantName"),
    "inspector must expose editable variantName"
  );
  assert(
    inspectorBody.actions?.some((action) => action.id === "approve"),
    "inspector must expose approve action"
  );
  console.log("  ✓ admin inspector");

  const brands = await request("/api/motorcycle-brands");
  assert(brands.res.ok, `motorcycle-brands -> ${brands.res.status}`);
  const brandsBody = brands.body as { brands?: Array<{ name: string; slug: string }> };
  assert(
    !brandsBody.brands?.some((brand) => brand.slug === "pending-catalog-review"),
    "placeholder brand must be hidden from public catalog"
  );
  console.log("  ✓ placeholder brand hidden from public API");

  console.log("\n✓ catalog-request smoke passed");
}

main().catch((error) => {
  console.error("\n✗ catalog-request smoke failed");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
