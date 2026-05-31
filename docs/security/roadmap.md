# MotoTwin — Security roadmap

План фиксов по итогам [security audit](./README.md). Группировка — по приоритету (P0 / P1 / P2 / scope:infra). Подробности по каждой находке — в [findings.md](./findings.md).

## Итерация 1 — что закрыто

| Группа | Что сделано |
|--------|-------------|
| P0 | `MT-SEC-001` — Yandex introspection + audience check |
| P1 auth | `MT-SEC-002` (in-memory rate-limit), `MT-SEC-003` (Apple nonce), `MT-SEC-005` (Yandex linking off), `MT-SEC-016` (порядок ACCOUNT_BLOCKED), `MT-SEC-022` (sanitised logs + masked reset email), `MT-SEC-050` (forensic log on auto-link) |
| P1 web | `MT-SEC-006` (security headers без CSP), `MT-SEC-048` (`allowedDevOrigins=[]` в prod), `MT-SEC-056` (`metadata.title`) |
| P1 api | `MT-SEC-014` (body-size guard), `MT-SEC-015` (`fetchWithTimeout`) |
| P1 mobile | `MT-SEC-007` (`getAccessToken` expiry), `MT-SEC-018` (логировать ошибки SecureStore), `MT-SEC-063` (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`) |
| P2 config | `MT-SEC-013` (dev-error leakage off in prod), `MT-SEC-021` (`AUTH_SECRET` boot assert), `MT-SEC-023` (`MOTOTWIN_ENABLE_DEV_USER_SWITCHER` boot assert), `MT-SEC-043` (zod-валидация env через `instrumentation.ts`) |
| P2 RBAC | `MT-SEC-024` (4 ручки moderation/* через `requireAdminRole`) |
| P2 abuse | `MT-SEC-040` (recalculate 6/min/user), `MT-SEC-044` (push-test 3/min/user) |

## Итерация 3 — Infra hardening + Input-validation follow-up (закрыто)

| Группа | Что сделано |
|--------|-------------|
| **scope:infra P0** | `MT-SEC-029` (resolved) — `deploy/nginx/mototwin.conf` переписан под production: TLS Mozilla intermediate, HSTS preload, HTTP→HTTPS 301 redirect, 5 security headers на edge, OCSP stapling, `client_max_body_size 16m`, proxy timeouts. `docs/deploy/vps.md §5` обновлён с проверочными `curl`-ами. |
| **scope:infra P0** | `MT-SEC-027` (partial) — `mototwin.dump` untracked из git index (`git rm --cached`) + остаётся в `.gitignore`. **Open follow-up (manual):** rewrite git history (commit `85860f1` всё ещё содержит файл) + полная ротация секретов (`AUTH_SECRET`, `DATABASE_URL`, `RESEND_API_KEY`, `YANDEX_GEOCODER_API_KEY`); все active web-сессии и mobile refresh-токены будут инвалидированы после смены `AUTH_SECRET`. Чек-лист — [docs/deploy/vps.md §11](../deploy/vps.md#11-инцидент-mototwindump-в-git-history-mt-sec-027). |
| **scope:infra** | `MT-SEC-026` — по решению владельца пока **не трогаем README**; будет закрыто отдельно. |
| **P1 input-validation** | `MT-SEC-068`/`069`/`070`/`071` — **полностью закрыты**. Закрыто 18 оставшихся handler-ов: `user-service-event-templates` (последнее `await request.json()`), 7 admin GET-ручек (`audit-log`, `users`, `vehicles`, `models`, `search`, `moderation/inspector`, `imports`), 7 user-domain GET-ручек (`expenses/{uninstalled,node-summary}`, `vehicles/[id]/{installable,part-compatibility-report}`, `parts/{skus,service-kits}`, `part-masters/[id]`), service-events outer + nested `items[]` schemas + `vehicles/[id]` nested `rideProfile` — конвертированы на `strictObject`. |
| **P1 regression guard** | `eslint.config.mjs` — добавлен `no-restricted-syntax` guard для `src/app/api/**/route.ts`: запрещены прямой `await request.json()` (надо `parseJsonBody`) и `z.object(` (надо `strictObject` из `@/lib/http/input-validation`). Сообщения линтера ссылаются на MT-SEC-068 / MT-SEC-069. Текущий статус: 0 нарушений. |

## Итерация 2 — Input Validation audit (закрыто)

Системный обход всех 122 handler-ов в `src/app/api/**/route.ts`. Введены переиспользуемые helpers; критичные дыры закрыты.

| Группа | Что сделано |
|--------|-------------|
| **Helpers** | `src/lib/http/input-validation.ts` — `boundedText/Number/Int/Array`, `safeUrl`, `strictObject`, `boundedJsonValue`, `safePagination`, `parseSearchParamInt/Text`. `src/lib/http/safe-render-url.ts` — defense-in-depth фильтр для legacy URL из БД. |
| **P0** | `MT-SEC-065` (stored XSS через `fileUrl` в fitment evidence), `MT-SEC-073` (IDOR + DoS на `parts/recommended-skus` и `part-masters/duplicates` без auth). |
| **P1** | `MT-SEC-066` (`installedPartsJson: z.any()` → bounded JSON), `MT-SEC-067` (`formSnapshot: z.unknown()`), `MT-SEC-068` (топ-20 ручек `.strict()`), `MT-SEC-069` (топ-25 ручек `parseJsonBody`), `MT-SEC-070` (топ-15 schemas — все user-controlled text/numeric capped), `MT-SEC-072` (geocode/duplicates/recommended-skus search params capped), `MT-SEC-074` (`/api/geocode` — auth + rate-limit). |
| **P2** | `MT-SEC-071` (топ-12 GET-ручек search-params validated), `MT-SEC-075` (admin/imports — sanitize `file.name`). |

Что **частично** закрыто (open follow-up):

- ~~`MT-SEC-068`/`069`/`070`/`071`~~ — **закрыто в итерации 3** (см. секцию выше). ESLint guard в `eslint.config.mjs` предотвращает регрессии.
- **Интеграционные тесты** на 413 PAYLOAD_TOO_LARGE и 400 VALIDATION_FAILED — отдельная задача (нужна тест-инфраструктура для route handlers, см. `MT-SEC-019` в роадмапе).

Что **не** закрыто (унаследовано из итерации 1):

- `MT-SEC-004` (register enumeration) — закрыт generic message + rate-limit. Полная mitigation = 202-flow + email.
- `MT-SEC-006` (CSP) — заголовки добавлены, CSP отдельной задачей после ревью inline-стилей (см. `MT-SEC-047`).
- `MT-SEC-010` (Yandex implicit → code+PKCE) — требует client-side refactor login.tsx.
- `MT-SEC-049` (`npm audit`) — операционная задача (решение по `next-auth` 4 → 5).
- ~~`MT-SEC-054` (auth audit-log)~~ — **закрыто в итерации 4**.
- `MT-SEC-002` (multi-instance prod) — текущая реализация работает в одном Node-процессе; для горизонтального масштабирования заменить backend на Redis/Upstash без правки call sites.

## Итерация 5 — Auth audit retention & alerting (закрыто)

| Группа | Что сделано |
|--------|-------------|
| **P2 A09** | `MT-SEC-055` (resolved) — `purgeExpiredAuthAuditLogs()` + `findSuspiciousLoginFailures()` в `src/lib/auth-audit-retention.ts`; cron `scripts/cron-auth-audit-retention.ts` (`npm run cron:auth-audit-{purge,alerts}`); crontab в `docs/deploy/vps.md §8.1`; env knobs в `.env.example`. |

## Итерация 4 — Auth audit log (закрыто)

| Группа | Что сделано |
|--------|-------------|
| **P1 A09** | `MT-SEC-054` (resolved) — `AuthAuditLog` Prisma model + migration; `logAuthEvent()`; wiring во все auth flows; admin UI `/admin/audit?type=auth`; smoke `npm run qa:auth-audit-smoke`. Ретеншн — итерация 5 (`MT-SEC-055`). |

## Принципы приоритизации

- **P0** — фиксить до публичного беты-релиза, релиз заморожен до фикса.
- **P1** — в течение текущего спринта.
- **P2** — техдолг, фиксить по плану.
- **scope:infra** — следующая итерация (аудит инфраструктуры).

Оценки effort: **XS** ≤ 30 минут, **S** ≤ 4 часа, **M** ≤ 1 дня, **L** ≤ 3 дней, **XL** — больше.

---

## 1. P0 — релиз-блокеры

| ID | Название | Effort | Owner | Acceptance |
|----|----------|--------|-------|------------|
| [MT-SEC-001](./findings.md#mt-sec-001-yandex-oauth-не-проверяет-audience) | Yandex OAuth audience-check | M | backend-lead | См. findings.md |

**ETA:** 1-2 дня (с тестами и тегом релиза).

---

## 2. P1 — критичные, в спринт

Сгруппированы в три «пакета», чтобы катить связанные изменения вместе.

### Пакет A — Auth hardening (3-4 дня)

| ID | Название | Effort |
|----|----------|--------|
| [MT-SEC-002](./findings.md#mt-sec-002-нет-rate-limit-на-auth-endpoints) | Rate limit на 6 auth endpoint-ов | M |
| [MT-SEC-003](./findings.md#mt-sec-003-apple-sign-in-без-nonce) | Apple Sign-In nonce | S |
| [MT-SEC-004](./findings.md#mt-sec-004-account-enumeration-через-apiauthregister) | Убрать enumeration на register | S |
| [MT-SEC-005](./findings.md#mt-sec-005-allowdangerousemailaccountlinking-для-всех-oauth) | Убрать `allowDangerousEmailAccountLinking` для Yandex | S |
| [MT-SEC-010](./findings.md#mt-sec-010-mobile-yandex-flow-использует-implicit-grant) | Mobile Yandex → code+PKCE | M |
| [MT-SEC-054](./findings.md#mt-sec-054-нет-audit-log-для-auth-событий) | AuthAuditLog | M |

Acceptance gate пакета: после merge — прогон ручного теста credential stuffing (10 параллельных бот-логинов на один email → 429), Apple replay-attack тест (повторная отправка identityToken → 401).

### Пакет B — API hardening (1-2 дня)

| ID | Название | Effort |
|----|----------|--------|
| [MT-SEC-014](./findings.md#mt-sec-014-нет-body-size-limit-на-json-ручках) | Body size limits | S |
| [MT-SEC-015](./findings.md#mt-sec-015-нет-таймаутов-для-outbound-fetch) | Outbound fetch timeouts | S |

### Пакет C — Web hardening (1 день)

| ID | Название | Effort |
|----|----------|--------|
| [MT-SEC-006](./findings.md#mt-sec-006-нет-security-headers-csphsts) | Security headers (без CSP пока) | M |
| [MT-SEC-049](./findings.md#mt-sec-049-npm-audit--ревью-changelog-next-authxlsx) | `npm audit` + ревью next-auth/xlsx | S |

### Пакет D — Mobile hardening (0.5 дня)

| ID | Название | Effort |
|----|----------|--------|
| [MT-SEC-007](./findings.md#mt-sec-007-mobile-getaccesstoken-не-возвращает-null-для-истёкшего-токена) | Fix `getAccessToken` expiry | S |

**Суммарный ETA по P1:** 6-8 рабочих дней (можно параллелить пакеты A/B/C/D разными ролями).

---

## 3. P2 — техдолг

Сгруппированы по темам. Каждый пункт — отдельный issue с шаблоном [`finding-template.md`](./finding-template.md).

### 3.1 Cookies, sessions, OAuth (M)

- `MT-SEC-008` — `__Host-` префикс на session-cookie.
- `MT-SEC-009` — idle-таймаут web-сессии (rolling refresh).
- `MT-SEC-011` — rolling-update `expiresAt`.
- `MT-SEC-016` — единый ответ для `INVALID_CREDENTIALS` и `ACCOUNT_BLOCKED`.
- `MT-SEC-050` — ревок сессий при OAuth account-linking.
- `MT-SEC-051` — унификация web-сессии (custom vs Auth.js).

### 3.2 Configuration hardening (S)

- `MT-SEC-013` — boot-time assert `NODE_ENV=production`.
- `MT-SEC-021` — boot-time assert `AUTH_SECRET`.
- `MT-SEC-023` — boot-time assert `MOTOTWIN_ENABLE_DEV_USER_SWITCHER !== true` в проде.
- `MT-SEC-043` — централизованная zod-валидация ENV.
- `MT-SEC-048` — `allowedDevOrigins = []` в проде.
- `MT-SEC-056` — заменить `metadata.title`.

### 3.3 RBAC / inventory (M)

- `MT-SEC-024` — унифицировать `moderation/*` под `requireAdminRole(["MODERATOR"])`.
- `MT-SEC-038` — полная верификация mass assignment.
- `MT-SEC-039` — задокументировать публичные каталожные ручки.
- `MT-SEC-044` — закрыть dev-ручки в проде.
- `MT-SEC-045` — реестр всех 97 ручек.

### 3.4 Resource consumption (S)

- `MT-SEC-040` — anti-abuse для `notifications/recalculate` и `push-subscriptions/test`.
- `MT-SEC-041` — debounce и индексы для `admin/search`.

### 3.5 Logging & monitoring (M)

- `MT-SEC-022` — структурный логгер с redaction.
- `MT-SEC-046` — обработка 5xx/timeout от OAuth.
- `MT-SEC-055` — ~~ретеншн логов и алертинг~~ **закрыто в итерации 5**.

### 3.6 Password policy (S)

- `MT-SEC-012` — добавить zxcvbn / haveibeenpwned k-anonymity check.

### 3.7 CSP + frontend (M)

- `MT-SEC-047` — review `EXTENSION_DOM_SANITIZE_SCRIPT` для CSP, затем включить CSP (расширение MT-SEC-006).

### 3.8 Mobile (XS-L)

- `MT-SEC-018` — не глотать ошибку `SecureStore.delete` (S).
- `MT-SEC-057` — biometric-gate на запуск (M).
- `MT-SEC-058` — certificate pinning (L, для MASVS L2).
- `MT-SEC-059` — screenshot-блокировка для `/login`, `/profile` (S).
- `MT-SEC-061` — MASVS L2 (jailbreak detection, app integrity) — L, отдельный milestone.
- `MT-SEC-062` — реальный EAS `projectId` (XS).
- `MT-SEC-063` — `keychainAccessible: WHEN_UNLOCKED_THIS_DEVICE_ONLY` (S).
- `MT-SEC-064` — проверить `ui-*-preferences.ts` на PII (S).

### 3.9 Supply chain (scope:supply-chain, отдельный milestone)

- `MT-SEC-052` — `npm ci --ignore-scripts` для prod-деплоя.
- `MT-SEC-053` — SRI / CSP `script-src`.

---

## 4. Quick wins (≤ 1 час каждый)

Можно сделать одним PR за полдня. Большая часть — копипаст с этого репо.

1. **MT-SEC-007** — поменять `return tokens.accessToken;` на `return null;` в [apps/app/src/auth-storage.ts:60](../../apps/app/src/auth-storage.ts).
2. **MT-SEC-056** — поменять `metadata.title = "Create Next App"` → `"MotoTwin"` в [src/app/layout.tsx:20](../../src/app/layout.tsx).
3. **MT-SEC-062** — заменить `"projectId": "REPLACE_AFTER_eas_init"` на реальный ID в [apps/app/app.json:29](../../apps/app/app.json).
4. **MT-SEC-005** (частично) — убрать `allowDangerousEmailAccountLinking: true` для Yandex в [src/lib/auth/authjs.ts:118](../../src/lib/auth/authjs.ts).
5. **MT-SEC-021** — добавить throw на старте, если `process.env.AUTH_SECRET` пуст в проде.
6. **MT-SEC-023** — добавить throw на старте, если `MOTOTWIN_ENABLE_DEV_USER_SWITCHER=true` в проде.
7. **MT-SEC-048** — `allowedDevOrigins: process.env.NODE_ENV === "production" ? [] : lanIpv4HostnamesForDev()` в [next.config.ts](../../next.config.ts).
8. **MT-SEC-013** — добавить assert `if (NODE_ENV === "production") { ... }` чтобы dev-ответ не утёк.

Эти восемь правок суммарно — половина рабочего дня и сразу уберут несколько P1+P2 атак-векторов.

---

## 5. scope:infra (следующая итерация)

Здесь — пограничные находки, замеченные во время аудита приложения, но требующие инфраструктурного владельца. **Не блокируют** релиз приложения, но критичны для production.

| ID | Название | Severity (predict) | Status / эскиз |
|----|----------|---------------------|----------------|
| `MT-SEC-029` | Nginx без TLS / HSTS / security headers | P0 (для прода) | **resolved** в итерации 3 — `deploy/nginx/mototwin.conf` переписан. |
| `MT-SEC-027` | `mototwin.dump` в репо | P0 (если реальный) | **partial** в итерации 3 — untracked. Open: rewrite history + ротация секретов ([docs/deploy/vps.md §11](../deploy/vps.md#11-инцидент-mototwindump-в-git-history-mt-sec-027)). |
| `MT-SEC-026` | README с SSH-IP + demo credentials | P1 | **open** — по решению владельца отложено. |
| `MT-SEC-030` | docker-compose.yml dev postgres/postgres на `0.0.0.0:5432` | P2 | Поменять на `127.0.0.1:5432` либо использовать `.env` для dev-паролей. |
| `MT-SEC-031` | `eng.traineddata`, `rus.traineddata` (10 МБ суммарно) в репо | P2 (гигиена) | Перенести в Git LFS или внешний bucket. |
| `MT-SEC-052` | (supply-chain) `npm ci --ignore-scripts` для prod | P2 | Обновить `deploy/scripts/deploy-app.sh`. |
| `MT-SEC-053` | (supply-chain) SRI / CSP `script-src` | P2 | После MT-SEC-006/MT-SEC-047. |

---

## 6. Метрики и контрольные точки

Что отслеживать после релиза фиксов:

| Метрика | Цель | Источник |
|---------|------|----------|
| 429 / минуту на `/api/auth/*` | < 50 | server logs |
| Среднее время ответа `/api/auth/oauth/mobile` | < 1.5 сек | server logs |
| % успешных Yandex OAuth с client_id mismatch | 0 | `AuthAuditLog` |
| Failed logins на одного пользователя > 5 / час | алерт | `AuthAuditLog` + alerting |
| `npm audit --omit=dev` HIGH/CRITICAL | 0 | CI (по факту настройки) |
| Mozilla Observatory score для `https://beta.mototwin.ru/` | ≥ B | manual / cron |

## 7. Owner-структура

| Зона | Owner |
|------|-------|
| API (route handlers, lib/auth, lib/admin) | backend-lead |
| Web (страницы, server actions, security headers) | frontend |
| Mobile (apps/app/**) | mobile |
| Infra (Nginx, Docker, VPS) | DevOps (после `scope:infra` итерации) |
| Supply chain (deps, EAS, CI) | backend-lead + DevOps |
| Audit-log policy & retention | backend-lead |

## 8. Definition of Done для security findings

- [ ] Каждая P0/P1 находка закрыта тикетом с acceptance criteria из [findings.md](./findings.md).
- [ ] Покрыта тестом (unit или integration), который красный без фикса и зеленый с фиксом.
- [ ] Обновлён статус в [findings.md](./findings.md) (`open` → `resolved`).
- [ ] При scope:supply-chain или scope:infra — открыт отдельный тикет в соответствующий тред.
- [ ] Релиз с фиксами помечен тегом `security:YYYY-MM-DD` для аудита.
