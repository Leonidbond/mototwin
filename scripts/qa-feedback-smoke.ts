/**
 * Smoke test: Help & Feedback MVP — submit feedback, admin list/detail/patch/export.
 *
 * Env:
 *   BASE_URL — default http://127.0.0.1:3000
 *   MOTOTWIN_DEV_USER_EMAIL — user for POST /api/feedback (default demo@mototwin.local)
 *   MOTOTWIN_DEV_ADMIN_EMAIL — admin for feedback admin APIs (default super@mototwin.local)
 */
import "dotenv/config";

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
): Promise<{ res: Response; body: unknown; text: string }> {
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
  return { res, body, text };
}

async function main() {
  console.log(`feedback smoke: ${BASE}`);
  console.log(
    `  user=${USER_EMAIL} admin=${ADMIN_EMAIL} devHeaders=${USE_DEV_HEADERS ? "on" : "off (default demo user)"}`
  );

  const asUser = USE_DEV_HEADERS ? USER_EMAIL : undefined;
  const asAdmin = USE_DEV_HEADERS ? ADMIN_EMAIL : undefined;

  const message = `qa-feedback-smoke ${Date.now()}`;

  const submit = await request(
    "/api/feedback",
    {
      method: "POST",
      body: JSON.stringify({
        type: "PROBLEM",
        message,
        pageKey: "garage",
        platform: "web",
        routePath: "/garage",
        locale: "ru-RU",
      }),
    },
    asUser
  );
  assert(
    submit.res.status === 201,
    `POST /api/feedback -> ${submit.res.status} ${JSON.stringify(submit.body)}`
  );
  const submitBody = submit.body as { id?: string; createdAt?: string };
  const feedbackId = submitBody.id;
  assert(feedbackId, "feedback create must return id");
  console.log(`  ✓ submitted feedback ${feedbackId}`);

  const list = await request("/api/admin/feedback?q=" + encodeURIComponent(message.slice(0, 20)), {}, asAdmin);
  assert(list.res.ok, `GET /api/admin/feedback -> ${list.res.status} ${JSON.stringify(list.body)}`);
  const listBody = list.body as { items?: Array<{ id: string; message: string }>; total?: number };
  assert(
    listBody.items?.some((row) => row.id === feedbackId),
    "admin list must include submitted feedback"
  );
  console.log(`  ✓ admin list (${listBody.total ?? "?"} total)`);

  const detail = await request(`/api/admin/feedback/${feedbackId}`, {}, asAdmin);
  assert(detail.res.ok, `GET /api/admin/feedback/[id] -> ${detail.res.status}`);
  const detailBody = detail.body as { id?: string; status?: string; pageKey?: string; message?: string };
  assert(detailBody.id === feedbackId, "detail id must match");
  assert(detailBody.status === "NEW", "detail status must be NEW");
  assert(detailBody.pageKey === "garage", "detail pageKey must be garage");
  assert(detailBody.message === message, "detail message must match");
  console.log("  ✓ admin detail");

  const patch = await request(
    `/api/admin/feedback/${feedbackId}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        status: "IN_PROGRESS",
        adminNote: "qa-feedback-smoke note",
      }),
    },
    asAdmin
  );
  assert(
    patch.res.ok,
    `PATCH /api/admin/feedback/[id] -> ${patch.res.status} ${JSON.stringify(patch.body)}`
  );
  const patchBody = patch.body as { status?: string; adminNote?: string };
  assert(patchBody.status === "IN_PROGRESS", "patch must set IN_PROGRESS");
  console.log("  ✓ admin patch status");

  const exportRes = await request(
    `/api/admin/feedback/export?ids=${encodeURIComponent(feedbackId)}`,
    {},
    asAdmin
  );
  assert(exportRes.res.ok, `GET /api/admin/feedback/export -> ${exportRes.res.status}`);
  assert(
    exportRes.res.headers.get("content-type")?.includes("ndjson") ||
      exportRes.res.headers.get("content-type")?.includes("json"),
    "export must be ndjson content-type"
  );
  assert(exportRes.text.includes(feedbackId), "export must contain feedback id");
  assert(exportRes.text.includes(message), "export must contain message");
  console.log("  ✓ admin export ndjson");

  const adminPage = await request("/admin/feedback", {}, asAdmin);
  assert(
    adminPage.res.status === 200,
    `GET /admin/feedback page -> ${adminPage.res.status}`
  );
  console.log("  ✓ admin feedback page");

  const adminDetailPage = await request(`/admin/feedback/${feedbackId}`, {}, asAdmin);
  assert(
    adminDetailPage.res.status === 200,
    `GET /admin/feedback/[id] page -> ${adminDetailPage.res.status}`
  );
  console.log("  ✓ admin feedback detail page");

  console.log("\n✓ feedback smoke passed");
}

main().catch((error) => {
  console.error("\n✗ feedback smoke failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
