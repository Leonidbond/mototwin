/**
 * QA smoke: wishlist SKU → INSTALLED → service event (API parity with checklist item 6).
 *
 * Дополнительный кейс: единый пикер «Готово к установке» — три строки в одном
 * событии (чистый expense + wishlist BOUGHT с linked expense + wishlist NEEDED).
 *
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
import type {
  ExpenseItem,
  InstallableForServiceEventResponse,
  PartWishlistItem,
} from "@mototwin/types";

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
  assert(form.items[0]?.nodeId === installed.nodeId, "nodeId prefill in items[0]");
  assert(form.title === WISHLIST_INSTALL_SERVICE_TYPE_RU, "title (legacy serviceType)");
  assert(
    installed.costAmount != null &&
      form.partsCost === formatExpenseAmountRu(installed.costAmount) &&
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
    serviceEvents: Array<{ id: string; totalCost: number | null }>;
  };
  const inJournal = events.serviceEvents.find((e) => e.id === createdId);
  assert(inJournal, "event in journal");
  assert(
    inJournal.totalCost === payload.totalCost,
    `journal totalCost ${inJournal.totalCost} vs ${payload.totalCost}`,
  );

  const wlAfter = await fetch(`${BASE}/api/vehicles/${vid}/wishlist`);
  const wl2 = (await wlAfter.json()) as { items: PartWishlistItem[] };
  assert(!filterActiveWishlistItems(wl2.items).some((i) => i.id === itemId), "still not active after save");

  const prisma2 = makePrisma();
  const anchorNodeId = payload.nodeId ?? payload.items[0]?.nodeId;
  if (!anchorNodeId) {
    throw new Error("payload should have an anchor nodeId or items[0].nodeId");
  }
  const nodeState = await prisma2.nodeState.findUnique({
    where: { vehicleId_nodeId: { vehicleId: vid, nodeId: anchorNodeId } },
    select: { status: true, lastServiceEventId: true },
  });
  assert(nodeState?.status === "RECENTLY_REPLACED", "leaf NodeState after install event");
  assert(nodeState?.lastServiceEventId === createdId, "NodeState.lastServiceEventId");
  await prisma2.$disconnect();

  console.log("OK item6 API smoke", {
    vehicleId: vid,
    wishlistItemId: itemId,
    serviceEventId: createdId,
    title: payload.title,
    totalCost: payload.totalCost,
    currency: payload.currency,
  });

  await runMultiInstallableSmoke(vid, v.odometer, v.engineHours);
}

/**
 * Сценарий: пикер «Готово к установке» сводит активный wishlist и uninstalled
 * расходы в один список и позволяет установить их одним сервисным событием.
 *
 * Готовим три позиции на трёх разных листовых узлах:
 *   1. Чистый ExpenseItem (PURCHASED + NOT_INSTALLED, без `shoppingListItemId`).
 *   2. Wishlist в статусе BOUGHT с `costAmount`/`currency` — backend в `POST
 *      /wishlist` через `syncExpenseItemForWishlistItem` создаёт привязанный
 *      `ExpenseItem` (`shoppingListItemId == wishlist.id`), endpoint должен
 *      смержить их в `wishlist+expense`.
 *   3. Wishlist в статусе NEEDED — чистый `wishlist`.
 *
 * Затем создаём одно сервисное событие, где `installedPartsJson` содержит две
 * wishlist-записи, а `installedExpenseItemIds` — оба расхода. После сохранения
 * проверяем: оба wishlist стали INSTALLED, оба expense получили
 * `installationStatus=INSTALLED` + `serviceEventId == event.id`.
 */
async function runMultiInstallableSmoke(
  vid: string,
  vehicleOdometer: number,
  vehicleEngineHours: number | null
) {
  const headers = { "Content-Type": "application/json" } as const;

  const prismaPick = makePrisma();
  const leaves = await prismaPick.node.findMany({
    where: { children: { none: {} } },
    select: { id: true, code: true },
    take: 3,
    orderBy: { code: "asc" },
  });
  await prismaPick.$disconnect();
  assert(leaves.length >= 3, "need at least 3 distinct global leaf nodes for installable smoke");
  const [nodeExpenseOnly, nodeWishlistBought, nodeWishlistNeeded] = leaves;

  // 1. Standalone ExpenseItem (no wishlist link).
  const standaloneExpenseRes = await fetch(`${BASE}/api/expenses`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      vehicleId: vid,
      nodeId: nodeExpenseOnly.id,
      category: "PART",
      installStatus: "BOUGHT_NOT_INSTALLED",
      purchaseStatus: "PURCHASED",
      installationStatus: "NOT_INSTALLED",
      expenseDate: new Date().toISOString(),
      title: "[QA installable] standalone expense",
      amount: 1230,
      currency: "RUB",
      partName: "Standalone smoke part",
      partSku: "SMOKE-EXP-1",
      vendor: "Acme",
      purchasedAt: new Date().toISOString(),
    }),
  });
  await assertResponseOk(standaloneExpenseRes, "POST standalone expense");
  const standaloneExpenseBody = (await standaloneExpenseRes.json()) as { expense: ExpenseItem };
  const standaloneExpenseId = standaloneExpenseBody.expense.id;

  // 2. Wishlist BOUGHT — backend auto-creates linked ExpenseItem.
  const boughtRes = await fetch(`${BASE}/api/vehicles/${vid}/wishlist`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      title: "[QA installable] wishlist BOUGHT",
      nodeId: nodeWishlistBought.id,
      quantity: 1,
      status: "BOUGHT",
      costAmount: 999,
      currency: "RUB",
    }),
  });
  await assertResponseOk(boughtRes, "POST wishlist BOUGHT");
  const boughtBody = (await boughtRes.json()) as { item: PartWishlistItem };
  const boughtWishlistId = boughtBody.item.id;

  // 3. Wishlist NEEDED.
  const neededRes = await fetch(`${BASE}/api/vehicles/${vid}/wishlist`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      title: "[QA installable] wishlist NEEDED",
      nodeId: nodeWishlistNeeded.id,
      quantity: 2,
      status: "NEEDED",
      costAmount: null,
      currency: null,
    }),
  });
  await assertResponseOk(neededRes, "POST wishlist NEEDED");
  const neededBody = (await neededRes.json()) as { item: PartWishlistItem };
  const neededWishlistId = neededBody.item.id;

  // GET /installable should expose all 3 with proper sources + dedupe.
  const installableRes = await fetch(`${BASE}/api/vehicles/${vid}/installable`);
  await assertResponseOk(installableRes, "GET installable");
  const installable = (await installableRes.json()) as InstallableForServiceEventResponse;

  const expenseEntry = installable.items.find((e) => e.expenseItemId === standaloneExpenseId);
  assert(expenseEntry, "installable: standalone expense entry");
  assert(expenseEntry.source === "expense", `expense source got=${expenseEntry.source}`);
  assert(expenseEntry.wishlistItemId == null, "expense entry has no wishlist link");

  const boughtEntry = installable.items.find((e) => e.wishlistItemId === boughtWishlistId);
  assert(boughtEntry, "installable: wishlist BOUGHT entry");
  assert(
    boughtEntry.source === "wishlist+expense",
    `wishlist+expense source got=${boughtEntry.source}`
  );
  assert(boughtEntry.expenseItemId != null, "wishlist+expense should have linked expense id");

  const neededEntry = installable.items.find((e) => e.wishlistItemId === neededWishlistId);
  assert(neededEntry, "installable: wishlist NEEDED entry");
  assert(neededEntry.source === "wishlist", `wishlist source got=${neededEntry.source}`);
  assert(neededEntry.expenseItemId == null, "wishlist NEEDED has no expense link");

  // Build a service event payload that includes all 3 lines.
  const installedExpenseItemIds = [standaloneExpenseId, boughtEntry.expenseItemId!];
  const installedPartsJson = JSON.stringify([
    {
      source: "wishlist",
      wishlistItemId: boughtWishlistId,
      title: boughtEntry.title,
      quantity: boughtEntry.quantity ?? 1,
      skuId: null,
      skuLabel: null,
    },
    {
      source: "wishlist",
      wishlistItemId: neededWishlistId,
      title: neededEntry.title,
      quantity: neededEntry.quantity ?? 1,
      skuId: null,
      skuLabel: null,
    },
  ]);

  const eventDateIso = new Date().toISOString();
  const sePost = await fetch(`${BASE}/api/vehicles/${vid}/service-events`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      title: "[QA installable] 3-row install",
      mode: "BASIC",
      eventDate: eventDateIso,
      odometer: vehicleOdometer,
      engineHours: vehicleEngineHours,
      partsCost: null,
      laborCost: null,
      totalCost: null,
      currency: "RUB",
      comment: "scripts/qa-installed-wishlist-smoke.ts (multi-installable)",
      installedPartsJson: JSON.parse(installedPartsJson),
      installedExpenseItemIds,
      items: [
        { nodeId: nodeExpenseOnly.id, actionType: "REPLACE", comment: null },
        { nodeId: nodeWishlistBought.id, actionType: "REPLACE", comment: null },
        { nodeId: nodeWishlistNeeded.id, actionType: "REPLACE", comment: null },
      ],
    }),
  });
  await assertResponseOk(sePost, "POST service-event (multi-installable)");
  const seBody = (await sePost.json()) as { serviceEvent: { id: string } };
  const eventId = seBody.serviceEvent.id;

  const prismaCheck = makePrisma();
  try {
    const wishlistAfter = await prismaCheck.partWishlistItem.findMany({
      where: { id: { in: [boughtWishlistId, neededWishlistId] } },
      select: { id: true, status: true },
    });
    for (const w of wishlistAfter) {
      assert(
        w.status === "INSTALLED",
        `wishlist ${w.id} should be INSTALLED, got ${w.status}`
      );
    }

    const expensesAfter = await prismaCheck.expenseItem.findMany({
      where: { id: { in: installedExpenseItemIds } },
      select: { id: true, installationStatus: true, serviceEventId: true },
    });
    assert(expensesAfter.length === installedExpenseItemIds.length, "all expenses still present");
    for (const exp of expensesAfter) {
      assert(
        exp.installationStatus === "INSTALLED",
        `expense ${exp.id} installationStatus got ${exp.installationStatus}`
      );
      assert(
        exp.serviceEventId === eventId,
        `expense ${exp.id} serviceEventId got ${exp.serviceEventId} expected ${eventId}`
      );
    }
  } finally {
    await prismaCheck.$disconnect();
  }

  console.log("OK installable picker smoke", {
    vehicleId: vid,
    serviceEventId: eventId,
    expenseEntryId: standaloneExpenseId,
    boughtWishlistId,
    neededWishlistId,
    leafNodes: [nodeExpenseOnly.code, nodeWishlistBought.code, nodeWishlistNeeded.code],
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
