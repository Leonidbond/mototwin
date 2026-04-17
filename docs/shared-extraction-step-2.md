# MotoTwin Shared Extraction - Step 2

## Что перенесено в shared-пакеты

Во втором шаге вынесена только чистая node-tree логика, которая уже использовалась в `src/app/vehicles/[id]/page.tsx` без зависимости от React rendering.

## `packages/types`

Добавлены lightweight типы для node-tree selection:
- `NodePathItem`
- `SelectedNodePath`
- `FlattenedNodeSelectOption`
- `CascadedNodeSelectionState`

Текущий `NodeStatusExplanation` оставлен и переиспользован как stable shape для UI статусов.

## `packages/domain`

Добавлены framework-agnostic helpers:
- `flattenNodeTreeToSelectOptions`
- `findNodePathById`
- `getNodeSelectLevels`
- `getAvailableChildrenForSelectedPath`
- `getSelectedNodeFromPath`
- `getLeafStatusReasonShort`

Дополнительно вынесены status label helpers:
- `getTopNodeStatusBadgeLabel`
- `getStatusExplanationTriggeredByLabel`

Все функции детерминированы, не имеют side effects, не зависят от fetch/API и React lifecycle.

## Что изменено в web-странице

В `src/app/vehicles/[id]/page.tsx` заменены локальные pure helper-реализации на импорты из shared:
- поиск path до узла по `id`
- расчет уровней node selection
- выбор final node по path
- получение children для текущего path
- короткий reason label для leaf-узла
- badge label статуса узла
- label для `triggeredBy` в статус-пояснении

UI разметка, модалки, state orchestration, data loading, API и backend behavior не менялись.

## Почему это безопасно шарить

Перенесенная логика:
- уже применялась как pure utility;
- использует только входные данные и возвращает предсказуемый результат;
- нужна и web, и Expo для одинаковой интерпретации дерева узлов и status explanation.

## Что намеренно оставлено в web

На этом шаге не переносились:
- React-компоненты и JSX;
- modal/open-close logic;
- fetch/data loading/error handling;
- page-specific interaction state.

## Что переносить следующим шагом

Небольшой безопасный шаг для Expo readiness:
1. Вынести форматтеры и view-model мапперы для service-event карточек (без JSX).
2. Вынести read-only selectors для vehicle detail header/cards.
3. Подключить shared selectors в Expo экране vehicle detail в read-only режиме.
