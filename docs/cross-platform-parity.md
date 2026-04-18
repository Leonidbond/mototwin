# MotoTwin Cross-Platform Parity

## 1. Scope

Документ фиксирует текущее состояние parity между:
- web client
- Expo mobile client

Parity оценивается по core workflows, business outcome и пользовательскому пониманию результата.

## 2. Parity principles in current project

- Backend contracts are shared truth.
- Business result should remain aligned between platforms.
- UI/layout may differ by platform conventions.
- Divergence must be explicit and documented.

## 3. Current parity matrix

## 3.1 Garage

- **Web:** implemented (`/garage`)
- **Expo:** implemented (`index`)
- **Parity status:** aligned for spec highlights (both use `filterMeaningfulGarageSpecHighlights` after `buildGarageCardProps`) and for **attention indicator** next to the motorcycle title (`attentionSummary` from `GET /api/garage`, `buildGarageAttentionIndicatorViewModel`, `statusSemanticTokens`; chip is tappable and opens the same vehicle detail route as the title)
- **Notes:** both show list states and navigation to vehicle detail; visual composition differs. See **4.2** for spec highlight rules. See [attention-flow-mvp.md](./attention-flow-mvp.md) § «Гараж: индикатор внимания у названия».

## 3.2 Add motorcycle

- **Web:** implemented (`/onboarding`)
- **Expo:** implemented (`vehicles/new`)
- **Parity status:** aligned by business outcome
- **Notes:** both use same catalog/vehicle creation routes; UX differs (web form vs mobile progressive sections).

## 3.3 Vehicle detail

- **Web:** implemented (`/vehicles/[id]`)
- **Expo:** implemented (`vehicles/[id]/index`)
- **Parity status:** mostly aligned
- **Notes:** both expose identity/state/profile/technical/node-tree context; web uses larger single-page modal orchestration.

## 3.4 Service log

- **Web:** implemented inside vehicle page modal
- **Expo:** implemented as dedicated route (`vehicles/[id]/service-log`)
- **Parity status:** aligned by business outcome
- **Notes:** both support reading `SERVICE` and `STATE_UPDATE`, filtering/sorting and grouped understanding. Entry date string: web `default`, Expo `compact`; month headers shared — **4.1**.

## 3.4.1 Expense summary (MVP)

- **Web:** block on vehicle detail (`/vehicles/[id]`), same `serviceEvents` as the service log modal; **collapsed by default**; no separate **«Журнал»** control inside the block (full journal from the node-tree section)
- **Expo:** block on vehicle detail (`vehicles/[id]/index`), loads `getServiceEvents` alongside the node tree; **collapsed by default**; same removal of **«Журнал»** from the expense block
- **Parity status:** aligned (totals, paid count, per-currency breakdown, current month, latest paid row; expand/collapse; **«Детали расходов»** only when expanded and paid count > 0)
- **Notes:** derived only from `ServiceEvent` `costAmount` / `currency` via `buildExpenseSummaryFromServiceEvents` in `@mototwin/domain`; no new Prisma model — see [expense-tracking-mvp.md](./expense-tracking-mvp.md).

## 3.4.2 Expense drill-down (MVP)

- **Web:** from vehicle detail, **«Детали расходов»** opens the **existing service log modal** with `ServiceEventsFilters.paidOnly` set; banner + **«Сбросить фильтр»** clear paid-only mode; same `serviceEvents` as the full log
- **Expo:** **«Детали расходов»** navigates to `vehicles/[id]/service-log?paidOnly=1`; banner and reset match web intent; `getServiceEvents` on service-log focus as before
- **Parity status:** aligned (user sees paid-only rows in the same journal UI as the full log; monthly grouping and summaries follow the filtered set)
- **Notes:** `isPaidServiceEvent` / `filterServiceLogEntries` with `paidOnly` in `@mototwin/domain` — see [expense-tracking-mvp.md](./expense-tracking-mvp.md). No separate Expense Details screen or `expense-details` types.

## 3.5 Add service event

- **Web:** implemented via modal form
- **Expo:** implemented route form (`vehicles/[id]/service-events/new`)
- **Parity status:** aligned
- **Notes:** both enforce leaf-node-only servicing and use same backend validations.

## 3.6 Update vehicle state

- **Web:** inline edit in vehicle page
- **Expo:** dedicated route (`vehicles/[id]/state`)
- **Parity status:** aligned
- **Notes:** both call same backend endpoint and produce `STATE_UPDATE` log side effect.

## 3.7 Edit vehicle profile

- **Web:** modal edit in vehicle page
- **Expo:** dedicated route (`vehicles/[id]/profile`)
- **Parity status:** aligned
- **Notes:** both update nickname/vin/ride profile via shared backend contract.

## 3.8 Node status semantics

- **Web:** consumes `node-tree` payload
- **Expo:** consumes same payload
- **Parity status:** aligned
- **Notes:** `effectiveStatus`, explanation semantics and severity ordering are shared.

## 3.8.1 «Требует внимания» (MVP)

- **Web:** control near vehicle title on `/vehicles/[id]` opens a **modal** listing `OVERDUE` / `SOON` nodes from the same `nodeTree`. The control is colored by **worst** attention severity (`buildAttentionActionViewModel` + `statusSemanticTokens`: any OVERDUE → critical, else any SOON → warning, else neutral). **Detailed** status text uses the **same** status-explanation modal as the node tree (`selectedStatusExplanationNode`), not a separate attention-only expander.
- **Expo:** control near title on `vehicles/[id]/index` opens screen `vehicles/[id]/attention` (reloads `getNodeTree` on focus); same summary, same severity coloring, and the same **`StatusExplanationModal`** component/path as the vehicle detail node tree for full explanations when `statusExplanation` is present.
- **Parity status:** aligned (same count, same priority order, same explanation content as tree, same journal-by-node and leaf-only add-service actions)
- **Notes:** see [attention-flow-mvp.md](./attention-flow-mvp.md); no permanent attention block in the vehicle body; no backend changes

## 3.8.2 Parts catalog API (backend / shared)

- **Web / Expo UI:** в форме wishlist доступен **опциональный** поиск и выбор SKU (`getPartSkus`), очистка выбора, отображение компактного блока каталога в списке при `sku`; ручная позиция без SKU сохраняется.
- **Shared:** `@mototwin/types` (`PartSkuViewModel`, `WishlistItemSkuInfo`, фильтры поиска, `PartWishlistFormValues.skuId`), `@mototwin/domain` (в т.ч. `applyPartSkuViewModelToPartWishlistFormValues`, `getWishlistItemSkuDisplayLines`, форматирование строк поиска), `@mototwin/api-client` — `getPartSkus`, `getPartSku` к **`GET /api/parts/skus`** и **`GET /api/parts/skus/[skuId]`**.
- **Parity status:** совпадает сценарий: поиск → выбор → сохранение с `skuId`, предзаполнение полей, **INSTALLED** → сервисное событие с учётом SKU в комментарии/`installedPartsJson` (см. [parts-wishlist-mvp.md](./parts-wishlist-mvp.md)).

## 3.8.3 Parts wishlist → установка (INSTALLED)

- **Web:** `PATCH .../wishlist/[itemId]` только обновляет позицию. После успешного перехода в `INSTALLED` с **`nodeId`** открывается **существующая** форма «Добавить сервисное событие» с предзаполнением из wishlist и текущего пробега/моточасов (**включая стоимость и валюту позиции, если заданы**); без **`nodeId`** — ненавязчивая подсказка на странице, без автосоздания события. Запись в журнале появляется только после явного сохранения формы (`POST .../service-events`).
- **Expo:** тот же смысл: после `INSTALLED` с узлом — переход на `service-events/new` с query-параметрами для предзаполнения (**в т.ч. `wlCost` / `wlCurrency` при наличии стоимости в позиции**); без узла — `Alert` с той же идеей; событие создаётся только по сохранению формы.
- **Parity status:** aligned (один backend, один бизнес-результат: статус в списке обновляется сразу; история обслуживания — по подтверждению пользователя)
- **Notes:** общий хелпер `createInitialAddServiceEventFromWishlistItem` в `@mototwin/domain`; активный список покупок на web и Expo использует одно правило — `filterActiveWishlistItems` (без отображения `INSTALLED`, строки остаются в БД/API); **отдельного архива wishlist «Установленные» нет** — после сохранения события смотреть **журнал обслуживания**; распознавание типичной установки из списка: `serviceType` «Установка запчасти», комментарий с префиксом из `WISHLIST_INSTALL_SERVICE_COMMENT_PREFIX_RU`, опционально метка `wishlistOriginLabelRu` в строке журнала; см. [parts-wishlist-mvp.md](./parts-wishlist-mvp.md).

## 4. Intentional platform differences (acceptable)

1. **Flow composition**
- web: one operational page with modals
- Expo: decomposed route-based screens

2. **Visual layout**
- web: desktop/table-like patterns
- Expo: mobile cards/chips/timeline patterns

These differences are acceptable because business result and terminology remain aligned.

### 4.1 Date display policy (shared meaning, optional compact rows)

| Context | Web | Expo | Shared helper |
|--------|-----|------|----------------|
| Service log **entry** line | `buildServiceLogTimelineProps(…, "default")` — full `ru-RU` date | `…, "compact")` — short month form | `formatServiceLogEntryDate` in `@mototwin/domain` |
| Service log **month group** header | Long month + year (`ru-RU`) | Same | `formatMonthYearLabel` in `packages/domain` (grouping) |
| **Status explanation** dates | `formatIsoCalendarDateRu` | Same | `@mototwin/domain` |

Invalid or unparseable timestamps: compact journal line falls back to `YYYY-MM-DD` slice; full/compact explanation-style formatting returns the raw string unchanged.

### 4.2 Garage spec highlights policy

- **Garage list (web + Expo):** after `buildGarageCardProps`, apply **`filterMeaningfulGarageSpecHighlights`**. Only non-empty values that are not the Russian “not specified” placeholders are shown (engine, cooling, wheels, brakes subset).
- **Vehicle detail:** full technical specs via **`buildVehicleTechnicalInfoViewModel`** (additional fields; only rows with real values).

This keeps garage cards scannable without hiding data that remains on the vehicle screen.

## 5. Partial parity / known gaps

1. **Shared client adoption**
- Expo actively uses `@mototwin/api-client`.
- Web still uses mostly direct `fetch` inside pages.
- Impact: possible drift in client-side request handling behavior.

2. **Interaction density**
- Web provides denser all-in-one operational view.
- Expo optimizes one-handed and step-by-step interactions.
- Impact: user journey shape differs, but result is kept aligned.

## 6. Parity follow-up expectations

When implementing new user-facing features:
1. explicitly state web impact
2. explicitly state mobile impact
3. record parity status
4. if one side deferred, define concrete next parity step

## 7. Related docs

- `frontend-web.md`
- `frontend-expo.md`
- `shared-packages.md`
- `api-backend.md`
