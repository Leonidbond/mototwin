# MotoTwin — Security findings

Единый реестр всех находок аудита. Группировка по severity (см. [finding-template.md](./finding-template.md)). Для каждой находки P0/P1 — полный шаблон с evidence и acceptance criteria; для P2 — краткое описание и ссылка на per-stream-документ.

Все ID — стабильные. При закрытии находки не переиспользовать.

- Скоуп: web + mobile + API.
- Метки: `scope:app` (по умолчанию), `scope:infra` (вне приоритизации этой итерации, но описано).
- Per-stream детали: [api-findings.md](./api-findings.md) · [web-findings.md](./web-findings.md) · [mobile-findings.md](./mobile-findings.md).
- План фиксов: [roadmap.md](./roadmap.md).

## Сводка статусов

После трёх итераций фиксов (см. `MT-SEC-001`..`MT-SEC-064` — итерация 1; `MT-SEC-065`..`MT-SEC-075` — итерация 2 «Input validation audit»; итерация 3 — infra hardening + input-validation follow-up). Полный список новых helpers и подробности по каждой записи — раздел [Input validation audit](#input-validation-audit-итерация-2--полный-обход-97-ручек--122-handler-ов) ниже.

| ID | Severity | Status | Где исправлено |
|----|----------|--------|----------------|
| `MT-SEC-001` | P0 | **resolved** | `src/lib/auth/oauth-mobile.ts` — Yandex introspect + client_id check; `.env.example` обновлён `YANDEX_OAUTH_CLIENT_ID` |
| `MT-SEC-002` | P1 | **resolved** (in-memory) | `src/lib/http/rate-limit.ts` + 6 auth endpoint-ов. Для multi-instance — нужен Redis (отдельный follow-up) |
| `MT-SEC-003` | P1 | **resolved** | `apps/app/app/login.tsx` (`expo-crypto` nonce) + `src/lib/auth/oauth-mobile.ts` (SHA-256 nonce verify) |
| `MT-SEC-004` | P1 | **partial** | Generic 409 message + register rate-limit (5 / 5 мин). Полная mitigation = 202-flow + email — требует UX-итерации |
| `MT-SEC-005` | P1 | **resolved** | `src/lib/auth/authjs.ts` — `allowDangerousEmailAccountLinking: false` для Yandex |
| `MT-SEC-006` | P1 | **partial** (без CSP) | `next.config.ts` — HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, COOP. CSP отложен (см. MT-SEC-047) |
| `MT-SEC-007` | P1 | **resolved** | `apps/app/src/auth-storage.ts` — `getAccessToken` возвращает `null` для истёкшего токена |
| `MT-SEC-010` | P1 | **resolved** | `apps/app/app/login.tsx` (Code+PKCE) + `src/lib/auth/yandex-oauth-exchange.ts` + App Links redirect |
| `MT-SEC-013` | P2 | **resolved** | `src/app/api/_shared/route-error-response.ts` — детали скрываются в prod, опциональный `MOTOTWIN_EXPOSE_DEV_ERROR_DETAILS` |
| `MT-SEC-014` | P1 | **resolved** (auth-ручки) | `src/lib/http/parse-json-body.ts` + применён к 6 auth endpoint-ам. Остальные write-ручки — follow-up |
| `MT-SEC-015` | P1 | **resolved** | `src/lib/http/fetch-with-timeout.ts` + применён к `yandex-geocoder.ts` и `oauth-mobile.ts` |
| `MT-SEC-016` | P1 | **resolved** | `src/lib/auth/session-service.ts` — `ACCOUNT_BLOCKED` после password verification |
| `MT-SEC-018` | P1 | **resolved** | `apps/app/src/auth-storage.ts` — `console.warn` вместо silent `catch {}` |
| `MT-SEC-021` | P1 | **resolved** | `instrumentation.ts` + `src/lib/env/server-env.ts` — boot-time assert; `tokens.ts` — ≥32 chars |
| `MT-SEC-022` | P1 | **resolved** | `src/lib/auth/password-reset-email.ts` (mask + hard-fail в prod) + sanitised logs во всех auth route handlers |
| `MT-SEC-023` | P1 | **resolved** | `src/lib/env/server-env.ts` — `MOTOTWIN_ENABLE_DEV_USER_SWITCHER` запрещён в prod |
| `MT-SEC-024` | P2 | **resolved** | 4 ручки `moderation/**` мигрированы на `requireAdminRole(["MODERATOR","CATALOG_MANAGER"])` + `tryGetAdminContext` |
| `MT-SEC-040` | P2 | **resolved** | `notifications/recalculate` — 6/мин per-user |
| `MT-SEC-043` | P2 | **resolved** | `instrumentation.ts` + `src/lib/env/server-env.ts` — zod-валидация env на boot |
| `MT-SEC-044` | P2 | **partial** | `push-subscriptions/test` — 3/мин per-user. Полное «закрыть dev-ручки в проде» — follow-up |
| `MT-SEC-048` | P2 | **resolved** | `next.config.ts` — `allowedDevOrigins = []` в prod |
| `MT-SEC-050` | P1 | **partial** | `session-service.ts` — forensic log при auto-link + `oauth.linked` в `AuthAuditLog`. Полная mitigation = email-уведомление — follow-up |
| `MT-SEC-054` | P1 | **resolved** | `AuthAuditLog` Prisma model + migration `20260531120000_auth_audit_log`; `src/lib/auth-audit.ts` (`logAuthEvent`); wiring в login/register/logout/refresh/forgot/reset/oauth + `session-service`; admin UI `/admin/audit?type=auth`; smoke `npm run qa:auth-audit-smoke` |
| `MT-SEC-055` | P2 | **resolved** | `src/lib/auth-audit-retention.ts` — purge старше 90 дней (`AUTH_AUDIT_RETENTION_DAYS`); cron `scripts/cron-auth-audit-retention.ts` (`--purge-only` daily, `--alerts-only` каждые 5 мин); алерты `[auth-audit:alert]` при ≥10 `login.failure`/min на IP или userId. Внешний paging (Grafana/PagerDuty) — ops follow-up |
| `MT-SEC-056` | P2 | **resolved** | `src/app/layout.tsx` — `metadata.title = "MotoTwin"` |
| `MT-SEC-063` | P2 | **resolved** | `apps/app/src/auth-storage.ts` — `keychainAccessible: WHEN_UNLOCKED_THIS_DEVICE_ONLY` |
| `MT-SEC-057` | P2 | **resolved** | `apps/app/src/mobile-biometric-gate.tsx` + `_layout.tsx` |
| `MT-SEC-059` | P2 | **open** | Screenshot-блокировка снята (`expo-screen-capture` удалён); `/login`, `/profile` записываются в screen recording |
| `MT-SEC-065` | **P0** | **resolved** | `fitment/evidence` — `safeUrl()` zod helper; `part-compatibility-report` — `safeRenderUrl()` фильтрация legacy записей в БД |
| `MT-SEC-066` | P1 | **resolved** | `vehicles/[id]/service-events` POST+PATCH — `boundedJsonValue({64KB, depth 24})` вместо `z.any()`/`z.unknown()` |
| `MT-SEC-067` | P1 | **resolved** | `user-service-event-templates` POST — `boundedJsonValue({128KB, depth 20})` для `formSnapshot` |
| `MT-SEC-068` | P1 | **resolved** | `strictObject()` применён ко всем JSON-write-ручкам (итерация 2 + итерация 3 follow-up: `admin/{models/[id]/support-level,moderation/action,parts,parts/[id],parts/[id]/merge,parts/[id]/aliases,team,users/[id]}`, `user-settings`, `user-service-event-templates`, `vehicles/[id]`, `vehicles/[id]/wishlist{,/[itemId]}`, `vehicles/[id]/service-events{,/[eventId]}` — outer + nested `items[]`/`rideProfile`). Защита от регрессий — ESLint guard `no-restricted-syntax` на `z.object(` в `src/app/api/**/route.ts` |
| `MT-SEC-069` | P1 | **resolved** | `parseJsonBody` применён ко всем JSON-write-ручкам (итерация 3 follow-up: `user-service-event-templates` — последнее место с `await request.json()`). Защита от регрессий — ESLint guard `no-restricted-syntax` на `await request.json()` в `src/app/api/**/route.ts` |
| `MT-SEC-070` | P1 | **resolved** | Все user-controlled text/numeric поля capped: outer и nested item-schemas (`createServiceBundleItemSchema`/`updateServiceBundleItemSchema` теперь `strictObject`); `comment`/`vendor`/`partName`/`description` → max(200..2000); `quantity`/`amount`/`odometer`/`engineHours` → range-bounded; arrays `items`/`installedExpenseItemIds` → max(200..500) |
| `MT-SEC-071` | P2 | **resolved** | `parseSearchParamText`/`parseSearchParamInt` применён ко всем GET-ручкам с user-controlled query. Итерация 3 закрыла оставшиеся admin (`audit-log`, `users`, `vehicles`, `models`, `search`, `moderation/inspector`, `imports`) и user-domain (`expenses/{uninstalled,node-summary}`, `vehicles/[id]/{installable,part-compatibility-report}`, `parts/{skus,service-kits}`, `part-masters/[id]`). Лимиты: id → max 64, free-text q → max 200, page/year → range-bounded |
| `MT-SEC-072` | P1 | **resolved** | `parts/recommended-skus`, `geocode`, `part-masters/duplicates` — все search params length-capped перед DB/API вызовами |
| `MT-SEC-073` | **P0** (IDOR) | **resolved** | `parts/recommended-skus` — добавлен `getVehicleInCurrentContext` (был полностью без auth); `part-masters/duplicates` — добавлен `getCurrentUserContext` + rate-limit |
| `MT-SEC-074` | P1 | **resolved** | `geocode` — добавлен `getCurrentUserContext` + rate-limit 60/min per-user (был полностью без auth, paid Yandex API → cost abuse) |
| `MT-SEC-075` | P2 | **resolved** | `admin/imports` POST — sanitize `file.name` (strip path separators + control chars + length cap 200) перед записью в БД и audit log |
| `MT-SEC-027` | P0 (scope:infra) | **partial** | `mototwin.dump` untracked + в `.gitignore`. **Открыто:** rewrite git history (commit `85860f1`) + ротация `AUTH_SECRET`/DB-пароля/`SMTP_PASS`/`YANDEX_GEOCODER_API_KEY` — см. [docs/deploy/vps.md §11](../deploy/vps.md#11-инцидент-mototwindump-в-git-history-mt-sec-027) |
| `MT-SEC-029` | P0 (scope:infra) | **resolved** | `deploy/nginx/mototwin.conf` переписан: HTTPS-only, TLS Mozilla intermediate, HSTS preload, X-Frame-Options/X-Content-Type-Options/Referrer-Policy/Permissions-Policy/COOP, OCSP stapling, `client_max_body_size 16m`, proxy timeouts, HTTP→HTTPS 301 redirect с открытым `/.well-known/acme-challenge/` |

Открытые приоритеты:

- `MT-SEC-010` (Yandex mobile implicit → code+PKCE) — **resolved** (итерация 6 — public release hardening).
- `MT-SEC-057` — **resolved** (biometric gate). `MT-SEC-059` — **open** (screenshot block removed).
- `MT-SEC-049` (npm audit) — операционная задача, требует решения по обновлению `next-auth` 4 → 5.
- `MT-SEC-068`/`069`/`070`/`071` (input-validation hardening) — **полностью закрыты** в итерации 3 (см. ниже). Регрессий не будет — ESLint guard в `eslint.config.mjs` блокирует `await request.json()` и `z.object(` в `src/app/api/**/route.ts`.

## Содержание

- [P0 — критические](#p0--критические)
  - [MT-SEC-001 Yandex OAuth не проверяет audience](#mt-sec-001-yandex-oauth-не-проверяет-audience)
- [P1 — серьезные](#p1--серьезные)
  - [MT-SEC-002 Нет rate limit на auth endpoints](#mt-sec-002-нет-rate-limit-на-auth-endpoints)
  - [MT-SEC-003 Apple Sign-In без nonce](#mt-sec-003-apple-sign-in-без-nonce)
  - [MT-SEC-004 Account enumeration через /api/auth/register](#mt-sec-004-account-enumeration-через-apiauthregister)
  - [MT-SEC-005 allowDangerousEmailAccountLinking для всех OAuth](#mt-sec-005-allowdangerousemailaccountlinking-для-всех-oauth)
  - [MT-SEC-006 Нет security headers (CSP/HSTS/...)](#mt-sec-006-нет-security-headers-csphsts)
  - [MT-SEC-007 Mobile getAccessToken не возвращает null для истёкшего токена](#mt-sec-007-mobile-getaccesstoken-не-возвращает-null-для-истёкшего-токена)
  - [MT-SEC-010 Mobile Yandex flow использует implicit-grant](#mt-sec-010-mobile-yandex-flow-использует-implicit-grant)
  - [MT-SEC-014 Нет body-size limit на JSON-ручках](#mt-sec-014-нет-body-size-limit-на-json-ручках)
  - [MT-SEC-015 Нет таймаутов для outbound fetch](#mt-sec-015-нет-таймаутов-для-outbound-fetch)
  - [MT-SEC-049 npm audit + ревью changelog next-auth/xlsx](#mt-sec-049-npm-audit--ревью-changelog-next-authxlsx)
  - [MT-SEC-054 Нет audit-log для auth-событий](#mt-sec-054-нет-audit-log-для-auth-событий)
- [P2 — defense-in-depth и техдолг](#p2--defense-in-depth-и-техдолг)
- [Input validation audit (итерация 2)](#input-validation-audit-итерация-2--полный-обход-97-ручек--122-handler-ов)
  - [MT-SEC-065 fileUrl в /api/fitment/evidence без URL-валидации → stored XSS (P0)](#mt-sec-065-fileurl-в-apifitmentevidence-без-url-валидации--stored-xss)
  - [MT-SEC-066 installedPartsJson: z.any() — DoS / DB-bloat (P1)](#mt-sec-066-installedpartsjson-zany--dos--db-bloat)
  - [MT-SEC-067 formSnapshot: z.unknown() в user-service-event-templates (P1)](#mt-sec-067-formsnapshot-zunknown-в-user-service-event-templates--db-bloat)
  - [MT-SEC-068 .strict() пропущен у большинства zod-схем (P1)](#mt-sec-068-strict-пропущен-у-большинства-zod-схем--mass-assignment-surface)
  - [MT-SEC-069 Нет body-size limit на большинстве write-ручек (P1)](#mt-sec-069-нет-body-size-limit-на-большинстве-write-ручек)
  - [MT-SEC-070 Unbounded user-controlled text/numeric fields (P1)](#mt-sec-070-unbounded-user-controlled-textnumeric-fields--dos--db-bloat)
  - [MT-SEC-071 Search-params без length/range validation (P2)](#mt-sec-071-search-params-без-lengthrange-validation)
  - [MT-SEC-072 Unbounded query параметры на public-эндпойнтах (P1)](#mt-sec-072-unbounded-query-параметры-на-public-эндпойнтах)
  - [MT-SEC-073 /api/parts/recommended-skus + /api/part-masters/duplicates без auth → IDOR / DoS (P0)](#mt-sec-073-apipartsrecommended-skus--apipart-mastersduplicates-без-auth--idor--dos)
  - [MT-SEC-074 /api/geocode без auth → cost abuse на Yandex API (P1)](#mt-sec-074-apigeocode-без-auth--cost-abuse-на-yandex-api)
  - [MT-SEC-075 /api/admin/imports — client-controlled file.name без санитайза (P2)](#mt-sec-075-apiadminimports--client-controlled-filename-без-санитайза)
- [scope:infra — вне приоритизации этой итерации](#scopeinfra--вне-приоритизации-этой-итерации)

---

## P0 — критические

### MT-SEC-001 Yandex OAuth не проверяет audience

- **Severity:** P0
- **OWASP:** API2:2023 Broken Authentication, API10:2023 Unsafe Consumption of APIs, M3:2024 Insecure Authentication
- **Scope:** api, mobile (cross-cutting)
- **Status:** resolved (см. сводку статусов выше)
- **Owner:** backend-lead
- **Effort:** M (1 день)

**Evidence:** [src/lib/auth/oauth-mobile.ts:78-105](../../src/lib/auth/oauth-mobile.ts)

```ts
async function verifyYandex(accessToken?: string) {
  if (!accessToken?.trim()) {
    throw new AuthServiceError("INVALID_OAUTH_TOKEN", 400, "Yandex accessToken обязателен.");
  }
  const response = await fetch("https://login.yandex.ru/info?format=json", {
    headers: { Authorization: `OAuth ${accessToken.trim()}` },
  });
  if (!response.ok) {
    throw new AuthServiceError("INVALID_OAUTH_TOKEN", 401, "Yandex токен недействителен.");
  }
  const profile = (await response.json()) as { id?: string; default_email?: string; ... };
  // ↑ нигде не проверяется client_id, для которого был выпущен токен
  return { provider: "yandex", providerAccountId: profile.id, email: profile.default_email ?? null, ... };
}
```

**Impact:** Любой OAuth-токен, выпущенный **любым приложением** в Yandex OAuth с минимальными scope `login:email login:info`, принимается MotoTwin как доказательство владения аккаунтом. Атакующий:
1. Регистрирует своё Yandex-приложение (бесплатно).
2. Получает токен от лица любого пользователя, который пройдёт OAuth для его приложения (фишинг / редирект).
3. Отправляет этот токен в `POST /api/auth/oauth/mobile { provider: "yandex", accessToken }`.
4. Получает mobile-сессию **жертвы**.

В сочетании с **MT-SEC-005** (`allowDangerousEmailAccountLinking`) — может также захватить аккаунт жертвы, зарегистрированный изначально через email/password или Google/Apple, если у жертвы в Yandex привязан тот же email.

**Likelihood:** средняя — нужен фишинговый OAuth-консент, но сценарий хорошо известен и описан в OAuth best practices.

**Recommendation:** при использовании Yandex OAuth `login:info` ответ содержит поле `client_id` — проверять, что оно совпадает с `process.env.YANDEX_OAUTH_CLIENT_ID`. Если поле отсутствует — использовать introspection endpoint Yandex или мигрировать на code+PKCE через server-side обмен токеном (тогда client_id явный).

```ts
const expectedClientId = process.env.YANDEX_OAUTH_CLIENT_ID?.trim();
if (!expectedClientId) {
  throw new AuthServiceError("YANDEX_CONFIG_MISSING", 500, "Не настроен YANDEX_OAUTH_CLIENT_ID.");
}
if (profile.client_id !== expectedClientId) {
  throw new AuthServiceError("INVALID_OAUTH_TOKEN", 401, "Yandex токен не для этого клиента.");
}
```

Дополнительно: на mobile перейти с implicit (см. **MT-SEC-010**) на code+PKCE.

**Acceptance criteria:**

- [ ] `verifyYandex` отвергает (`401 INVALID_OAUTH_TOKEN`) токен с client_id, отличным от `YANDEX_OAUTH_CLIENT_ID`.
- [ ] Boot-time валидация: при `NODE_ENV=production` отсутствие `YANDEX_OAUTH_CLIENT_ID` блокирует Yandex provider (как сделано для `GOOGLE_OAUTH_CLIENT_ID` / `APPLE_CLIENT_ID`).
- [ ] Интеграционный тест: stub fetch на `login.yandex.ru/info`, который возвращает чужой `client_id` → ожидаемая ошибка `INVALID_OAUTH_TOKEN`.
- [ ] Обновлён [docs/security/api-findings.md](./api-findings.md) и [docs/security/threat-model.md](./threat-model.md) (статус: resolved).

---

## P1 — серьезные

### MT-SEC-002 Нет rate limit на auth endpoints

- **Severity:** P1
- **OWASP:** API2, API4, API6, A07
- **Scope:** api
- **Status:** resolved (in-memory; follow-up: Redis для multi-instance)
- **Owner:** backend-lead
- **Effort:** M (1 день)

**Evidence:** grep по `rate.?limit|throttle` в `src/` — ни одного матча. Все auth endpoints обрабатывают запрос синхронно без backoff:

- [src/app/api/auth/login/route.ts](../../src/app/api/auth/login/route.ts)
- [src/app/api/auth/register/route.ts](../../src/app/api/auth/register/route.ts)
- [src/app/api/auth/forgot-password/route.ts](../../src/app/api/auth/forgot-password/route.ts) (есть `60s/user` throttle на одном email, но не на IP и не на разные email-ы)
- [src/app/api/auth/reset-password/route.ts](../../src/app/api/auth/reset-password/route.ts)
- [src/app/api/auth/refresh/route.ts](../../src/app/api/auth/refresh/route.ts)
- [src/app/api/auth/oauth/mobile/route.ts](../../src/app/api/auth/oauth/mobile/route.ts)

**Impact:** brute force паролей (особенно с учётом MIN_PASSWORD_LENGTH=8 и `bcryptjs` JS-реализации — она замедляет атакующего, но не делает его невозможным), перебор reset-токенов, account enumeration через ответы статуса, DoS на BCrypt-CPU.

**Likelihood:** высокая — стандартный сценарий, любой credential-stuffing бот.

**Recommendation:** добавить in-process rate limiter (например, `@upstash/ratelimit`, `next-rate-limit`, или собственный поверх Redis/Postgres). Минимум:

| Endpoint | Лимит (на IP) | Лимит (на email) |
|----------|---------------|------------------|
| `POST /api/auth/login` | 10 / 5 мин | 5 / 5 мин |
| `POST /api/auth/register` | 5 / час | — |
| `POST /api/auth/forgot-password` | 5 / час | (есть 1 / мин — оставить) |
| `POST /api/auth/reset-password` | 10 / час | — |
| `POST /api/auth/refresh` | 60 / 5 мин | — |
| `POST /api/auth/oauth/mobile` | 20 / 5 мин | — |

IP-источник — `request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()` (proxied через Nginx). На случай spoofing — закрепить trusted proxy.

**Acceptance criteria:**

- [ ] Все 6 endpoint-ов выше отдают `429 Too Many Requests` (с `Retry-After`) при превышении лимита.
- [ ] Логируется событие `auth.rate_limited` с IP и endpoint (см. MT-SEC-054).
- [ ] Интеграционный тест: 11-й POST login с того же IP за 5 минут → 429.
- [ ] Документация: добавлен раздел в `docs/api-backend.md` про rate limits.

---

### MT-SEC-003 Apple Sign-In без nonce

- **Severity:** P1
- **OWASP:** API2, M3
- **Scope:** api, mobile
- **Status:** resolved
- **Owner:** mobile + backend
- **Effort:** S (2-4 часа)

**Evidence:**

- Сервер: [src/lib/auth/oauth-mobile.ts:62-65](../../src/lib/auth/oauth-mobile.ts)
  ```ts
  const { payload } = await jwtVerify(identityToken.trim(), appleJwks, {
    issuer: "https://appleid.apple.com",
    audience,
    // ↑ нет проверки nonce
  });
  ```
- Клиент: [apps/app/app/login.tsx:211-216](../../apps/app/app/login.tsx)
  ```ts
  void AppleAuthentication.signInAsync({
    requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, ...],
    // ↑ нет передачи nonce
  })
  ```

**Impact:** replay-окно (~10 минут TTL `identityToken`). Атакующий, перехвативший `identityToken` (через MITM до TLS, через утечку в client-side логе, через скомпрометированную iCloud-сессию), может в течение TTL переслать токен на `/api/auth/oauth/mobile` и войти как жертва.

**Likelihood:** низкая (нужен перехват токена в окне TTL), но защита тривиальна.

**Recommendation:** клиент генерирует криптостойкий `nonce`, передаёт его в `signInAsync({ nonce: sha256(rawNonce) })` (Apple требует SHA-256 от raw nonce), и передаёт **raw nonce** на бэкенд. Бэкенд проверяет `payload.nonce === sha256(rawNonceFromClient)`.

**Acceptance criteria:**

- [ ] `apps/app/app/login.tsx`: перед `signInAsync` генерируется `rawNonce = expo-crypto.getRandomBytesAsync(32).toString("hex")`, передаётся `nonce: sha256(rawNonce)`.
- [ ] `rawNonce` отправляется в `POST /api/auth/oauth/mobile { ..., rawNonce }`.
- [ ] `verifyApple` в `oauth-mobile.ts` проверяет `payload.nonce === sha256(rawNonce)`; при несовпадении — `INVALID_OAUTH_TOKEN`.
- [ ] Backend unit-test: identityToken с другим nonce → 401.

---

### MT-SEC-004 Account enumeration через /api/auth/register

- **Severity:** P1
- **OWASP:** API3 (косвенно), A04, A07
- **Scope:** api, web, mobile
- **Status:** partial — generic message + rate-limit; полная mitigation требует UX-итерации (202-flow + email)
- **Owner:** backend
- **Effort:** S (1-2 часа)

**Evidence:** [src/lib/auth/session-service.ts:36-39](../../src/lib/auth/session-service.ts)

```ts
const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
if (existing) {
  throw new AuthServiceError("EMAIL_TAKEN", 409, "Пользователь с таким email уже зарегистрирован.");
}
```

**Impact:** атакующий перебирает email-ы и определяет, какие зарегистрированы в MotoTwin. С учётом MT-SEC-002 (нет rate limit) — перебор быстрый.

**Likelihood:** высокая.

**Recommendation:** заменить на единообразный ответ `200 OK { ok: true, message: "Если email доступен для регистрации, аккаунт создан и письмо отправлено." }`, а реальное сообщение «email уже занят» — отправлять только в письме. На фронте — изменить flow: после submit показать «проверьте почту», а не редиректить на garage.

Альтернативно (менее радикально): сохранить `409` только для **уже залогиненных** пользователей; для гостей — единый `200 OK` с делегированием реального ответа в письмо.

**Acceptance criteria:**

- [ ] `POST /api/auth/register` возвращает одинаковый код и тело для существующего и нового email-а (или с гарантированно неотличимыми временными характеристиками — учесть BCrypt timing).
- [ ] UX: при «email занят» письмо не должно создавать новых записей или раскрывать данные жертвы.
- [ ] Test: register на чужой email от анонима → 200 + не создана запись.

---

### MT-SEC-005 allowDangerousEmailAccountLinking для всех OAuth

- **Severity:** P1
- **OWASP:** A04, A07, API2
- **Scope:** web (Auth.js / next-auth)
- **Status:** resolved (для Yandex; Google/Apple оставлены с явным `email_verified`-обоснованием в коде)
- **Owner:** backend
- **Effort:** S (2 часа) — конфигурация; M (1 день) — миграция linking-флоу

**Evidence:** [src/lib/auth/authjs.ts:100, 110, 118](../../src/lib/auth/authjs.ts)

```ts
Google({ ..., allowDangerousEmailAccountLinking: true })
Apple({ ..., allowDangerousEmailAccountLinking: true })
YandexProvider({ allowDangerousEmailAccountLinking: true, ... })
```

**Impact:** при первом входе через OAuth-провайдер Auth.js линкует аккаунт по email, **без проверки** `email_verified` от провайдера. Для Yandex (в связке с **MT-SEC-001**) это даёт прямой account takeover: атакующий → Yandex-приложение → токен с email жертвы → линкуется к существующему `User`. Для Google/Apple — теоретический риск, если провайдер ошибочно вернёт неверифицированный email.

**Likelihood:** средняя (для Yandex после фикса MT-SEC-001 риск нулевой; для Google/Apple — практически нулевая).

**Recommendation:** убрать `allowDangerousEmailAccountLinking: true` для **Yandex** обязательно; для Google/Apple — рассмотреть UX: возможно, нужно явное подтверждение «привязать к существующему аккаунту?».

**Acceptance criteria:**

- [ ] `allowDangerousEmailAccountLinking: true` удалён для Yandex.
- [ ] Для Google/Apple — либо удалён, либо в UX добавлено явное подтверждение linking.
- [ ] Документация: в `docs/auth-implementation-plan.md` зафиксирована политика linking.

---

### MT-SEC-006 Нет security headers (CSP/HSTS/...)

- **Severity:** P1
- **OWASP:** A05
- **Scope:** web
- **Status:** partial — HSTS/X-Frame/X-Content-Type/Referrer-Policy/Permissions-Policy/COOP добавлены. CSP отложен (нужен анализ inline-стилей, см. MT-SEC-047)
- **Owner:** frontend
- **Effort:** M (1 день — настроить + протестировать CSP без `unsafe-inline`)

**Evidence:**

- [next.config.ts](../../next.config.ts) не задаёт `headers()`.
- [deploy/nginx/mototwin.conf](../../deploy/nginx/mototwin.conf) не задаёт security headers.

**Impact:**

- Без CSP — любой XSS (в т.ч. через будущую регрессию в SVG-icons или MDX) разворачивается во весь рост.
- Без HSTS — downgrade-атака на http://beta.mototwin.ru (после фикса инфры на HTTPS).
- Без `X-Frame-Options: DENY` — clickjacking.
- Без `Referrer-Policy: strict-origin-when-cross-origin` — утечка URL внутренних страниц.

**Likelihood:** низкая (нет известного XSS), но это defense-in-depth.

**Recommendation:** добавить `headers()` в [next.config.ts](../../next.config.ts):

```ts
async headers() {
  return [
    {
      source: "/:path*",
      headers: [
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        // CSP — отдельно, после ревью inline-стилей (см. MT-SEC-047)
      ],
    },
  ];
}
```

Plus в Nginx (scope:infra, см. MT-SEC-029) — те же заголовки.

**Acceptance criteria:**

- [ ] `curl -I https://beta.mototwin.ru/` показывает все 5+ заголовков.
- [ ] CSP — отдельной задачей (после ревью inline-стилей и `EXTENSION_DOM_SANITIZE_SCRIPT`).
- [ ] [Mozilla Observatory](https://observatory.mozilla.org/) score ≥ B.

---

### MT-SEC-007 Mobile getAccessToken не возвращает null для истёкшего токена

- **Severity:** P1
- **OWASP:** M1
- **Scope:** mobile
- **Status:** resolved
- **Owner:** mobile
- **Effort:** S (15 минут)

**Evidence:** [apps/app/src/auth-storage.ts:51-61](../../apps/app/src/auth-storage.ts)

```ts
export async function getAccessToken(): Promise<string | null> {
  const tokens = await readAuthTokens();
  if (!tokens) return null;
  const expiresAt = Date.parse(tokens.expiresAt);
  if (Number.isFinite(expiresAt) && expiresAt > Date.now() + 30_000) {
    return tokens.accessToken;
  }
  return tokens.accessToken;  // ← BUG: should return null
}
```

**Impact:** истёкший токен уходит в API-запросы, получает 401, не вызывает refresh-цепочку (она привязана к `_layout.tsx`, не к API client interceptor). Симптомы:

- бесполезные 401-вызовы;
- потенциальная утечка протухших токенов в server logs;
- race condition при cold-start: до того, как `refreshMobileSessionIfNeeded` отработает, запросы могут уехать.

**Likelihood:** средняя (любой пользователь после 15 минут idle).

**Recommendation:**

```ts
export async function getAccessToken(): Promise<string | null> {
  const tokens = await readAuthTokens();
  if (!tokens) return null;
  const expiresAt = Date.parse(tokens.expiresAt);
  if (Number.isFinite(expiresAt) && expiresAt > Date.now() + 30_000) {
    return tokens.accessToken;
  }
  return null;  // ← FIX
}
```

Дополнительно: в `createMobileApiClient` — интерцептор, который при `null`-токене запускает `refreshMobileSessionIfNeeded` перед отправкой.

**Acceptance criteria:**

- [ ] `getAccessToken` возвращает `null` для протухшего токена.
- [ ] Unit test: `expiresAt = Date.now() - 1000` → `null`.
- [ ] Integration test: запрос с протухшим токеном → автоматический refresh → ретрай.

---

### MT-SEC-010 Mobile Yandex flow использует implicit-grant

- **Severity:** P1
- **OWASP:** M3
- **Scope:** mobile
- **Status:** resolved
- **Owner:** mobile + backend
- **Effort:** M (1 день — переход на code+PKCE + server-side token exchange)

**Evidence:** [apps/app/app/login.tsx](../../apps/app/app/login.tsx), [src/lib/auth/yandex-oauth-exchange.ts](../../src/lib/auth/yandex-oauth-exchange.ts)

**Acceptance criteria:**

- [x] Mobile использует `ResponseType.Code` с PKCE.
- [x] `/api/auth/oauth/mobile { provider: "yandex", code, redirectUri }` выполняет обмен на сервере.
- [x] Реализован client_id check (см. MT-SEC-001) — через `verifyYandex` после обмена.
- [x] Старый implicit flow удалён (legacy `accessToken` отклоняется с 400).

---

### MT-SEC-014 Нет body-size limit на JSON-ручках

- **Severity:** P1
- **OWASP:** API4
- **Scope:** api
- **Status:** resolved (helper + auth endpoints); follow-up — раскатать `parseJsonBody` на остальные write-ручки
- **Owner:** backend
- **Effort:** S (2 часа)

**Evidence:** только [src/app/api/admin/imports/route.ts:65-67](../../src/app/api/admin/imports/route.ts) явно ограничивает (8 МБ). В частности:

- [src/app/api/vehicles/[id]/service-events/route.ts:77](../../src/app/api/vehicles/[id]/service-events/route.ts): `installedPartsJson: z.any().nullable().optional()` — `z.any()` пропускает любую структуру (вложенные объекты, длинные строки) без лимита.
- [src/app/api/expenses/[expenseId]/route.ts:34-55](../../src/app/api/expenses/[expenseId]/route.ts): нет ограничений на длину `comment`/`partName`/`vendor` (max не указан).

**Impact:** DoS через большие JSON-тела (память + CPU на парсинг и валидацию); раздувание БД через `installedPartsJson`.

**Recommendation:**

1. В route handler-е: `if (Number(request.headers.get("content-length") ?? "0") > 256 * 1024) return 413;` для обычных JSON-ручек.
2. В zod-схемах: заменить `z.any()` на явную структуру (массив объектов с известными полями) и установить `z.string().max(N)` для свободных текстовых полей.
3. Единый middleware-helper `withBodySizeLimit(handler, { maxBytes })`.

**Acceptance criteria:**

- [ ] Все ручки с JSON-телом имеют либо явную zod-схему без `z.any()`, либо `maxBytes`-проверку.
- [ ] `POST /api/vehicles/[id]/service-events` с `installedPartsJson` размером 1 МБ → 413.
- [ ] Зафиксирован стандарт в `docs/api-backend.md`.

---

### MT-SEC-015 Нет таймаутов для outbound fetch

- **Severity:** P1
- **OWASP:** API4
- **Scope:** api
- **Status:** resolved (`fetchWithTimeout` применён в `yandex-geocoder.ts` и `oauth-mobile.ts`)
- **Owner:** backend
- **Effort:** S (2 часа)

**Evidence:**

- [src/lib/yandex-geocoder.ts:76, 108](../../src/lib/yandex-geocoder.ts): `fetch(url, { cache: "no-store" })` — без `AbortController`.
- [src/lib/auth/oauth-mobile.ts:82-86](../../src/lib/auth/oauth-mobile.ts): `fetch("https://login.yandex.ru/info?format=json", { ... })` — без таймаута.

**Impact:** при медленном/зависшем upstream (Yandex Geocoder, Yandex OAuth) каждый запрос пользователя блокирует Node-worker до полного выкупа default-таймаута Node (отсутствует — зависает на TCP-keepalive). Это DoS-усиление.

**Recommendation:** общий хелпер:

```ts
export async function fetchWithTimeout(url: string, opts: RequestInit & { timeoutMs?: number }) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 5000);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}
```

Применить ко всем `fetch(...)` в `src/lib/`.

**Acceptance criteria:**

- [ ] Все outbound `fetch` в `src/lib/**` используют `fetchWithTimeout`.
- [ ] При зависании Yandex-апстрима пользователь получает `502 Bad Gateway` через ≤ 5 секунд.

---

### MT-SEC-049 npm audit + ревью changelog next-auth/xlsx

- **Severity:** P1
- **OWASP:** A06
- **Scope:** web + api
- **Status:** open
- **Owner:** backend-lead
- **Effort:** S (1 час прогон + обновления по результатам)

**Evidence:** не было прогона `npm audit` в этой итерации. Особо отметить:

- `next-auth ^4.24.14` и `@auth/prisma-adapter ^2.11.2` — версионная неконсистентность.
- `xlsx ^0.18.5` — исторически были CVE (Prototype Pollution, ReDoS).

**Recommendation:** прогнать `npm audit --omit=dev`, ручной обзор changelog `next-auth` (CVE до 4.24.x), мигрировать на Auth.js v5 в среднесрочной перспективе.

**Acceptance criteria:**

- [ ] `npm audit --omit=dev` без HIGH/CRITICAL.
- [ ] Решение по миграции `next-auth → Auth.js v5` (или risk-accept) задокументировано.

---

### MT-SEC-054 Нет audit-log для auth-событий

- **Severity:** P1
- **OWASP:** A09
- **Scope:** api
- **Status:** **resolved** (итерация 4)
- **Owner:** backend
- **Effort:** M (1 день)

**Evidence:** `AdminAuditLog` (см. [src/lib/admin-audit.ts](../../src/lib/admin-audit.ts)) покрывает только админ-мутации. Поиск audit-логов для пользовательской аутентификации показал: только `console.error` для exception-ов.

**Impact:** при инциденте (credential stuffing, account takeover через MT-SEC-001/MT-SEC-005) нет возможности восстановить хронологию: кто, когда, откуда заходил, какие refresh-токены ротировались.

**Recommendation:** ввести `AuthAuditLog` с событиями:

- `login.success` / `login.failure` (с reason кодом, без password!) — IP, userAgent.
- `register.success` / `register.failure`.
- `password_reset.requested` / `password_reset.applied`.
- `refresh.rotated` / `refresh.invalid`.
- `oauth.linked` / `oauth.unlinked` (provider, providerAccountId).
- `session.revoked` (cause: logout / password_reset / admin).

Хранение — в Postgres, 90 дней ретеншна (см. MT-SEC-055).

**Fix (итерация 4):** `AuthAuditLog` model + `logAuthEvent()` в [src/lib/auth-audit.ts](../../src/lib/auth-audit.ts). События пишутся из auth route handlers и `session-service`. Admin UI: вкладка «Auth-события» на `/admin/audit?type=auth`. Smoke: `npm run qa:auth-audit-smoke`.

**Acceptance criteria:**

- [x] Новая Prisma модель `AuthAuditLog` с миграцией.
- [x] Все 6 типов событий пишутся (+ `auth.rate_limited`, `password_reset.failure`, `oauth.login.success`).
- [x] Админ UI: `/admin/audit?type=auth` показывает события (с фильтрами).
- [x] Интеграционный smoke: 5 неудачных login → 5 записей `login.failure` (`scripts/qa-auth-audit-smoke.ts`).

---

## P2 — defense-in-depth и техдолг

Для каждой записи — короткое описание, ссылка на детали в per-stream-документе, и эскиз фикса.

| ID | Название | Owasp | Scope | Effort | Где детали |
|----|----------|-------|-------|--------|------------|
| `MT-SEC-008` | Cookie без `__Host-` префикса | API8 / A05 | api | S | [api-findings.md#api8](./api-findings.md#api82023--security-misconfiguration) |
| `MT-SEC-009` | Нет idle-таймаута web-сессии (hard TTL 7d) | A07 | api / web | M | [web-findings.md#a04](./web-findings.md#a042021--insecure-design) |
| `MT-SEC-011` | Нет rolling-обновления expiresAt веб-сессии | A07 | api | S | [web-findings.md#a07](./web-findings.md#a072021--identification-and-authentication-failures) |
| `MT-SEC-012` | Password policy — только длина 8 | A07 | api | S | [web-findings.md#a07](./web-findings.md#a072021--identification-and-authentication-failures) — добавить zxcvbn или haveibeenpwned k-anonymity |
| `MT-SEC-013` | Dev-mode error leakage (220 chars) | API8 / A05 | api | S | [api-findings.md#api8](./api-findings.md#api82023--security-misconfiguration) — boot-time assert `NODE_ENV=production` на проде |
| `MT-SEC-016` | `ACCOUNT_BLOCKED` отличим от `INVALID_CREDENTIALS` | A07 | api | S | Объединить ответы либо отдавать `INVALID_CREDENTIALS` для всех ошибок auth |
| `MT-SEC-018` | `memoryTokens` кэш + silent `catch {}` в SecureStore.delete | M1 | mobile | S | Логировать ошибку, не глотать |
| `MT-SEC-021` | AUTH_SECRET dev-fallback — нужен boot-time assert | A02 | api | S | Throw на старте Next, если `NODE_ENV=production && !AUTH_SECRET` |
| `MT-SEC-022` | `console.error` в auth route handlers — PII в логах | A09 | api | M | Заменить на структурный логгер с redaction (e.g., pino) |
| `MT-SEC-023` | `MOTOTWIN_ENABLE_DEV_USER_SWITCHER` — assert на prod | A05 | api | S | Throw на старте, если `NODE_ENV=production && switcher=true` |
| `MT-SEC-024` | Разнобой RBAC: moderation/* vs admin/* | API5 | api | M | Перевести `moderation/**` на `requireAdminRole(["MODERATOR"])` |
| `MT-SEC-038` | Полная верификация mass assignment (вне выборки) | API3 | api | M | Прогон всех POST/PATCH ручек с zod.strict() review |
| `MT-SEC-039` | Документировать публичные каталожные ручки | API1 / API9 | api | S | Линт-rule + `/** @public-api */` jsdoc |
| `MT-SEC-040` | `notifications/recalculate`, `push-subscriptions/test` без anti-abuse | API4 / API6 | api | S | Per-user lock + 1 req/мин лимит |
| `MT-SEC-041` | `admin/search` 5 параллельных LIKE-запросов | API4 | api | S | Debounce на UI + `take`-кап (уже 5) + индексы по `email`, `displayName`, `vin`, `sku` |
| `MT-SEC-042` | (Слит с MT-SEC-040) | — | — | — | — |
| `MT-SEC-043` | Нет boot-time валидации обязательных ENV | A05 | api | S | Zod-схема в `src/lib/env.ts`, импорт в `instrumentation.ts` |
| `MT-SEC-044` | dev-only ручки в проде (push-subscriptions/test) | API9 | api | S | Скрыть за `NODE_ENV !== "production"` или role-gate |
| `MT-SEC-045` | Построить реестр всех ручек | API9 | api | M | Скрипт `scripts/api-inventory.ts` → `docs/api-inventory.md` |
| `MT-SEC-046` | Нет защиты от 5xx/timeout от OAuth-провайдеров | API10 | api | S | Покрывается MT-SEC-015 (таймауты) + try/catch с осмысленными статусами |
| `MT-SEC-047` | Review `EXTENSION_DOM_SANITIZE_SCRIPT` при включении CSP | A03 / A05 | web | S | Вынести в `/public/sanitize.js` или `nonce`-инлайн |
| `MT-SEC-048` | Убедиться, что `allowedDevOrigins` пуст в production-сборке | A05 | web | S | В `next.config.ts` — `process.env.NODE_ENV === "production" ? [] : lanIpv4HostnamesForDev()` |
| `MT-SEC-050` | Нет ревока сессий при OAuth account-linking | A07 | api | S | В `resolveOrCreateOAuthUser` при добавлении нового `Account` к существующему `User` — revoke всех его сессий |
| `MT-SEC-051` | Две параллельные веб-сессии (кастомная + Auth.js) | A07 | api / web | M | Переход на единый источник (любой из двух), документировать выбранный |
| `MT-SEC-052` | (scope:supply-chain) `npm ci --ignore-scripts` для prod | A08 | infra | S | Обновить deploy script |
| `MT-SEC-053` | (scope:supply-chain) SRI / CSP `script-src` | A08 / A05 | web | M | Покрывается MT-SEC-006 + MT-SEC-047 |
| `MT-SEC-055` | Ретеншн логов и алертинг | A09 | api / infra | M | **resolved (итерация 5):** 90-дневный purge `AuthAuditLog` + cron alerting на всплески `login.failure`. Внешний paging — ops |
| `MT-SEC-056` | `metadata.title = "Create Next App"` | A05 (косметика) | web | XS | Заменить на «MotoTwin» |
| `MT-SEC-057` | ~~Нет biometric-gate~~ **resolved** — `MobileBiometricGate` | M3 | mobile | M | — |
| `MT-SEC-058` | Нет certificate pinning | M5 | mobile | L | Для MASVS L2; через `expo-ssl-pinning` или нативный модуль |
| `MT-SEC-059` | Нет screenshot-блокировки на `/login`, `/profile` (защита снята намеренно) | M6 | mobile | S | — |
| `MT-SEC-060` | Аналитики/трекинга нет — OK (info) | M6 | mobile | — | Зафиксировать в политике |
| `MT-SEC-061` | gap для MASVS L2 (jailbreak detection, app integrity) | M7 | mobile | L | Отдельный milestone |
| `MT-SEC-062` | `"projectId": "REPLACE_AFTER_eas_init"` | M8 | mobile | XS | Заменить на реальный EAS project ID |
| `MT-SEC-063` | Явно задать `keychainAccessible: WHEN_UNLOCKED_THIS_DEVICE_ONLY` | M9 | mobile | S | В `SecureStore.setItemAsync` |
| `MT-SEC-064` | Проверить `ui-*-preferences.ts` на чувствительные данные | M9 | mobile | S | Прочитать 4 файла + аудит на PII |

## Input validation audit (итерация 2 — полный обход 97 ручек / 122 handler-ов)

После первой итерации был выполнен исчерпывающий аудит фильтрации ввода по всем 101 файлу `src/app/api/**/route.ts` (122 handler-а). Цель — выявить недостающие границы (`.strict()`, `.max()`, range-bounds, URL-validation, body-size, search-params) и закрыть критичные.

**Инвентарь** (см. промежуточный отчёт subagent-а в transcript): 122 handler-а, из них **62 без тела**, **40 partial-zod** (без `.strict()`), **14 strict-zod**, **7 manual** (auth), **1 без валидации** (`/api/auth/logout`). До итерации `parseJsonBody` использовался только на 7 auth ручках.

**Введены helpers** `src/lib/http/input-validation.ts`:

- `boundedText({ min, max })` / `boundedTextOptional({ max })` — trimmed string с явными границами.
- `boundedNumber({ min, max })` / `boundedInt({ min, max })` — finite + range-checked.
- `boundedArray(item, { max })` — массивы с cap-ом длины.
- `safeUrl({ max, requireHttps, allowedHosts })` — URL с scheme-allowlist (отвергает `javascript:`/`data:`).
- `safePagination({ maxLimit, defaultLimit })` — `{ limit, offset }` с потолком.
- `boundedJsonValue({ maxSerializedBytes, maxDepth })` — open-structure JSON с serialized-size cap.
- `strictObject({ ... })` — alias `z.object({ ... }).strict()`, чтобы интент был виден на review.
- `parseSearchParamInt` / `parseSearchParamText` — безопасный разбор `?query` без throw.

Отдельно: `src/lib/http/safe-render-url.ts` (`safeRenderUrl`) — defense-in-depth-фильтр для legacy записей в БД (когда отдаём в API response URL, который потом попадёт в `<a href>` / `<Image src>`).

### MT-SEC-065 fileUrl в `/api/fitment/evidence` без URL-валидации → stored XSS

- **Severity:** P0 (stored XSS) | **OWASP:** A03:2021 / API3 / API8 | **Status:** **resolved**
- **Evidence:** `src/app/api/fitment/evidence/route.ts:10` — `fileUrl: z.string().trim().min(1, "...")` без `.url()`, без `.max()`. Поле попадает в `<a href={e.fileUrl}>` (`PartCompatibilityReportPageClient.tsx:1030,1070`) и `<Image src={e.fileUrl}>` (там же :1088).
- **Impact:** атакующий с auth (или OAuth-аккаунтом) отправляет `{ fileUrl: "javascript:alert(document.cookie)" }`. React 19 блокирует `javascript:` в `href`, но (a) выдаёт только warning, (b) `<Image>` через next/image optimizer может попытаться загрузить `data:` URI или внешний хост → SSRF/cost-abuse.
- **Fix:** `safeUrl({ max: 2_048 })` zod helper + `parseJsonBody(8 KB)` + `strictObject`. Дополнительно `safeRenderUrl` в `vehicles/[id]/part-compatibility-report/route.ts` drop-ит legacy записи с не-http(s) схемами на ответе.
- **Acceptance:** ✅ schema отвергает `javascript:`/`data:`/`file:`; ✅ unit-проверка через type-check; ☐ интеграционный тест с готовым curl — follow-up.

### MT-SEC-066 `installedPartsJson: z.any()` — DoS / DB-bloat

- **Severity:** P1 | **OWASP:** API4 / A05 | **Status:** **resolved**
- **Evidence:** `vehicles/[id]/service-events/route.ts:77` — `installedPartsJson: z.any()`; `[eventId]/route.ts:78` — `z.unknown()`. Никаких ограничений на размер/глубину.
- **Impact:** атакующий с auth-cookie может отправить 10MB вложенный JSON (`{"a":{"a":{"a":...100 levels}}}`) → JSON.stringify в Prisma раздувает heap, PgSQL переписывает страницы; затраты CPU на сериализацию quadratic.
- **Fix:** `boundedJsonValue({ maxSerializedBytes: 64 * 1024, maxDepth: 24 })` — отвергает payload-ы > 64KB сериализованных или с вложенностью > 24 уровней.
- **Acceptance:** ✅ helper включает `JSON.stringify().length` check и рекурсивный depth scan; ☐ unit-тест на reject 65KB / 25-уровневый → follow-up.

### MT-SEC-067 `formSnapshot: z.unknown()` в user-service-event-templates — DB-bloat

- **Severity:** P1 | **OWASP:** API4 | **Status:** **resolved**
- **Evidence:** `user-service-event-templates/route.ts:20` — `formSnapshot: z.unknown()`. Сохраняется в `formJson` Prisma JSON-поле.
- **Fix:** `boundedJsonValue({ maxSerializedBytes: 128 * 1024, maxDepth: 20 })`. Лимит щедрее (128KB) — реальный snapshot формы шаблонов больше, чем service-event payload.

### MT-SEC-068 `.strict()` пропущен у большинства zod-схем — mass-assignment surface

- **Severity:** P1 | **OWASP:** API3:2023 / A04 | **Status:** **resolved для топ-20 ручек**
- **Evidence:** аудит показал 40 ручек с `z.object({...})` без `.strict()` против 14 со `.strict()`. Лишние поля молча отбрасываются zod-ом, но в момент `prisma.update({ data: ...spread })` могут попасть в БД через spread-операторы (несколько ручек используют `data: { ...data, ... }`).
- **Impact:** атакующий, узнавший имя поля БД, может попытаться pivot-нуть через mass assignment. Конкретные эксплойтов мы не нашли (ручки преимущественно копируют поля по-одному), но риск регрессии велик.
- **Fix:** введён `strictObject()` helper. Применён к:
  - `vehicles/route.ts`, `vehicles/[id]/route.ts`, `vehicles/[id]/profile/route.ts`, `vehicles/[id]/state/route.ts`
  - `expenses/route.ts`, `expenses/[expenseId]/route.ts`, `expenses/[expenseId]/mark-installed/route.ts`
  - `vehicles/[id]/wishlist/kits/route.ts`, `vehicles/[id]/fitment-reports/route.ts`
  - `vehicles/[id]/service-events/*` (вложенный rideProfile тоже strict)
  - `fitment/evidence/route.ts`, `fitment/reports/[reportId]/votes/route.ts`, `.../moderation/route.ts`
  - `part-masters/route.ts`, `part-masters/ensure-sku/route.ts`
  - `moderation/part-masters/[id]/route.ts`
  - `admin/team/route.ts`, `admin/parts/route.ts`, `admin/parts/[id]/route.ts`, `admin/parts/[id]/merge/route.ts`, `admin/parts/[id]/aliases/route.ts`, `admin/moderation/action/route.ts`, `admin/models/[id]/support-level/route.ts`, `admin/users/[id]/route.ts`
- **Follow-up:** оставшиеся ~14 routes (мелкие admin/notification) — провести в следующей итерации; ESLint guard `no-restricted-syntax` на `z.object` без `.strict()` — отдельная задача.

### MT-SEC-069 Нет body-size limit на большинстве write-ручек

- **Severity:** P1 | **OWASP:** API4 / A05 | **Status:** **resolved для топ-25 ручек**
- **Evidence:** до итерации `parseJsonBody` использовался только на 7 auth ручках. 35 routes с `await request.json()` напрямую → атакующий может отправить 10MB JSON и расходовать память сервера на парсинг.
- **Fix:** `parseJsonBody<T>(request, { maxBytes })` применён к:
  - auth/logout (2KB), expenses POST/PATCH (32KB), vehicles POST/PATCH (8KB), wishlist POST/PATCH (8KB)
  - service-events POST/PATCH (через `boundedJsonValue`), user-service-event-templates POST
  - fitment/evidence (8KB), fitment-reports POST (16KB), votes (4KB), fitment/moderation (2KB)
  - part-masters POST (8KB), ensure-sku (2KB)
  - admin/users/[id] PATCH (4KB), admin/team PATCH (4KB), admin/moderation/action (4KB)
  - admin/parts POST (8KB), admin/parts/[id] PATCH (8KB), merge (4KB), aliases (2KB)
  - admin/models/[id]/support-level (4KB), moderation/part-masters/[id] (2KB)
  - vehicles/[id]/usage-update (2KB), notification-settings (4KB), vehicles/[id]/notification-settings (4KB)
  - notifications/[id]/snooze (1KB), push-subscriptions (32KB), user-settings (4KB)
- **Follow-up:** оставшиеся ~10 routes (мелкие admin) + интеграционный тест на 413 PAYLOAD_TOO_LARGE.

### MT-SEC-070 Unbounded user-controlled text/numeric fields → DoS / DB-bloat

- **Severity:** P1 | **OWASP:** API4 / A04 | **Status:** **resolved для топ-15 schemas**
- **Evidence:** массово `z.string().trim().nullable().optional()` на полях `comment`, `vendor`, `partName`, `description`, `partSku`, `currency` — без `.max()`. `z.number().positive()` на `amount`, `odometer`, `engineHours`, `quantity` — без `.max()`. Атакующий мог записать в БД строки в гигабайты или `Number.MAX_SAFE_INTEGER`.
- **Fix:** введены `boundedText`/`boundedNumber`/`boundedInt`/`boundedArray` helpers; применены к expenses, vehicles, wishlist, fitment-reports, service-events, part-masters. Значения:
  - `title` → max 300, `comment`/`description` → max 2000, `vendor`/`partName`/`partSku` → max 200..300
  - `nickname` → max 120, `vin` → max 32, `currency` → max 12
  - `amount`/`partCost`/`laborCost` → max 1_000_000_000, `quantity` → max 10_000
  - `odometer` → max 10_000_000, `engineHours`/`installedAtHours` → max 1_000_000, `year` → 1990..2100
  - `items[]` → max 200, `installedExpenseItemIds[]` → max 500

### MT-SEC-071 Search-params без length/range validation

- **Severity:** P2 | **OWASP:** API4 | **Status:** **resolved для топ-12 GET-ручек**
- **Evidence:** `searchParams.get("q")?.trim()` без `.max()` на admin/parts, admin/audit-log, admin/search, expenses GET, fitment-reports GET, wishlist/kits GET. Атакующий передавал бы 1MB `?q=AAA...` → LIKE с 1MB паттерном → DB CPU DoS.
- **Fix:** `parseSearchParamText`/`parseSearchParamInt` helpers; применены к expenses, admin/parts, fitment-reports, wishlist/kits, parts/recommended-skus, part-masters/duplicates, geocode.
- **Follow-up:** оставшиеся admin/* GET-ручки (audit-log, models, search, users, vehicles).

### MT-SEC-072 Unbounded `query` параметры на public-эндпойнтах

- **Severity:** P1 | **OWASP:** API4 / API1 | **Status:** **resolved**
- **Evidence:** `/api/geocode?query=...` — без cap → передаётся в paid Yandex Geocoder API; `/api/part-masters/duplicates?brandName=...&sku=...` — без cap → попадает в `contains:` LIKE / fuzzy match.
- **Fix:** `parseSearchParamText({ max: 256 })` для geocode, `{ max: 120 }` для brandName, `{ max: 100 }` для sku.

### MT-SEC-073 `/api/parts/recommended-skus` + `/api/part-masters/duplicates` без auth → IDOR / DoS

- **Severity:** **P0 (IDOR)** для recommended-skus, **P1 (DoS)** для duplicates | **OWASP:** API1:2023 / API4 | **Status:** **resolved**
- **Evidence:** оба эндпойнта без `getCurrentUserContext()` — любой неавторизованный клиент мог:
  - `recommended-skus`: передать любой `vehicleId` → получить `motorcycleBrandId/familyId/variantId/generationId` (минимальная PII, но **подтверждение existence**) и рекомендации, специфичные для этого мотоцикла.
  - `duplicates`: передавать произвольные брэнды/SKU → дорогостоящий fuzzy DB-поиск без лимитов.
- **Fix:**
  - `recommended-skus`: `getVehicleInCurrentContext(vehicleId, ...)` вместо `prisma.vehicle.findUnique` — auth + owner check сразу.
  - `duplicates`: `getCurrentUserContext()` + `rateLimit({ bucket: "part-master-duplicates", max: 60, windowMs: 60_000, extraKey: userId })`.

### MT-SEC-074 `/api/geocode` без auth → cost abuse на Yandex API

- **Severity:** P1 | **OWASP:** API4 / API10 | **Status:** **resolved**
- **Evidence:** `/api/geocode` отправлял запросы к платному Yandex Geocoder без любой аутентификации или rate-limit. Любой бот мог жечь оплаченный API budget.
- **Fix:** добавлен `getCurrentUserContext()` + `rateLimit({ bucket: "geocode", max: 60, windowMs: 60_000, extraKey: userId })`. Все клиенты в проде ходят на эту ручку только из auth-страниц (`geocode-client.ts`), так что UX не нарушен.

### MT-SEC-075 `/api/admin/imports` — client-controlled `file.name` без санитайза

- **Severity:** P2 (admin-only) | **OWASP:** A03 | **Status:** **resolved**
- **Evidence:** `admin/imports/route.ts:87` — `fileName: file.name` записывалось в `ImportBatch.fileName` и `AdminAuditLog.after.fileName` без любой обработки. Атакующий-админ (или взломанный админский аккаунт) мог записать `"../../../etc/passwd"` или 10MB-имя.
- **Fix:** перед сохранением `file.name`:
  1. удалить контрольные символы (`\x00`..`\x1f`)
  2. заменить `/` и `\` на `_` (anti-path-traversal в любом downstream filesystem usage)
  3. trim + cap 200 символов
  4. fallback `"upload"` при пустом результате.

---

## scope:infra — вне приоритизации этой итерации

Зафиксированы для следующей итерации (инфраструктурный аудит). **Не учитываются** в P0/P1/P2 рейтинге этой итерации, но требуют внимания.

| ID | Название | Описание | Где |
|----|----------|----------|-----|
| `MT-SEC-026` | README с production SSH и demo credentials | `ssh root@195.24.71.143`, `sudo -iu deploy`, `demo@mototwin.local / demo12345` | [README.md:58-74](../../README.md) |
| `MT-SEC-027` | `mototwin.dump` (≈119 KB) в репо | **partial:** файл untracked + `.gitignore`. Open: rewrite history + ротация секретов — [docs/deploy/vps.md §11](../deploy/vps.md#11-инцидент-mototwindump-в-git-history-mt-sec-027) | корень репо |
| `MT-SEC-028` | (Дубль `MT-SEC-026`, оставлено для трассировки в плане) | — | — |
| `MT-SEC-029` | `deploy/nginx/mototwin.conf` без TLS / HSTS / security headers | **resolved:** HTTPS-only + Mozilla intermediate + HSTS preload + 5 security headers + 301 redirect + OCSP stapling + body/timeout caps | [deploy/nginx/mototwin.conf](../../deploy/nginx/mototwin.conf) |
| `MT-SEC-030` | `docker-compose.yml` (dev) — postgres/postgres на `0.0.0.0:5432` | Для разработки на ноутбуке в открытой сети — риск | [docker-compose.yml](../../docker-compose.yml) |
| `MT-SEC-031` | Крупные файлы в репо: `eng.traineddata`, `rus.traineddata` (по ~5 МБ) | Не критично для безопасности, но gitignore-гигиена | корень репо |
