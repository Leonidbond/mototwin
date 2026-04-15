Теперь у нас есть:
	•	дерево узлов
	•	NodeState
	•	NodeMaintenanceRule
	•	базовые seeded-правила ресурса для ключевых leaf nodes

Следующий правильный шаг — реализовать расчет статуса leaf node на backend.

Что должен делать расчет

Для каждого leaf node статус должен определяться по трем входам:
	1.	правило ресурса узла

	•	intervalKm
	•	intervalHours
	•	intervalDays
	•	warningKm
	•	warningHours
	•	warningDays
	•	triggerMode

	2.	последнее обслуживание этого leaf node

	•	дата последнего ServiceEvent
	•	пробег последнего ServiceEvent
	•	моточасы последнего ServiceEvent

	3.	текущее состояние мотоцикла

	•	текущий vehicle.odometer
	•	текущий vehicle.engineHours
	•	текущая дата

Какую логику берем

Для MVP берем понятную и детерминированную логику:

Если нет правила
	•	статус null

Если правило есть, но нет ни одного ServiceEvent по этому leaf node
	•	пока статус null

Это консервативно и безопасно. Мы не будем притворяться, что знаем, когда узел обслуживался в последний раз, если в журнале этого нет.

Если есть правило и есть последний ServiceEvent

Считаем отдельно:
	•	kmRemaining
	•	hoursRemaining
	•	daysRemaining

Дальше для triggerMode = WHICHEVER_COMES_FIRST:

OVERDUE
Если хотя бы один из активных ресурсов уже исчерпан:
	•	пробег >= интервал
	•	моточасы >= интервал
	•	дни >= интервал

SOON
Если OVERDUE еще нет, но хотя бы один из активных ресурсов вошел в warning-зону:
	•	осталось по пробегу <= warningKm
	•	осталось по моточасам <= warningHours
	•	осталось по дням <= warningDays

RECENTLY_REPLACED
Если узел только что обслужен и не вошел в SOON/OVERDUE, можно пока оставить текущую логику из NodeState, если она была записана сервисным событием. Но на этом шаге я рекомендую проще:
	•	для автоматического расчета leaf node возвращать только:
	•	OVERDUE
	•	SOON
	•	OK
	•	null

А RECENTLY_REPLACED пока сохранять как прямой NodeState.status, если он есть, и учитывать как fallback, когда узел еще далеко от warning-зоны.

То есть:
	•	если сразу после сервисного события узел отмечен RECENTLY_REPLACED
	•	но ресурс еще не подошел к warning
	•	leaf можно отдавать как RECENTLY_REPLACED

OK
Если ничего из вышеописанного не сработало



## Логика автоматического статуса узла (MVP)

Ниже зафиксирована фактическая backend-логика, которая сейчас работает в `GET /api/vehicles/[id]/node-tree`.

### Что загружается для расчета

При построении дерева backend загружает:

- `vehicle`: `odometer`, `engineHours`
- все `Node` (дерево)
- `NodeState` для текущего `vehicleId`
- `NodeMaintenanceRule` (для leaf-узлов)
- последние `ServiceEvent` по каждому leaf-узлу этого `vehicle`

### Какие статусы участвуют

Для каждого узла в ответе:

- `directStatus` — прямой статус из `NodeState` (если есть)
- `computedStatus` — автоматически вычисленный статус (для leaf; для parent = `null`)
- `effectiveStatus` — финальный статус узла, который уходит в UI

### Правила расчета `computedStatus` для leaf

#### 1) Базовые условия

- если у leaf нет активного maintenance-rule -> `computedStatus = null`
- если правило есть, но нет ни одного `ServiceEvent` по этому leaf -> `computedStatus = null`

#### 2) Что вычисляется при наличии rule + latest event

Возможные измерения:

- km: `elapsedKm = vehicle.odometer - latestServiceEvent.odometer`
- hours: `elapsedHours = vehicle.engineHours - latestServiceEvent.engineHours`  
  (только если оба значения не `null`)
- days: `elapsedDays = floor((now - latestServiceEvent.eventDate) / day)`

Если измерение нельзя посчитать (например нет `engineHours`) — это измерение игнорируется.

#### 3) Активность измерений

Измерение считается активным, если соответствующий `interval*` не `null`:

- `intervalKm`
- `intervalHours`
- `intervalDays`

Warning-порог учитывается только если `warning*` не `null`.

#### 4) Trigger mode

MVP основной режим — `WHICHEVER_COMES_FIRST` (в коде `ANY` обрабатывается так же).

Для `WHICHEVER_COMES_FIRST`/`ANY`:

- если хотя бы одно активное измерение превысило интервал -> `OVERDUE`
- иначе если хотя бы одно активное измерение дошло до warning-зоны -> `SOON`
- иначе -> `OK`

Также поддержан `ALL`:

- `OVERDUE` если все активные измерения exceeded
- `SOON` если все вычислимые warning-проверки достигнуты
- иначе `OK`

### Как объединяется `computedStatus` с `directStatus`

Для leaf финальный `effectiveStatus` выбирается так:

- если `computedStatus` = `SOON` или `OVERDUE` — он имеет приоритет над `RECENTLY_REPLACED`
- если `directStatus = RECENTLY_REPLACED`, а `computedStatus` = `OK` или `null` — сохраняем `RECENTLY_REPLACED`
- в остальных случаях берем `computedStatus`, если он есть, иначе `directStatus`

Это дает желаемое поведение:

- сразу после обслуживания узел может оставаться `RECENTLY_REPLACED`
- как только ресурс входит в warning/overdue, статус переключается на `SOON`/`OVERDUE`

### Агрегация родителя (parent)

`effectiveStatus` родителя считается из своего статуса + всех детей по приоритету:

1. `OVERDUE`
2. `SOON`
3. `RECENTLY_REPLACED`
4. `OK`

Если ни у узла, ни у потомков нет статуса -> `effectiveStatus = null`.

### Что важно для эксплуатации

- Логика read-time: ничего не записывается в БД во время запроса.
- Расчет детерминирован в рамках одного ответа (используется единый `now`).
- Для корректной работы `NodeMaintenanceRule` в runtime Prisma Client должен быть сгенерирован после изменений схемы (`prisma generate` + restart dev server).

