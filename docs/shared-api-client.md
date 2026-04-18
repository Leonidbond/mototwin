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
| `getBrands()` | `GET /api/brands` |
| `getModels(brandId)` | `GET /api/models?brandId=` |
| `getModelVariants(modelId)` | `GET /api/model-variants?modelId=` |
| `createVehicle(input)` | `POST /api/vehicles` |

Типы ответов экспортируются из `@mototwin/types` (модуль `api`): `GarageVehiclesResponse`, `VehicleDetailResponse`, и т.д.

## Ошибки

1. **`ApiClient.request`** при `!response.ok` читает тело через **`readHttpErrorMessage`**: сначала пытается разобрать JSON и взять поле **`error`** (строка). Если тело — **HTML** (часто так отдаёт Next при 404/500 вместо `{ error }`) или `Content-Type: text/html`, в сообщение **не** подставляется вся разметка, а короткая русская формулировка вида «Ошибка HTTP …: сервер вернул HTML вместо JSON».
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

Ранее использовались имена вроде `getGarage`, `getVehicleNodeTree`, `getVehicleServiceEvents`, `createVehicleServiceEvent`. Текущие канонические имена — в таблице выше; старые имена удалены, чтобы везде был один контракт.
