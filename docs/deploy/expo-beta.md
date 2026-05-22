# Expo — закрытая бета

## Подготовка (на Mac)

```bash
npm install -g eas-cli
cd apps/app
eas login
eas init   # привязать проект Expo
```

В `eas.json` уже задан `EXPO_PUBLIC_API_BASE_URL` для профиля `preview` — замените домен на ваш beta URL перед сборкой.

## Сборки

```bash
cd apps/app
eas build -p android --profile preview
eas build -p ios --profile preview
```

Раздача: internal distribution / APK link (Android), TestFlight (iOS, нужен Apple Developer).

**Expo Go не подходит** для production API — только standalone-сборка с HTTPS URL.

## Проверка

1. Регистрация / логин на экране Login
2. Гараж загружается
3. Logout → API 401
4. Второй аккаунт не видит мото первого
