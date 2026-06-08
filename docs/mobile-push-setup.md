# Mobile push (Expo Push)

Пошаговая настройка push-уведомлений для **iOS/Android** через [Expo Push Service](https://docs.expo.dev/push-notifications/overview/).

Сервер отправляет push через `expo-server-sdk` ([`src/lib/push/send-expo-push.ts`](../src/lib/push/send-expo-push.ts)).  
Клиент регистрирует Expo push token ([`apps/app/src/expo-push-registration.ts`](../apps/app/src/expo-push-registration.ts)).

---

## Шаг 1. EAS project (обязательно)

Без реального `projectId` приложение не получит push token.

```bash
npm install -g eas-cli   # или: npx eas-cli
cd apps/app
eas login
eas init
```

`eas init` создаст проект на expo.dev и запишет UUID в `app.json`:

```json
"extra": {
  "eas": {
    "projectId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  }
}
```

**Проверка:** в `apps/app/app.json` не должно остаться `REPLACE_AFTER_eas_init`.

---

## Шаг 2. Credentials в EAS

Expo доставляет push через FCM (Android) и APNs (iOS). Credentials загружаются в EAS, не в `.env` сервера.

### Android — Firebase / FCM

1. [Firebase Console](https://console.firebase.google.com/) → создать проект (например `mototwin`).
2. Добавить Android-приложение с package **`ru.mototwin.app`**.
3. Скачать `google-services.json` → положить в `auth/google-services.json`, затем:

```bash
bash apps/app/scripts/sync-push-files-from-auth.sh
```

Скрипт копирует файл в `apps/app/` и **`apps/app/android/app/`** (нужно для нативной сборки Android).

4. Firebase → Project settings → Service accounts → **Generate new private key** (JSON).
5. Загрузить в EAS:

```bash
cd apps/app
eas credentials -p android
# → Push Notifications: Manage your FCM Api Key
# → Upload a service account JSON
```

### iOS — APNs

0. **Identifiers** → `ru.mototwin.app` → включить **Push Notifications** (Capability).
1. [Apple Developer](https://developer.apple.com/account/resources/authkeys/list) → Keys → **+** → включить **Apple Push Notifications service (APNs)**.
2. Скачать `.p8` → `auth/AuthKey_XXXXXXXXXX.p8`, создать `auth/apns_push.key` (см. `auth/apns_push.key.example`).
3. Загрузить в EAS:

```bash
bash apps/app/scripts/prepare-ios-push-from-auth.sh
cd apps/app
APNS_KEY_ID=XXXXXXXXXX ./scripts/upload-apns-to-eas.exp preview
APNS_KEY_ID=XXXXXXXXXX ./scripts/upload-apns-to-eas.exp production
```

Ключ `AuthKey_SXBSD9822T.p8` (Apple Sign In) **не подходит** — нужен отдельный ключ с APNs.

Bundle ID: **`ru.mototwin.app`**. Team ID: **`BM9LAU7B7D`**.

Подробнее: `auth/apns_push_steps.txt`.

---

## Шаг 3. Сборка standalone-приложения

Push **не работает в Expo Go** для production API. Нужна EAS-сборка:

```bash
cd apps/app
eas build -p android --profile preview
eas build -p ios --profile preview
```

В `eas.json` уже задан `EXPO_PUBLIC_API_BASE_URL=https://mototwin.space`.

После установки APK / TestFlight:

1. Войти в аккаунт.
2. Экран **Уведомления** → **Подключить push**.
3. Разрешить уведомления в ОС.

При успехе token сохраняется в `PushSubscription` (`provider=EXPO`), включается `pushEnabled`.

---

## Шаг 4. Сервер (VPS)

Код отправки уже в репозитории. На production нужен деплой последней версии.

Опционально в `/opt/mototwin/app/mototwin/.env`:

```env
# Не обязателен для базовой отправки; нужен для повышенных лимитов Expo API
EXPO_ACCESS_TOKEN=
```

Получить: [expo.dev](https://expo.dev) → Account → Access tokens.

Cron пересчёта и dispatch (если ещё не настроен):

```cron
*/15 * * * * cd /opt/mototwin/app/mototwin && npx tsx scripts/cron-recalculate-all-users.ts >> /var/log/mototwin-cron.log 2>&1
```

---

## Шаг 5. Проверка

### A. Smoke с токеном устройства

После «Подключить push» токен можно взять из БД (`push_subscriptions.token`) или логов.

```bash
EXPO_PUSH_TOKEN='ExponentPushToken[...]' npx tsx scripts/qa-expo-push-smoke.ts
```

### B. Через API (авторизованный пользователь)

```bash
# после логина — cookie или Bearer
curl -X POST https://mototwin.space/api/push-subscriptions/test \
  -H "Cookie: mototwin_session=..."
```

Пересчитывает оповещения и dispatch для текущего пользователя.

### C. End-to-end

1. Создать просроченное ТО (или дождаться cron).
2. Убедиться, что `pushEnabled=true` и есть активная подписка.
3. Push должен прийти на устройство; tap → deep link по `actionUrl` в data.

---

## Troubleshooting

| Симптом | Решение |
|---------|---------|
| «Не настроен EAS projectId» | Шаг 1: `eas init`, пересборка |
| «Push только на физическом устройстве» | Симулятор не поддерживает push |
| Token получен, push не приходит | Проверить FCM/APNs credentials в EAS (шаг 2) |
| `DeviceNotRegistered` в логах | Переподключить push на устройстве |
| Delivery `NO_ACTIVE_SUBSCRIPTIONS` | Нажать «Подключить push», включить `pushEnabled` |
| Delivery `EXPO_PUSH_FAILED` | Невалидный token или credentials |

---

## Что дальше (не mobile)

- **Web Push** — отдельная итерация (VAPID + service worker).
- Прямой **FCM/APNS** без Expo — схема БД поддерживает, клиент пока шлёт `provider=EXPO`.

См. также: [mobile-build.md](./mobile-build.md), [deploy/expo-beta.md](./deploy/expo-beta.md), [email-smtp.md](./email-smtp.md).
