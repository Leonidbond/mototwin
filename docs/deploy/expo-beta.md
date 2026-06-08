# Expo — закрытая бета

Краткий чеклист раздачи. **Полная инструкция по сборке:** [`../mobile-build.md`](../mobile-build.md).

## Подготовка (один раз)

```bash
npm install -g eas-cli
cd apps/app
eas login
eas init   # projectId → app.json extra.eas.projectId
```

В `eas.json` задайте `EXPO_PUBLIC_API_BASE_URL` для профилей `preview` / `production` (сейчас placeholder — замените на beta/prod домен).

Локальный release APK без EAS — см. [`mobile-build.md` §6](../mobile-build.md#6-release-apk-локально-android).

## Сборки (EAS)

```bash
cd apps/app
eas build -p android --profile preview
eas build -p ios --profile preview
```

Раздача: internal APK link (Android), TestFlight (iOS, Apple Developer).

**Google Play:** [google-play.md](./google-play.md) — AAB, privacy policy, Play Console.

**Push-уведомления:** пошагово — [`../mobile-push-setup.md`](../mobile-push-setup.md) (EAS projectId, FCM, APNs, сборка).

**Expo Go не подходит** для production API — только standalone с HTTPS URL.

## Проверка

1. Регистрация / логин
2. Гараж загружается
3. Logout → API 401
4. Второй аккаунт не видит мото первого

См. также [`beta-checklist.md`](./beta-checklist.md).
