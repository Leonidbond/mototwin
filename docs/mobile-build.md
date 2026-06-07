# Сборка и запуск мобильного приложения (Expo)

Канонический документ по dev-серверу, нативным сборкам Android/iOS и типичным проблемам. Клиент: **`apps/app`** (`@mototwin/app`), Expo SDK **54**, Expo Router.

См. также: [`frontend-expo.md`](./frontend-expo.md) (экраны и архитектура), [`deploy/expo-beta.md`](./deploy/expo-beta.md) (краткий чеклист бета-раздачи).

---

## 1. Что выбрать

| Режим | Когда использовать |
|-------|-------------------|
| **Expo Go + Metro** | Быстрая разработка UI, hot reload, локальный или staging API |
| **`expo run:android` / `expo run:ios`** | Нативные модули, отладка на эмуляторе/устройстве с dev-бандлом |
| **Release APK локально (`assembleRelease`)** | Тест на эмуляторе/телефоне против production/staging **без** Expo Go |
| **EAS Build** | Раздача тестерам (internal APK / TestFlight), CI, подпись релиза |

**Expo Go не подходит** для финальной проверки production API и OAuth — нужна standalone-сборка с зашитым `EXPO_PUBLIC_API_BASE_URL`.

---

## 2. Требования

Из **корня репозитория**:

```bash
npm ci
```

Дополнительно для **Android (локальная нативная сборка)**:

- [Android Studio](https://developer.android.com/studio) (SDK, эмулятор)
- **JDK 17+** — удобно использовать JBR из Android Studio:

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
```

- **adb** — обычно в `$HOME/Library/Android/sdk/platform-tools`. Добавьте в `PATH` или вызывайте полным путём.

Для **iOS** (только macOS): Xcode, CocoaPods (`npx pod-install` в `apps/app/ios` после prebuild).

---

## 3. Переменные окружения

Скопируйте шаблон:

```bash
cp apps/app/.env.example apps/app/.env
```

Ключевые переменные:

| Переменная | Назначение |
|------------|------------|
| `EXPO_PUBLIC_API_BASE_URL` | Базовый URL Next.js API (без завершающего `/`). Для prod: `https://mototwin.space` |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | **Android release:** native Google Sign-In (`webClientId` + audience idToken на сервере) |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | **iOS:** Expo AuthSession |
| `EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID` | **Expo Go** (dev) |
| `EXPO_PUBLIC_YANDEX_CLIENT_ID` | OAuth Yandex |

Подробнее: [auth-oauth-production.md](../auth-oauth-production.md) §5, шаблон `apps/app/.env.example`.

Файл `apps/app/.env` в `.gitignore` — не коммитить.

### Как приложение выбирает API

Логика в `apps/app/src/api-base-url.ts`:

1. `EXPO_PUBLIC_API_BASE_URL` из `.env` (приоритет)
2. LAN: IP Metro-бандлера, порт **3000**
3. Tunnel: `expo.extra.devApiBaseUrl` из `app.config.ts` (LAN IP машины при старте Metro)
4. Fallback: `http://localhost:3000`

Для **release-сборки** URL должен быть задан явно — иначе в APK окажется dev-логика или localhost.

---

## 4. Разработка (Metro / Expo Go)

Запуск **только из workspace** `apps/app` или через корневые скрипты:

```bash
# из корня репозитория
npm run mobile:dev          # expo start --lan (рекомендуется)
npm run mobile:dev:lan
npm run mobile:dev:usb      # expo start --localhost + adb reverse
npm run mobile:adb:reverse  # adb reverse tcp:8081 + tcp:3000
```

Или из `apps/app`:

```bash
cd apps/app
npx expo start
```

**Не запускайте** `npx expo` из корня монорепо без workspace — получите `Unable to resolve module ../../App`.

### Локальный backend

Во **втором терминале** из корня:

```bash
npm run dev
```

Next.js на `:3000`. Без него приложение откроется, но данные не загрузятся.

### Сеть

- Телефон и Mac в одной Wi‑Fi, без изоляции клиентов / VPN.
- macOS: разрешить входящие для Node (фаервол), порт **8081**.
- iOS: Настройки → Конфиденциальность → Локальная сеть → **Expo Go — Вкл.**

### USB вместо Wi‑Fi (Android)

```bash
npm run mobile:adb:reverse
npm run mobile:dev:usb
```

В Expo Go откройте `exp://127.0.0.1:8081`.

### Tunnel

`npm run mobile:dev:tunnel` / `expo start --tunnel` часто падает (ngrok). Предпочитайте LAN или USB — см. комментарии в `apps/app/.env.example`.

---

## 5. Нативный Android-проект

Каталог `apps/app/android/` генерируется **`expo prebuild`**. Если его нет или изменились нативные плагины в `app.json`:

```bash
cd apps/app
npx expo prebuild --platform android
```

После prebuild проверьте, что есть `android/app/src/main/res/drawable/splashscreen_logo.xml` (splash). Если сборка ругается на отсутствие drawable — добавьте ресурс или перегенерируйте prebuild.

**Важно:** `npx expo prebuild --clean` перегенерирует `android/` и может затереть правки в `app/build.gradle` (release signing). После clean prebuild восстановите блок `signingConfigs.release` из репозитория или не используйте `--clean` без необходимости.

### Release keystore (prod подпись APK/AAB)

Файлы **не в git** (см. `.gitignore`):

| Файл | Назначение |
|------|------------|
| `android/keystores/mototwin-release.keystore` | Release keystore |
| `android/keystore.properties` | пароли и alias для Gradle |

Первичная генерация (или на новой машине, если есть backup keystore):

```bash
bash apps/app/scripts/generate-android-release-keystore.sh
```

Шаблон: `android/keystore.properties.example`. **Сохраните backup** keystore + `keystore.properties` (1Password / offline). Без keystore нельзя обновлять приложение в Google Play.

SHA-1 для Google OAuth (Android client, package `ru.mototwin.app`):

```bash
bash apps/app/scripts/print-android-oauth-sha1.sh
```

Либо вручную (`keytool -list -v -keystore …`) или `./gradlew signingReport` в `apps/app/android` — секция `Variant: release`.

Без **release SHA-1** в Google Console Android OAuth client native Google Sign-In вернёт `DEVELOPER_ERROR` (не `redirect_uri_mismatch`).

Debug-сборки используют `debug.keystore` (**другой SHA-1**). В Google Console можно добавить оба fingerprint в один Android OAuth client.

### Debug на эмуляторе/устройстве

```bash
cd apps/app
npx expo run:android
```

Или из корня: `npm run mobile:android`.

Debug-сборка **не вкладывает** JS-бандл в APK — нужен запущенный Metro. Для автономного теста используйте **release** (§6).

---

## 6. Release APK (локально, Android)

Подходит для эмулятора и физического устройства против staging/production API.

### 6.1. Настройте API

В `apps/app/.env`:

```env
EXPO_PUBLIC_API_BASE_URL=https://mototwin.space
```

Или экспортируйте переменную в shell на время сборки (она подхватывается Metro при `export:embed`).

### 6.2. Соберите APK

```bash
cd apps/app/android

export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export NODE_ENV=production
export EXPO_PUBLIC_API_BASE_URL=https://mototwin.space
export EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID="....apps.googleusercontent.com"

./gradlew assembleRelease
```

Артефакт:

```text
apps/app/android/app/build/outputs/apk/release/app-release.apk
```

Размер ~80–90 MB (Hermes + встроенный JS-бundle).

### 6.3. Установка

```bash
# если adb не в PATH:
$HOME/Library/Android/sdk/platform-tools/adb devices
$HOME/Library/Android/sdk/platform-tools/adb install -r apps/app/android/app/build/outputs/apk/release/app-release.apk
```

Флаг `-r` — переустановка поверх существующей версии.

### 6.4. Зависимости Expo

После смены major/minor версий Expo или ошибок нативного рантайма (`AnyTypeCache`, mismatch SDK):

```bash
cd apps/app
npx expo install --fix
npx expo prebuild --platform android --clean   # только если нужно пересоздать android/
```

---

## 7. EAS Build (облако)

Подготовка (один раз):

```bash
npm install -g eas-cli
cd apps/app
eas login
eas init   # записать projectId в app.json → extra.eas.projectId
```

Профили в `apps/app/eas.json`. Перед сборкой замените `EXPO_PUBLIC_API_BASE_URL` на ваш beta/prod домен.

```bash
cd apps/app
eas build -p android --profile preview
eas build -p ios --profile preview
```

Раздача: internal APK (Android), TestFlight (iOS, нужен Apple Developer).

---

## 8. iOS (кратко)

```bash
cd apps/app
npx expo prebuild --platform ios
npx expo run:ios
```

Release / TestFlight — через EAS (`eas build -p ios`).

---

## 9. Проверка после сборки

1. Экран логина: email/пароль или OAuth (Android: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`; iOS: `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`; Apple — только iOS).
2. Гараж загружается (`GET /api/garage`).
3. Карточка мотоцикла, журнал, обновление пробега.
4. Logout → последующие запросы без токена → 401.
5. Второй аккаунт не видит мото первого.

Тестовые пользователи на prod (если засидены): `test1@mototwin.online` … — пароли в `scripts/seed-beta-test-users.ts`.

---

## 10. Типичные проблемы

| Симптом | Решение |
|---------|---------|
| `Unable to resolve module ../../App` | Запуск Expo из `apps/app` или `npm run mobile:dev` из корня |
| Пустой гараж / таймаут в Expo Go | Запущен ли `npm run dev`? Один Wi‑Fi? Фаервол / VPN? |
| `adb: command not found` | Добавить `platform-tools` в PATH или полный путь к `adb` |
| Release APK — белый экран / нет данных | Собирали **release**, не debug; задан `EXPO_PUBLIC_API_BASE_URL` при сборке |
| Debug APK без UI после установки | Debug ждёт Metro — используйте `assembleRelease` или `expo run:android` с Metro |
| Native crash при старте (Expo modules) | `npx expo install --fix` в `apps/app`, пересборка |
| `DEVELOPER_ERROR` / OAuth Google на Android | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` при сборке + **release SHA-1** в Android OAuth client (§5 [auth-oauth-production.md](../auth-oauth-production.md)) |
| OAuth Google на iOS | `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` + native redirect в iOS client |
| Gradle: JAVA_HOME | `export JAVA_HOME="…/Android Studio.app/Contents/jbr/Contents/Home"` |
| Splash drawable missing | `npx expo prebuild` или `res/drawable/splashscreen_logo.xml` |
| Старый prod без `/api/subscription/current` | 404 на subscription не должен ломать весь профиль — см. отдельные try/catch в клиенте |
| На Android cold start периодически таймаутится `auth/me`, а в браузере всё ок | Известный кейс TLS 1.3 handshake на некоторых сетях. В `apps/app/android/app/src/main/java/ru/mototwin/app/MainApplication.kt` клиент принудительно использует TLS 1.2 (`connectionSpecs`) — это рабочий обходной путь до серверного фикса |

---

## 11. Полезные пути и файлы

| Путь | Назначение |
|------|------------|
| `apps/app/app/**` | Expo Router — экраны |
| `apps/app/components/expo-shell/` | `InternalScreenChrome`, хедеры |
| `apps/app/src/api-base-url.ts` | Резолв URL API |
| `apps/app/app.config.ts` | Плагины (Google Sign-In), dev LAN IP для tunnel |
| `apps/app/src/google-native-sign-in.ts` | Android native Google OAuth |
| `apps/app/scripts/print-android-oauth-sha1.sh` | SHA-1 для Google Console |
| `apps/app/eas.json` | Профили EAS и env для облачных сборок |
| `package.json` (корень) | `mobile:dev`, `mobile:android`, … |

Корневые npm-скрипты:

```text
mobile:dev          → expo start --lan
mobile:dev:lan      → то же
mobile:dev:usb      → expo start --localhost
mobile:dev:tunnel   → expo start --tunnel (ненадёжно)
mobile:adb:reverse  → проброс 8081 и 3000 на USB
mobile:android      → expo run:android
mobile:ios          → expo run:ios
```
