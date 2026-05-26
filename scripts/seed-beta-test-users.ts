/**
 * Creates or updates beta QA accounts with passwords (idempotent).
 * Run on server: npx tsx scripts/seed-beta-test-users.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/lib/auth/password";
import { ensureUserBootstrap } from "../src/lib/auth/user-bootstrap";
import { normalizeEmail } from "../src/lib/auth/tokens";

const TEST_USERS = [
  { email: "test1@mototwin.online", password: "MotoTwinTest1!", displayName: "Beta Tester 1" },
  { email: "test2@mototwin.online", password: "MotoTwinTest2!", displayName: "Beta Tester 2" },
  { email: "test3@mototwin.online", password: "MotoTwinTest3!", displayName: "Beta Tester 3" },
  { email: "test4@mototwin.online", password: "MotoTwinTest4!", displayName: "Beta Tester 4" },
  { email: "test5@mototwin.online", password: "MotoTwinTest5!", displayName: "Beta Tester 5" },
] as const;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function upsertTestUser(input: (typeof TEST_USERS)[number]) {
  const email = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      displayName: input.displayName,
      passwordHash,
      isBlocked: false,
      blockedAt: null,
      blockReason: null,
    },
    create: {
      email,
      displayName: input.displayName,
      passwordHash,
    },
    select: { id: true, email: true },
  });
  await ensureUserBootstrap(user.id);
  const garage = await prisma.garage.findFirst({
    where: { ownerUserId: user.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true },
  });
  if (!garage) {
    await prisma.garage.create({
      data: { ownerUserId: user.id, title: "Мой гараж" },
    });
  }
  return { email: user.email, garageTitle: garage?.title ?? "Мой гараж" };
}

async function main() {
  const created: Array<{ email: string; password: string; displayName: string }> = [];
  for (const spec of TEST_USERS) {
    const row = await upsertTestUser(spec);
    created.push({
      email: row.email ?? spec.email,
      password: spec.password,
      displayName: spec.displayName,
    });
    console.log(`OK ${spec.email}`);
  }
  console.log("\n--- credentials (beta QA) ---");
  for (const row of created) {
    console.log(`${row.email}\t${row.password}\t${row.displayName}`);
  }
  console.log("\nAdd to MOTOTWIN_BETA_ALLOWED_EMAILS if missing:");
  console.log(created.map((r) => r.email).join(","));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
