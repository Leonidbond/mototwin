# Общие контракты компонентов (web + Expo)

## Зачем контракты без общего UI

MotoTwin — два клиента (Next.js и Expo) с разной вёрсткой и навигацией. Дублировать **визуальные** компоненты между платформами сейчас нецелесообразно: разные примитивы (`div` / `View`), жесты, модальные паттерны и плотность экрана.

Вместо этого мы выносим в `@mototwin/types` **семантические контракты пропсов**: что секция означает для продукта (заголовки, строки из view models, флаги загрузки, колбэки без DOM/React Native типов). Оба клиента остаются хозяевами разметки, но могут **согласовать форму данных** и проще сравнивать экраны при ревью.

## Как это помогает паритету

- Один и тот же смысл секции описан одним типом (`GarageCardProps`, `VehicleHeaderProps`, …).
- Данные по возможности строятся из уже общих **view models** и **form contracts** (`VehicleSummaryViewModel`, `AddServiceEventFormValues`, …).
- В `@mototwin/domain` можно собрать готовый объект пропсов из сырых сущностей (`buildGarageCardProps`, `buildServiceLogTimelineProps`, …), не навязывая общий React-компонент.

## Где лежат типы и хелперы

| Назначение | Пакет | Файл / экспорт |
|------------|--------|----------------|
| Контракты пропсов секций и форм | `@mototwin/types` | `component-contracts` (реэкспорт из пакета) |
| Сборка пропсов из моделей | `@mototwin/domain` | `buildGarageCardProps`, `buildVehicleHeaderProps`, `buildVehicleStateSectionProps`, `buildNodeTreeSectionProps`, `buildServiceLogTimelineProps` |

## Секции с общими контрактами

| Контракт | Назначение |
|----------|------------|
| `GarageCardProps` | Карточка мотоцикла в списке гаража (подпись бренда/модели, summary, профиль поездки, опциональные «спеки»). |
| `VehicleHeaderProps` | Шапка карточки мотоцикла (`VehicleDetailViewModel` + опциональные действия). |
| `VehicleStateSectionProps` | Блок пробега / моточасов и режим редактирования (без полей формы — см. форму ниже). |
| `RideProfileSectionProps` | Локализованный профиль эксплуатации, пустое состояние, опциональный коллапс. |
| `TechnicalInfoSectionProps` | Таблица тех. полей из `VehicleTechnicalInfoViewModel`. |
| `NodeTreeSectionProps` | Секция дерева узлов (корни — `NodeTreeItemViewModel[]`, загрузка, ошибки). |
| `NodeTreeItemProps` | Одна строка дерева: узел, глубина, раскрытие, действие «добавить сервис» с листа. |
| `ServiceLogTimelineProps` | Журнал по месяцам + опционально фильтры/сортировка и колбэки. |
| `ServiceLogEntryProps` | Одна запись журнала (`ServiceLogEntryViewModel`). |
| `AddServiceEventFormProps` | Значения и жизненный цикл отправки формы события (поля — `AddServiceEventFormValues`). |
| `UpdateVehicleStateFormProps` | Форма обновления пробега / моточасов. |
| `EditVehicleProfileFormProps` | Редактирование никнейма, VIN и профиля поездки (`onPatchValues` без событий ввода). |
| `AddMotorcycleFormProps` | Онбординг / добавление мотоцикла: каскад бренд→модель→вариант + профиль поездки. |

## Что остаётся платформенным

- Разметка, стили, анимации, модалки, списки и навигация (`Link`, `router`, табы).
- Локальное состояние раскрытия дерева (`Set`, анимации), каскадные `<select>` на web vs отдельные экраны на mobile.
- Типы `ReactNode`, обработчики `ChangeEvent` / `NativeSyntheticEvent` — только в коде платформы, не в `@mototwin/types`.

## Намеренно не обобщено

Если секция требует слишком много платформенных деталей (например, вложенные модалки с произвольной разметкой), контракт остаётся узким или локальным; это нормально для MVP. Расширяем по мере повторения смысла между клиентами.

## Связанные документы

- Общие view models и формы: `docs/shared-vehicle-view-models.md`, `docs/shared-form-contracts.md`, `docs/shared-service-log-view-models.md`, `docs/shared-node-tree-view-models.md`.
- API-клиент: `docs/shared-api-client.md`.
