# OAuth на production (web + mobile)

Канонический чеклист настройки Google / Apple / Yandex для `https://mototwin.space`.

См. также: [auth-web-architecture.md](./auth-web-architecture.md), [auth-implementation-plan.md](./auth-implementation-plan.md), [deploy/vps.md](./deploy/vps.md), [mobile-build.md](./mobile-build.md).

---

## 1. Два разных «whitelist»

| Список | Где | Для чего |
|--------|-----|----------|
| **Google Test users** | Google Cloud Console → OAuth consent screen | Пока приложение в статусе **Testing**, вход через Google разрешён только перечисленным Gmail |
| **`MOTOTWIN_BETA_ALLOWED_EMAILS`** | серверный `.env` | Только **регистрация email+пароль** (`POST /api/auth/register`). **Не блокирует** web OAuth (Google/Apple/Yandex) |

Ошибка на стороне Google («Access blocked», `403 access_denied`) → добавьте Gmail в **Test users** Google Console.  
Ошибка «Регистрация закрыта» на `/register` → добавьте email в **`MOTOTWIN_BETA_ALLOWED_EMAILS`**.

---

## 2. Web: как устроен вход

На `/login` два независимых пути:

| Способ | Клиент | Сессия |
|--------|--------|--------|
| Email + пароль | `POST /api/auth/login` | cookie `mototwin_session` (кастомная) |
| Google / Apple / Yandex | Auth.js `signIn("google" \| "apple" \| "yandex")` | cookie Auth.js + таблица `authjs_sessions` (database strategy) |

Оба пути резолвятся в `resolveAuthenticatedUserId()` — см. [src/lib/auth/request-auth.ts](../src/lib/auth/request-auth.ts).

Auth.js route: `/api/auth/[...nextauth]` → [src/lib/auth/authjs.ts](../src/lib/auth/authjs.ts).

### Мост OAuth → `mototwin_session`

После OAuth Auth.js выставляет **свою** cookie. Web API ожидает **`mototwin_session`** (как при email/password).

1. `AuthSessionProvider` монтирует `WebAuthReadyProvider` ([WebAuthReadyProvider.tsx](../src/components/auth/WebAuthReadyProvider.tsx)).
2. При `useSession().status === "authenticated"` один раз вызывается `GET /api/auth/sync-web-session`.
3. Ответ минтит `mototwin_session` через `attachMototwinSessionCookieIfNeeded`.
4. `POST /api/auth/logout` очищает **обе** семьи cookies (Auth.js chunked + `mototwin_session`).

Подробнее: [auth-web-architecture.md](./auth-web-architecture.md) §2–3.

---

## 3. Серверный `.env` (production)

Файл на VPS: `/opt/mototwin/app/mototwin/.env`. Канонический origin: **`https://mototwin.space`**.

```env
AUTH_SECRET="..."                    # openssl rand -base64 32, ≥32 символов
AUTH_BASE_URL="https://mototwin.space"
NEXTAUTH_URL="https://mototwin.space" # обязателен для redirect_uri в NextAuth v4

# Google (web Auth.js + mobile idToken audience)
AUTH_GOOGLE_CLIENT_ID="....apps.googleusercontent.com"
AUTH_GOOGLE_CLIENT_SECRET="GOCSPX-..."
GOOGLE_OAUTH_CLIENT_ID="....apps.googleusercontent.com"
GOOGLE_ANDROID_OAUTH_CLIENT_ID="....apps.googleusercontent.com"
GOOGLE_IOS_OAUTH_CLIENT_ID="....apps.googleusercontent.com"

# Apple — web: Service ID + JWT secret; mobile: Bundle ID
AUTH_APPLE_CLIENT_ID="ru.mototwin.app.web"   # Service ID из Apple Developer
AUTH_APPLE_CLIENT_SECRET="<JWT из .p8, см. §6>"
APPLE_CLIENT_ID="ru.mototwin.app"            # Bundle ID (iOS native Sign In)

# Yandex — один Client ID для web + mobile (см. §7)
YANDEX_CLIENT_ID="..."
YANDEX_CLIENT_SECRET="..."
YANDEX_OAUTH_CLIENT_ID="..."                 # тот же Client ID, если одно приложение в oauth.yandex.ru
```

Mobile Expo (`apps/app/.env` / `eas.json`):

```env
EXPO_PUBLIC_API_BASE_URL=https://mototwin.space
EXPO_PUBLIC_YANDEX_CLIENT_ID="..."           # = YANDEX_OAUTH_CLIENT_ID
```

После правок: `sudo systemctl restart mototwin`.

Проверка провайдеров:

```bash
curl -s https://mototwin.space/api/auth/providers | jq 'to_entries[] | {id: .value.id, callback: .value.callbackUrl}'
# google, apple, yandex — каждый с https://mototwin.space/api/auth/callback/<provider>
```

---

## 4. Google Cloud Console — web client

**OAuth consent screen**

- Authorized domain: `mototwin.space` (опционально `mototwin.online` — legacy alias с 301 на `.space`)
- В режиме **Testing** → **Test users** → Gmail каждого тестера
- Для публичного доступа без whitelist → **Publish app**

**Credentials → OAuth client ID → Web application**

| Поле | Значение |
|------|----------|
| Authorized JavaScript origins | `https://mototwin.space` |
| Authorized redirect URIs | `https://mototwin.space/api/auth/callback/google` |

Без trailing slash. Только `https://`.

Client ID / Secret → `AUTH_GOOGLE_CLIENT_ID`, `AUTH_GOOGLE_CLIENT_SECRET`, `GOOGLE_OAUTH_CLIENT_ID`.

---

## 5. Google Cloud — mobile clients

Код: [apps/app/app/login.tsx](../apps/app/app/login.tsx), `scheme: mototwin`, `android.package` / `ios.bundleIdentifier`: `ru.mototwin.app`.

Mobile flow **не** использует `/api/auth/callback/google`. Клиент получает `idToken` → `POST /api/auth/oauth/mobile` → access/refresh tokens MotoTwin.

`EXPO_PUBLIC_API_BASE_URL=https://mototwin.space` (без `/` в конце).

### Платформы

| Платформа | Реализация | Env в mobile / EAS | Google Console |
|-----------|------------|-------------------|----------------|
| **Android** | `@react-native-google-signin/google-signin` ([google-native-sign-in.ts](../apps/app/src/google-native-sign-in.ts)) | **`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`** (Web client ID — audience idToken на сервере) | Android client: package `ru.mototwin.app` + **SHA-1** keystore, которым подписан APK |
| **iOS** (EAS / dev build) | `@react-native-google-signin/google-signin` ([google-native-sign-in.ts](../apps/app/src/google-native-sign-in.ts)) | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` + `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | iOS client: Bundle ID `ru.mototwin.app` |
| **iOS** (Expo Go) | Expo AuthSession ([google-oauth-redirect.ts](../apps/app/src/google-oauth-redirect.ts)) | `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` или `EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID` | iOS client + redirect `com.googleusercontent.apps.…:/oauth2redirect` |
| **Expo Go** (dev) | AuthSession | `EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID` + redirect `https://auth.expo.io/@USER/mototwin-app` | Web client (Expo proxy) |
| **Apple Sign-In** | `expo-apple-authentication` | — (нативный SDK) | только **iOS**; на Android кнопка скрыта |

**Web client** (§4): redirect только `https://mototwin.space/api/auth/callback/google`. **Не добавляйте** `com.googleusercontent.apps.…:/oauth2redirect` в Web client — для Android native redirect не нужен.

### Android: SHA-1 release keystore

| Keystore | SHA-1 | Когда |
|----------|-------|-------|
| **EAS Build** (preview/production APK с `eas build`) | `ED:2D:8D:5A:ED:C7:21:73:44:CE:49:2C:82:AD:AE:01:DF:8A:39:A7` | APK с expo.dev |
| **Локальный release** (`mototwin-release.keystore`) | `4E:6C:7C:70:18:59:AB:89:66:92:DE:49:47:7D:1A:17:13:E2:B9:31` | `./gradlew assembleRelease` на Mac |
| **Debug** (`debug.keystore`) | `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` | dev-сборки |

В Google Cloud Console у **одного** Android OAuth client — только **один** SHA-1. Для нескольких keystore создайте **несколько** Android clients с одним package `ru.mototwin.app` и разными SHA-1 (SDK выберет подходящий по подписи APK). Альтернатива: загрузить `mototwin-release.keystore` в EAS (`eas credentials -p android`), чтобы EAS и локальные сборки имели один SHA-1.

Проверить на машине:

```bash
bash apps/app/scripts/print-android-oauth-sha1.sh
```

Без этого SHA-1 в **Android OAuth client** → `DEVELOPER_ERROR`. Debug APK использует **другой** SHA-1 (`debug.keystore`) — можно добавить оба fingerprint в один Android client.

После добавления плагина `@react-native-google-signin/google-signin` в `app.config.ts`:

```bash
cd apps/app
npx expo prebuild --platform android   # без --clean, чтобы не затереть release signing
```

### iOS: native redirect (AuthSession)

Redirect для iOS OAuth client (не регистрировать в Web client):

```text
com.googleusercontent.apps.<IOS_CLIENT_ID_PREFIX>:/oauth2redirect
```

Пример для client `869160369331-t0tb16c5fd2o14fp202j30jkt72hg3hs.apps.googleusercontent.com`:

```text
com.googleusercontent.apps.869160369331-t0tb16c5fd2o14fp202j30jkt72hg3hs:/oauth2redirect
```

---

## 6. Apple Sign In

### Apple Developer (developer.apple.com)

| Шаг | Что создать | Значение MotoTwin |
|-----|-------------|-------------------|
| 1 | **App ID** + Sign In with Apple | Bundle ID `ru.mototwin.app` |
| 2 | **Service ID** + Configure | Identifier `ru.mototwin.app.web` → `AUTH_APPLE_CLIENT_ID` |
| 3 | **Key** (.p8) + Sign In with Apple | Key ID (напр. `SXBSD9822T`), Team ID из Membership |

**Service ID → Sign In with Apple → Configure:**

| Поле | Значение |
|------|----------|
| Primary App ID | `ru.mototwin.app` |
| Domains | `mototwin.space` |
| Return URLs | `https://mototwin.space/api/auth/callback/apple` |

⚠️ Apple **не принимает `localhost`** для web Sign In — только HTTPS prod.

### Client secret (JWT)

`AUTH_APPLE_CLIENT_SECRET` — не строка из кабинета, а **JWT**, подписанный `.p8` (срок до ~6 месяцев).

Локально (Team ID, Key ID, Service ID, путь к `.p8`):

```bash
node --input-type=module -e "
import { SignJWT, importPKCS8 } from 'jose';
import fs from 'fs';
const teamId = 'BM9LAU7B7D';
const keyId = 'SXBSD9822T';
const clientId = 'ru.mototwin.app.web';
const key = await importPKCS8(fs.readFileSync('auth/AuthKey_SXBSD9822T.p8','utf8'), 'ES256');
const now = Math.floor(Date.now()/1000);
console.log(await new SignJWT({}).setProtectedHeader({alg:'ES256',kid:keyId}).setIssuer(teamId).setSubject(clientId).setAudience('https://appleid.apple.com').setIssuedAt(now).setExpirationTime(now+86400*180).sign(key));
"
```

Метаданные для генерации удобно хранить в `auth/apple_oauth.txt` (gitignored).

### Web callback

| | |
|--|--|
| Redirect URI | `https://mototwin.space/api/auth/callback/apple` |

### iOS app (native)

| | |
|--|--|
| Bundle ID | `ru.mototwin.app` → `APPLE_CLIENT_ID` |
| SDK | `expo-apple-authentication` — кнопка только на iOS |

---

## 7. Yandex ID

### oauth.yandex.ru — одно приложение (web + mobile)

**Redirect URI** (все нужные):

| Сценарий | URI |
|----------|-----|
| Web prod | `https://mototwin.space/api/auth/callback/yandex` |
| Web local | `http://localhost:3000/api/auth/callback/yandex` |
| Mobile (все сборки) | тот же URI: `https://mototwin.space/api/auth/callback/yandex` — Yandex допускает только один Callback URL; сервер перенаправляет mobile-flow в `mototwin://oauth/yandex?code=...` |

**Доступ к данным:** `login:email`, `login:info` (email + имя).

**Android:** package `ru.mototwin.app` + SHA256 release keystore.

**iOS:** App ID `{TeamID}.ru.mototwin.app`.

Env: `YANDEX_CLIENT_ID`, `YANDEX_CLIENT_SECRET`, `YANDEX_OAUTH_CLIENT_ID` (= тот же ID), mobile `EXPO_PUBLIC_YANDEX_CLIENT_ID`.

---

## 8. Реализация: адаптер, bootstrap, Apple cookies

### Apple: SameSite=None cookies

Apple шлёт callback **POST**-ом (`response_mode=form_post`). Cookies PKCE/state с `SameSite=Lax` не отправляются — ошибка `PKCE code_verifier cookie was missing` / `OAuthCallback`.

Исправление в [authjs.ts](../src/lib/auth/authjs.ts): `buildAuthCookies()` выставляет `SameSite=None` + `Secure` для `pkceCodeVerifier`, `state`, `callbackUrl` на HTTPS (`NEXTAUTH_URL`).

### Prisma adapter (`displayName` vs `name`)

Стандартный `@auth/prisma-adapter` передаёт в `User` поля `name` / `emailVerified`. В MotoTwin имя хранится в `User.displayName`.

Кастомный адаптер: [src/lib/auth/prisma-auth-adapter.ts](../src/lib/auth/prisma-auth-adapter.ts) — маппинг `name` ↔ `displayName` на границе Auth.js.

Без него первый Google-вход падает с `OAuthCreateAccount` / `PrismaClientValidationError: Unknown arg 'name'`.

### Bootstrap гаража / settings / subscription

После первого OAuth-входа вызывается `ensureUserBootstrap()` — создаёт гараж, `UserSettings`, trial `Subscription`, notification settings.

**Важно:** bootstrap выполняется в **`events.signIn`**, не в `signIn` callback. Callback Auth.js для нового OAuth-пользователя может сработать **до** commit строки `User` в БД; ранний вызов давал FK `garages_ownerUserId_fkey`.

Код: [src/lib/auth/user-bootstrap.ts](../src/lib/auth/user-bootstrap.ts), [src/lib/auth/authjs.ts](../src/lib/auth/authjs.ts).

Код: [src/lib/auth/user-bootstrap.ts](../src/lib/auth/user-bootstrap.ts), [src/lib/auth/authjs.ts](../src/lib/auth/authjs.ts).

### Домены и nginx

- Канонический хост: **`mototwin.space`**
- Legacy **`mototwin.online`** → 301 на `.space` ([deploy/nginx/mototwin.conf](../deploy/nginx/mototwin.conf))
- После переноса DNS `.online` на vps2: certbot + [mototwin.online-redirect.ssl.conf](../deploy/nginx/mototwin.online-redirect.ssl.conf)

---

## 9. Типичные ошибки

| Симптом | Причина | Действие |
|---------|---------|----------|
| Google: Access blocked / 403 | OAuth app в Testing, Gmail не в Test users | Google Console → Test users |
| `DEVELOPER_ERROR` (Android Google) | SHA-1/package ≠ подпись APK | Android OAuth client: package `ru.mototwin.app` + **release SHA-1** (§5) |
| `redirect_uri_mismatch` (web Google) | URI в Google ≠ callback | `https://mototwin.space/api/auth/callback/google` |
| `OAuthCallback` / `PKCE code_verifier cookie was missing` (Apple) | POST callback без PKCE cookie (браузер / form_post) | Apple web: `appleWebProvider()` — ручной token exchange без PKCE/state cookies |
| `checks.state argument is missing` (Apple) | `checks: []` + openid-client `client.callback` | тот же `appleWebProvider()` с `token.request` |
| `invalid_client` (Apple) | истёк JWT secret или неверный Key/Team/Service ID | `node scripts/generate-apple-client-secret.mjs` → обновить `AUTH_APPLE_CLIENT_SECRET`, restart |
| Yandex: redirect_uri не совпадает | не тот URI в кабинете | добавить web + `mototwin://oauth/yandex` (§7) |
| Callback на `localhost` (Google/Yandex) | нет `NEXTAUTH_URL` / `AUTH_BASE_URL` | задать на сервере, restart |
| `OAuthCreateAccount` | старый код без `mototwinPrismaAdapter` | деплой актуального `main` |
| FK `garages_ownerUserId_fkey` | bootstrap до persist User | bootstrap в `events.signIn`, не в callback |

---

## 10. Smoke

```bash
# Провайдеры и callback URL
curl -s https://mototwin.space/api/auth/providers

# Полный auth smoke (register/login/block)
BASE_URL=https://mototwin.space npx tsx scripts/qa-auth-smoke.ts
```

Ручная проверка: [https://mototwin.space/login](https://mototwin.space/login) → Google / Apple / Yandex → редирект на `/garage` → в DevTools Application → Cookies есть `mototwin_session` (после sync).

Проверка sync (должен вернуть `{ "ok": true }` при активной Auth.js-сессии):

```bash
curl -s -b cookies.txt -c cookies.txt https://mototwin.space/api/auth/sync-web-session
```
