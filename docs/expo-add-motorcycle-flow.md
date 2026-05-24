# Expo Add Motorcycle flow

## Что реализовано

В Expo добавлен рабочий flow добавления мотоцикла в гараж через экран `apps/app/app/vehicles/new.tsx`.

Flow сделан как **single-screen** с прогрессивными секциями (4-уровневый каскадный пикер по новому стандарту иерархии моделей):
- выбор **марки** (`MotorcycleBrand`);
- выбор **семейства модели** (`MotorcycleModelFamily`, после выбора марки);
- выбор **модификации** (`MotorcycleVariant`, после выбора семейства);
- выбор **поколения** (`MotorcycleGeneration`, после выбора модификации) — карточка показывает `yearsLabel` (или диапазон `yearFrom`–`yearTo`) и подсказку по техспекам (`engine` · `displacementCc` · `powerHpNormalized || powerValue+powerUnit` · `gearbox`);
- ввод базовых данных (`nickname`, `vin`, `odometer`, `engineHours`);
- выбор профиля эксплуатации (`usageType`, `ridingStyle`, `loadType`, `usageIntensity`).

При смене значения в любом верхнем уровне все нижестоящие выборы и связанные списки сбрасываются (cascade reset).

После успешного создания вызывается переход в `Garage` (`router.replace("/")`).

## Какие маршруты и данные используются

Используются унифицированные backend endpoints для каталога моделей (см. [api-backend.md §3.1 Catalog](./api-backend.md#31-catalog)):
- `GET /api/motorcycle-brands` — список марок;
- `GET /api/motorcycle-model-families?motorcycleBrandId=...` — список семейств марки;
- `GET /api/motorcycle-variants?motorcycleModelFamilyId=...` — список модификаций семейства;
- `GET /api/motorcycle-generations?motorcycleVariantId=...` — список поколений модификации (с `yearFrom/yearTo/yearsLabel/marketRegion/segment/supportLevel/technicalSpecs`);
- `POST /api/vehicles` — создание мотоцикла; тело включает все 4 ID (`motorcycleBrandId/motorcycleModelFamilyId/motorcycleVariantId/motorcycleGenerationId`).

В shared `api-client` (`packages/api-client`) для этого flow:
- `getMotorcycleBrands()` → `MotorcycleBrandsResponse`
- `getMotorcycleModelFamilies({ motorcycleBrandId })` → `MotorcycleModelFamiliesResponse`
- `getMotorcycleVariants({ motorcycleModelFamilyId })` → `MotorcycleVariantsResponse`
- `getMotorcycleGenerations({ motorcycleVariantId })` → `MotorcycleGenerationsResponse`
- `createVehicle(input)` → `CreateVehicleResponse` с `GarageVehicleItem`

В shared `types` (`packages/types`):
- `MotorcycleBrandPickerItem`, `MotorcycleModelFamilyPickerItem`, `MotorcycleVariantPickerItem`, `MotorcycleGenerationPickerItem` — пайлоды шагов;
- `MotorcycleBrandWire`/`MotorcycleModelFamilyWire`/`MotorcycleVariantWire`/`MotorcycleGenerationWire` — полные wire-шейпы;
- `VehicleTechnicalSpecsView` — техспеки на карточке поколения;
- `AddMotorcycleFormValues`, `AddMotorcyclePayload`, `CreateVehicleInput` — форма + payload.

## Валидация и UX

Валидация — общая с web через `validateAddMotorcycleFormValues(values, "mobile")` из `@mototwin/domain`:
- `motorcycleBrandId` обязателен;
- `motorcycleModelFamilyId` обязателен;
- `motorcycleVariantId` обязателен;
- `motorcycleGenerationId` обязателен;
- `odometer` обязателен, целое число и `>= 0`;
- `engineHours` опционален, если заполнен — целое число и `>= 0`.

`nickname` и `vin` остаются опциональными.

Для загрузки списков марок / семейств / модификаций / поколений показаны отдельные loading states. Шаг disabled до выбора родителя.

При ошибках показывается понятное сообщение на экране (через `AddMotorcycleFieldErrors`-маппинг по полям и общий список `errors[]`).

## Обновление Garage после создания

На экране `apps/app/app/garage.tsx` загрузка гаража переведена на `useFocusEffect`.
Это гарантирует refresh списка при возврате из Add Motorcycle flow, и новый мотоцикл появляется в гараже сразу после успешного создания.

## Что отложено

В рамках MVP сознательно отложены:
- сложный wizard/stepper UX (с собственным шагающим header-ом);
- автосохранение и черновики формы;
- расширенная доменная валидация VIN;
- дополнительные onboarding-подсказки и rich-UI карточки выбора (preview-панель техспек уже на web `/onboarding`, на Expo пока минимальный hint).
