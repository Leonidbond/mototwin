# Shared API client (`@mototwin/api-client`)

## Purpose

Один типизированный слой HTTP для **Expo** и **веба**: те же пути `/api/*`, те же контракты ответов, единая обработка ошибок без привязки к React, Next или Expo.

## Настройка `baseUrl`

| Клиент | Значение | Почему |
|--------|----------|--------|
| **Next.js (веб)** | `""` (пустая строка) | Запросы идут на тот же origin: `fetch("/api/garage")` → `baseUrl` + `/api/garage`. |
| **Expo** | Полный URL backend, например из `getApiBaseUrl()` | Приложение не на том же хосте, что API. |

Создание клиента:

```ts
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";

const api = createMotoTwinEndpoints(createApiClient({ baseUrl: "" })); // web
// const api = createMotoTwinEndpoints(createApiClient({ baseUrl: apiBaseUrl })); // Expo
```

## Методы (`createMotoTwinEndpoints`)

Все методы соответствуют существующим route handlers под `src/app/api/**` (пути не менялись).

| Метод | HTTP |
|--------|------|
| `getGarageVehicles()` | `GET /api/garage` |
| `getVehicleDetail(vehicleId)` | `GET /api/vehicles/:id` |
| `getNodeTree(vehicleId)` | `GET /api/vehicles/:id/node-tree` |
| `getServiceEvents(vehicleId)` | `GET /api/vehicles/:id/service-events` |
| `createServiceEvent(vehicleId, input)` | `POST /api/vehicles/:id/service-events` |
| `updateVehicleState(vehicleId, input)` | `PATCH /api/vehicles/:id/state` |
| `updateVehicleProfile(vehicleId, input)` | `PATCH /api/vehicles/:id/profile` |
| `getMotorcycleBrands()` | `GET /api/motorcycle-brands` |
| `getMotorcycleModelFamilies({ motorcycleBrandId })` | `GET /api/motorcycle-model-families?motorcycleBrandId=` |
| `getMotorcycleVariants({ motorcycleModelFamilyId })` | `GET /api/motorcycle-variants?motorcycleModelFamilyId=` |
| `getMotorcycleGenerations({ motorcycleVariantId })` | `GET /api/motorcycle-generations?motorcycleVariantId=` |
| `createVehicle(input)` | `POST /api/vehicles` |

Каталог моделей унифицирован по 4-уровневой иерархии (`MotorcycleBrand → MotorcycleModelFamily → MotorcycleVariant → MotorcycleGeneration`). Старые методы `getBrands()` / `getModels()` / `getModelVariants()` (и соответствующие роуты) удалены — см. [data-model.md](./data-model.md).

Типы ответов экспортируются из `@mototwin/types` (модуль `api`): `GarageVehiclesResponse`, `VehicleDetailResponse`, и т.д.

## Ошибки

1. **`ApiClient.request`** при `!response.ok` читает тело через **`readHttpErrorMessage`**: сначала пытается разобрать JSON и взять поле **`error`** (строка). Для ответов **`error === "Validation failed"`** с массивом **`issues`** (Zod) к сообщению **добавляются** краткие строки `path: message` (до 12 штук), чтобы в UI было видно причину, а не одну фразу «Validation failed». Если тело — **HTML** (часто так отдаёт Next при 404/500 вместо `{ error }`) или `Content-Type: text/html`, в сообщение **не** подставляется вся разметка, а короткая русская формулировка вида «Ошибка HTTP …: сервер вернул HTML вместо JSON».
2. Бросается обычный **`Error`** с этим текстом — без отдельной иерархии классов.
3. Вызывающий код (экран/страница) в **`catch`** может показать `error.message` или свой запасной текст на русском.

Если вы видите такое сообщение при запросе к `/api/...`, имеет смысл проверить в **Network**: реальный статус, не ушёл ли запрос не на тот URL, и что route handler действительно отдаёт JSON.

## Ограничения (MVP)

- Нет авторизации и заголовков с токенами.
- Нет универсального «репозитория» — только явные методы под маршруты.
- Успешный ответ ожидается как **JSON** (`response.json()`).

## Где что используется

- **Expo:** основные экраны (гараж, карточка мотоцикла, журнал, формы) уже ходят через `createMotoTwinEndpoints`.
- **Веб:** подключены **гараж**, **онбординг**, **страница мотоцикла** (`/vehicles/[id]`) для перечисленных операций выше.
- **По-прежнему локальный `fetch`:** другие страницы и сценарии вне списка разрешённых файлов; их можно переводить на клиент точечно.

## Переименования методов (parity)

Ранее использовались имена вроде `getGarage`, `getVehicleNodeTree`, `getVehicleServiceEvents`, `createVehicleServiceEvent`, а также `getBrands` / `getModels` / `getModelVariants` (3-уровневый каталог). Текущие канонические имена — в таблице выше; старые имена удалены, чтобы везде был один контракт. Для каталога моделей канон — `getMotorcycle*` (4 уровня).
