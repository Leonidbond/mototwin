# Expo Add Motorcycle flow

## Что реализовано

В Expo добавлен рабочий flow добавления мотоцикла в гараж через экран `apps/app/app/vehicles/new.tsx`.

Flow сделан как **single-screen** c progressive sections:
- выбор марки;
- выбор модели (после выбора марки);
- выбор модификации (после выбора модели);
- ввод базовых данных (`nickname`, `vin`, `odometer`, `engineHours`);
- выбор профиля эксплуатации (`usageType`, `ridingStyle`, `loadType`, `usageIntensity`).

После успешного создания вызывается переход в `Garage` (`router.replace("/")`).

## Какие маршруты и данные используются

Используются существующие backend endpoints без изменения их поведения:
- `GET /api/brands` — список марок;
- `GET /api/models?brandId=...` — список моделей марки;
- `GET /api/model-variants?modelId=...` — список модификаций модели;
- `POST /api/vehicles` — создание мотоцикла.

В shared `api-client` добавлены минимальные методы:
- `getBrands()`
- `getModels(brandId)`
- `getModelVariants(modelId)`
- `createVehicle(input)`

В shared `types` добавлены минимальные типы для этого flow:
- `BrandItem`
- `ModelItem`
- `ModelVariantItem`
- `CreateVehicleInput`

## Валидация и UX

Реализована простая явная валидация (MVP):
- `brand` обязателен;
- `model` обязателен;
- `modelVariant` обязателен;
- `odometer` обязателен, целое число и `>= 0`;
- `engineHours` опционален, если заполнен — целое число и `>= 0`.

`nickname` и `vin` оставлены опциональными.

Для загрузки списков марок/моделей/модификаций показаны отдельные loading states.

При ошибках показывается понятное сообщение на экране.

## Обновление Garage после создания

На экране `apps/app/app/index.tsx` загрузка гаража переведена на `useFocusEffect`.
Это гарантирует refresh списка при возврате из Add Motorcycle flow, и новый мотоцикл появляется в гараже сразу после успешного создания.

## Что отложено

В рамках MVP сознательно отложены:
- сложный wizard/stepper UX;
- автосохранение и черновики формы;
- расширенная доменная валидация VIN;
- дополнительные onboarding-подсказки и rich-UI карточки выбора.
