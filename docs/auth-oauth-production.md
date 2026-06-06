# OAuth на production (web + mobile)

Канонический чеклист настройки Google / Apple / Yandex для `https://mototwin.online`.

См. также: [auth-implementation-plan.md](./auth-implementation-plan.md), [deploy/vps.md](./deploy/vps.md), [mobile-build.md](./mobile-build.md).

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
| Google / Apple / Yandex | Auth.js `signIn("google" \| "apple" \| "yandex")` | таблица `authjs_sessions` (database strategy) |

Оба пути резолвятся в `resolveAuthenticatedUserId()` — см. [src/lib/auth/request-auth.ts](../src/lib/auth/request-auth.ts).

Auth.js route: `/api/auth/[...nextauth]` → [src/lib/auth/authjs.ts](../src/lib/auth/authjs.ts).

---

## 3. Серверный `.env` (web OAuth)

Минимум для Google на VPS (`/opt/mototwin/app/mototwin/.env`):

```env
AUTH_SECRET="..."                    # openssl rand -base64 32, ≥32 символов
AUTH_BASE_URL="https://mototwin.online"
NEXTAUTH_URL="https://mototwin.online" # обязателен для корректного redirect_uri в NextAuth v4

AUTH_GOOGLE_CLIENT_ID="....apps.googleusercontent.com"
AUTH_GOOGLE_CLIENT_SECRET="GOCSPX-..."
GOOGLE_OAUTH_CLIENT_ID="....apps.googleusercontent.com"  # тот же Web Client ID (проверка mobile idToken)
```

Apple / Yandex (web):

```env
AUTH_APPLE_CLIENT_ID=""
AUTH_APPLE_CLIENT_SECRET=""
YANDEX_CLIENT_ID=""
YANDEX_CLIENT_SECRET=""
```

Проверка после деплоя:

```bash
curl -s https://mototwin.online/api/auth/providers | jq '.google.callbackUrl'
# ожидается: "https://mototwin.online/api/auth/callback/google"
```

---

## 4. Google Cloud Console — web client

**OAuth consent screen**

- Authorized domain: `mototwin.online`
- В режиме **Testing** → **Test users** → Gmail каждого тестера
- Для публичного доступа без whitelist → **Publish app**

**Credentials → OAuth client ID → Web application**

| Поле | Значение |
|------|----------|
| Authorized JavaScript origins | `https://mototwin.online` |
| Authorized redirect URIs | `https://mototwin.online/api/auth/callback/google` |

Без trailing slash. Только `https://`.

Client ID / Secret → `AUTH_GOOGLE_CLIENT_ID`, `AUTH_GOOGLE_CLIENT_SECRET`, `GOOGLE_OAUTH_CLIENT_ID`.

---

## 5. Google Cloud — mobile clients

Expo: [apps/app/app/login.tsx](../apps/app/app/login.tsx), `scheme: mototwin`, `android.package` / `ios.bundleIdentifier`: `ru.mototwin.app`.

| Client type | Поле в Google Console | Env в mobile / EAS |
|-------------|----------------------|-------------------|
| **Web** (idToken audience) | redirect как в §4 | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` |
| **iOS** | Bundle ID `ru.mototwin.app` | `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` |
| **Android** | Package `ru.mototwin.app` + SHA-1 release keystore | `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` |
| **Expo Go** (dev) | + redirect `https://auth.expo.io/@USER/mototwin-app` | `EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID` |

Mobile flow **не** использует `/api/auth/callback/google`. Клиент получает `idToken` → `POST /api/auth/oauth/mobile` → access/refresh tokens MotoTwin.

`EXPO_PUBLIC_API_BASE_URL=https://mototwin.online` (без `/` в конце).

---

## 6. Apple / Yandex (web callbacks)

| Провайдер | Redirect URI |
|-----------|--------------|
| Apple (Service ID) | `https://mototwin.online/api/auth/callback/apple` |
| Yandex OAuth app | `https://mototwin.online/api/auth/callback/yandex` |

Yandex mobile redirect (не web): `mototwin://oauth/yandex` — в кабинете **мобильного** OAuth-приложения Яндекс.

---

## 7. Реализация: адаптер и bootstrap

### Prisma adapter (`displayName` vs `name`)

Стандартный `@auth/prisma-adapter` передаёт в `User` поля `name` / `emailVerified`. В MotoTwin имя хранится в `User.displayName`.

Кастомный адаптер: [src/lib/auth/prisma-auth-adapter.ts](../src/lib/auth/prisma-auth-adapter.ts) — маппинг `name` ↔ `displayName` на границе Auth.js.

Без него первый Google-вход падает с `OAuthCreateAccount` / `PrismaClientValidationError: Unknown arg 'name'`.

### Bootstrap гаража / settings / subscription

После первого OAuth-входа вызывается `ensureUserBootstrap()` — создаёт гараж, `UserSettings`, trial `Subscription`, notification settings.

**Важно:** bootstrap выполняется в **`events.signIn`**, не в `signIn` callback. Callback Auth.js для нового OAuth-пользователя может сработать **до** commit строки `User` в БД; ранний вызов давал FK `garages_ownerUserId_fkey`.

Код: [src/lib/auth/user-bootstrap.ts](../src/lib/auth/user-bootstrap.ts), [src/lib/auth/authjs.ts](../src/lib/auth/authjs.ts).

---

## 8. Типичные ошибки

| Симптом | Причина | Действие |
|---------|---------|----------|
| Google: Access blocked / 403 | OAuth app в Testing, Gmail не в Test users | Google Console → Test users |
| `redirect_uri_mismatch` | URI в Google ≠ фактический callback | Сверить §4 байт-в-байт |
| Callback на `localhost` | нет `NEXTAUTH_URL` / `AUTH_BASE_URL` | Задать на сервере, restart |
| `OAuthCreateAccount` | старый код без `mototwinPrismaAdapter` | деплой ≥ `bf09f6a` |
| FK `garages_ownerUserId_fkey` | bootstrap до persist User | деплой ≥ `0311d80` |
| `?error=OAuthCreateAccount` после фикса | частично созданный user без garage | повторить вход — `events.signIn` догонит bootstrap |
| Android Google Sign-In fail (release) | нет SHA-1 release в Android OAuth client | `keytool -list -v -keystore ...` |

---

## 9. Smoke

```bash
# Провайдеры и callback URL
curl -s https://mototwin.online/api/auth/providers

# Полный auth smoke (register/login/block)
BASE_URL=https://mototwin.online npx tsx scripts/qa-auth-smoke.ts
```

Ручная проверка: [https://mototwin.online/login](https://mototwin.online/login) → «Войти через Google» → редирект на `/garage`.
