# Expense tracking MVP (`ExpenseItem`)

**Дата:** 2026-04-28  
**Статус:** реализована отдельная модель расходов `ExpenseItem`.

## Источник данных

Expense analytics строится только из таблицы **`expense_items`** (`ExpenseItem`), а не напрямую из журнала обслуживания.

`ExpenseItem` может быть создан из трёх источников:

- `ServiceEvent` с валидной стоимостью и валютой;
- `PartWishlistItem` со статусом `BOUGHT`, стоимостью и валютой;
- ручной технический расход без `ServiceEvent` (например диагностика, работа сервиса, ремонт).

Старые поля **`ServiceEvent.costAmount/currency`** и **`PartWishlistItem.costAmount/currency`** остаются для совместимости форм, но аналитика читает `ExpenseItem`.

## Что входит в сводку

- Только технические расходы: обслуживание, запчасти, ремонт, диагностика, работа сервиса, прочие технические расходы.
- **`amount > 0`** и непустая **`currency`**.
- Сезон = календарный год: `YYYY-01-01` включительно до `(YYYY+1)-01-01` исключительно.

## Что исключается

- Бензин, страховка, штрафы, парковка, мойка, экипировка.
- Любые нетехнические категории: они не представлены в `ExpenseCategory`, поэтому не попадают в UI/API аналитики.
- `STATE_UPDATE` не создаёт расход.

## Data model

Prisma:

- `ExpenseCategory`: `SERVICE`, `PARTS`, `REPAIR`, `DIAGNOSTICS`, `LABOR`, `OTHER_TECHNICAL`.
- `ExpenseInstallStatus`: `BOUGHT_NOT_INSTALLED`, `INSTALLED`, `NOT_APPLICABLE`.
- `ExpenseItem`:
  - обязательные: `vehicleId`, `category`, `installStatus`, `expenseDate`, `title`, `amount`, `currency`;
  - optional links: `nodeId`, `serviceEventId`, `shoppingListItemId` (`PartWishlistItem`);
  - snapshots: `partSku`, `partName`;
  - `quantity`, `comment`, `createdAt`, `updatedAt`.

Связь `shoppingListItemId` — это продуктовый `ShoppingListItem`, который в текущем коде реализован моделью `PartWishlistItem`.

## Статус установки

- `BOUGHT_NOT_INSTALLED` — деталь куплена заранее, но ещё не установлена.
- `INSTALLED` — расход связан с установленной деталью/сервисным событием.
- `NOT_APPLICABLE` — расход без установки: диагностика, работа сервиса и подобные.

Отдельная метрика **«куплено, но не установлено»** считается по `installStatus === BOUGHT_NOT_INSTALLED`.

## Агрегация

- **По валютам:** отдельные суммы и число расходов; смешанные валюты не складываются в одну сумму.
- **По году/сезону:** календарный год по `expenseDate`.
- **По месяцам:** календарный месяц внутри выбранного года.
- **По узлам:** `nodeId` / `node.name`, если узел задан; иначе группа «Без узла».
- **По категориям:** русские подписи из shared domain labels.

## Поведение клиентов

| Клиент | Где | Данные |
|--------|-----|--------|
| Web | `/expenses` | общая страница расходов гаража/пользователя |
| Web | `/vehicles/[id]/expenses` | та же аналитика, отфильтрованная по одному мотоциклу |
| Expo | `vehicles/[id]/expenses` | vehicle-scoped аналитика по `ExpenseItem` |

Пустое состояние: **«Расходов пока нет»** с подсказкой добавить технический расход или стоимость в сервисное событие.

## API

- `GET /api/expenses?year=2026&vehicleId=...` — список расходов + analytics.
- `POST /api/expenses` — ручной технический расход.
- `PATCH /api/expenses/[expenseId]` — редактирование.
- `DELETE /api/expenses/[expenseId]` — удаление.

API возвращает:

- `expenses: ExpenseItem[]`;
- `analytics: ExpenseAnalyticsSummary`;
- `years: number[]`.

## Синхронизация источников

### ServiceEvent

При создании/редактировании `SERVICE` события с валидными `costAmount/currency` backend создаёт или пересоздаёт связанный `ExpenseItem`:

- `serviceEventId = ServiceEvent.id`;
- `nodeId = ServiceEvent.nodeId`;
- `expenseDate = ServiceEvent.eventDate`;
- `title = ServiceEvent.serviceType`;
- category классифицируется эвристически: parts/repair/diagnostics/labor/service;
- `installedPartsJson.source === "wishlist"` + `wishlistItemId` заполняет `shoppingListItemId`.

При удалении `SERVICE` события связанный `ExpenseItem` удаляется.

### PartWishlistItem

При создании/редактировании wishlist-строки со статусом `BOUGHT`, валидной суммой и валютой создаётся standalone `ExpenseItem`:

- `shoppingListItemId = PartWishlistItem.id`;
- `category = PARTS`;
- `installStatus = BOUGHT_NOT_INSTALLED`;
- `expenseDate = updatedAt`.

При смене статуса или стоимости этот расход пересинхронизируется.

## Shared API

- Типы: `packages/types/src/expense-item.ts` (`ExpenseItem`, `ExpenseAnalyticsSummary`, DTO create/update).
- Доменные хелперы: `packages/domain/src/expense-summary.ts` — `buildExpenseAnalyticsFromItems`, labels категорий/статусов, форматирование сумм.
- HTTP client: `packages/api-client/src/mototwin-endpoints.ts` — `getExpenses`, `createExpense`, `updateExpense`, `deleteExpense`.

## QA (кратко)

1. Расходы в RUB и EUR отображаются отдельными итогами, без конвертации и сложения.
2. `POST /api/expenses` создаёт ручной технический расход без `ServiceEvent`.
3. `ServiceEvent` с суммой создаёт связанный `ExpenseItem`; редактирование стоимости пересинхронизирует его.
4. Wishlist item `BOUGHT` со стоимостью создаёт метрику «куплено, но не установлено».
5. Сезон 2026 включает даты `2026-01-01` … `2026-12-31`.
6. `/expenses` показывает общий гараж, `/vehicles/[id]/expenses` — один мотоцикл.
