# Google Play — публикация Android-приложения

Пошаговый чеклист для релиза **MotoTwin** (`ru.mototwin.app`) в Google Play.  
Сборка: EAS Build → **AAB** (Android App Bundle). API: `https://mototwin.space`.

См. также: [mobile-build.md](../mobile-build.md), [mobile-push-setup.md](../mobile-push-setup.md).

---

## 1. Что уже настроено в репозитории

| Элемент | Где |
|---------|-----|
| Package `ru.mototwin.app` | `apps/app/app.json` |
| Версия `1.0.0`, `versionCode` (EAS autoIncrement) | `app.json` + `eas.json` |
| Production AAB | `eas.json` → `build.production.android.buildType: "app-bundle"` |
| Submit draft → internal track | `eas.json` → `submit.production.android` |
| Firebase / FCM | `auth/google-services.json` → sync script |
| Privacy policy URL | **https://mototwin.space/privacy** (`src/app/privacy/page.tsx`) |
| Release permissions | только `INTERNET`, `POST_NOTIFICATIONS`, `VIBRATE` |
| Backup rules | `android/.../res/xml/backup_rules.xml` |

---

## 2. Перед первой сборкой (один раз)

### 2.1. EAS и credentials

```bash
npm install -g eas-cli
cd apps/app
eas login
```

Проверить projectId в `app.json` → `extra.eas.projectId`.

**Android signing:** EAS создаст keystore при первой production-сборке или загрузите свой:

```bash
eas credentials -p android
```

Локальный release keystore (если собираете APK вручную): `apps/app/scripts/generate-android-release-keystore.sh`.

**FCM для push:**

```bash
bash apps/app/scripts/sync-push-files-from-auth.sh
eas credentials -p android
# → Upload FCM service account JSON (auth/firebase-fcm-service-account.json)
```

### 2.2. Google Play Console

1. [play.google.com/console](https://play.google.com/console) — аккаунт разработчика ($25, один раз).
2. **Create app** → MotoTwin, `ru.mototwin.app`, default language: Russian.
3. Заполнить обязательные разделы (можно параллельно с internal testing):
   - **Store listing**: название, краткое/полное описание, иконка 512×512, feature graphic 1024×500, скриншоты телефона (мин. 2).
   - **Privacy policy**: `https://mototwin.space/privacy`
   - **App access**: если нужен логин — указать тестовый аккаунт для ревьюеров.
   - **Ads**: No, если рекламы нет.
   - **Content rating**: анкета IARC.
   - **Target audience**: возраст (14+).
   - **Data safety**: email, OAuth ID, push token, данные гаража — «собираем для функций приложения», не продаём.

### 2.3. Деплой privacy policy на VPS

Страница `/privacy` должна быть доступна по HTTPS **до** отправки на ревью:

```bash
# на VPS после git pull + build + restart — см. mototwin-deploy skill
curl -sI https://mototwin.space/privacy
```

---

## 3. Сборка AAB

```bash
bash apps/app/scripts/build-play-release.sh
```

Или вручную:

```bash
bash apps/app/scripts/sync-push-files-from-auth.sh
cd apps/app
eas build -p android --profile production
```

Артефакт: `.aab` в Expo dashboard. `versionCode` увеличивается автоматически (`autoIncrement: true`).

**Preview (APK для тестеров без Play):**

```bash
cd apps/app
eas build -p android --profile preview
```

---

## 4. Загрузка в Play Console

### Вариант A — EAS Submit

```bash
cd apps/app
eas submit -p android --profile production
```

Потребуется JSON ключ сервисного аккаунта Google Play (Play Console → Setup → API access).

В `eas.json` задано: track `internal`, `releaseStatus: draft`. Измените track на `production` перед публичным релизом:

```json
"submit": {
  "production": {
    "android": {
      "track": "production",
      "releaseStatus": "completed"
    }
  }
}
```

### Вариант B — вручную

Play Console → **Testing → Internal testing** → Create release → Upload AAB.

---

## 5. Smoke-тест перед публикацией

На устройстве с production/internal сборкой (не Expo Go):

1. Вход: email/пароль, Google, Yandex.
2. Гараж загружается.
3. Logout → API 401.
4. Push: **Оповещения → Подключить push** (если FCM настроен).
5. Второй аккаунт не видит мото первого.

---

## 6. Регистрация пользователей

На production сервере регистрация по email может быть ограничена `MOTOTWIN_BETA_ALLOWED_EMAILS`.  
Для **открытой** публикации в Play — уберите или расширьте allowlist в `.env` на VPS.

OAuth (Google/Yandex) работает независимо от allowlist.

---

## 7. Обновления

1. Поднять `version` в `apps/app/app.json` (semver, напр. `1.0.1`).
2. `eas build -p android --profile production` — `versionCode` +1 автоматически.
3. `eas submit` или ручная загрузка в Play Console.

---

## 8. Troubleshooting

| Симптом | Решение |
|---------|---------|
| Play отклоняет privacy URL | Деплой `/privacy` на mototwin.space |
| `DEVELOPER_ERROR` Google Sign-In | SHA-1 release keystore в Google Cloud Android OAuth client |
| Push не работает | FCM service account в EAS + `google-services.json` в сборке |
| Data safety mismatch | Сверить с фактом: email, OAuth, push token, гараж |
| Permission warnings | В release только INTERNET, POST_NOTIFICATIONS, VIBRATE |

---

## Быстрые команды

```bash
# AAB для Play
bash apps/app/scripts/build-play-release.sh

# Загрузить draft в internal track
cd apps/app && eas submit -p android --profile production

# SHA-1 для Google OAuth
bash apps/app/scripts/print-android-oauth-sha1.sh
```
