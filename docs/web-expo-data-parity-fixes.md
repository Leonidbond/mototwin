# Паритет данных Web / Expo (итерация)

**Дата:** 2026-04-18  
**Основание:** [web-expo-parity-audit.md](./web-expo-parity-audit.md), фокус на одних и тех же пользовательских данных при разных раскладках UI.

## Сделано

### Гараж (Expo `app/index.tsx`)

- Карточка строится через **`buildGarageCardProps`** и общие view models (`VehicleSummaryViewModel`, `RideProfileViewModel`).
- Отображаются: подпись бренд | модель, заголовок, подзаголовок, год/версия (как на web, с `|` в строке года).
- Метрики: пробег, моточасы, VIN — из **`summary`** (включая «Не указаны» / «Не указан» там, где на web так же показываются плейсхолдеры в блоках).
- Блок **«Профиль эксплуатации»**: все четыре поля при наличии `rideProfile`; иначе короткое сообщение без профиля.
- Спеки двигатель / охлаждение / колёса / тормоза: из **`specHighlights`**, с фильтром **`filterMeaningfulGarageSpecHighlights`** (без шумных «Не указан*» в компактном списке чипов).

### Журнал обслуживания (Expo `service-log.tsx`)

- Группировка и фильтрация через **`buildServiceLogTimelineProps`** (тот же путь, что на web).
- Месячная сводка: подписи **«Обслуживание: N»**, **«Обновления состояния: N»** (как на web).
- Фильтр типа записи: подписи **«Сервис»**, **«Обновление состояния»** (значения `SERVICE` / `STATE_UPDATE` без изменений).
- Сортировка: добавлены поля **сервис, моточасы, стоимость, комментарий** (в дополнение к дате, типу, узлу, пробегу) — паритет с web.
- Карточка сервисного события: строка узла **`entry.secondaryTitle`**, как на web (вместо `expoServiceNodeLabel`).

### Профиль мотоцикла (Expo `profile.tsx`)

- Русские подписи полей (никнейм, сценарий, стиль, нагрузка, интенсивность), выровнено с web по смыслу.

### Новый мотоцикл / onboarding

- **Expo `vehicles/new.tsx`**: стартовый ride profile из **`createInitialAddMotorcycleFormValues()`** (в т.ч. `ridingStyle: "ACTIVE"` как на web).
- **Web `onboarding/page.tsx`**: начальное состояние профиля поездки из того же хелпера (`initialRideProfileForm()`).

### Shared (`packages/domain`)

- **`filterMeaningfulGarageSpecHighlights`** в `component-contract-props.ts` (экспорт из пакета).

### Карточка ТС на web — канонический `VehicleDetail` (2026-04-18)

- Ответы `getVehicleDetail` / обновление профиля с wire-формой Prisma (`brand`, `model`, `modelVariant`) маппятся в общий **`VehicleDetail`** через **`vehicleDetailFromApiRecord`** (`packages/domain`), тип wire — **`VehicleDetailApiRecord`** (`packages/types`).
- Страница `src/app/vehicles/[id]/page.tsx` больше не держит отдельный локальный тип мотоцикла; заголовок и VM строятся так же по смыслу, как раньше (те же строки `brandName` / `modelName` / год / версия).

### Дефолт валюты — новое сервисное событие (2026-04-18)

- Каноническое значение по умолчанию: **RUB** (ISO 4217), константа **`DEFAULT_ADD_SERVICE_EVENT_CURRENCY`** и **`createInitialAddServiceEventFormValues`** в `packages/domain/src/forms.ts`.
- **Web** (`src/app/vehicles/[id]/page.tsx`): поле валюты инициализируется из shared helper; сброс формы подставляет тот же дефолт.
- **Expo** (`apps/app/app/vehicles/[id]/service-events/new.tsx`): то же; placeholder поля «Валюта» — `RUB`.
- В API по-прежнему уходит строка кода валюты (нормализация без изменения контракта).

## Файлы

| Файл |
|------|
| `apps/app/app/index.tsx` |
| `apps/app/app/vehicles/[id]/service-log.tsx` |
| `apps/app/app/vehicles/new.tsx` |
| `apps/app/app/vehicles/[id]/profile.tsx` |
| `src/app/onboarding/page.tsx` |
| `packages/domain/src/component-contract-props.ts` |
| `packages/domain/src/forms.ts` |
| `packages/domain/src/vehicle-view-models.ts` |
| `packages/domain/src/index.ts` |
| `packages/types/src/vehicle.ts` |
| `docs/web-expo-parity-audit.md` |
| `docs/web-expo-data-parity-fixes.md` |
| `docs/web-expo-parity-audit-repeat.md` |
| `docs/shared-form-contracts.md` |
| `packages/types/src/forms.ts` |
| `src/app/vehicles/[id]/page.tsx` |
| `apps/app/app/vehicles/[id]/service-events/new.tsx` |

## Impact

| Слой | Изменения |
|------|-----------|
| **Web** | Onboarding: единый источник дефолтов ride profile; форма нового сервисного события — дефолт валюты **RUB** из domain. |
| **Expo** | Гараж, журнал, профиль, новый мотоцикл — ближе к web по данным и подписям; форма нового сервисного события — тот же дефолт **RUB**. |
| **Shared** | Фильтр спек гаража; журнал — `buildServiceLogTimelineProps`; **`DEFAULT_ADD_SERVICE_EVENT_CURRENCY`** / initial values для сервисного события. |
| **Backend** | Нет. |

## QA (ручная)

- Сравнить одну и ту же машину: гараж (метрики, VIN, профиль, спеки при заполненных полях БД), журнал (узел в строке сервиса, месячные счётчики, сортировка), экран редактирования профиля, форма нового мотоцикла (дефолты chips).
- `npx tsc --noEmit` — успешно после изменений.

## Оставшееся (вне этого шага)

- Low-only пункты аудита (свёртка длинного комментария в журнале на Expo и т.д.).
- При необходимости позже вынести русские подписи месячной сводки в shared-константы.
