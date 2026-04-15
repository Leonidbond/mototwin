# MotoTwin MVP Functional Logic

## 1. Scope

Документ описывает **текущую реализованную** функциональную логику обслуживания в MotoTwin MVP:

- текущее состояние мотоцикла,
- история сервиса,
- правила обслуживания,
- расчет статусов leaf узлов,
- агрегация статусов вверх по дереву,
- отображение в UI.

Документ основан на текущей backend/frontend реализации, без описания будущих фич как готовых.

## 2. End-to-end functional chain

Текущая цепочка работает так:

1. В системе есть `Vehicle` с текущими значениями:
   - `odometer`
   - `engineHours`
2. В системе есть `ServiceEvent` (история обслуживания и state updates).
3. Для leaf узлов могут быть настроены `NodeMaintenanceRule`.
4. Endpoint `GET /api/vehicles/[id]/node-tree` собирает:
   - дерево `Node`,
   - `NodeState` для мотоцикла,
   - правила `NodeMaintenanceRule` для leaf,
   - последние `ServiceEvent` по leaf узлам,
   - текущее состояние `Vehicle`.
5. Для каждого leaf узла вычисляется `computedStatus`.
6. Из `computedStatus` + `directStatus` формируется leaf `effectiveStatus`.
7. `effectiveStatus` агрегируется по дереву к parent узлам.
8. UI отображает дерево со статусами, short explanation и подробным explanation modal.

## 3. Inputs used in status calculation

Для leaf статуса используются следующие входы:

- **Current motorcycle state** (`Vehicle`):
  - `odometer`
  - `engineHours`
- **Last service baseline** (`ServiceEvent`):
  - `eventDate`
  - `odometer`
  - `engineHours`
- **Maintenance rule** (`NodeMaintenanceRule`):
  - `intervalKm`, `intervalHours`, `intervalDays`
  - `warningKm`, `warningHours`, `warningDays`
  - `triggerMode`
  - `isActive`
- **Current direct node state** (`NodeState.status`) для leaf merge-логики.

## 4. How last service event is determined

В `node-tree` backend запрашивает `ServiceEvent` для leaf узлов текущего мотоцикла, сортирует их так:

- `nodeId asc`
- `eventDate desc`
- `createdAt desc`

Далее для каждого `nodeId` берется **первое** событие из отсортированного набора, то есть фактически latest event для узла.

## 5. How maintenance rules are applied

Для leaf узла:

1. Если rule отсутствует -> `computedStatus = null`.
2. Если rule неактивно (`isActive = false`) -> `computedStatus = null`.
3. Если rule есть, но нет last service event -> `computedStatus = null`.
4. Если rule + latest event есть:
   - считается elapsed по активным измерениям:
     - `elapsedKm = currentOdometer - lastServiceOdometer`
     - `elapsedHours = currentEngineHours - lastServiceEngineHours` (если оба значения есть)
     - `elapsedDays = now - lastServiceDate` (в днях)
   - считается remaining:
     - `remainingKm = intervalKm - elapsedKm`
     - `remainingHours = intervalHours - elapsedHours`
     - `remainingDays = intervalDays - elapsedDays`
   - проверяется `interval exceeded` и `warning reached`.

### Trigger mode behavior (as implemented)

- `WHICHEVER_COMES_FIRST` (основной MVP режим) и `ANY`:
  - если любое активное измерение превысило interval -> `OVERDUE`
  - иначе если любое активное измерение вошло в warning -> `SOON`
  - иначе -> `OK`
- `ALL`:
  - `OVERDUE` только если все активные измерения exceeded
  - `SOON` только если все warning-условия выполнены
  - иначе `OK`

Если активные измерения не удалось вычислить (из-за missing source values), вычисление по ним игнорируется; при недостатке данных итог может остаться `null`.

## 6. How statuses are derived (leaf)

В реализации используются 4 ключевых статуса:

- `OVERDUE`
- `SOON`
- `RECENTLY_REPLACED`
- `OK`

Для leaf сначала вычисляется `computedStatus` (rule-based), затем применяется merge с `directStatus`:

- если `computedStatus` = `OVERDUE` или `SOON` -> это приоритетный leaf `effectiveStatus`
- иначе если `directStatus` = `RECENTLY_REPLACED` и `computedStatus` = `OK` или `null` -> `effectiveStatus = RECENTLY_REPLACED`
- иначе `effectiveStatus = computedStatus ?? directStatus`

Таким образом, `RECENTLY_REPLACED` работает как временный позитивный статус, но не перекрывает `SOON/OVERDUE`.

## 7. effectiveStatus aggregation to parent nodes

Для parent узлов `effectiveStatus` агрегируется из:

- собственного node self effective status,
- `effectiveStatus` всех children.

Приоритет фиксирован:

`OVERDUE > SOON > RECENTLY_REPLACED > OK`

Если ни у узла, ни у потомков статуса нет -> `effectiveStatus = null`.

## 8. How recalculation is triggered

## 8.1 State update flow

Пользователь редактирует `odometer/engineHours` на vehicle detail странице:

- `PATCH /api/vehicles/[id]/state` обновляет `Vehicle` и пишет `ServiceEvent` с `eventKind = STATE_UPDATE`.
- После успеха frontend перезагружает:
  - `GET /api/vehicles/[id]/node-tree`
  - `GET /api/vehicles/[id]/service-events`

За счет новых current values recalculation в `node-tree` дает новый статус.

## 8.2 Service event flow

Пользователь создает сервисное событие:

- `POST /api/vehicles/[id]/service-events` (только leaf узел)
- backend:
  - создает `ServiceEvent`
  - upsert в `NodeState` -> `RECENTLY_REPLACED`
  - обновляет `TopNodeState` (compatibility)
- frontend после успеха перезагружает:
  - `node-tree`
  - `service-events`

Новый latest service baseline и/или `NodeState` влияют на следующий расчет.

## 9. Short explanation and detailed explanation

## 9.1 Short explanation

`reasonShort` формируется backend-логикой на основе:

- итогового `computedStatus` (`SOON` / `OVERDUE`)
- `triggeredBy` (`km`, `hours`, `days`)

Примеры:

- `Скоро по пробегу`
- `Просрочено по времени`

UI показывает short explanation в leaf строке дерева как clickable элемент.

## 9.2 Detailed explanation

`statusExplanation` для leaf узлов включает:

- `reasonShort`, `reasonDetailed`
- `triggerMode`
- `current` state (`odometer`, `engineHours`, `date`)
- `lastService`
- `rule`
- `usage` (`elapsed*`, `remaining*`)
- `triggeredBy`

UI открывает модалку `Пояснение расчета` и рендерит эти данные в табличном виде для сравнения по измерениям.

## 10. Tree visualization in UI (functional effect)

На странице `/vehicles/[id]`:

- дерево узлов рендерится иерархически;
- parent/child разворачиваются через local expand state;
- статусы отображаются бейджами;
- leaf узлы показывают short explanation и action `+` для быстрого сервисного события;
- сервисный журнал и форма события вынесены в модальные окна;
- после операций UI перезагружает данные, поэтому пользователь сразу видит перерасчитанные статусы.

## 11. Current simplifications and MVP assumptions

- Расчет статусов выполняется на чтении (`GET /node-tree`), без background jobs и без persisted precompute.
- `WHICHEVER_COMES_FIRST` является основным практическим режимом MVP.
- `TopNodeState` сохранен для совместимости, хотя основная leaf-логика опирается на `NodeState` + rule calculation.
- Для `STATE_UPDATE` в `ServiceEvent` используется обязательный `nodeId` (ограничение текущей схемы).
- API/garage слой пока работает с demo-user сценарием.

