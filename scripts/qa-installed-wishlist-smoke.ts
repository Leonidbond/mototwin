/**
 * QA smoke: wishlist SKU → INSTALLED → service event (API parity with checklist item 6).
 * Requires: DATABASE_URL, dev server on BASE_URL, DB seeded with demo user + QA catalog.
 *
 *   BASE_URL=http://127.0.0.1:3000 npx tsx scripts/qa-installed-wishlist-smoke.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  createInitialAddServiceEventFromWishlistItem,
  filterActiveWishlistItems,
  formatExpenseAmountRu,
  getTodayDateYmdLocal,
  isActiveWishlistItem,
  normalizeAddServiceEventPayload,
  WISHLIST_INSTALL_SERVICE_TYPE_RU,
} from "@mototwin/domain";
import type { PartWishlistItem } from "@mototwin/types";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function assertResponseOk(response: Response, label: string) {
  if (response.ok) return;
  throw new Error(`${label} ${response.status} ${await response.text()}`);
}

function makePrisma() {
  const connectionString = process.env.DATABASE_URL;
  assert(connectionString, "DATABASE_URL is not set");
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

async function main() {
  const prisma = makePrisma();
  const user = await prisma.user.findUnique({
    where: { email: "demo@mototwin.local" },
    select: { id: true },
  });
  assert(user, "demo@mototwin.local not found");

  const vehicle = await prisma.vehicle.findFirst({
    where: { userId: user.id, nickname: { contains: "KTM 690" } },
    select: { id: true, nickname: true, odometer: true, engineHours: true },
  });
  assert(vehicle, "QA KTM 690 vehicle not found");

  const sku = await prisma.partSku.findFirst({
    where: {
      brandName: "Hiflofiltro",
      partType: "OIL_FILTER",
      canonicalName: { contains: "Oil Filter" },
      partNumbers: { some: { number: { contains: "HF155" } } },
    },
    select: {
      id: true,
      canonicalName: true,
      priceAmount: true,
      currency: true,
      primaryNodeId: true,
    },
  });
  assert(sku, "HF155 catalog SKU (QA oil filter row) not found");

  await prisma.$disconnect();

  const vid = vehicle.id;
  const headers = { "Content-Type": "application/json" } as const;

  const post = await fetch(`${BASE}/api/vehicles/${vid}/wishlist`, {
    method: "POST",
    headers,
    body: JSON.stringify({ skuId: sku.id, quantity: 1, status: "NEEDED" }),
  });
  await assertResponseOk(post, "POST wishlist");
  const created = (await post.json()) as { item: PartWishlistItem };
  const itemId = created.item.id;

  const patch = await fetch(`${BASE}/api/vehicles/${vid}/wishlist/${itemId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ status: "INSTALLED" }),
  });
  await assertResponseOk(patch, "PATCH INSTALLED");

  const wlRes = await fetch(`${BASE}/api/vehicles/${vid}/wishlist`);
  await assertResponseOk(wlRes, "GET wishlist");
  const wl = (await wlRes.json()) as { items: PartWishlistItem[] };
  const installed = wl.items.find((i) => i.id === itemId);
  assert(installed, "installed item missing from GET wishlist");
  assert(!isActiveWishlistItem(installed), "INSTALLED should not be active");
  const active = filterActiveWishlistItems(wl.items);
  assert(!active.some((i) => i.id === itemId), "INSTALLED must not appear in active filter");

  const vehRes = await fetch(`${BASE}/api/vehicles/${vid}`);
  await assertResponseOk(vehRes, "GET vehicle");
  const vehJson = (await vehRes.json()) as {
    vehicle: { odometer: number; engineHours: number | null };
  };
  const v = vehJson.vehicle;

  const form = createInitialAddServiceEventFromWishlistItem(installed, {
    odometer: v.odometer,
    engineHours: v.engineHours,
  });

  assert(form.eventDate === getTodayDateYmdLocal(), "eventDate = today (local YMD)");
  assert(form.odometer === String(v.odometer), "odometer = current");
  assert(
    v.engineHours == null
      ? form.engineHours === ""
      : form.engineHours === String(v.engineHours),
    "engineHours = current",
  );
  assert(form.nodeId === installed.nodeId, "nodeId prefill");
  assert(form.serviceType === WISHLIST_INSTALL_SERVICE_TYPE_RU, "serviceType");
  assert(
    installed.costAmount != null &&
      form.costAmount === formatExpenseAmountRu(installed.costAmount) &&
      form.currency === (installed.currency?.trim() || "RUB").toUpperCase(),
    "cost/currency from wishlist",
  );
  assert(
    form.comment?.includes(installed.title) || form.comment?.includes(sku.canonicalName),
    `comment should mention title or SKU: ${form.comment}`,
  );

  const payload = normalizeAddServiceEventPayload(form);
  const sePost = await fetch(`${BASE}/api/vehicles/${vid}/service-events`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  await assertResponseOk(sePost, "POST service-events");
  const createdBody = (await sePost.json()) as { serviceEvent: { id: string } };
  const createdId = createdBody.serviceEvent.id;

  const listRes = await fetch(`${BASE}/api/vehicles/${vid}/service-events`);
  await assertResponseOk(listRes, "GET service-events");
  const events = (await listRes.json()) as {
    serviceEvents: Array<{ id: string; costAmount: number | null }>;
  };
  const inJournal = events.serviceEvents.find((e) => e.id === createdId);
  assert(inJournal, "event in journal");
  assert(
    inJournal.costAmount === payload.costAmount,
    `journal cost ${inJournal.costAmount} vs ${payload.costAmount}`,
  );

  const wlAfter = await fetch(`${BASE}/api/vehicles/${vid}/wishlist`);
  const wl2 = (await wlAfter.json()) as { items: PartWishlistItem[] };
  assert(!filterActiveWishlistItems(wl2.items).some((i) => i.id === itemId), "still not active after save");

  const prisma2 = makePrisma();
  const nodeState = await prisma2.nodeState.findUnique({
    where: { vehicleId_nodeId: { vehicleId: vid, nodeId: payload.nodeId } },
    select: { status: true, lastServiceEventId: true },
  });
  assert(nodeState?.status === "RECENTLY_REPLACED", "leaf NodeState after install event");
  assert(nodeState?.lastServiceEventId === createdId, "NodeState.lastServiceEventId");
  await prisma2.$disconnect();

  console.log("OK item6 API smoke", {
    vehicleId: vid,
    wishlistItemId: itemId,
    serviceEventId: createdId,
    serviceType: payload.serviceType,
    cost: payload.costAmount,
    currency: payload.currency,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
