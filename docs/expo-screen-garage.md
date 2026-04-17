# MotoTwin Expo Garage Screen

## Что реализовано

Собран первый рабочий экран Expo-приложения: `Garage` как root screen (`apps/app/app/index.tsx`).

Экран:
- запрашивает сохраненные мотоциклы из backend;
- показывает loading state;
- показывает error state с retry;
- показывает empty state;
- показывает список карточек мотоциклов.

## Какой источник данных используется

Экран использует существующий backend endpoint `GET /api/garage` через shared API client:
- `@mototwin/api-client` (`createApiClient`, `createMotoTwinEndpoints`);
- базовый URL берется из `EXPO_PUBLIC_API_BASE_URL` (fallback: `http://localhost:3000`).

Для списка используется shared type `GarageVehicleItem` из `@mototwin/types`.

## Что отображается в карточке

Для каждого мотоцикла отображается:
- бренд;
- модель;
- nickname (если есть, иначе используется бренд+модель как title);
- год и версия (если доступны);
- пробег.

## Что осталось следующим шагом

Для следующего шага Expo migration:
1. Добавить переход из Garage к read-only screen карточки мотоцикла.
2. Вынести `apiBaseUrl` в единый конфиг Expo окружения.
3. Добавить pull-to-refresh и более явный offline UX.
4. Подключить shared domain-formatters там, где начнет дублироваться presentation-логика.
