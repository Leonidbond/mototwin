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
- **Parity status:** aligned as personal dashboard semantics (`Мой гараж`) with shared summary meaning, web-aligned garage cards, unchanged vehicle-detail navigation, and platform-appropriate navigation chrome.
- **Notes:** both clients use shared `buildGarageDashboardSummary` (motorcycles count + attention counts from existing garage payload, no extra backend calls). Both clients use the same Garage card information architecture: title + meta line, silhouette, dedicated `Garage Score`, short `Требует внимания` block, and quick actions. Empty state and primary CTA (`Добавить мотоцикл`) are aligned. Garage Score legend uses Russian status labels on both clients. Web keeps profile/settings entry in desktop chrome; Expo exposes it in bottom navigation. See [garage-dashboard-mvp.md](./garage-dashboard-mvp.md) and [auth-roadmap.md](./auth-roadmap.md).
- **Profile/settings parity:** both clients expose the same Profile settings surface (currency, distance unit, date format, default snooze days; engine-hours unit fixed to `h`) with shared defaults/normalization in domain. Persistence is DB-backed per user via `/api/user-settings`; local storage/file cache is fallback only and scoped by user identity. `defaultCurrency` is wired to wishlist create + add-service-event defaults while preserving item-specific wishlist-install prefill. See [user-settings-mvp.md](./user-settings-mvp.md).
- **Auth/ownership note:** both clients remain pre-auth in MVP and must not claim user isolation yet; planned ownership migration is documented in [auth-data-ownership-architecture.md](./auth-data-ownership-architecture.md).
- **Phase 1 ownership status:** backend now has demo user + demo garage ownership foundation; web/Expo UX remains unchanged and still pre-auth by behavior.
- **Phase 2A ownership status:** base Garage/Vehicle APIs are scoped to current demo context (garage list, create vehicle, vehicle detail, profile update). Nested vehicle APIs are intentionally deferred to Phase 2B; visible web/Expo behavior stays unchanged.
- **Phase 2B ownership status:** nested vehicle APIs used by web/Expo detail flows are guarded by current demo context (`node-tree`, `state`, `top-nodes`, `service-events`, `wishlist`, `wishlist kits`). Out-of-context vehicle ids return `404`, while demo-owned flows remain unchanged.
- **Phase 2C dev-only QA status:** in development, both web and Expo support a local **Dev-only user switcher** (`Demo User`, `Test User A`, `Test User B`) on Profile surface that changes API context via development header. This is explicitly non-production and non-auth behavior.
- **Phase 2D hardening status:** both clients use the same explicit dev-switcher gate (`NODE_ENV !== "production"` + `MOTOTWIN_ENABLE_DEV_USER_SWITCHER=true`) for switcher visibility and dev-header override behavior.
- **Resolver hardening parity:** both clients now depend on the same read-only server context resolver contract (no request-path auto-bootstrap); missing seeded context returns controlled API errors on both platforms.
- **Trash parity:** both clients support soft-delete flow to **`Свалка`** (move-to-trash from Garage, list trashed vehicles, restore, permanent delete with explicit confirmation). Active Garage list excludes trashed vehicles on both clients.
- **Vehicle profile edit parity:** both clients support editing nickname/VIN/ride profile with the same backend contract (`PATCH /api/vehicles/[id]`) and keep odometer/engine-hours restricted to Update State flow.
- **Action icon parity:** web is canonical for secondary/entity action semantics. Expo now mirrors icon-only actions for Garage header entry points, Vehicle Detail node-tree/search/context quick actions, Service Log edit/delete, Trash restore/permanent delete, and Wishlist destructive secondary action. Web icon-only actions provide `title`/`aria-label` hover/focus hints; Expo icon-only actions provide `accessibilityLabel` and keep destructive confirmations as text alerts.
- **Back/close parity:** modal/overlay close returns to the previous overlay state when the user opened one modal from another. Full page/route exits use history back (`router.back()` / `router.canGoBack()`) with a logical fallback route when there is no history.

## 3.2 Add motorcycle

- **Web:** implemented (`/onboarding`)
- **Expo:** implemented (`vehicles/new`)
- **Parity status:** aligned by business outcome
- **Notes:** both use same catalog/vehicle creation routes; UX differs (web form vs mobile progressive sections).

## 3.3 Vehicle detail

- **Web:** implemented (`/vehicles/[id]`)
- **Expo:** implemented (`vehicles/[id]/index`)
- **Parity status:** aligned by first-screen dashboard semantics; platform layout remains intentionally different.
- **Notes:** both expose identity/state/profile/technical/node-tree context; web uses larger single-page modal orchestration, while Expo keeps route-based flows. Expo vehicle detail now mirrors the web dashboard hierarchy on the first screen: hero/identity, orange mileage update action, quick actions (`ТО`, `Расход`, `Деталь`), KPI/readiness strip, **«Требует внимания»**, **«Состояние узлов»**, recent events, expenses, and wishlist entry point.
- **Responsive mobile behavior:** Expo allows portrait and landscape (`orientation: "default"`). Phone portrait stays single-column; phone landscape and tablet-width layouts use denser horizontal groups for hero/KPI, attention/systems, and lower dashboard cards.
- **Overview top-nodes:** both clients now show compact overview cards (6 groups) powered by 15 top-service nodes (`/api/nodes/top`) and keep full tree access as a separate flow (`Все узлы →`) without removing existing full-tree business logic. Cards are informational surfaces, not click targets. The group icon is the action for issue drill-down: it opens the tree, expands the relevant branch, highlights all `SOON` / `OVERDUE` nodes in the group with status-colored frames, and scrolls to the first highlighted node. Leaf badges inside each card are colored by that leaf node status and open the tree focused on the exact node.
- **Attention visual rule:** both clients keep attention row/card backgrounds neutral and apply status color to badges and icon containers, not the entire block.
- Blocks **«Профиль эксплуатации»** and **«Техническая сводка»** are collapsible on both clients and persist local UI state only with per-vehicle keys (`vehicleDetail.<vehicleId>.usageProfile.expanded`, `vehicleDetail.<vehicleId>.technicalSummary.expanded`), default: expanded.

## 3.4 Service log

- **Web:** implemented as dedicated route (`/vehicles/[id]/service-log`)
- **Expo:** implemented as dedicated route (`vehicles/[id]/service-log`)
- **Parity status:** aligned by business outcome
- **Notes:** both support reading `SERVICE` and `STATE_UPDATE`, filtering/sorting and grouped understanding. `SERVICE` rows have edit + delete actions on both clients and reuse existing service-event lifecycle routes (`PATCH` / `DELETE` on `/api/vehicles/[id]/service-events/[eventId]`); `STATE_UPDATE` remains read-only in this flow. For `STATE_UPDATE`, both clients use shared formatter semantics for odometer/engine-hours change lines (`X → Y` when previous value exists, `обновлен(ы) до Y` otherwise). Both clients show aligned action feedback after create/edit/delete (`добавлено` / `обновлено` / `удалено`, with optional `Статусы и расходы обновлены` detail), while UI mechanism stays platform-local (web inline notice, Expo inline message). Both clients can deep-link to a concrete event via `serviceEventId`, with scroll/highlight. Wishlist-install rows expose the reverse link **«Из списка покупок»** to the concrete parts/wishlist item (`wishlistItemId`). Entry date string: web `default`, Expo `compact`; month headers shared — **4.1**. На Expo формы/фильтры с `TextInput` используют keyboard-aware layout (локальный UI-слой, без backend/API изменений). На web фильтры/сортировка журнала используют dark tokens для `input`, `select`, `checkbox`, sort chips и browser option controls; чёрный текст на тёмном фоне недопустим.

## 3.4.1 Expense analytics

- **Web:** `/expenses` shows garage-wide technical expense analytics; `/vehicles/[id]/expenses` shows the same analytics filtered to one motorcycle.
- **Expo:** `vehicles/[id]/expenses` shows vehicle-scoped technical expense analytics.
- **Parity status:** aligned for vehicle-scoped business outcome (totals by currency, selected calendar year/season, month/category/node breakdowns, all expenses list, and “куплено, но не установлено” metric).
- **Notes:** analytics is backed by `ExpenseItem`, not directly by `ServiceEvent`. Technical categories only: service, parts, repair, diagnostics, labor, other technical. Fuel/insurance/fines/parking/wash/gear are intentionally out of scope — see [expense-tracking-mvp.md](./expense-tracking-mvp.md).

## 3.4.2 Expense entry points and journal filter

- **Web:** expense entry points navigate to `/vehicles/[id]/expenses`; Service Log keeps a **«Статистика расходов»** link and `paidOnly=1` filter for paid service rows.
- **Expo:** expense tab/action navigates to `vehicles/[id]/expenses`; Service Log keeps `paidOnly=1` as a journal-only filter.
- **Parity status:** aligned by intent. Expense analytics is a dedicated page/screen; the journal filter remains useful for auditing service rows that produced linked expenses.
- **Notes:** `ExpenseItem` can exist without `ServiceEvent`, e.g. bought part not installed yet or diagnostics/labor without an installation event.

## 3.5 Add service event

- **Web:** общая модалка **`BasicServiceEventModal`** (`src/app/vehicles/[id]/_components/BasicServiceEventModal.tsx`) — страница журнала, карточка ТС и прочие входы; одна форма **`AddServiceEventFormValues`** (BASIC/ADVANCED, несколько узлов, запчасти/работа, SKU, блок **«Готово к установке»** из **`getInstallableForServiceEvent`**, JSON).
- **Expo:** полноэкранный маршрут **`vehicles/[id]/service-events/new`** + **`basic-service-event-bundle-form.tsx`** с тем же смыслом полей и **`validateAddServiceEventFormValuesMobile`** / `normalizeAddServiceEventPayload`.
- **Parity status:** aligned (bundle semantics + shared domain prefill/validation)
- **Notes:** предзаполнение из узла / wishlist / повтор / редактирование — через общие `createInitial*` в `@mototwin/domain` (в т.ч. `createInitialAddServiceEventFromNode` и шаблон узла через `getServiceEventTemplateForNode` внутри domain). Wishlist → `INSTALLED` после успешного create без изменений по смыслу. В **ADVANCED** итоговые суммы события = суммы по строкам плюс верхние поля «Запчасти»/«Работа»; при редактировании верхние поля — остаток к сумме строк (см. [web-expo-service-log-parity-fixes.md](./web-expo-service-log-parity-fixes.md)).

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

- **Web:** consumes unified node source (`/api/vehicles/[id]/node-tree`) for user-facing service-node actions
- **Expo:** same behavior
- **Parity status:** aligned
- **Notes:** status calculation surfaces (`effectiveStatus`/explanations/severity) are shared through the same full-tree contract.

## 3.8.1 «Требует внимания» (MVP)

- **Web:** control near vehicle title on `/vehicles/[id]` opens a **modal** listing `OVERDUE` / `SOON` nodes from the same `nodeTree`. The control is colored by **worst** attention severity (`buildAttentionActionViewModel` + `statusSemanticTokens`: any OVERDUE → critical, else any SOON → warning, else neutral). **Detailed** status text uses the **same** status-explanation modal as the node tree (`selectedStatusExplanationNode`), not a separate attention-only expander.
- **Expo:** the `vehicles/[id]/index` dashboard renders a permanent scrollable «Требует внимания» block from the same `nodeTree`. Tapping an item opens a bottom quick-action sheet with **В дерево**, journal, leaf-only add-service, wishlist/cart, and orange parts-selection actions instead of a dedicated attention screen.
- **Parity status:** aligned for count, priority order, node filtering, journal-by-node, wishlist/cart, and leaf-only add-service actions; Expo intentionally uses an inline dashboard block + bottom sheet instead of the former `vehicles/[id]/attention` route.
- **Notes:** see [attention-flow-mvp.md](./attention-flow-mvp.md); no backend changes
- **Snooze marker parity:** web and Expo both support local reminder snooze in Node Context for `OVERDUE` / `SOON` nodes (`7 days`, `30 days`, `clear`) with visible marker `Отложено до <date>`. Snoozed items stay visible in attention list and keep original status semantics.
- **Snooze filter parity:** web attention modal and the former Expo attention screen supported local filters (`Все` / `Без отложенных` / `Только отложенные`). The current Expo dashboard block keeps snoozed items visible and relies on Node Context for snooze management.

## 3.8.1.a План обслуживания в дереве узлов (MVP)

- **Web:** в блоке дерева узлов на `/vehicles/[id]` добавлен локальный toggle режима «Показывать план обслуживания». На основной странице показываются только root-узлы; клик по root открывает модалку его поддерева. В режиме плана внутри модалки показываются дополнительные строки по leaf-узлам (остаток/просрочка, последний сервис, интервал правила при наличии) и компактные parent summary (`Просрочено / Скоро / Запланировано`) по потомкам.
- **Expo:** тот же toggle и те же смыслы на `vehicles/[id]/index`: на основном экране только root-узлы, тап открывает мобильную модалку поддерева с теми же действиями и тем же plan-контекстом.
- **Mode toggle parity:** переключатель режима есть и в основном блоке узлов, и внутри modal/screen поддерева; используется единый state (изменение в одном месте сразу отражается в другом и сохраняется локально).
- **Shared:** `@mototwin/types` (`NodeMaintenancePlanViewModel`, `NodeMaintenancePlanSummaryViewModel`, `NodeTreeMaintenanceModeState`), `@mototwin/domain` (`buildNodeMaintenancePlanViewModel`, `buildNodeMaintenancePlanSummary`, `getNodeMaintenancePlanShortText`, `getNodeMaintenanceDueText`).
- **Persistence:** local-only per vehicle: `vehicleDetail.<vehicleId>.nodeMaintenanceMode.enabled` (web `localStorage`, Expo local preference helper).
- **Parity status:** aligned (одинаковая модель UX: top-level список + subtree modal, одинаковый смысл режима плана; layout platform-specific).
- **Notes:** отдельного экрана/модалки «План обслуживания» нет; существующие действия узлов и модалка пояснения статуса сохранены. На обеих платформах добавлен поиск по дереву узлов (name/code, case-insensitive, от 2 символов): результат открывает нужный subtree modal/screen, раскрывает родителей совпавшего узла и подсвечивает match. Дерево на обеих платформах поддерживает фильтр по статусу (`Все`, `Просрочено`, `Скоро`, `Недавно заменено`, `ОК`) с количеством узлов в каждом статусе; фильтр сохраняет родительские ветки совпадений и поиск работает внутри выбранного статуса. В результатах поиска есть quick actions `Открыть`, `Журнал`, `Купить` (для leaf only). См. [upcoming-maintenance-mvp.md](./upcoming-maintenance-mvp.md).
- **Node Context:** web и Expo имеют unified Node Context modal/screen для выбранного узла (статус, plan, последние сервисные события, рекомендации, комплекты, общие node-actions). Поиск/дерево/attention используют этот контекст как общий entry point при `Открыть/Контекст`. Под заголовком есть общий ряд `Состояние обслуживания` (~65%) + `Расходы по узлу` (~35%); расходы считаются за сезон по выбранному узлу + поддереву, а переход в расходы передаёт `returnNodeId` для возврата в дерево к исходному узлу.

## 3.8.2 Parts catalog API + node recommendations

- **Web / Expo UI:** в форме wishlist доступен **опциональный** поиск и выбор SKU (`getPartSkus`), очистка выбора, плюс блок **рекомендаций по выбранному узлу** с честной маркировкой (`EXACT_FIT`, `MODEL_FIT`, `GENERIC_NODE_MATCH`, `RELATED_CONSUMABLE`, `VERIFY_REQUIRED`), объяснением «почему рекомендовано» и действием **«Добавить в список покупок»**; ручная позиция без SKU сохраняется.
- **Shared:** `@mototwin/types` (`PartSkuViewModel`, `WishlistItemSkuInfo`, `PartRecommendationViewModel`, `PartRecommendationGroup`), `@mototwin/domain` (`applyPartSkuViewModelToPartWishlistFormValues`, `buildPartRecommendationViewModel`, `buildPartRecommendationExplanation`, `classifyPartRecommendation`, `sortPartRecommendations`, `PART_RECOMMENDATION_GROUP_ORDER`, `getPartRecommendationGroupTitle`, `getPartRecommendationWhyText`, `getPartRecommendationWarningText`, `getPartRecommendationWarningLabel`, `groupPartRecommendationsByType`, `sortPartRecommendationGroups`, `sortPartRecommendationsWithinGroup`, `buildPartRecommendationGroupsForDisplay`), `@mototwin/api-client` — `getPartSkus`, `getPartSku`, `getRecommendedSkusForNode`.
- **UI:** рекомендации в форме wishlist отображаются **секциями по типу** (одинаковые заголовки, why-text, fitmentNote и предупреждения на web и Expo); `VERIFY_REQUIRED` визуально помечены; пустое состояние — «Для этого узла пока нет рекомендаций из каталога».
- **Service kits:** в том же node context (форма wishlist) на web и Expo доступны kits; один action создаёт несколько независимых wishlist-строк (`POST .../wishlist/kits`), с общими правилами подбора SKU и дедупликации. Это не создаёт сервисные события и не меняет flow установки.
- **Kit-origin mark:** на web и Expo строки, добавленные из kits, помечаются одинаково (`Из комплекта: <title>`) как UI-only badge, вычисляемый из `comment` (без новых полей Prisma/API).
- **Kit preview parity:** перед добавлением kit обе платформы показывают одинаковые статусы preview (`Будет добавлено`, `Уже есть в списке`, `Не удалось сопоставить узел`) и блокируют add, если нет доступных позиций.
- **Backend:** `GET /api/parts/recommended-skus?vehicleId=...&nodeId=...` (JSON only), консервативная классификация по `PartSkuNodeLink` + `PartFitment`, сортировка (fit > relation > confidence > price/offer).
- **Parity status:** совпадает сценарий: поиск/рекомендации → выбор или быстрый add → сохранение с `skuId`, предзаполнение полей, **INSTALLED** → сервисное событие с учётом SKU в комментарии/`installedPartsJson` (см. [parts-wishlist-mvp.md](./parts-wishlist-mvp.md)).

## 3.8.3 Parts wishlist → установка (INSTALLED)

- **Node-link rule:** для новых/обновляемых строк wishlist на web и Expo узел обязателен и должен быть leaf; API (`POST/PATCH .../wishlist`) отклоняет отсутствие узла (`400: "Выберите узел мотоцикла"`) и не-leaf (`400: "Выберите конечный узел для позиции списка покупок"`). Prisma `PartWishlistItem.nodeId` может оставаться nullable как transitional schema state для старых данных, но продуктовый контракт уже required.
- **Web:** при выборе `INSTALLED` с **`nodeId`** открывается **существующая** форма «Добавить сервисное событие» с предзаполнением из wishlist и текущего пробега/моточасов (**включая стоимость и валюту позиции, если заданы**). Статус wishlist-строки применяется только после успешного сохранения формы (`POST .../service-events` + последующий update wishlist); если модалка закрыта без сохранения, статус остаётся прежним. Без **`nodeId`** — переход к редактированию позиции/подсказка выбрать leaf-узел, без автосоздания события.
- **Expo:** тот же смысл: после выбора `INSTALLED` с узлом — переход на `service-events/new` с query-параметрами для предзаполнения (**в т.ч. `wlCost` / `wlCurrency` при наличии стоимости в позиции**); статус применяется только после сохранения события; без узла — подсказка выбрать leaf-узел.
- **Parity status:** aligned (один backend и один итоговый бизнес-результат; обе платформы откладывают применение `INSTALLED` до сохранения события, чтобы закрытие формы не меняло статус преждевременно).
- **Notes:** общий хелпер `createInitialAddServiceEventFromWishlistItem` в `@mototwin/domain`; активный preview-список покупок на web и Expo использует одно правило — `filterActiveWishlistItems`. Full parts/wishlist screens на обеих платформах показывают все статусы и добавляют MVP-навигацию для больших списков (status chips, search, collapsible groups, «Показать ещё»); строки `INSTALLED` остаются в БД/API. После сохранения события смотреть **журнал обслуживания**; распознавание типичной установки из списка: `serviceType` «Установка запчасти», комментарий с префиксом из `WISHLIST_INSTALL_SERVICE_COMMENT_PREFIX_RU`, опционально метка `wishlistOriginLabelRu` в строке журнала; см. [parts-wishlist-mvp.md](./parts-wishlist-mvp.md).

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
