/**
 * Полный QA прогон создания сервисного события: BASIC (1 и 2 узла), ADVANCED + PATCH в BASIC,
 * установка из wishlist (INSTALLED → событие), «Готово к установке» (3 строки).
 * Проверяются ответы API, записи в БД, NodeState / lastServiceEventId, расходы, wishlist после multi-install.
 *
 * Требования: `DATABASE_URL`, сид (`npm run db:seed`), Next в dev на `BASE_URL` (по умолчанию http://127.0.0.1:3000).
 *
 *   BASE_URL=http://127.0.0.1:3000 npx tsx scripts/qa-service-event-full-smoke.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  createInitialAddServiceEventFromWishlistItem,
  filterActiveWishlistItems,
  isActiveWishlistItem,
  normalizeAddServiceEventPayload,
} from "@mototwin/domain";
import type { ExpenseItem, InstallableForServiceEventResponse, PartWishlistItem } from "@mototwin/types";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function assertResponseOk(response: Response, label: string) {
  if (response.ok) return;
  const body = await response.text();
  throw new Error(`${label} ${response.status} ${body.slice(0, 800)}`);
}

function makePrisma() {
  const connectionString = process.env.DATABASE_URL;
  assert(connectionString, "DATABASE_URL is not set");
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

function toNum(v: unknown): number {
  if (typeof v === "number") return v;
  if (v != null && typeof (v as { toString(): string }).toString === "function") {
    return Number((v as { toString(): string }).toString());
  }
  return Number.NaN;
}

async function assertNodeState(
  prisma: PrismaClient,
  vehicleId: string,
  nodeId: string,
  expectedEventId: string,
  label: string
) {
  const row = await prisma.nodeState.findUnique({
    where: { vehicleId_nodeId: { vehicleId, nodeId } },
    select: { status: true, lastServiceEventId: true },
  });
  assert(row?.status === "RECENTLY_REPLACED", `${label}: NodeState.status`);
  assert(row?.lastServiceEventId === expectedEventId, `${label}: NodeState.lastServiceEventId`);
}

async function pingServer(vehicleId: string): Promise<void> {
  const base = BASE.replace(/\/+$/, "");
  const url = `${base}/api/vehicles/${vehicleId}`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    throw new Error(
      `Сервер недоступен или вернул ${res.status} на GET ${url}. Запустите Next: npm run dev`
    );
  }
}

async function main() {
  const prisma = makePrisma();
  const user = await prisma.user.findUnique({
    where: { email: "demo@mototwin.local" },
    select: { id: true },
  });
  assert(user, "demo@mototwin.local not found — выполните npm run db:seed");

  const vehicle = await prisma.vehicle.findFirst({
    where: { userId: user.id, nickname: { contains: "KTM 690" } },
    select: { id: true, odometer: true, engineHours: true },
  });
  assert(vehicle, "Тестовый мотоцикл KTM 690 не найден — выполните npm run db:seed");

  const leaves = await prisma.node.findMany({
    where: { children: { none: {} } },
    select: { id: true, code: true },
    take: 3,
    orderBy: { code: "asc" },
  });
  assert(leaves.length >= 3, "В БД нужно ≥3 листовых узла (глобальное дерево из сида)");
  const [leaf0, leaf1, leaf2] = leaves;

  await prisma.$disconnect();

  const vid = vehicle.id;
  await pingServer(vid);

  const headers = { "Content-Type": "application/json" } as const;

  const vehRes = await fetch(`${BASE}/api/vehicles/${vid}`);
  await assertResponseOk(vehRes, "GET vehicle");
  const vehJson = (await vehRes.json()) as { vehicle: { odometer: number; engineHours: number | null } };
  const odo = vehJson.vehicle.odometer;
  const engineHours = vehJson.vehicle.engineHours ?? null;

  const eventDate = new Date();
  eventDate.setMinutes(eventDate.getMinutes() - 3);
  const eventDateIso = eventDate.toISOString();

  const prismaAssert = makePrisma();
  const createdEventIds: string[] = [];
  const createdWishlistIds: string[] = [];
  const createdExpenseIds: string[] = [];

  try {
    // --- 1) BASIC, один узел ---
    const basic1 = await fetch(`${BASE}/api/vehicles/${vid}/service-events`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: "[QA full-smoke] BASIC 1 узел",
        mode: "BASIC",
        eventDate: eventDateIso,
        odometer: odo,
        engineHours,
        partsCost: 100,
        laborCost: 50,
        totalCost: 150,
        currency: "RUB",
        comment: "qa-service-event-full-smoke.ts (1 BASIC 1 node)",
        items: [{ nodeId: leaf0.id, actionType: "REPLACE", comment: null }],
      }),
    });
    await assertResponseOk(basic1, "POST BASIC 1 узел");
    const basic1Json = (await basic1.json()) as { serviceEvent: { id: string; mode: string } };
    const id1 = basic1Json.serviceEvent.id;
    createdEventIds.push(id1);
    assert(basic1Json.serviceEvent.mode === "BASIC", "mode BASIC");

    const exp1 = await prismaAssert.expenseItem.findMany({
      where: { serviceEventId: id1 },
      select: { id: true, amount: true },
    });
    assert(exp1.length === 1, `BASIC 1 узел: ожидалась 1 expense, получено ${exp1.length}`);
    assert(toNum(exp1[0].amount) === 150, "BASIC 1 узел: сумма expense");

    await assertNodeState(prismaAssert, vid, leaf0.id, id1, "BASIC 1 узел");

    // --- 2) BASIC, два узла ---
    const basic2 = await fetch(`${BASE}/api/vehicles/${vid}/service-events`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: "[QA full-smoke] BASIC 2 узла",
        mode: "BASIC",
        eventDate: eventDateIso,
        odometer: odo,
        engineHours,
        partsCost: 200,
        laborCost: 100,
        totalCost: 300,
        currency: "RUB",
        comment: "qa-service-event-full-smoke.ts (2 BASIC 2 nodes)",
        items: [
          { nodeId: leaf0.id, actionType: "SERVICE", comment: null },
          { nodeId: leaf1.id, actionType: "SERVICE", comment: null },
        ],
      }),
    });
    await assertResponseOk(basic2, "POST BASIC 2 узла");
    const id2 = (await basic2.json()) as { serviceEvent: { id: string } };
    createdEventIds.push(id2.serviceEvent.id);

    const exp2 = await prismaAssert.expenseItem.count({ where: { serviceEventId: id2.serviceEvent.id } });
    assert(exp2 === 1, `BASIC 2 узла: одна сводная expense, получено ${exp2}`);

    await assertNodeState(prismaAssert, vid, leaf0.id, id2.serviceEvent.id, "BASIC 2 узла leaf0");
    await assertNodeState(prismaAssert, vid, leaf1.id, id2.serviceEvent.id, "BASIC 2 узла leaf1");

    // --- 3) ADVANCED 2 узла → PATCH BASIC ---
    const part1 = 2000;
    const labor1 = 500;
    const part2 = 1500;
    const labor2 = 300;
    const totalParts = part1 + part2;
    const totalLabor = labor1 + labor2;
    const totalCost = totalParts + totalLabor;

    const advPost = await fetch(`${BASE}/api/vehicles/${vid}/service-events`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: "[QA full-smoke] ADVANCED",
        mode: "ADVANCED",
        eventDate: eventDateIso,
        odometer: odo,
        engineHours,
        partsCost: totalParts,
        laborCost: totalLabor,
        totalCost,
        currency: "RUB",
        comment: "qa-service-event-full-smoke.ts (3 ADVANCED)",
        items: [
          {
            nodeId: leaf0.id,
            actionType: "REPLACE",
            partName: "QA A",
            sku: "QA-A",
            quantity: 1,
            partCost: part1,
            laborCost: labor1,
            comment: null,
          },
          {
            nodeId: leaf1.id,
            actionType: "SERVICE",
            partName: "QA B",
            sku: "QA-B",
            quantity: 2,
            partCost: part2,
            laborCost: labor2,
            comment: null,
          },
        ],
      }),
    });
    await assertResponseOk(advPost, "POST ADVANCED");
    const advJson = (await advPost.json()) as { serviceEvent: { id: string; mode: string } };
    const id3 = advJson.serviceEvent.id;
    createdEventIds.push(id3);
    assert(advJson.serviceEvent.mode === "ADVANCED", "created ADVANCED");

    const expAdv = await prismaAssert.expenseItem.findMany({
      where: { serviceEventId: id3 },
      orderBy: { nodeId: "asc" },
    });
    assert(expAdv.length === 2, `ADVANCED: 2 expense, получено ${expAdv.length}`);

    await assertNodeState(prismaAssert, vid, leaf0.id, id3, "ADV leaf0");
    await assertNodeState(prismaAssert, vid, leaf1.id, id3, "ADV leaf1");

    const patchBasic = await fetch(`${BASE}/api/vehicles/${vid}/service-events/${id3}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        title: "[QA full-smoke] ADV→BASIC",
        mode: "BASIC",
        eventDate: eventDateIso,
        odometer: odo,
        engineHours,
        partsCost: totalParts,
        laborCost: totalLabor,
        totalCost,
        currency: "RUB",
        comment: "after PATCH",
        items: [
          { nodeId: leaf0.id, actionType: "REPLACE", comment: null },
          { nodeId: leaf1.id, actionType: "REPLACE", comment: null },
        ],
      }),
    });
    await assertResponseOk(patchBasic, "PATCH BASIC");
    const expAfterPatch = await prismaAssert.expenseItem.findMany({
      where: { serviceEventId: id3 },
      select: { amount: true, nodeId: true },
    });
    assert(expAfterPatch.length === 1, `После PATCH: 1 expense, получено ${expAfterPatch.length}`);
    assert(toNum(expAfterPatch[0].amount) === totalCost, "PATCH: rollup amount");

    // --- 4) Wishlist: INSTALLED → событие (как из формы «установка») ---
    const wlPost = await fetch(`${BASE}/api/vehicles/${vid}/wishlist`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: "[QA full-smoke] wishlist INSTALLED",
        nodeId: leaf2.id,
        quantity: 1,
        status: "NEEDED",
        costAmount: 777,
        currency: "RUB",
      }),
    });
    await assertResponseOk(wlPost, "POST wishlist");
    const wlCreated = (await wlPost.json()) as { item: PartWishlistItem };
    const wlId = wlCreated.item.id;
    createdWishlistIds.push(wlId);

    const wlInst = await fetch(`${BASE}/api/vehicles/${vid}/wishlist/${wlId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status: "INSTALLED" }),
    });
    await assertResponseOk(wlInst, "PATCH wishlist INSTALLED");

    const wlGet = await fetch(`${BASE}/api/vehicles/${vid}/wishlist`);
    await assertResponseOk(wlGet, "GET wishlist");
    const wlItems = (await wlGet.json()) as { items: PartWishlistItem[] };
    const installed = wlItems.items.find((i) => i.id === wlId);
    assert(installed, "wishlist строка после INSTALLED");
    assert(!isActiveWishlistItem(installed), "INSTALLED не в активных");
    assert(!filterActiveWishlistItems(wlItems.items).some((i) => i.id === wlId), "filterActive исключает");

    const form = createInitialAddServiceEventFromWishlistItem(installed, {
      odometer: odo,
      engineHours,
    });
    const payloadWl = normalizeAddServiceEventPayload(form);
    const seWl = await fetch(`${BASE}/api/vehicles/${vid}/service-events`, {
      method: "POST",
      headers,
      body: JSON.stringify(payloadWl),
    });
    await assertResponseOk(seWl, "POST service-events (wishlist)");
    const id4 = ((await seWl.json()) as { serviceEvent: { id: string } }).serviceEvent.id;
    createdEventIds.push(id4);

    const anchorWl = payloadWl.nodeId ?? payloadWl.items[0]?.nodeId;
    assert(anchorWl, "anchor wishlist");
    await assertNodeState(prismaAssert, vid, anchorWl, id4, "wishlist install");

    // --- 5) «Готово к установке»: 3 строки (как qa-installed-wishlist multi) ---
    const [nExp, nBought, nNeeded] = [leaf0, leaf1, leaf2];
    const standaloneRes = await fetch(`${BASE}/api/expenses`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        vehicleId: vid,
        nodeId: nExp.id,
        category: "PART",
        installStatus: "BOUGHT_NOT_INSTALLED",
        purchaseStatus: "PURCHASED",
        installationStatus: "NOT_INSTALLED",
        expenseDate: new Date().toISOString(),
        title: "[QA full-smoke] standalone expense",
        amount: 1230,
        currency: "RUB",
        partName: "Smoke standalone",
        partSku: "QA-FULL-SMOKE-EXP",
        vendor: "QA",
        purchasedAt: new Date().toISOString(),
      }),
    });
    await assertResponseOk(standaloneRes, "POST standalone expense");
    const standaloneId = ((await standaloneRes.json()) as { expense: ExpenseItem }).expense.id;
    createdExpenseIds.push(standaloneId);

    const boughtRes = await fetch(`${BASE}/api/vehicles/${vid}/wishlist`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: "[QA full-smoke] installable BOUGHT",
        nodeId: nBought.id,
        quantity: 1,
        status: "BOUGHT",
        costAmount: 999,
        currency: "RUB",
      }),
    });
    await assertResponseOk(boughtRes, "POST wishlist BOUGHT");
    const boughtId = ((await boughtRes.json()) as { item: PartWishlistItem }).item.id;
    createdWishlistIds.push(boughtId);

    const neededRes = await fetch(`${BASE}/api/vehicles/${vid}/wishlist`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: "[QA full-smoke] installable NEEDED",
        nodeId: nNeeded.id,
        quantity: 1,
        status: "NEEDED",
      }),
    });
    await assertResponseOk(neededRes, "POST wishlist NEEDED");
    const neededId = ((await neededRes.json()) as { item: PartWishlistItem }).item.id;
    createdWishlistIds.push(neededId);

    const instRes = await fetch(`${BASE}/api/vehicles/${vid}/installable`);
    await assertResponseOk(instRes, "GET installable");
    const installable = (await instRes.json()) as InstallableForServiceEventResponse;
    const boughtEntry = installable.items.find((e) => e.wishlistItemId === boughtId);
    assert(boughtEntry, "installable: BOUGHT entry");
    assert(boughtEntry.source === "wishlist+expense" && boughtEntry.expenseItemId, "installable: bought merged");

    const neededEntry = installable.items.find((e) => e.wishlistItemId === neededId);
    assert(neededEntry, "installable: NEEDED entry");

    const installedPartsJson = [
      {
        source: "wishlist" as const,
        wishlistItemId: boughtId,
        title: boughtEntry.title,
        quantity: boughtEntry.quantity ?? 1,
        skuId: null,
        skuLabel: null,
      },
      {
        source: "wishlist" as const,
        wishlistItemId: neededId,
        title: neededEntry.title,
        quantity: neededEntry.quantity ?? 1,
        skuId: null,
        skuLabel: null,
      },
    ];
    const installedExpenseItemIds = [standaloneId, boughtEntry.expenseItemId];

    const multiPost = await fetch(`${BASE}/api/vehicles/${vid}/service-events`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: "[QA full-smoke] installable 3 rows",
        mode: "BASIC",
        eventDate: new Date().toISOString(),
        odometer: odo,
        engineHours,
        partsCost: null,
        laborCost: null,
        totalCost: null,
        currency: "RUB",
        comment: "qa-service-event-full-smoke.ts (5 installable 3 rows)",
        installedPartsJson,
        installedExpenseItemIds,
        items: [
          { nodeId: nExp.id, actionType: "REPLACE", comment: null },
          { nodeId: nBought.id, actionType: "REPLACE", comment: null },
          { nodeId: nNeeded.id, actionType: "REPLACE", comment: null },
        ],
      }),
    });
    await assertResponseOk(multiPost, "POST installable 3 rows");
    const id5 = ((await multiPost.json()) as { serviceEvent: { id: string } }).serviceEvent.id;
    createdEventIds.push(id5);

    for (const nid of [nExp.id, nBought.id, nNeeded.id]) {
      await assertNodeState(prismaAssert, vid, nid, id5, `installable node ${nid}`);
    }

    const wlAfter = await prismaAssert.partWishlistItem.findMany({
      where: { id: { in: [boughtId, neededId] } },
      select: { id: true, status: true },
    });
    for (const w of wlAfter) {
      assert(w.status === "INSTALLED", `wishlist ${w.id} → INSTALLED`);
    }

    const expLinked = await prismaAssert.expenseItem.findMany({
      where: { id: { in: installedExpenseItemIds } },
      select: { id: true, installationStatus: true, serviceEventId: true },
    });
    assert(expLinked.length === 2, "оба расхода на месте");
    for (const e of expLinked) {
      assert(e.installationStatus === "INSTALLED", `expense ${e.id} INSTALLED`);
      assert(e.serviceEventId === id5, `expense ${e.id} → event`);
    }

    console.log("OK qa-service-event-full-smoke", {
      vehicleId: vid,
      events: {
        basic1: id1,
        basic2: id2.serviceEvent.id,
        advancedPatched: id3,
        wishlist: id4,
        installable3: id5,
      },
      leaves: leaves.map((l) => l.code),
    });
  } finally {
    for (const eid of createdEventIds) {
      const del = await fetch(`${BASE}/api/vehicles/${vid}/service-events/${eid}`, { method: "DELETE" });
      if (!del.ok) {
        console.warn("cleanup DELETE service-event", eid, del.status, await del.text());
      }
    }
    for (const wid of createdWishlistIds) {
      const delW = await fetch(`${BASE}/api/vehicles/${vid}/wishlist/${wid}`, { method: "DELETE" });
      if (!delW.ok) {
        console.warn("cleanup DELETE wishlist", wid, delW.status, await delW.text());
      }
    }
    for (const xid of createdExpenseIds) {
      const delX = await fetch(`${BASE}/api/expenses/${xid}`, { method: "DELETE" });
      if (!delX.ok && delX.status !== 404) {
        console.warn("cleanup DELETE expense", xid, delX.status, await delX.text());
      }
    }
    await prismaAssert.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
