# TopNodeState Cache Plan

## 1. Context

`GET /api/vehicles/[id]/node-tree` уже рассчитывает фактический `effectiveStatus` динамически на основе:
- `ServiceEvent`
- `NodeMaintenanceRule`
- `NodeState`
- `Vehicle.odometer`
- `Vehicle.engineHours`
- текущей даты

Этот расчет является текущим source of truth для статусной логики.

## 2. Why `TopNodeState` becomes cached summary

`TopNodeState` нужен как быстрый compatibility/read-model слой для верхних узлов,
но не как самостоятельный источник бизнес-истины.

Цель:
- хранить всегда актуальный кэш итогового статуса top-level узлов;
- не дублировать и не расходиться с логикой node-tree;
- использовать один и тот же calculation helper для обоих сценариев.

## 3. Why node-tree remains the calculation reference

`node-tree` содержит полную логику:
- leaf `computedStatus`
- merge `directStatus` + `computedStatus`
- агрегация parent `effectiveStatus` по приоритету
- explanation payload

Поэтому именно эта логика должна быть reference implementation,
а `TopNodeState` — кэш результата верхнего среза.

Семантика отображения дерева (UX, 2026-04-18):
- `GET …/node-tree` — **источник правды для UI дерева узлов**: если по всему поддереву корня нет осмысленных статусов, **`effectiveStatus` и `status` остаются `null`**. Значение **не** подменяется на `OK`.
- Кэш **`TopNodeState`** может по-прежнему хранить не-null `status` (например, fallback `OK` при невыразимом enum в БД или устаревшая запись). Это **не** следует интерпретировать в дереве узлов как подтверждённое «всё в порядке», если актуальный ответ `node-tree` даёт `null` для того же корня. Экраны, читающие только `top-nodes`, должны помнить об этом рассинхроне до выравнивания кэша под ту же семантику.
- Для любых узлов (включая не-корни) `null` — допустимое состояние «нет данных / не вычислено».

## 4. What is implemented now

### Step 1 (done earlier): extraction
- создан `src/lib/maintenance-status.ts` с переиспользуемыми helper-функциями:
  - приоритет статусов
  - leaf status calculation
  - direct/computed/effective merge
  - parent aggregation
- `src/app/api/vehicles/[id]/node-tree/route.ts` переведен на эти helpers
  без изменения response shape и семантики.

### Step 2 (done earlier): service-event transaction updates cache
В `POST /api/vehicles/[id]/service-events` после создания `ServiceEvent` и обновления `NodeState`
в той же транзакции выполняется:

1. Определение затронутого root top-level узла (ancestor выбранного leaf).
2. Пересчет его `effectiveStatus` через shared helper logic.
3. `TopNodeState.upsert` для пары `(vehicleId, rootNodeId)`:
   - `status` = пересчитанный `effectiveStatus`;
   - `lastServiceEventId` = id нового `ServiceEvent` when appropriate
     (когда итоговый статус root = `RECENTLY_REPLACED`).

Итог: `TopNodeState` начинает работать как актуализируемый cached summary для затронутого top-level узла.

### Step 3 (done now): state patch transaction updates all top-level cache records
В `PATCH /api/vehicles/[id]/state` сохранено текущее поведение (валидация, проверка vehicle,
обновление `odometer/engineHours`, создание `STATE_UPDATE` service event), и в той же транзакции добавлено:

1. Чтение полного дерева узлов (`Node`) и всех `NodeState` для vehicle.
2. Чтение maintenance rules и latest service events для расчета статусов.
3. Пересчет `effectiveStatus` для **всех root top-level узлов** через shared helper logic.
4. `TopNodeState.upsert` для каждой пары `(vehicleId, rootNodeId)`:
   - `status` = пересчитанный `effectiveStatus`;
   - при отсутствии вычислимого статуса используется safe fallback:
     существующий `TopNodeState.status`, иначе `OK`.

Итог: после изменения пробега/моточасов кэш верхнего уровня синхронизируется для всего мотоцикла сразу.

## 5. Next routes to update

Чтобы `TopNodeState` был always-up-to-date cache summary, следующим шагом нужно обновить маршруты,
которые меняют входные данные статуса:

1. (опционально) `PATCH /api/vehicles/[id]/profile`
- напрямую не меняет maintenance status input,
  но можно оставить без пересчета, если rule logic не зависит от ride profile.

2. `GET /api/vehicles/[id]/top-nodes`
- оставить контракт без изменений;
- endpoint читает уже актуализированный cached `TopNodeState`.

## 6. Guardrails for next step

- не менять schema Prisma;
- не менять публичный response shape node-tree/top-nodes;
- не форкать логику статусов в route handlers;
- использовать единые helpers из `src/lib/maintenance-status.ts`.
