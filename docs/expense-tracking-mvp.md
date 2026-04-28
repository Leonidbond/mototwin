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

- `ExpenseCategory`: `PART`, `CONSUMABLE`, `SERVICE_WORK`, `REPAIR`, `DIAGNOSTICS`, `OTHER`.
- `ExpenseInstallStatus`: legacy display/status field `BOUGHT_NOT_INSTALLED`, `INSTALLED`, `NOT_APPLICABLE`.
- `ExpensePurchaseStatus`: `PLANNED`, `PURCHASED`.
- `ExpenseInstallationStatus`: `NOT_INSTALLED`, `INSTALLED`.
- `ExpenseItem`:
  - обязательные: `vehicleId`, `category`, `installStatus`, `expenseDate`, `title`, `amount` (`Decimal(12,2)`), `currency`;
  - optional links: `nodeId`, `serviceEventId`, `shoppingListItemId` (`PartWishlistItem`);
  - lifecycle: `purchaseStatus`, `installationStatus`, `purchasedAt`, `installedAt`;
  - snapshots: `partSku`, `partName`, `vendor`, `odometer`, `engineHours`;
  - `quantity`, `comment`, `createdAt`, `updatedAt`.

Связь `shoppingListItemId` — это продуктовый `ShoppingListItem`, который в текущем коде реализован моделью `PartWishlistItem`.

## Статус установки

- `BOUGHT_NOT_INSTALLED` — деталь куплена заранее, но ещё не установлена.
- `INSTALLED` — расход связан с установленной деталью/сервисным событием.
- `NOT_APPLICABLE` — расход без установки: диагностика, работа сервиса и подобные.

Отдельная метрика **«куплено, но не установлено»** считается только по:

- `purchaseStatus = PURCHASED`;
- `installationStatus = NOT_INSTALLED`;
- `serviceEventId = null`.

## Агрегация

- **По валютам:** отдельные суммы и число расходов; смешанные валюты не складываются в одну сумму.
- **По году/сезону:** календарный год по `expenseDate`.
- **По месяцам:** календарный месяц внутри выбранного года.
- **По узлам:** `nodeId` / `node.name`, если узел задан; иначе группа «Без узла».
- **В дереве узлов:** parent node агрегирует расходы своего узла и всех дочерних узлов; leaf node показывает только свои расходы.
- **По категориям:** русские подписи из shared domain labels.

## Поведение клиентов

| Клиент | Где | Данные |
|--------|-----|--------|
| Web | `/expenses` | общая страница расходов гаража/пользователя |
| Web | `/vehicles/[id]/expenses` | та же аналитика, отфильтрованная по одному мотоциклу |
| Expo | `vehicles/[id]/expenses` | vehicle-scoped аналитика по `ExpenseItem` |

Страница расходов реализована как dashboard, близкий на web и mobile:

- верхняя панель: выбор мотоцикла/сезона/месяца, добавление расхода;
- KPI-карточки: всего, сезон, число расходов, средний расход в месяц, куплено/не установлено, самый дорогой узел;
- график расходов по месяцам;
- структура расходов по категориям;
- топ узлов;
- блок **«Куплено, не установлено»**;
- быстрые выводы;
- таблица/список **«Все расходы»** с поиском и фильтрами.

Валюта визуальных графиков по умолчанию — `RUB`. Если рублей в данных нет, используется первая доступная валюта. Общие итоговые карточки остаются мультивалютными: суммы разных валют выводятся отдельно и не складываются.

Все блоки dashboard строятся от текущего набора фильтров. Если страница открыта из дерева узлов через `nodeId`, фильтр применяется к выбранному узлу и всему его поддереву.

Поведение блока **«Куплено, не установлено»**:

- стрелка в заголовке открывает страницу подбора/списка покупок с фильтром `BOUGHT`;
- клик по конкретной детали открывает тот же сценарий установки, что и на странице подбора: позиция подсвечивается и запускается создание `ServiceEvent`;
- если расход не связан с wishlist-позицией, fallback-действие — отметить `ExpenseItem` установленным напрямую.

В блоке **«Все расходы»** переход к журналу обслуживания выполняется только через кнопку **«Событие»** у расхода, связанного с `ServiceEvent`; вся строка расхода не является кликабельной.

Экспорт отчета не входит в текущий UI страницы расходов.

Пустое состояние: **«Расходов пока нет»** с подсказкой добавить технический расход или стоимость в сервисное событие.

## API

- `GET /api/expenses?year=2026&vehicleId=...` — список расходов + analytics.
- `GET /api/expenses/node-summary?vehicleId=...&year=2026` — агрегаты расходов для полного дерева узлов.
- `GET /api/expenses/uninstalled?vehicleId=...&nodeId=...` — купленные, но не установленные детали для выбора в ServiceEvent.
- `POST /api/expenses` — ручной технический расход.
- `PATCH /api/expenses/[expenseId]` — редактирование.
- `DELETE /api/expenses/[expenseId]` — удаление.
- `POST /api/shopping-list/[id]/create-expense` — создать `ExpenseItem` из позиции списка покупок.
- `PATCH /api/expenses/[expenseId]/mark-installed` — отметить расход установленным.

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
- category классифицируется эвристически: `PART` / `CONSUMABLE` / `SERVICE_WORK` / `REPAIR` / `DIAGNOSTICS` / `OTHER`;
- `installedPartsJson.source === "wishlist"` + `wishlistItemId` заполняет `shoppingListItemId`.

Если `ServiceEvent` устанавливает позицию из wishlist или выбранный ранее купленный `ExpenseItem`, standalone-расход `NOT_INSTALLED` обновляется в той же транзакции:

- `serviceEventId = ServiceEvent.id`;
- `installationStatus = INSTALLED`;
- `installedAt = ServiceEvent.eventDate`;
- `odometer/engineHours` берутся из ServiceEvent;
- связанный `PartWishlistItem.status = INSTALLED`.

Это не даёт двойного учёта: одна купленная заранее деталь после установки становится установленным расходом, а не двумя расходами.

При удалении `SERVICE` события связанный `ExpenseItem` удаляется.

### PartWishlistItem

При создании расхода из wishlist-строки создаётся standalone `ExpenseItem`:

- `shoppingListItemId = PartWishlistItem.id`;
- `category = PART`;
- `installStatus = BOUGHT_NOT_INSTALLED`;
- `purchaseStatus = PURCHASED`;
- `installationStatus = NOT_INSTALLED`;
- `expenseDate/purchasedAt = дата покупки`.

После установки через ServiceEvent wishlist-строка получает статус `INSTALLED`.

## Интеграция с деревом узлов

Расходы остаются отдельной страницей `/expenses`, но в полном дереве узлов показываются как компактный контекст к узлу.

Для каждого узла дерево получает `ExpenseNodeSummaryItem` из `GET /api/expenses/node-summary`:

- `totalByCurrency[]` — суммы отдельно по валютам, без конвертации;
- `expenseCount`;
- `purchasedNotInstalledCount`;
- `latestExpenses` — последние 3 расхода.

Правила:

- leaf node показывает только расходы своего `nodeId`;
- parent node показывает расходы своего `nodeId` и всех descendants;
- сезон = календарный год из query `year`;
- узлы без расходов не получают пустых строк;
- ссылка **«Все расходы по узлу»** ведёт на `/expenses?vehicleId=<id>&nodeId=<nodeId>&year=<year>`; на странице `/expenses` такой `nodeId` фильтрует всё поддерево.

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
7. `/expenses?vehicleId=<id>&nodeId=<nodeId>&year=<year>` фильтрует расходы по узлу и всем descendants.
8. Блок «Куплено, не установлено» ведёт в подбор с `partsStatus=BOUGHT`; конкретная позиция запускает установку через service-event flow.
