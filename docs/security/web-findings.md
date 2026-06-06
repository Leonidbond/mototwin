# Web audit — OWASP Top 10 (2021)

Скоуп: страницы и компоненты в [`src/app/`](../../src/app/) (кроме `api/`), [`src/components/`](../../src/components/), серверные actions, общие хелперы вьюшек.

Полный реестр находок — [findings.md](./findings.md). Здесь — разбор по 10 категориям OWASP с верификацией паттернов и evidence.

## A01:2021 — Broken Access Control

**Вердикт:** клиентские страницы корректно гейтятся: `/admin/**` — через layout, `/api/admin/**` — через `requireAdmin*` (см. [api-findings.md API5](./api-findings.md)). User-страницы (`/garage`, `/vehicles/[id]/**`) фетчат данные через `/api/**`, которые сами авторизуют по `getCurrentUserContext`. На страницах нет прямых Prisma-запросов в обход API.

- Admin layout: [src/app/admin/layout.tsx:17-27](../../src/app/admin/layout.tsx) вызывает `await getAdminContext()` и при отказе рендерит `AdminAccessGuard` — это **server-side гейт** (RSC), не клиентский.
- Server action: [src/app/admin/actions.ts:15-16](../../src/app/admin/actions.ts) — `revalidateAdminAction` тоже стартует с `await requireAnyAdmin()`. Это **единственный** server action в репозитории (подтверждено grep `use server`).
- User-страницы — все client-side с `createWebApiClient` → защита API-слоем.

Доп. наблюдение: страница `/login` использует **два пути** — email/password через `POST /api/auth/login` (cookie `mototwin_session`), OAuth-кнопки через Auth.js `signIn("google"|…)` (таблица `authjs_sessions`). Оба резолвятся в `resolveAuthenticatedUserId()`. См. [auth-oauth-production.md](../auth-oauth-production.md).

## A02:2021 — Cryptographic Failures

**Вердикт:** базовая криптография корректная:

- bcrypt(12) для паролей — [password.ts:4, 13-15](../../src/lib/auth/password.ts).
- Все токены хранятся как `sha256(AUTH_SECRET:token)` — [tokens.ts:18-20](../../src/lib/auth/tokens.ts). Сравнение через `findFirst({ tokenHash })` — Prisma уровень БД (timing-safe не критичен для constant-time, т.к. SHA-256 + индекс по PK).
- `AUTH_SECRET` обязателен в проде (см. `MT-SEC-021` — есть dev-fallback, нужен boot-time assert).
- TLS — `scope:infra`: [deploy/nginx/mototwin.conf](../../deploy/nginx/mototwin.conf) сейчас только `listen 80;`. Это критично (см. `MT-SEC-029`), но вне скоупа итерации.

Связанные находки: `MT-SEC-021`, `MT-SEC-029` (scope:infra).

## A03:2021 — Injection

**Вердикт:** SQL injection нет — все `$queryRaw`/`$executeRaw` используют tagged-template плейсхолдеры; XSS-injection нет — `dangerouslySetInnerHTML` применяется только с **константными** строками.

- `$queryRaw` в [src/lib/wishlist-delete-service-log-note.ts:57-80](../../src/lib/wishlist-delete-service-log-note.ts): `vehicleId` и `itemId` подставлены через `${...}` плейсхолдеры (Prisma sanitize) — безопасно.
- `$executeRaw` в [src/lib/service-event-expense-links.ts:62-69](../../src/lib/service-event-expense-links.ts): `${args.odometer}`, `${args.engineHours}`, `${args.vehicleId}`, `Prisma.join(ids)` — все через Prisma helpers — безопасно.
- `dangerouslySetInnerHTML`:
  - [src/app/layout.tsx:48-52](../../src/app/layout.tsx) — встраивает константный `EXTENSION_DOM_SANITIZE_SCRIPT` (см. [extension-dom-sanitize-script.ts](../../src/lib/extension-dom-sanitize-script.ts)); скрипт защищает от хак-расширений (Bitdefender) и не принимает данных от пользователя — безопасно.
  - [src/components/icons/top-nodes/index.tsx:43](../../src/components/icons/top-nodes/index.tsx), [packages/icons/src/top-nodes.ts:23](../../packages/icons/src/top-nodes.ts), [src/app/vehicles/[id]/vehicle-detail-client.tsx:6530](../../src/app/vehicles/[id]/vehicle-detail-client.tsx) — встраивают SVG-body из in-repo icon-пакета. Данные **не** пользовательские — безопасно.
- `eval`, `new Function` — отсутствуют (grep пуст).

Связанные находки: нет. Однако в roadmap имеет смысл добавить **`MT-SEC-047`** (P2) — review `EXTENSION_DOM_SANITIZE_SCRIPT` на CSP-совместимость; при включении CSP `script-src 'self'` его придётся либо в `script-src-elem 'nonce-xxx'`, либо вынести в `/public`.

## A04:2021 — Insecure Design

**Вердикт:** дизайн авторизации в целом продуман (refresh-rotation, revoke-on-password-reset, beta-allowlist), но есть design-level риски в OAuth-цепочке.

- **`MT-SEC-005`** (P1) — `allowDangerousEmailAccountLinking: true` для всех трёх OAuth-провайдеров в web ([authjs.ts:100, 110, 118](../../src/lib/auth/authjs.ts)). Документация Auth.js предупреждает: «If the user’s email at one provider is not verified, this could allow account takeover».
  - Google и Apple возвращают `email_verified` — но Auth.js при `allowDangerous...: true` его не проверяет.
  - Yandex `default_email` берется как есть из ответа `/info`.
- **`MT-SEC-004`** (P1) — register выдает `EMAIL_TAKEN` (account enumeration).
- **`MT-SEC-009`** (P2) — нет idle-таймаута web-сессии: hard TTL 7 дней ([constants.ts:4](../../src/lib/auth/constants.ts)), но `lastUsedAt` не трекается. Долго лежащий ноутбук → session reuse.

## A05:2021 — Security Misconfiguration

**Вердикт:** заметные пробелы — security headers, dev-flags, error leakage.

- **`MT-SEC-006`** (P1) — нет CSP/HSTS/Referrer-Policy/Permissions-Policy/X-Frame-Options/X-Content-Type-Options. [next.config.ts](../../next.config.ts) не задаёт `headers()`. Минимальный набор для production:
  ```
  Content-Security-Policy: default-src 'self'; ... (нужен plan под inline-style из @mototwin/design-tokens)
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  ```
- **`MT-SEC-008`** (P2) — cookie без `__Host-` префикса.
- **`MT-SEC-013`** (P2) — dev-mode error leakage в [route-error-response.ts:66-69](../../src/app/api/_shared/route-error-response.ts) (см. API8).
- **`MT-SEC-023`** (P2) — `MOTOTWIN_ENABLE_DEV_USER_SWITCHER` в `.env.example` — задокументировать «выключено в проде» и assert на старте.
- **`MT-SEC-043`** (P2) — нет валидации обязательных ENV на boot.
- **`MT-SEC-048`** (P2) — `next.config.ts` использует `lanIpv4HostnamesForDev()` для `allowedDevOrigins`. В сборке Next-а это безопасно (только для HMR в dev), но нужно убедиться, что `allowedDevOrigins` пуст в production-сборке.

## A06:2021 — Vulnerable and Outdated Components

**Вердикт:** требует прогона `npm audit` (вне скоупа итерации). Зафиксированы наблюдения:

| Пакет | Версия | Заметки |
|-------|--------|---------|
| `next` | `^16.2.6` | Активная мажорная ветка; следить за патчами безопасности. |
| `react`, `react-dom` | `19.2.4` | Стабильная. |
| `@prisma/client`, `prisma` | `^7.7.0` | Свежая мажорная ветка, проверить changelog по deprecations. |
| `next-auth` | `^4.24.14` | **Расходится** с `@auth/prisma-adapter ^2.11.2` (Auth.js v5-style). Auth.js рекомендует [миграцию на v5](https://authjs.dev/getting-started/migrating-to-v5). |
| `bcryptjs` | `^3.0.3` | JS-реализация bcrypt; работает корректно, но в 10x медленнее `bcrypt` native. При высоких нагрузках login — узкое место (косвенно усугубляет отсутствие rate limit, `MT-SEC-002`). |
| `jose` | `^6.2.3` | Для Apple JWKS — актуальная. |
| `google-auth-library` | `^10.6.2` | Актуальная. |
| `xlsx` | `^0.18.5` | Известная история CVE в SheetJS; используется в `admin/imports` — проверить, что обновлено до фиксов. |

Действие: **`MT-SEC-049`** (P1) — разовый прогон `npm audit --omit=dev` + ручной review changelog `next-auth` и `xlsx` (есть исторические CVE).

## A07:2021 — Identification and Authentication Failures

**Вердикт:** жёсткие TTL, ротация refresh, revoke-on-password-reset — хорошо. Пробелы: rate limit, password policy, account enumeration, idle session.

- **`MT-SEC-002`** (P1) — нет rate limit.
- **`MT-SEC-012`** (P2) — password policy только длина 8 ([password.ts:6-11](../../src/lib/auth/password.ts)). Желательно добавить ban на популярные пароли (zxcvbn / haveibeenpwned k-anonymity), а также длину 12+.
- **`MT-SEC-004`** (P1) — account enumeration на register.
- **`MT-SEC-016`** (P2) — `ACCOUNT_BLOCKED` отличим от `INVALID_CREDENTIALS`.
- **`MT-SEC-009`** (P2) — нет idle-таймаута.
- **`MT-SEC-011`** (P2) — нет rolling-обновления `expiresAt` веб-сессии при активности.
- **`MT-SEC-050`** (P2) — нет ревока сессий при OAuth account-linking: если пользователь привязал Apple/Google к существующему аккаунту, старые refresh-токены жертвы не отзываются.
- **`MT-SEC-051`** (P2) — после успешного login через `signIn("credentials", ...)` Next-Auth выпускает session-cookie с дефолтным именем (`next-auth.session-token` / `authjs.session-token`), а не `mototwin_session`. Это означает, что у web-пользователя могут быть **две независимые сессии одновременно**. Нужно унифицировать.

## A08:2021 — Software and Data Integrity Failures

**Вердикт:** lockfile есть (`package-lock.json`), `postinstall: prisma generate` — стандартно. Подробный supply-chain аудит — вне скоупа итерации.

- **`MT-SEC-052`** (P2, scope:supply-chain) — рекомендуется `npm ci --ignore-scripts` для prod-деплоя и pin transitive deps через `overrides`.
- **`MT-SEC-053`** (P2, scope:supply-chain) — нет проверки `subresource integrity` или CSP `script-src` (см. `MT-SEC-006`).

## A09:2021 — Security Logging and Monitoring Failures

**Вердикт:** `AdminAuditLog` покрывает все мутации админ-панели (хорошо); пользовательские auth-события **не логируются**.

Сильные стороны:
- [logAdminAction](../../src/lib/admin-audit.ts) применяется при блокировке/разблокировке пользователя, импорте, модерации, мерже SKU.
- [admin/audit-log/route.ts](../../src/app/api/admin/audit-log/route.ts) даёт UI для просмотра.

Пробелы:
- **`MT-SEC-022`** (P2) — `console.error` для login/register/oauth — это server-side лог (попадает в stdout VPS), который теоретически может содержать PII в stack trace или сам логировать `error.message` от Prisma с email-ом. Нужно структурное логирование с redaction.
- **`MT-SEC-054`** (P1) — отсутствует audit log для:
  - удачный/неудачный login (без brute-force алерта);
  - смена пароля / сброс;
  - выпуск/ротация refresh-токена;
  - привязка/отвязка OAuth-аккаунта.
- **`MT-SEC-055`** (P2) — **resolved (итерация 5):** 90-дневный purge `AuthAuditLog` + cron alerting на всплески `login.failure`. Внешний paging — ops.

## A10:2021 — Server-Side Request Forgery

**Вердикт:** см. [api-findings.md API7](./api-findings.md) — SSRF нет.

## Дополнительные web-наблюдения

- `metadata.title = "Create Next App"` в [src/app/layout.tsx:20](../../src/app/layout.tsx) — забытый плейсхолдер. **`MT-SEC-056`** (P2, косметика, информ-раскрытие что это Next.js boilerplate).
- На странице `/login` ссылка на `/forgot-password` есть, обработка `nextPath` нормализована (`nextPath.startsWith("/") ? nextPath : "/garage"` в [login/page.tsx:32](../../src/app/login/page.tsx)) — корректно (защита от open redirect через `?next=https://evil.com`).

## Сводка по web-стриму

| Категория | Состояние | Связанные находки |
|-----------|-----------|-------------------|
| A01 Broken Access Control | OK | — (через API) |
| A02 Cryptographic Failures | OK | `MT-SEC-021` |
| A03 Injection | OK | `MT-SEC-047` |
| A04 Insecure Design | Pробелы | `MT-SEC-004`, `MT-SEC-005`, `MT-SEC-009` |
| A05 Security Misconfiguration | Pробелы | `MT-SEC-006`, `MT-SEC-008`, `MT-SEC-013`, `MT-SEC-023`, `MT-SEC-043`, `MT-SEC-048` |
| A06 Vulnerable Components | Требует прогона | `MT-SEC-049` |
| A07 Auth Failures | Pробелы | `MT-SEC-002`, `MT-SEC-004`, `MT-SEC-009`, `MT-SEC-011`, `MT-SEC-012`, `MT-SEC-016`, `MT-SEC-050`, `MT-SEC-051` |
| A08 Integrity | Pробелы (scope:supply-chain) | `MT-SEC-052`, `MT-SEC-053` |
| A09 Logging | Pробелы | `MT-SEC-022`, `MT-SEC-054`, `MT-SEC-055` |
| A10 SSRF | OK | — |
