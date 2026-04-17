# MotoTwin Shared Extraction - Step 1

## Что перенесено в shared-пакеты

В этом шаге перенесена только чистая и явно переиспользуемая логика из `src/app/vehicles/[id]/page.tsx`.

## `packages/types`

Добавлены/уточнены практичные типы:
- `NodeStatus`
- `ServiceEventKind`
- `ServiceEventItem` и `ServiceEventNode`
- `NodeTreeItem` и `NodeStatusExplanation` (shape, который уже нужен UI)
- `ServiceEventsFilters`
- `ServiceEventsSortField`
- `ServiceEventsSortDirection`
- `MonthlyServiceLogSummary`
- `MonthlyServiceLogGroup`

Цель: дать общий lightweight контракт для web и будущего Expo, без попытки отражать весь backend schema.

## `packages/domain`

Добавлены pure helpers:
- status helpers:
  - `getNodeStatusPriority`
  - `getNodeStatusLabel`
  - `compareNodeStatuses`
- service log helpers:
  - `filterAndSortServiceEvents`
  - `groupServiceEventsByMonth`
  - `getStateUpdateSummary`
  - `getMonthlyCostLabel`

Эти функции:
- детерминированы;
- не зависят от React;
- не зависят от fetch/API;
- не содержат UI рендера.

## Что изменено в web-странице

В `src/app/vehicles/[id]/page.tsx` заменены только локальные pure helper-реализации на импорты из shared:
- фильтрация/сортировка service log;
- группировка по месяцам и monthly summary;
- текст summary для `STATE_UPDATE`;
- формат monthly costs.

UI, модалки, data loading, API вызовы и поведение страницы не менялись.

## Почему это безопасно шарить

Перенесенная логика уже была:
- изолированной от React state lifecycle;
- без side effects;
- с понятным входом/выходом;
- полезной для web и mobile сценариев service log.

Поэтому перенос снижает дублирование без риска изменения backend поведения.

## Что намеренно оставлено в web (пока)

На этом шаге не переносились:
- React-компоненты и JSX;
- модальные флоу и локальные UI interaction state;
- fetch/data loading и обработка ошибок;
- формы создания событий, edit profile и update state orchestration;
- entangled page-specific logic.

## Что переносить следующим шагом

Рекомендуемый следующий небольшой шаг:
1. Вынести общие форматтеры лейблов/дат, используемые в нескольких экранах (`usage/profile/status`).
2. Вынести типы response envelope для API client слоя в `packages/types`.
3. Начать подключать shared `types/domain` в Expo экраны для read-only сценариев (garage, vehicle detail, service log).
