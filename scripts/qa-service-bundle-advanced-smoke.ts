/**
 * QA smoke: ADVANCED bundle → несколько ExpenseItem (per-node); затем PATCH в BASIC → одна expense; DELETE.
 * Требует: DATABASE_URL, запущенный Next на BASE_URL, сид demo@mototwin.local + KTM 690 из сида.
 *
 *   BASE_URL=http://127.0.0.1:3000 npx tsx scripts/qa-service-bundle-advanced-smoke.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

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

function toNum(v: unknown): number {
  if (typeof v === "number") return v;
  if (v != null && typeof (v as { toString(): string }).toString === "function") {
    return Number((v as { toString(): string }).toString());
  }
  return Number.NaN;
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
    select: { id: true, odometer: true, engineHours: true },
  });
  assert(vehicle, "QA KTM 690 vehicle not found");

  const leaves = await prisma.node.findMany({
    where: { children: { none: {} } },
    select: { id: true, code: true },
    take: 2,
    orderBy: { code: "asc" },
  });
  assert(leaves.length >= 2, "need at least 2 global leaf nodes in DB");
  const [n1, n2] = leaves;
  assert(n1.id !== n2.id, "two distinct leaf nodes");

  await prisma.$disconnect();

  const vid = vehicle.id;
  const headers = { "Content-Type": "application/json" } as const;

  const vehRes = await fetch(`${BASE}/api/vehicles/${vid}`);
  await assertResponseOk(vehRes, "GET vehicle");
  const vehJson = (await vehRes.json()) as { vehicle: { odometer: number; engineHours: number | null } };
  const odo = vehJson.vehicle.odometer;

  const eventDate = new Date();
  eventDate.setMinutes(eventDate.getMinutes() - 5);
  const eventDateIso = eventDate.toISOString();

  const part1 = 2000;
  const labor1 = 500;
  const part2 = 1500;
  const labor2 = 300;
  const totalParts = part1 + part2;
  const totalLabor = labor1 + labor2;
  const totalCost = totalParts + totalLabor;

  const advancedBody = {
    title: "[QA smoke] ADV per-item bundle",
    mode: "ADVANCED" as const,
    eventDate: eventDateIso,
    odometer: odo,
    engineHours: vehJson.vehicle.engineHours ?? null,
    partsCost: totalParts,
    laborCost: totalLabor,
    totalCost,
    currency: "RUB",
    comment: "scripts/qa-service-bundle-advanced-smoke.ts",
    items: [
      {
        nodeId: n1.id,
        actionType: "REPLACE" as const,
        partName: "Smoke part A",
        sku: "SMOKE-A",
        quantity: 1,
        partCost: part1,
        laborCost: labor1,
        comment: "row1",
      },
      {
        nodeId: n2.id,
        actionType: "SERVICE" as const,
        partName: "Smoke part B",
        sku: "SMOKE-B",
        quantity: 2,
        partCost: part2,
        laborCost: labor2,
        comment: "row2",
      },
    ],
  };

  const post = await fetch(`${BASE}/api/vehicles/${vid}/service-events`, {
    method: "POST",
    headers,
    body: JSON.stringify(advancedBody),
  });
  await assertResponseOk(post, "POST ADVANCED service-events");
  const created = (await post.json()) as { serviceEvent: { id: string; nodeId: string; mode: string } };
  const eventId = created.serviceEvent.id;
  assert(created.serviceEvent.mode === "ADVANCED", "created mode ADVANCED");

  const prisma2 = makePrisma();
  const expensesAdv = await prisma2.expenseItem.findMany({
    where: { serviceEventId: eventId },
    orderBy: { nodeId: "asc" },
    select: { id: true, nodeId: true, amount: true, title: true },
  });
  assert(expensesAdv.length === 2, `ADVANCED: expected 2 expense items, got ${expensesAdv.length}`);
  const amounts = expensesAdv.map((e) => toNum(e.amount)).sort((a, b) => a - b);
  assert(amounts[0] === part2 + labor2 && amounts[1] === part1 + labor1, `amounts ${amounts.join(",")}`);
  const nodeSet = new Set(expensesAdv.map((e) => e.nodeId));
  assert(nodeSet.has(n1.id) && nodeSet.has(n2.id), "expense nodeIds should match item nodes");

  const patchBody = {
    title: "[QA smoke] ADV → BASIC",
    mode: "BASIC" as const,
    eventDate: eventDateIso,
    odometer: odo,
    engineHours: vehJson.vehicle.engineHours ?? null,
    partsCost: totalParts,
    laborCost: totalLabor,
    totalCost,
    currency: "RUB",
    comment: "after PATCH BASIC",
    items: [
      { nodeId: n1.id, actionType: "REPLACE" as const, comment: null },
      { nodeId: n2.id, actionType: "REPLACE" as const, comment: null },
    ],
  };

  const patch = await fetch(`${BASE}/api/vehicles/${vid}/service-events/${eventId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(patchBody),
  });
  await assertResponseOk(patch, "PATCH BASIC");

  const expensesBasic = await prisma2.expenseItem.findMany({
    where: { serviceEventId: eventId },
    select: { id: true, nodeId: true, amount: true },
  });
  assert(expensesBasic.length === 1, `BASIC: expected 1 expense item, got ${expensesBasic.length}`);
  assert(toNum(expensesBasic[0].amount) === totalCost, "BASIC rollup amount");
  assert(expensesBasic[0].nodeId === created.serviceEvent.nodeId, "BASIC expense on anchor node");

  const del = await fetch(`${BASE}/api/vehicles/${vid}/service-events/${eventId}`, { method: "DELETE" });
  await assertResponseOk(del, "DELETE service-events");

  const afterDel = await prisma2.expenseItem.count({ where: { serviceEventId: eventId } });
  assert(afterDel === 0, "expenses cleaned with event");

  await prisma2.$disconnect();

  console.log("OK qa-service-bundle-advanced-smoke", {
    vehicleId: vid,
    eventId,
    leafNodes: [n1.code, n2.code],
    advancedExpenseAmounts: [part1 + labor1, part2 + labor2],
    basicRollup: totalCost,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
