# MotoTwin Expo Bootstrap

## Что создано

В репозиторий добавлен минимальный безопасный Expo-first scaffold без изменений текущего web-приложения:

- `apps/app` — новый Expo app;
- Expo Router entrypoint:
  - `apps/app/app/_layout.tsx`
  - `apps/app/app/index.tsx`
- базовые конфиги Expo:
  - `apps/app/package.json`
  - `apps/app/app.json`
  - `apps/app/babel.config.js`
  - `apps/app/tsconfig.json`
  - `apps/app/expo-env.d.ts`
- в корневом `package.json` добавлены workspace-настройка и минимальные mobile scripts.

## Как запустить Expo app

Из корня проекта:

1. Установить зависимости:
   - `npm install`
2. Запустить dev сервер Expo:
   - `npm run mobile:dev`
3. Открыть платформу:
   - Android: `npm run mobile:android`
   - iOS: `npm run mobile:ios`
   - Web (Expo): `npm run mobile:web`

Альтернативно можно запускать команды напрямую в workspace `@mototwin/app`.

## Что намеренно не мигрировано на этом шаге

Это только bootstrap-этап. Пока **не** переносились:

- текущие Next.js экраны и UI;
- auth flow;
- API-интеграция и data loading;
- shared packages (`packages/types`, `packages/domain`, `packages/api-client`);
- state management библиотеки;
- бизнес-логика текущего web MVP.

Текущий web MotoTwin остается без изменений и продолжает работать как раньше.
