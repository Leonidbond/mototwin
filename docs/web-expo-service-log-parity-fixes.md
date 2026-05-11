# Выравнивание журнала обслуживания (Web + Expo)

**Дата:** 2026-04-18 (обновление формы bundle: 2026-05-03; multi wishlist + ссылки журнала: 2026-05; блок «Готово к установке» + `GET …/installable`: 2026-05; ADVANCED-суммы, парсинг сумм, превью «Итого», строки журнала по bundle, линковка расходов: 2026-05-04; **web UI:** страницы `service-events/*` + `ServiceEventForm` + каталог `service-event-form/`: 2026-05-06, 2026-05-08; **web журнал:** рабочие фильтры + `ServiceEventsFilters` расширение + детали «Исполнитель»: 2026-05-10; **шапка журнала:** одна CTA «Добавить ТО»: 2026-05-10; **web детали журнала:** deep link на узлы / расходы / подбор, `partsSearch`, сброс `highlightServiceEventId`/`serviceEventId` после скролла, BASIC без блока «Установленные запчасти», домен `resolveWishlistItemIdForServiceBundleItem`: 2026-05-10; **Expo журнал (паритет web):** 2026-05-10 — `JournalTimelineRow` ≈ web `ServiceLogRow`, `MobileEventDetailSheet` ≈ `ServiceLogEventDetails`, query расходов `year` + `serviceEventId` + `highlightExpenseId` + `returnTo`, подбор `wishlist/picker` с `partsSearch`, сброс highlight в URL журнала после скролла; **Expo корзина замен из журнала:** после deep link по `wishlistItemId` не вызывается `router.replace` на `/wishlist` без query — иначе повторный `useFocusEffect` → `load()` и сброс фильтра в «Все» / пропажа детали: 2026-05-10)  
**Цель:** Одинаковый смысл данных и правил отображения журнала на Next.js и Expo при сохранении платформенной вёрстки; **одна модель формы** сервисного события (bundle) на web и в Expo.

## Общая модель данных

- Цепочка **фильтр → сортировка → группировка по месяцу → view models** сосредоточена в `buildServiceLogTimelineProps` (`packages/domain/src/component-contract-props.ts`).
- **`paidOnly`:** поле `ServiceEventsFilters.paidOnly === true` оставляет только события с **`totalCost` / `costAmount` > 0** и непустой **`currency`** (`isPaidServiceEvent` в `packages/domain/src/service-log.ts`). Сочетается с остальными полями фильтра и с **фильтром по узлу** (сначала подмножество по узлам, затем остальное).
- **Фильтр по узлу (поддерево):** опциональный аргумент `restrictToNodeIds` — сначала события ограничиваются по `nodeId` / строкам bundle (`applyServiceLogNodeFilter`), затем применяются поля `ServiceEventsFilters` и сортировка. Тип состояния фильтра в UI: `ServiceLogNodeFilter` в `@mototwin/types` — `nodeIds` + `displayLabel`.
- **Расширенные поля `ServiceEventsFilters`** (клиент, `packages/domain/src/service-log.ts` — `filterServiceLogEntries` / `normalizeServiceLogFilters` / `isServiceLogTimelineQueryActive`): диапазон **пробега** и **суммы**, **`performerKind`**, **`actionType`** (хотя бы одна строка bundle с данным `actionType`). Пустые строки = «без ограничения».
- Месячные счётчики (`serviceCount`, `stateUpdateCount`, `costLabel`) считаются в `groupServiceEventsByMonth` **по уже отфильтрованному и отсортированному** списку событий, то есть сводка относится к текущему видимому набору записей.

## Новые общие хелперы (`packages/domain`)

| Символ | Назначение |
|--------|------------|
| `DEFAULT_SERVICE_LOG_SORT_STATE` | Сортировка по умолчанию: дата, по убыванию. |
| `isServiceLogTimelineQueryActive(filters, sort, nodeSubtreeFilter?)` | Активны ли даты/поиск/узел (текст)/вид/расширенные поля, сортировка не дефолтная, задан **фильтр по узлу** или **`paidOnly`** (кнопка **«Сброс»** на web). |
| `createServiceLogNodeFilter` / `applyServiceLogNodeFilter` / `getDescendantLeafNodeIds` | Чистые хелперы подмножества узлов и клиентский отбор событий (`packages/domain/src/service-log-node-filter.ts`). |
| `findNodeTreeItemById` | Поиск сырого `NodeTreeItem` по id для построения фильтра из клика по дереву. |
| `getServiceLogEventKindBadgeLabel(kind)` | Подпись бейджа: «Сервис» / «Обновление состояния». |
| `SERVICE_LOG_COMMENT_PREVIEW_MAX_CHARS` | Длина превью комментария (120), web и Expo. |
| `isLikelyWishlistInstallServiceEvent` / `WISHLIST_INSTALL_SERVICE_COMMENT_PREFIX_RU` | Эвристика без нового `eventKind`: событие из сценария wishlist → «Установка запчасти» + префикс комментария. |
| `ServiceLogEntryViewModel.wishlistOriginLabelRu` | Краткая подпись «Из списка покупок» на карточке журнала (web + Expo), иначе `null`. |

## Форма сервисного события (bundle): web + Expo

- **Web:** общий компонент **`ServiceEventForm`** в **`src/app/vehicles/[id]/_components/service-event-form/`** — те же `AddServiceEventFormValues`, BASIC/ADVANCED, bundle, SKU, **«Готово к установке»** (`getInstallableForServiceEvent`), валидация `validateAddServiceEventFormValues`, `onSubmit`. Страницы **`/vehicles/[id]/service-events/new`** и **`/vehicles/[id]/service-events/[eventId]/edit`**; переходы из **`service-log/page.tsx`** и **`vehicle-detail-client.tsx`** (`router.push` / query `returnTo` и др.). Поведение по шагам — [web-service-event-form.md](./web-service-event-form.md).
- **Expo:** тот же смысл полей в **`apps/app/components/vehicle-detail/basic-service-event-bundle-form.tsx`** — та же модалка **«Готово к установке…»** с теми же чипами и **`getInstallableForServiceEvent`**; экран **`service-events/new.tsx`** только загружает дерево/машину/событие, собирает начальные значения доменными хелперами (`createInitialAddServiceEventFromNode`, `FromWishlistItem`, `Edit`, `Repeat`, …), сбрасывает форму через `key` и вызывает `validateAddServiceEventFormValuesMobile` + `normalizeAddServiceEventPayload` / `normalizeEditServiceEventPayload` при сохранении.

**Паритет экрана создания/редактирования (Expo ≈ web, 2026-05-11):**

- **Дата по умолчанию:** при создании без предзаполнения (как пустой сценарий на web в `ServiceEventCreateClient`) в форме выставляется **`eventDate` = сегодня** (`YYYY-MM-DD`), плюс пробег/моточасы с карточки ТС при наличии.
- **Wishlist и `pendingInstall`:** как на web (`ServiceEventCreateClient`), **`PATCH` wishlist** со статусом **INSTALLED** и привязкой узла к якорю события выполняется только при **`pendingInstall=1|true`** в query и непустом **`wishlistItemId`**. Навигация из списка покупок задаёт флаг через **`buildServiceEventNewFromWishlistHref(..., { pendingInstall: true })`** в сценариях отложенной установки; если позиция уже **INSTALLED** после API (как на web после успешного `updateWishlistItem`), ссылка на форму строится **без** `pendingInstall`, чтобы при сохранении события статус не дублировался.
- **Возврат в журнал:** после создания с `source=service-log` в query подсветки используется **`highlightServiceEventId`** (экран **`service-log.tsx`** по-прежнему принимает и **`serviceEventId`**, и **`highlightServiceEventId`**).
- **Копирайт и UX:** заголовки экрана совпадают с web («Добавить сервисное событие» / «Редактировать сервисное событие»); при отложенной установке — текст-подсказка как web **`contextHint`**; под фиксированным превью стоимости — блок **«Что будет после сохранения»** (тот же смысл, что **`PostSaveExplainer`** на web).
- **Новая строка bundle в ADVANCED:** дефолтный тип работы для пустой строки — **REPLACE**, как в `ServiceEventForm` на web.

### ADVANCED: деньги, превью «Итого», редактирование

- **Нормализация в payload (`normalizeAddServiceEventPayload` / edit):** в режиме **ADVANCED** поля события **`partsCost` / `laborCost`** на API — это **сумма по строкам bundle** (поля строки «Запчасти» / «Работа») **плюс** числа из блока **«Данные события»** («Запчасти» / «Работа» сверху). Так совпадает с подсказками в UI: верхние поля — дополнение к строкам, а не замена. **`totalCost`** = сумма этих двух итогов (если заданы). Парсинг ввода сумм — **`parseExpenseAmountInputToNumberOrNull`** (в т.ч. группировка `ru-RU`, неразрывный пробел).
- **Превью «Итого»** в форме web и в форме Expo считает ту же комбинацию (строки + верх), чтобы пользователь видел итог до сохранения.
- **Редактирование (`createInitialEditServiceEventValues`):** для **ADVANCED** в верхних строках формы показывается **остаток** относительно суммы по строкам (`event.partsCost` − сумма `partCost` по items, то же для работы), чтобы при повторном сохранении не произошло двойного учёта. В **BASIC** верхние поля по-прежнему отражают сохранённые **`partsCost` / `laborCost`** (или fallback к **`totalCost`** для legacy).

### Журнал: стоимости по строкам bundle

- В view model сервисной записи журнала у bundle-строк есть **`lineCostRu`** (и форматирование через **`formatBundleItemLineCostsRu`** в `packages/domain/src/service-log-view-models.ts`); web (`service-log/page.tsx`) и Expo (`service-log.tsx`) выводят эти подписи в карточке события там, где показываются строки пакета.

### «Готово к установке»: расходы и строки формы

- **Несколько чистых расходов (`source: "expense"`):** выбор целей для строк bundle разрешается через **`resolveInstallableExpenseTargetRow`** (web `ServiceEventForm`, Expo `components/vehicle-detail/basic-service-event-bundle-form`) — второй и следующие расходы не затирают строку 0.
- **Связь `ExpenseItem` ↔ событие:** после сохранения события **`linkInstalledExpenseItemsToServiceEvent`** (`src/lib/service-event-expense-links.ts`) идемпотентна относительно расходов, уже привязанных к этому же `serviceEventId` внутри транзакции (после `syncExpenseItemForServiceEvent`), и не требует повторного `update`, если статус уже **INSTALLED**. Это устраняет ложную ошибку вида «Selected expense items are not available for this service event».

## Web (`src/app/vehicles/[id]/service-log/page.tsx`)

Журнал — отдельная страница `/vehicles/[id]/service-log` (не модалка на карточке ТС). Добавление/редактирование/повтор сервисного события — **та же** форма **`ServiceEventForm`** на отдельных маршрутах **`/vehicles/[id]/service-events/new`** и **`…/[eventId]/edit`**; переходы из журнала и из `vehicle-detail-client.tsx`.

- **Шапка:** справа одна кнопка **«Добавить ТО»** (тот же `openCreate` / `service-events/new`); отдельная ghost-кнопка **«Добавить событие»** убрана как дубль.
- **Тулбар фильтров:** поиск по строке **`serviceType`** (placeholder «событие, узел, комментарий» — по факту legacy-поле); дропдаун **типа события**; **узлы** — кнопка открывает **`NodePickerModal`** (`mode="multi"`, листья дерева + «Топ-узлы»), выбор пишется в URL **`nodeIds`** + **`nodeLabel`**; чип «Узел: …» под строкой «Найдено» сбрасывает только URL-узел. **Период** — кнопка открывает панель с пресетами и двумя **`input type="date"`**; у контейнера периода **`overflow: visible`**, иначе панель обрезается базовым `overflow: hidden` дропдауна. Кнопка **«Фильтры»** раскрывает **одну компактную строку**: пробег от–до, сумма от–до, тип работы, исполнитель, **«Сброс»** (полный сброс — как раньше: фильтры, сортировка, query узла и **`paidOnly`**). Счётчик на «Фильтрах» учитывает активные поля и узел из URL.
- **Только расходы:** баннер «Показаны события с расходами» и «Сбросить фильтр» при `paidOnly`; чекбокс в панели фильтров; query **`expandExpenses=1|true`** при открытии страницы включает режим «только расходы» (как handoff с блоков расходов).
- **Статистика расходов:** кнопка в шапке журнала ведёт на `/vehicles/[id]/expenses` (аналитика по мотоциклу), не в модалку журнала.
- Бейджи типа записи: русские подписи через `getServiceLogEventKindBadgeLabel`, без `SERVICE` / `STATE_UPDATE` как основного текста.
- Селектор «Тип записи»: опции «Сервис» и «Обновление состояния» (значения `SERVICE` / `STATE_UPDATE` без изменений).
- Месячная сводка: чипы «Обслуживание» и «Обновления состояния» показываются **только при ненулевом** счётчике (как на Expo); расходы — по-прежнему при наличии `costLabel`.
- Заголовок месяца: без принудительного `uppercase`, `capitalize` для согласования с Expo.
- Ключ секции месяца: стабильный `group.monthKey`.
- **Сортировка:** один комбо-контрол в строке «Найдено»; переключатели «список / сетка» после сортировки **не используются** (удалены).
- **Правая панель деталей:** для **`performedBy === "SERVICE"`** под типом исполнителя выводится строка **«Название сервиса:»** и **`serviceProviderNote`** (или «—»); для других типов при непустой заметке — прежнее краткое **«· …»** в той же строке, что и тип.
- **«Сброс»** (расширенные фильтры): отключён, если запрос совпадает с дефолтом (`isServiceLogTimelineQueryActive`), как и раньше для кнопки сброса.
- Пустой журнал / пустой результат фильтра: те же формулировки, что на Expo («Журнал пуст» / «Ничего не найдено» + пояснение).
- Комментарий: обрезка по `SERVICE_LOG_COMMENT_PREVIEW_MAX_CHARS`.
- События, похожие на установку из списка покупок: под заголовком типа работы показывается `wishlistOriginLabelRu`, если сработала эвристика (см. таблицу выше). Если в `installedPartsJson` несколько wishlist-id, отображаются **несколько** кликабельных ссылок (нумерация), как на Expo.
- **Правая панель деталей:** клики по узлам, суммам/расходам и строкам bundle (только **ADVANCED** для блока «Установленные запчасти»), плюс ссылки на источники wishlist — см. единое описание в [service-log-mvp.md](./service-log-mvp.md) (query `returnTo`, `partsSearch`, снятие `highlightServiceEventId` после скролла, доменное сопоставление `installedPartsJson` ↔ bundle).

## Expo (`apps/app/app/vehicles/[id]/service-log.tsx`)

- **Фильтр по узлу:** читается из query `nodeIds` (список через запятую, элементы URL-encoded) и `nodeLabel`; баннер с «Сбросить фильтр» делает `router.replace` на маршрут без узла, **сохраняя `paidOnly=1` при необходимости** (`buildVehicleServiceLogHref`). Полный «Сбросить» в блоке фильтров сбрасывает query целиком (узел и расходы).
- **`paidOnly`:** query `paidOnly=1` или `true`; баннер и чип «Только события с расходами»; сброс только расходов через `router.replace` без `paidOnly`, с сохранением `nodeIds` / `nodeLabel` при активном фильтре по узлу.
- Активность фильтров/сортировки: `isServiceLogTimelineQueryActive` вместо дублирования условий.
- **Строка ленты (`JournalTimelineRow`):** паритет с web `ServiceLogRow` — колонка даты (`formatRowDateColumnParts` + пробег), rail / точка / иконка типа (`getRowActionKind`, `getTimelineColors`, `getServiceIconConfig`), карточка с `mainTitle` и второй строкой (`secondaryTitle` или для STATE_UPDATE — `stateUpdateSubtitle` / `compactMetricsLine`), три метрики **Стоимость · Интервал · Исполнитель** (`getCompactCost`, `getIntervalLabel`, `getPerformerLabel`), шеврон; состояния **selected** и **highlight** по аналогии с web. Нет expand-превью bundle в строке: **тап** = выбор + открытие sheet.
- **Детали (`MobileEventDetailSheet`):** передаются `ServiceLogEntryViewModel` + сырой `ServiceEventItem` + `originWishlistItemIds`; секции и правила видимости по образцу web `ServiceLogEventDetails` (метрики с переходом в расходы при наличии данных, узлы-чипы → дерево, режим BASIC/ADVANCED, моточасы, напоминание, комментарии по bundle, стоимость по статьям, **«Установленные запчасти» только при `ADVANCED`**, исполнитель, источники, список расходов, футер **Редактировать / Удалить / Повторить ТО**).
- **Навигация из sheet:** расходы — `buildExpensesHrefForServiceEvent` (`year`, `serviceEventId`, опционально `highlightExpenseId`, `returnTo` на журнал с `highlightServiceEventId`); подбор — `buildWishlistPickerHrefFromServiceLog` → `/vehicles/:id/wishlist/picker` с `nodeId` / `wishlistItemId` / `partsSearch` / `returnTo`; узлы — `/vehicles/:id/nodes?nodeId=`; источники wishlist — `buildVehicleWishlistItemHighlightHref` (`wishlist/hrefs.ts`).
- **Корзина замен из журнала:** тап «Корзина замен» ведёт на `/vehicles/:id/parts?…` → `parts.tsx` делает `router.replace` на `/vehicles/:id/wishlist` с пробросом `wishlistItemId`, `nodeId`, `partsSearch`, `serviceEventId`, `returnTo`. На `wishlist/index` эффект подсветки по `wishlistItemId` выставляет фильтр по статусу позиции и открывает деталь; **после этого не делается** `router.replace` на URL без query (раньше это снимало параметры, снова вызывало `useFocusEffect` → `load()` и давало визуальный скачок «Установленные» → «Все»). Параметры в адресе могут сохраняться до ухода со экрана — по тому же принципу, что комментарий у `applyWishlistRowFocus`: без лишней смены URL не дергается повторная загрузка списка.
- **Deep link в журнал:** `serviceEventId` или `highlightServiceEventId` — скролл к строке, затем **`router.replace`** без этих параметров (остальные query сохраняются), по смыслу как на web после `scrollIntoView`.
- Комментарий в ленте: при необходимости свёртка по `SERVICE_LOG_COMMENT_PREVIEW_MAX_CHARS` (если блок превью ещё используется в других местах экрана); основной полный текст — в sheet.

## Намеренные отличия платформ

- Web: отдельная страница журнала; форма события — **полноэкранные маршруты** `service-events/new` и `…/edit`; липкие заголовки месяцев; комбо сортировки в строке «Найдено».
- Expo: полноэкранный список журнала, сворачиваемый блок фильтров, компактные даты (`dateStyle: "compact"` в `buildServiceLogTimelineProps`); создание/редактирование/повтор — **полноэкранный** маршрут `/vehicles/[id]/service-events/new` с тем же набором полей bundle внутри `basic-service-event-bundle-form` (query `source=service-log` и при необходимости `eventId` / `repeatFrom`); после сохранения возврат в журнал может использовать `feedback=created|updated`.

## Блок расходов на карточке ТС (не журнал)

- Web и Expo: секция **«Расходы на обслуживание»** **свёрнута по умолчанию**; полный журнал — из секции дерева узлов, не из отдельной кнопки **«Журнал»** в блоке расходов (кнопка убрана). Переход из развёрнутого блока расходов в журнал с фокусом на платных событиях использует query **`paidOnly`** и при необходимости **`expandExpenses`** — см. [expense-tracking-mvp.md](./expense-tracking-mvp.md) и [service-log-mvp.md](./service-log-mvp.md).

## Переход из «Требует внимания»

- **Журнал по узлу** из контекста внимания (web или Expo) открывает тот же **фильтр по поддереву**, что и действие «статус → журнал» в дереве (`createServiceLogNodeFilter` + на Expo query `nodeIds` / `nodeLabel`). Режим **«только расходы»** (`paidOnly`) при этом **не** включается (на web сбрасывается перед открытием журнала из внимания).

## QA (ручная проверка)

На одном и том же наборе данных с backend (одна и та же запись на **web** `/vehicles/[id]/service-log` и **Expo** экран журнала):

### Общее (web + Expo)

1. Совпадение чисел в месячных чипах «Обслуживание» / «Обновления состояния» / «Расходы» после одинаковых фильтров.
2. Фильтры: даты, **мультивыбор узла** (web: модалка + URL), тип записи, поиск по **`serviceType`**, **только расходы (`paidOnly`)**, раскрытые поля (**пробег / сумма / тип работы / исполнитель**); фильтр по узлу из дерева; сочетание узла и `paidOnly`; сброс и отключение **«Сброс»** в дефолтном состоянии. Expo: блок фильтров; тип **`ServiceEventsFilters`** общий с web.
3. Сортировка по всем полям из списка; порядок внутри месяца согласован с глобальной сортировкой отфильтрованного списка.
4. Визуальный приоритет: `SERVICE` — основная строка/карточка; `STATE_UPDATE` — приглушённая подача заголовка и rail, как на web.
5. Комментарии > 120 символов: на web — превью и разворот где применимо; на Expo полный текст в sheet.
6. Событие с **несколькими** wishlist-id в `installedPartsJson`: в деталях (web панель / Expo sheet) несколько ссылок «Источники»; переходы открывают ожидаемые экраны.
7. Форма нового события: блок **«Готово к установке»** на web и кнопка **«Готово к установке…»** в Expo — одинаковые чипы фильтра, один и тот же ответ **`GET …/installable`**; отметка строки с wishlist+expense не должна удваивать сумму в «Запчасти» по сравнению с отдельной отметкой wishlist и expense.
8. **ADVANCED:** суммы в payload и превью «Итого» = строки + верх «Запчасти»/«Работа»; при редактировании верхние поля — остаток к сумме строк; ввод с пробелами/NBSP как в `ru-RU` парсится корректно.
9. В журнале / деталях у строк bundle отображаются **`lineCostRu`**, если в данных есть суммы по строкам.
10. Сохранение события с **несколькими** отмеченными чистыми расходами и с **wishlist+expense** не падает на линковке расходов.

### Expo: строка ленты ≈ web `ServiceLogRow`

- [ ] Слева: день + месяц (3 буквы), при валидной дате — год отдельной строкой; строка пробега под датой совпадает по смыслу с web.
- [ ] Rail и точка: цвета для REPLACE / INSPECT / CLEAN / ADJUST / SERVICE / STATE_UPDATE согласованы с логикой web (`getTimelineColors`).
- [ ] В карточке: круглая иконка типа, **одна** строка `mainTitle`, вторая строка — для сервиса `secondaryTitle`, для STATE_UPDATE — приглушённый вариант подзаголовка как на web.
- [ ] Три метрики справа от заголовка: **Стоимость** (зелёный акцент при ненулевой), **Интервал** (напоминание км/ч/дата), **Исполнитель** (SELF/SERVICE/OTHER).
- [ ] Шеврон справа; выбранная строка — рамка/фон **selected**; подсветка из URL — **highlight** на точке без конфликта с selected.
- [ ] Тап по строке открывает sheet и выделяет строку; **нет** разворота bundle внутри строки.

### Expo: sheet ≈ web `ServiceLogEventDetails`

- [ ] Шапка: иконка типа, заголовок, подзаголовок; бейдж «Выполнено» / «Обновление состояния».
- [ ] Сетка метрик: дата, пробег, интервал, стоимость; тап по стоимости ведёт в расходы при наличии события и (расходов или суммы), как на web.
- [ ] **Узлы:** чипы по уникальным узлам из bundle или якорь события; тап → `/vehicles/:id/nodes?nodeId=…`.
- [ ] **Режим записи:** BASIC / ADVANCED с поясняющим текстом.
- [ ] **Моточасы** и **Следующее напоминание** — показываются, если есть данные во view model / raw event.
- [ ] **Комментарии по работам** — только строки bundle с непустым `comment`.
- [ ] **Стоимость по статьям** — при наличии `partsCostLabel` / `laborCostLabel`; тап → расходы по событию.
- [ ] **Установленные запчасти** — только для **ADVANCED** и не STATE_UPDATE; строки кликабельны (wishlist id → picker/query; иначе узел + `partsSearch` в picker).
- [ ] **Исполнитель:** тип + примечание; для SERVICE отдельная строка «Название сервиса».
- [ ] **Источники:** несколько wishlist-id → несколько кнопок; тап → список покупок с подсветкой позиции; фильтр остаётся по статусу позиции (например «Установленные»), деталь открыта, **без** мигания в «Все» и закрытия детали.
- [ ] **Расходы:** список с суммами; строка → расходы с `highlightExpenseId`; заголовок «итого» → список по событию.
- [ ] Футер: **Редактировать**, **Удалить**, **Повторить ТО** (для STATE_UPDATE — только «Закрыть»); закрытие sheet снимает выделение строки.

### Expo: навигация и query

- [ ] Открыть журнал с `?serviceEventId=` или `?highlightServiceEventId=` — скролл к записи, затем **исчезновение** этих параметров из URL при сохранении `nodeIds`, `paidOnly`, `month`, `expandExpenses`, `returnNodeId`, …
- [ ] Из sheet → **Расходы:** в URL есть `year`, `serviceEventId`, при клике по строке расхода — `highlightExpenseId`; **«Назад»** с `returnTo` возвращает на журнал с подсветкой события (`highlightServiceEventId` в `returnTo`).
- [ ] На экране расходов список отфильтрован по `serviceEventId`; карточка с `highlightExpenseId` подсвечена; через ~450 ms параметр `highlightExpenseId` снимается с URL, фильтр по событию остаётся.
- [ ] Из sheet → **Подбор** (`wishlist/picker`): при передаче `partsSearch` поле поиска в picker предзаполнено; `returnTo` присутствует в query (обработка «назад» из picker в приложении может дорабатываться отдельно).

### Копируемый чеклист

Полный пошаговый сценарий для одного прогона — в отдельном файле **[service-log-expo-manual-qa.md](./service-log-expo-manual-qa.md)**.

## Проверки в репозитории

- `npx tsc --noEmit -p apps/app` (Expo)
- `npx tsc --noEmit` (корень монорепо, если настроен)
- `npx eslint` на изменённых файлах: `apps/app/app/vehicles/[id]/service-log.tsx`, `apps/app/app/vehicles/[id]/expenses.tsx`, `apps/app/app/vehicles/[id]/wishlist/picker.tsx`, `apps/app/app/vehicles/[id]/wishlist/index.tsx`, `packages/domain` (service-log / service-log-view-models).

---

## Приложение: ранние заметки по Expo journal (объединено)

Ниже — сжатое содержание удалённых черновиков `expo-service-log-web-parity.md` и `expo-service-log-filter-sort-parity.md` (дублировали итог, который уже отражён в разделах выше).

**Визуальная итерация Expo (`service-log.tsx`):**

- Месячные группы с явной карточкой заголовка месяца; компактные чипы сводки (число SERVICE, STATE_UPDATE, расходы месяца при наличии).
- Лента: левый rail, точка типа события, карточка; SERVICE визуально главнее, STATE_UPDATE — вторичнее.
- Сохранены loading/error/empty, `useFocusEffect`, общий pipeline `buildServiceLogTimelineProps` (фильтры, сортировка, группы по месяцам).

**Фильтры и сортировка на клиенте:**

- Общий смысл: **`filterServiceLogEntries`** + опционально **`restrictToNodeIds`**; на web узел из URL и расширенные поля см. раздел **Web** выше; на Expo — диапазон дат, текстовый фильтр узла (без учёта регистра), вид события, текст по типу сервиса; «Сбросить» возвращает фильтры и сортировку к умолчанию.
- Сортировка: поле (дата, пробег, узел, стоимость, …) и направление; по умолчанию дата по убыванию.
- Фильтрация и сортировка применяются до группировки по месяцам; пустое состояние при отсутствии совпадений.
