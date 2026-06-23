# MotoTwin Admin Panel — MVP v1

Live at `/admin` once you sign in as a user with an `adminRole` set.

## 1. Quick start

```bash
npm run db:seed       # creates admin users (see seed list below)
npm run dev           # http://localhost:3000/admin
```

By default the panel resolves the request to `demo@mototwin.local` (seeded as SUPER_ADMIN). To switch to another admin role you have two options:

1. **Dev User Switcher** (bottom-right of the public app) — UI for browser sessions.
2. **`x-mototwin-dev-user-email` header** — for `curl` / API testing. Requires `MOTOTWIN_ENABLE_DEV_USER_SWITCHER=true` on the server.

Seeded admin accounts:

| Email                    | Role             | Notes                                     |
| ------------------------ | ---------------- | ----------------------------------------- |
| `super@mototwin.local`   | SUPER_ADMIN      | Full access including team and rollback   |
| `catalog@mototwin.local` | CATALOG_MANAGER  | Catalog mutations and bulk imports        |
| `moderator@mototwin.local` | MODERATOR      | Moderation queues + part field edits      |
| `analyst@mototwin.local` | ANALYST          | Read-only access to dashboards & reports  |
| `demo@mototwin.local`    | SUPER_ADMIN      | Same as super, used for E2E and demos     |

### Smoke check

Verify all admin pages and APIs against a running dev server:

```bash
bash scripts/qa-admin-smoke.sh                # http://localhost:3000 by default
bash scripts/qa-admin-smoke.sh http://host    # custom base URL
MOTOTWIN_DEV_EMAIL=catalog@mototwin.local bash scripts/qa-admin-smoke.sh
```

The script hits every admin page (17 routes) and every read-only admin API (17 endpoints). Each must respond `200`.

## 2. Routes

| Path                                  | Purpose                                              |
| ------------------------------------- | ---------------------------------------------------- |
| `/admin`                              | Dashboard with 8 widgets matching the design ref     |
| `/admin/users`, `/admin/users/[id]`   | Users list + detail + block/unblock; SUPER_ADMIN assigns admin roles on user detail |
| `/admin/vehicles`                     | Filterable list of all garage vehicles               |
| `/admin/models`, `/admin/models/[id]` | brand × family × variant × generation table + support-level editor (4-уровневая иерархия, см. [data-model.md](./data-model.md)) |
| `/admin/catalog`, `/admin/catalog/[id]` | PartMaster CRUD, aliases, fitments, merge          |
| `/admin/fitment`                      | MotorcycleBrand × node coverage matrix and conflict lists |
| `/admin/moderation`                   | 7 queues + right-side inspector                      |
| `/admin/imports`, `/admin/imports/new`, `/admin/imports/[id]` | Bulk import wizard (PARTS + PART_ALIASES) |
| `/admin/audit`                        | Searchable audit log (read-only)                     |
| `/admin/dictionaries`                 | Brands and node tree (read-only)                     |
| `/admin/reports`                      | Hub of links into pre-filtered sections              |
| `/admin/settings`                     | Grant/revoke admin roles: user search + current team roster (SUPER_ADMIN only) |
| `/admin/service-rules`, `/admin/service-rules/new` | Список регламентов ТО + форма создания (`POST /api/admin/service-rules`) |
| `/admin/notifications` | Журнал доставки уведомлений (read-only) |
| `/admin/subscriptions` | Сводка подписок (управление Stripe — в планах) |
| `/admin/fitment/conflicts`, `/admin/fitment/conflicts/[id]` | Legacy URLs → redirect на `/admin/moderation?queue=mixedFitments` |

The legacy `/moderation/fitment` 308-redirects to `/admin/moderation`.

## 3. Authentication and authorization

Authentication is the existing dev-stub (`apps/.../api/_shared/current-user-context.ts`). The admin panel layers RBAC on top:

- `User.adminRole` is the source of truth (`SUPER_ADMIN | CATALOG_MANAGER | MODERATOR | ANALYST`).
- Legacy `User.isModerator = true` is treated as `MODERATOR` by `resolveAdminRole` so existing accounts keep working.
- `src/lib/admin-auth.ts`:
  - `getAdminContext()` resolves the current user's admin role (or throws `AdminAccessError` for non-admins).
  - `requireAdminRole(['SUPER_ADMIN', ...])` gates `/api/admin/*` route handlers.
  - `requireAnyAdmin()` is the read-only equivalent.
  - `canMutate(role)` is the helper used by mutating controls that remain read-only for `ANALYST`.

User management actions:

- `GET /api/admin/users`, `GET /api/admin/users/[id]` — read user directory and profile.
- `PATCH /api/admin/users/[id]` — block/unblock account (requires any admin role, reason is mandatory, action is written to audit log).
- Blocking a user revokes app sessions (`auth_sessions`, `refresh_tokens`, `authjs_sessions`) and denies further auth until unblocked.

Team / admin role management (SUPER_ADMIN only):

- **`/admin/settings`** — search any user by email or display name, assign or revoke an admin role with a mandatory audit reason; below that, edit roles for the current admin team roster.
- **`/admin/users/[id]`** — card **«Права админки»** with the same role editor for the opened user.
- Shared UI: `AdminRoleAssignmentControl` (`src/app/admin/_components/AdminRoleAssignmentControl.tsx`).
- `GET /api/admin/team` — list accounts with `adminRole` or legacy `isModerator`.
- `PATCH /api/admin/team` — body `{ userId, adminRole, reason }`; writes `team.role.change` to audit log; syncs `isModerator` (`true` for `SUPER_ADMIN` and `MODERATOR`).
- Guardrails: cannot demote self below `SUPER_ADMIN`; cannot remove the last `SUPER_ADMIN`.

On **production** (`https://mototwin.space/admin`), sign in with an account that already has `adminRole`, then use `/admin/settings` — no direct DB edits required.

`src/app/admin/layout.tsx` runs `getAdminContext()` and renders `AdminAccessGuard` for unauthorized users — Next.js 16 `proxy.ts` is **not** used because edge runtime cannot do Prisma queries.

## 4. Audit log

Every mutating action calls `logAdminAction()` (`src/lib/admin-audit.ts`) which writes to `AdminAuditLog` with:

- `actorId`, `action` (dot-namespaced like `part.merge`, `support.change`, `import.commit`),
- `entityType` + `entityId`,
- `before` / `after` snapshots (Prisma `Json`),
- `reason` (free text supplied by the operator), `importBatchId`, `ip`, `userAgent`.

The `/admin/audit` page exposes filtering by action, actor, and entity type with deep-links into the related entity pages.

## 5. Bulk imports

`src/lib/admin-imports.ts` covers the full lifecycle:

1. **Upload** (`POST /api/admin/imports`) — parses CSV/TSV via Papaparse and XLSX via SheetJS in-memory (max 8 MB), persists rows to `ImportBatchRow`.
2. **Dry-run** (`POST /api/admin/imports/[id]/dry-run`) — validates each row, marks `action`, `status`, `errorMessage`, returns aggregate `summary`.
3. **Commit** (`POST /api/admin/imports/[id]/commit`) — applies rows transactionally per row; sets `mappedEntityId`.
4. **Rollback** (`POST /api/admin/imports/[id]/rollback`) — SUPER_ADMIN only; deletes entities created by this batch when they have no dependents.

Currently supported types in MVP v1: `PARTS`, `PART_ALIASES`. Other `ImportBatchType` values create the batch but display "В планах" in the wizard.

Expected columns:

- `PARTS`: `brand`, `sku`, `title`, plus optional `subcategory`, `description`, `imageUrl`.
- `PART_ALIASES`: `brand`, `sku`, `alias` — looks up the `PartMaster` by brand+sku and adds `PartAlias`.

## 6. Caching and refresh

- `src/lib/admin-cache.ts` defines stable `ADMIN_CACHE_TAGS` and revalidate windows.
- `src/app/admin/actions.ts` exposes `revalidateAdminAction(path)` (server action) — used by the dashboard's **«Обновить»** button.
- High-impact mutations call `revalidatePath` / `revalidateTag` directly:
  - `/api/admin/moderation/action` flushes dashboard work-queue + KPI tags.
  - `/api/admin/models/[id]/support-level` revalidates `/admin/models` and the dashboard.
  - `/api/admin/parts/[id]/merge` revalidates both catalog pages involved.

## 7. UI conventions

- All admin pages share `AdminPageChrome` (top bar + content) and use the `productSemanticColors` design tokens.
- Tables use `@tanstack/react-table` v8 wrapped in `AdminDataTable`.
- Filter bars (`AdminFilterBar`) sync state to URL search params so deep-links + browser back work.
- Charts use Recharts (`Sparkline`, `FitmentQualityDonut`, `ActivitySignalsChart`).
- Skeleton (`/admin/loading.tsx`) renders during route transitions; a global `error.tsx` catches render errors and offers a Reset.
- Localization passes through `src/app/admin/_locales/ru.ts` (`ruAdmin`) — wrap visible strings in `t(...)` once English support is added.

## 8. What's next (post-MVP backlog)

- Real visualization of the «8-step» import wizard (mapping step + preview before persisting rows).
- Import types beyond PARTS/PART_ALIASES.
- Notification editor (currently stub).
- Stripe-aware subscriptions admin (currently aggregate counts only).
- Pagination controls (currently URL-only `?page=`).
- Empty-state illustrations / nicer 0-result states.
- `unstable_cache` for the dashboard loaders (already grouped under `admin-cache.ts`).
