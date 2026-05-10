/**
 * HTTP smoke: страница журнала и маршруты переходов из UI (ожидается 200 от Next).
 * Дополняет API-smoke (`qa-service-event-full-smoke` и др.) проверкой отдачи страниц на живом сервере.
 *
 * Требует: `DATABASE_URL`, сид (`npm run db:seed`), Next на `BASE_URL` (по умолчанию http://127.0.0.1:3000).
 *
 *   BASE_URL=http://127.0.0.1:3000 npx tsx scripts/qa-service-log-web-routes-smoke.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function makePrisma() {
  const connectionString = process.env.DATABASE_URL;
  assert(connectionString, "DATABASE_URL is not set");
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

function highlightReturnPath(vehicleId: string, eventId: string): string {
  const q = new URLSearchParams();
  q.set("highlightServiceEventId", eventId);
  return `/vehicles/${vehicleId}/service-log?${q.toString()}`;
}

async function assertGetOk(pathWithQuery: string, label: string): Promise<void> {
  const base = BASE.replace(/\/+$/, "");
  const url = pathWithQuery.startsWith("http") ? pathWithQuery : `${base}${pathWithQuery.startsWith("/") ? "" : "/"}${pathWithQuery}`;
  const res = await fetch(url, { method: "GET", redirect: "follow" });
  if (!res.ok) {
    const snippet = (await res.text()).slice(0, 500);
    throw new Error(`${label}: ${res.status} ${url}\n${snippet}`);
  }
}

async function main() {
  const prisma = makePrisma();
  const user = await prisma.user.findUnique({
    where: { email: "demo@mototwin.local" },
    select: { id: true },
  });
  assert(user, "demo@mototwin.local not found — npm run db:seed");

  const vehicle = await prisma.vehicle.findFirst({
    where: { userId: user.id, nickname: { contains: "KTM 690" } },
    select: { id: true },
  });
  assert(vehicle, "QA KTM 690 vehicle not found");

  const serviceEvent = await prisma.serviceEvent.findFirst({
    where: { vehicleId: vehicle.id, eventKind: "SERVICE" },
    orderBy: { eventDate: "desc" },
    select: { id: true, eventDate: true, nodeId: true },
  });

  const expenseLinked = serviceEvent
    ? await prisma.expenseItem.findFirst({
        where: { vehicleId: vehicle.id, serviceEventId: serviceEvent.id },
        select: { id: true, expenseDate: true },
      })
    : null;

  const wishlistItem = await prisma.partWishlistItem.findFirst({
    where: { vehicleId: vehicle.id },
    select: { id: true },
  });

  await prisma.$disconnect();

  const vid = vehicle.id;
  await assertGetOk(`${BASE}/`, "GET / (dev server)");

  const checks: Array<{ path: string; label: string }> = [
    { path: `/vehicles/${vid}/service-log`, label: "journal root" },
    {
      path: `/vehicles/${vid}/service-log?paidOnly=1`,
      label: "journal paidOnly",
    },
    {
      path: `/vehicles/${vid}/service-events/new?returnTo=${encodeURIComponent(`/vehicles/${vid}/service-log`)}`,
      label: "service event create + returnTo journal",
    },
  ];

  if (serviceEvent) {
    const y = new Date(serviceEvent.eventDate).getFullYear();
    const rt = highlightReturnPath(vid, serviceEvent.id);
    checks.push(
      {
        path: `/vehicles/${vid}/nodes?nodeId=${encodeURIComponent(serviceEvent.nodeId)}`,
        label: "nodes + nodeId (from last SERVICE event)",
      },
      {
        path: `/vehicles/${vid}/service-log?serviceEventId=${encodeURIComponent(serviceEvent.id)}`,
        label: "journal serviceEventId",
      },
      {
        path: `/vehicles/${vid}/service-log?highlightServiceEventId=${encodeURIComponent(serviceEvent.id)}`,
        label: "journal highlightServiceEventId",
      },
      {
        path: `/vehicles/${vid}/service-log?nodeIds=${encodeURIComponent(serviceEvent.nodeId)}`,
        label: "journal nodeIds filter",
      },
      {
        path: `/vehicles/${vid}/service-events/${encodeURIComponent(serviceEvent.id)}/edit?returnTo=${encodeURIComponent(`/vehicles/${vid}/service-log`)}`,
        label: "service event edit + returnTo",
      },
      {
        path: `/vehicles/${vid}/service-events/new?repeatOf=${encodeURIComponent(serviceEvent.id)}&returnTo=${encodeURIComponent(`/vehicles/${vid}/service-log`)}`,
        label: "service event repeat + returnTo",
      },
      {
        path: `/vehicles/${vid}/expenses?year=${y}&serviceEventId=${encodeURIComponent(serviceEvent.id)}&returnTo=${encodeURIComponent(rt)}`,
        label: "expenses filtered by service event + returnTo",
      }
    );

    if (expenseLinked) {
      const ey = new Date(expenseLinked.expenseDate).getFullYear();
      checks.push({
        path: `/vehicles/${vid}/expenses?year=${ey}&serviceEventId=${encodeURIComponent(serviceEvent.id)}&highlightExpenseId=${encodeURIComponent(expenseLinked.id)}&returnTo=${encodeURIComponent(rt)}`,
        label: "expenses + highlightExpenseId + returnTo",
      });
    }

    const partsBase = new URLSearchParams();
    partsBase.set("returnTo", rt);
    if (wishlistItem) {
      partsBase.set("wishlistItemId", wishlistItem.id);
    } else {
      partsBase.set("partsSearch", "масло");
    }
    checks.push({
      path: `/vehicles/${vid}/parts?${partsBase.toString()}`,
      label: wishlistItem ? "parts + wishlistItemId + returnTo" : "parts + partsSearch + returnTo",
    });
  }

  for (const { path, label } of checks) {
    await assertGetOk(path, label);
    console.log(`ok  ${label}`);
  }

  console.log(`\nqa-service-log-web-routes-smoke: ${checks.length} GET checks passed (${BASE})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
