# Чеклист закрытой беты

## Перед приглашением тестировщиков

- [ ] HTTPS работает (`curl -sI https://ваш-домен/`)
- [ ] `MOTOTWIN_ENABLE_DEV_USER_SWITCHER` **не** задан в production `.env`
- [ ] `AUTH_SECRET` задан (длинная случайная строка)
- [ ] `AUTH_BASE_URL` и `NEXTAUTH_URL` = публичный HTTPS origin (напр. `https://mototwin.space`)
- [ ] `MOTOTWIN_BETA_ALLOWED_EMAILS` содержит email всех тестеров (**только для `/register`**, не для Google OAuth)
- [ ] Google OAuth (если включён): Test users в Google Console + redirect `https://mototwin.space/api/auth/callback/google` — см. [auth-oauth-production.md](../auth-oauth-production.md)
- [ ] Apple Sign In: Service ID + Return URL `https://mototwin.space/api/auth/callback/apple`, JWT `AUTH_APPLE_CLIENT_SECRET`, `APPLE_CLIENT_ID=ru.mototwin.app`
- [ ] Yandex OAuth: redirect URIs web + `mototwin://oauth/yandex`, env `YANDEX_*` на VPS
- [ ] `curl -s https://mototwin.space/api/auth/providers` — google, apple, yandex с callback на `.space`
- [ ] Регистрация с неразрешённым email отклоняется
- [ ] Два аккаунта: `GET /api/garage` изолированы; чужой `vehicleId` → 404
- [ ] Ежедневный бэкап Postgres (`deploy/scripts/backup.sh` в cron)
- [ ] Cron уведомлений (опционально): `scripts/cron-recalculate-all-users.ts`
- [ ] Cron auth audit (`MT-SEC-055`): purge daily + alerts every 5 min — см. [vps.md §8.1](./vps.md#81-cron-auth-audit-mt-sec-055)
- [ ] Expo-сборки с `EXPO_PUBLIC_API_BASE_URL=https://...`

## Smoke (локально против staging)

```bash
BASE_URL=https://ваш-домен npx tsx scripts/qa-auth-smoke.ts
BASE_URL=https://ваш-домен npm run qa:notifications-smoke   # после логина — см. скрипт
```

## Материалы для тестеров

1. URL: `https://ваш-домен`
2. Регистрация (email из allowlist) / логин
3. Android: ссылка на APK / iOS: TestFlight
4. Канал обратной связи
5. Не тестируем: email/push (пока заглушки)

## Порядок приглашения

1. Вы + 1 тестер (web), 2–3 дня
2. +2–3 тестера (web)
3. Expo-сборка, 2–3 тестера с телефонами
4. Расширение группы
