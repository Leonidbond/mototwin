# Mobile audit — OWASP Mobile Top 10 (2024) + MASVS L1

Скоуп: [`apps/app/`](../../apps/app/) — Expo 54 + Expo Router. Включая `app/`, `src/`, `app.config.ts`, `app.json`, `eas.json`, `metro.config.js`, `ios/`.

Полный реестр находок — [findings.md](./findings.md). Здесь — разбор по 10 категориям OWASP Mobile с верификацией и evidence.

## M1:2024 — Improper Credential Usage

**Вердикт:** хранение токенов — корректное (через `expo-secure-store`), но в логике expiry есть баг.

- Токены пишутся через [auth-storage.ts:33-40](../../apps/app/src/auth-storage.ts) — `SecureStore.setItemAsync` (iOS Keychain / Android Keystore). Хорошо.
- Чтение/кэширование в process memory `memoryTokens` — допустимо, но **`MT-SEC-018`** (P2): при ошибке `SecureStore.deleteItemAsync` (см. `clearAuthTokens`, [auth-storage.ts:42-48](../../apps/app/src/auth-storage.ts)) кэш всё же обнуляется до записи (`memoryTokens = null` стоит до `try`), так что в памяти токен не задержится. Но обработка ошибки `catch {}` (молчаливо) — теряем сигнал «токены не были стерты из Keychain», и при последующем `readAuthTokens` они снова всплывают. Это deferred token leak на устройстве с сбоящим Keychain — низкий риск.
- **`MT-SEC-007`** (P1) — `getAccessToken` ([auth-storage.ts:51-61](../../apps/app/src/auth-storage.ts)) логика истечения **сломана**:
  ```ts
  export async function getAccessToken(): Promise<string | null> {
    const tokens = await readAuthTokens();
    if (!tokens) return null;
    const expiresAt = Date.parse(tokens.expiresAt);
    if (Number.isFinite(expiresAt) && expiresAt > Date.now() + 30_000) {
      return tokens.accessToken;
    }
    return tokens.accessToken;  // ← always returns token, even if expired
  }
  ```
  Обе ветки возвращают `tokens.accessToken` — проверка expiry бессмысленна. Последствия:
  - истёкший access token уезжает в API запросах, ожидаемо получает 401;
  - `refreshMobileSessionIfNeeded` в `_layout.tsx:42-43` ([apps/app/app/_layout.tsx](../../apps/app/app/_layout.tsx)) делает refresh **до** запроса, **в обход** этой проверки, поэтому в обычном app flow это маскируется;
  - но фоновые операции (например, ответ на push-нотификацию) могут вызвать API без предварительного refresh.

  Это **логический баг** с риском утечки в логи протухших токенов и лишних 401-circles. Promote to P1.

## M2:2024 — Inadequate Supply Chain Security

**Вердикт:** вне скоупа итерации (`scope:supply-chain`), но зафиксировано:

- `apps/app/package.json` использует workspace-references на `@mototwin/*` через `file:../../packages/*` — нет внешней supply chain для shared-кода.
- `expo: "^54.0.33"` с `overrides` в [package.json:78-81](../../package.json) — pin `expo: 54.0.33` и `expo-modules-core: 3.0.29` — хорошо для воспроизводимости.
- `@expo/ngrok` в `devDependencies` — только для `expo start --tunnel`, в release-сборке не нужен.
- EAS-сборка ([eas.json](../../apps/app/eas.json)) использует remote `appVersionSource` и фиксирует `EXPO_PUBLIC_API_BASE_URL=https://beta.mototwin.ru` для `preview` и `production` — корректно (см. M5).

Связано: **`MT-SEC-052`**, **`MT-SEC-053`**.

## M3:2024 — Insecure Authentication / Authorization

**Вердикт:** mobile auth-flow на сервере достаточно прочный, но клиент использует устаревший implicit-grant для Yandex, и нет PKCE-проверки.

- **`MT-SEC-001`** (P0) — Yandex audience не проверяется на сервере; на клиенте мы получаем access token через implicit flow и отдаём серверу. Сервер должен **отказать** в незнакомом audience — см. API-разбор.
- **`MT-SEC-010`** (P1) — клиент использует `ResponseType.Token` (implicit) для Yandex ([login.tsx:48](../../apps/app/app/login.tsx)). Access token попадает в redirect URI (`mototwin://oauth/yandex`) и потенциально в системные логи Browser-Tab / inter-app intent. Code+PKCE предпочтительнее.
- **`MT-SEC-003`** (P1) — Apple Sign-In без nonce: клиент не передаёт `nonce` в [login.tsx:211-216](../../apps/app/app/login.tsx), сервер не сверяет ([oauth-mobile.ts:62-65](../../src/lib/auth/oauth-mobile.ts)) — replay window.
- Mobile login через `email/password` и `register` — те же ручки, что у web; **`MT-SEC-002`** (нет rate limit) применим.
- Refresh-flow: [create-mobile-api-client.ts:23-45](../../apps/app/src/create-mobile-api-client.ts) — ротирует токены через `/api/auth/refresh`, при ошибке выкидывает в `/login`. Корректно.
- **`MT-SEC-057`** (P2) — нет biometric-gate на запуск приложения. При утере разблокированного устройства атакующий получает доступ к API (токены в SecureStore с дефолтным `WHEN_UNLOCKED`).

## M4:2024 — Insufficient Input / Output Validation

**Вердикт:** в скоупе мобайла — низкий риск.

- Deep link scheme `mototwin://` зарегистрирован в [app.json:5](../../apps/app/app.json). Используется Expo Router для маршрутизации; параметры URL парсятся как сегменты роутов (zod-валидация на сторону роутов есть в нескольких местах, но это product-level).
- Notifications deep link: в [_layout.tsx:64-69](../../apps/app/app/_layout.tsx) `actionUrl`/`url` из push-payload берётся, проверяется `startsWith("/")` и **только тогда** `router.push`. Это защита от open redirect на внешние URL — хорошо.
- Сетевые ответы от backend — типизированы через `@mototwin/api-client` и используются как `any` в нескольких местах ([login.tsx](../../apps/app/app/login.tsx)) — это product-issue, не security.

## M5:2024 — Insecure Communication

**Вердикт:** dev cleartext `http://lan-ip:3000` используется только в dev; release-сборка через EAS форсит `https://beta.mototwin.ru` — корректно.

- [eas.json:8-10, 13-15](../../apps/app/eas.json) — `preview` и `production` builds задают `EXPO_PUBLIC_API_BASE_URL=https://beta.mototwin.ru`.
- [api-base-url.ts](../../apps/app/src/api-base-url.ts) — приоритет: `EXPO_PUBLIC_API_BASE_URL > Metro hostUri > expo.extra.devApiBaseUrl > localhost`. В release-сборке `EXPO_PUBLIC_API_BASE_URL` определён, остальное не задействуется.
- [app.config.ts:62-66](../../apps/app/app.config.ts) — `shouldEmbedDevApiBaseUrl()` возвращает `false` для `EAS_BUILD=true` или `NODE_ENV=production`. Это **критично**, чтобы dev-IP не утёк в production bundle. Корректно реализовано.
- ATS (iOS) / NetworkSecurityConfig (Android): в [app.json](../../apps/app/app.json) **не заданы** overrides — значит, используются дефолты. iOS дефолт: cleartext запрещён; Android (target SDK 35) — cleartext запрещён. Для dev (Expo Go) — переопределено внутри Expo Go, не наша забота.
- **`MT-SEC-058`** (P2) — нет certificate pinning. Для MASVS L1 не требуется, для L2 — да. На этапе бета-релиза не блокер; зафиксировать.

## M6:2024 — Inadequate Privacy Controls

**Вердикт:** PII в логах не обнаружено в просмотренных файлах; есть точки для hardening.

- В [login.tsx](../../apps/app/app/login.tsx), [auth-storage.ts](../../apps/app/src/auth-storage.ts), [create-mobile-api-client.ts](../../apps/app/src/create-mobile-api-client.ts) — `console.warn`/`console.log` использованы только для fonts ([_layout.tsx:29](../../apps/app/app/_layout.tsx)) и devkit-предупреждения о tunnel-host ([api-base-url.ts:44-49](../../apps/app/src/api-base-url.ts)). PII не логируется.
- **`MT-SEC-059`** (P2) — нет screenshot-блокировки для приватных экранов (`/login`, `/profile`, `/notifications`). На Android можно `FLAG_SECURE` (через `expo-screen-capture` или нативный модуль), на iOS — реакция на `applicationWillResignActive`. На бета-этапе не блокер.
- **`MT-SEC-060`** (P2) — аналитики/трекинга в коде нет — хорошо.

## M7:2024 — Insufficient Binary Protections

**Вердикт:** вне MASVS L1. Зафиксировать как gap для L2.

- Нет jailbreak/root detection.
- Нет obfuscation (Hermes — да; ProGuard на Android — конфигурируется EAS).
- **`MT-SEC-061`** (P2) — для L2 потребуется детектор jailbreak и app-integrity check (DeviceCheck / Play Integrity).

## M8:2024 — Security Misconfiguration

**Вердикт:** минимальный набор permissions, scheme и app.json — корректно; одно замечание по `projectId`.

- [app.json:14-31](../../apps/app/app.json): scheme `mototwin`, bundle `ru.mototwin.app`, `usesAppleSignIn: true`. Permissions явно не запрашиваются — Expo сам объявит нужные для `expo-notifications` (push), `expo-secure-store` (Keychain) и `expo-apple-authentication` (нативный entitlement).
- **`MT-SEC-062`** (P2) — `"projectId": "REPLACE_AFTER_eas_init"` в [app.json:29](../../apps/app/app.json) — забытый плейсхолдер. Должен быть реальный EAS project ID для production.
- iOS `usesAppleSignIn: true` — корректно для Apple Sign-In.
- Plugins: `expo-router`, `expo-apple-authentication` (в `app.json`); в `app.config.ts` добавлены `@react-native-community/datetimepicker`, `expo-notifications` — список ок.
- Deep link обработка: `actionUrl.startsWith("/")` — защита от внешних redirect (см. M4).

## M9:2024 — Insecure Data Storage

**Вердикт:** токены в SecureStore — корректно; других чувствительных данных не сохраняется.

- [auth-storage.ts:36](../../apps/app/src/auth-storage.ts): `SecureStore.setItemAsync(AUTH_TOKENS_KEY, JSON.stringify(tokens))` — без явного `keychainAccessible` — берётся дефолт `WHEN_UNLOCKED` (доступ только когда устройство разблокировано). Это корректно для большинства сценариев. Если требуется фоновая работа (например, push с access-token-call) — потребуется `AFTER_FIRST_UNLOCK`, но это снижает security.
- **`MT-SEC-063`** (P2) — явно задать `keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY` — лучше дефолта (`WHEN_UNLOCKED`): не синхронизируется в iCloud Keychain.
- Других персистентных данных (AsyncStorage) — не обнаружено в `apps/app/src/`. Файлы `ui-collapsible-preferences.ts`, `ui-dev-user-selection.ts`, `ui-last-viewed-vehicle.ts`, `ui-node-snooze-preferences.ts` — это **UI-state хелперы** (имена). Стоит просканировать содержимое в следующей итерации (записывают ли что-то чувствительное в plain storage). Помечено как **`MT-SEC-064`** (P2).

## M10:2024 — Insufficient Cryptography

**Вердикт:** клиент не делает своей криптографии — всю криптографию ведёт сервер. Risk-accepted.

- Локальной криптографии (encrypt-then-store) нет; все секреты переданы серверу через TLS.
- SecureStore сам использует Keychain/Keystore с симметричной криптой на стороне ОС.

## Сводка по mobile-стриму

| Категория | Состояние | Связанные находки |
|-----------|-----------|-------------------|
| M1 Credential Usage | P1 | `MT-SEC-007`, `MT-SEC-018` |
| M2 Supply Chain | scope:supply-chain | `MT-SEC-052`, `MT-SEC-053` |
| M3 Auth | P0 + P1 | `MT-SEC-001`, `MT-SEC-003`, `MT-SEC-010`, `MT-SEC-057` |
| M4 Input Validation | OK | — |
| M5 Communication | OK + P2 | `MT-SEC-058` |
| M6 Privacy | P2 | `MT-SEC-059`, `MT-SEC-060` |
| M7 Binary Protections | gap для L2 | `MT-SEC-061` |
| M8 Misconfiguration | P2 | `MT-SEC-062` |
| M9 Storage | P2 | `MT-SEC-063`, `MT-SEC-064` |
| M10 Cryptography | OK | — |
