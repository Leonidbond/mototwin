/**
 * MT-SEC-054 smoke: verify failed login attempts produce auth audit rows.
 *
 * Requires local dev server + DATABASE_URL (same as app).
 *
 * Env:
 *   BASE_URL — default http://127.0.0.1:3000
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const BASE = (process.env.BASE_URL ?? "http://127.0.0.1:3000").replace(/\/+$/, "");
const ATTEMPTS = 5;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function failedLogin(index: number) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: `audit-smoke-${Date.now()}-${index}@mototwin.local`,
      password: "wrong-password-smoke",
    }),
  });
  assert(res.status === 401, `login attempt ${index} expected 401, got ${res.status}`);
}

async function main() {
  console.log(`auth audit smoke: ${BASE}`);

  const before = await prisma.authAuditLog.count({
    where: { event: "login.failure" },
  });

  for (let i = 0; i < ATTEMPTS; i += 1) {
    await failedLogin(i);
  }

  // Allow fire-and-forget audit writes to settle.
  await new Promise((resolve) => setTimeout(resolve, 500));

  const after = await prisma.authAuditLog.count({
    where: { event: "login.failure" },
  });

  const delta = after - before;
  assert(
    delta >= ATTEMPTS,
    `expected at least ${ATTEMPTS} new login.failure rows, got ${delta} (before=${before}, after=${after})`
  );

  console.log(`OK: ${delta} login.failure audit row(s) recorded`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
