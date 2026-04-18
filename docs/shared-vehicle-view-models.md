# Shared Vehicle View Models

## Why this extraction

MotoTwin использует два клиента (Web и Expo) с разными UI-реализациями, но с одинаковой бизнес-семантикой отображения данных мотоцикла.  
Чтобы уменьшить дублирование и поддерживать parity, подготовка display-ready vehicle данных вынесена в `@mototwin/domain`.

Это **не** общий UI-компонентный слой: layout и стили остаются платформенными.

## What was added

### Shared types (`@mototwin/types`)

Добавлены lightweight view-model типы:
- `VehicleSummaryViewModel`
- `VehicleDetailViewModel`
- `VehicleStateViewModel`
- `RideProfileViewModel`
- `VehicleTechnicalInfoViewModel`

Также **`VehicleDetailApiRecord`** — форма JSON из Next/Prisma (`include` brand, model, modelVariant), отличная от плоского **`VehicleDetail`** (с полями `brandName`, `modelName`, `year`, `variantName`). На web после `getVehicleDetail` / обновления профиля сырой объект приводится через **`vehicleDetailFromApiRecord`**; тип ответа в `VehicleDetailResponse` по-прежнему заявлен как `VehicleDetail` в api-client (исторически), на границе используется приведение `as unknown as VehicleDetailApiRecord`.

### Shared helpers (`@mototwin/domain`)

Добавлены pure функции:
- `buildVehicleSummaryViewModel`
- `buildVehicleDetailViewModel`
- `buildVehicleStateViewModel`
- `buildRideProfileViewModel`
- `buildVehicleTechnicalInfoViewModel`
- `vehicleDetailFromApiRecord` — переводит wire-ответ API (`brand` / `model` / `modelVariant`, см. `VehicleDetailApiRecord` в `@mototwin/types`) в канонический `VehicleDetail` для тех же хелперов

## What helpers do

- нормализуют названия display полей;
- формируют готовые строки (`Пробег`, `Моточасы`, `year/version`, `brand/model`);
- переводят ride-profile enum-like значения в русские display labels;
- скрывают пустые значения через `null` или fallback;
- не используют React и не содержат platform-specific styling.

## Where reused now

- Web:
  - `src/app/garage/page.tsx`
  - `src/app/vehicles/[id]/page.tsx`
- Expo:
  - `apps/app/app/index.tsx`
  - `apps/app/app/vehicles/[id]/index.tsx`

## Why UI remains platform-specific

Web и Expo имеют разную структуру экранов, interaction patterns и style system.  
Общий слой ограничен data shaping (view-model), а не rendering. Это позволяет:
- избежать крупного рискованного рефактора;
- сохранить текущий UX на каждой платформе;
- улучшить parity и повторное использование логики подготовки данных.

## MVP boundary

Вынесены только безопасные и явно дублируемые части:
- заголовки/подзаголовки карточек;
- state/ride-profile/technical display-данные;
- форматирование строк для карточек и detail header.

Глубоко переплетенные с UI участки оставлены локально в клиентах.
