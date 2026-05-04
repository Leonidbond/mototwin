# Выравнивание журнала обслуживания (Web + Expo)

**Дата:** 2026-04-18 (обновление формы bundle: 2026-05-03; multi wishlist + ссылки журнала: 2026-05; блок «Готово к установке» + `GET …/installable`: 2026-05; ADVANCED-суммы, парсинг сумм, превью «Итого», строки журнала по bundle, линковка расходов: 2026-05-04)  
**Цель:** Одинаковый смысл данных и правил отображения журнала на Next.js и Expo при сохранении платформенной вёрстки; **одна модель формы** сервисного события (bundle) на web и в Expo.

## Общая модель данных

- Цепочка **фильтр → сортировка → группировка по месяцу → view models** сосредоточена в `buildServiceLogTimelineProps` (`packages/domain/src/component-contract-props.ts`).
- **`paidOnly`:** поле `ServiceEventsFilters.paidOnly === true` оставляет только события с **`costAmount` > 0** и непустой **`currency`** (`isPaidServiceEvent` в `packages/domain/src/service-log.ts`). Сочетается с текстовыми/датовыми фильтрами и с **фильтром по узлу** (сначала подмножество по узлам, затем остальное).
- **Фильтр по узлу (поддерево):** опциональный аргумент `restrictToNodeIds` — сначала события ограничиваются по `nodeId` (множество из дерева: `createServiceLogNodeFilter`), затем применяются обычные поля `ServiceEventsFilters` и сортировка. Тип состояния фильтра в UI не в shared-пакетах: `ServiceLogNodeFilter` в `@mototwin/types` описывает только `nodeIds` + `displayLabel`.
- Месячные счётчики (`serviceCount`, `stateUpdateCount`, `costLabel`) считаются в `groupServiceEventsByMonth` **по уже отфильтрованному и отсортированному** списку событий, то есть сводка относится к текущему видимому набору записей.

## Новые общие хелперы (`packages/domain`)

| Символ | Назначение |
|--------|------------|
| `DEFAULT_SERVICE_LOG_SORT_STATE` | Сортировка по умолчанию: дата, по убыванию. |
| `isServiceLogTimelineQueryActive(filters, sort, nodeSubtreeFilter?)` | Активны ли текстовые/датовые фильтры, сортировка не дефолтная, задан **фильтр по узлу** или **`paidOnly`** (кнопка «Сбросить»). |
| `createServiceLogNodeFilter` / `applyServiceLogNodeFilter` / `getDescendantLeafNodeIds` | Чистые хелперы подмножества узлов и клиентский отбор событий (`packages/domain/src/service-log-node-filter.ts`). |
| `findNodeTreeItemById` | Поиск сырого `NodeTreeItem` по id для построения фильтра из клика по дереву. |
| `getServiceLogEventKindBadgeLabel(kind)` | Подпись бейджа: «Сервис» / «Обновление состояния». |
| `SERVICE_LOG_COMMENT_PREVIEW_MAX_CHARS` | Длина превью комментария (120), web и Expo. |
| `isLikelyWishlistInstallServiceEvent` / `WISHLIST_INSTALL_SERVICE_COMMENT_PREFIX_RU` | Эвристика без нового `eventKind`: событие из сценария wishlist → «Установка запчасти» + префикс комментария. |
| `ServiceLogEntryViewModel.wishlistOriginLabelRu` | Краткая подпись «Из списка покупок» на карточке журнала (web + Expo), иначе `null`. |

## Форма сервисного события (bundle): web + Expo

- **Web:** общий компонент **`src/app/vehicles/[id]/_components/BasicServiceEventModal.tsx`** — состояние `AddServiceEventFormValues`, BASIC/ADVANCED, несколько узлов в пакете, запчасти/работа/итого, SKU, блок **«Готово к установке»** (чипы фильтра + единый список из **`getInstallableForServiceEvent`**), JSON, валидация `validateAddServiceEventFormValues`, сохранение через колбэк `onSubmit`. Подключён из **`service-log/page.tsx`** и из **`vehicle-detail-client.tsx`** (дерево, «Требует внимания», создание события, deep link `?openServiceEventModal=1` и т.д.), чтобы изменения UI применялись везде сразу.
- **Expo:** тот же смысл полей в **`apps/app/app/vehicles/[id]/_components/basic-service-event-bundle-form.tsx`** — та же модалка **«Готово к установке…»** с теми же чипами и **`getInstallableForServiceEvent`**; экран **`service-events/new.tsx`** только загружает дерево/машину/событие, собирает начальные значения доменными хелперами (`createInitialAddServiceEventFromNode`, `FromWishlistItem`, `Edit`, `Repeat`, …), сбрасывает форму через `key` и вызывает `validateAddServiceEventFormValuesMobile` + `normalizeAddServiceEventPayload` / `normalizeEditServiceEventPayload` при сохранении.

### ADVANCED: деньги, превью «Итого», редактирование

- **Нормализация в payload (`normalizeAddServiceEventPayload` / edit):** в режиме **ADVANCED** поля события **`partsCost` / `laborCost`** на API — это **сумма по строкам bundle** (поля строки «Запчасти» / «Работа») **плюс** числа из блока **«Данные события»** («Запчасти» / «Работа» сверху). Так совпадает с подсказками в UI: верхние поля — дополнение к строкам, а не замена. **`totalCost`** = сумма этих двух итогов (если заданы). Парсинг ввода сумм — **`parseExpenseAmountInputToNumberOrNull`** (в т.ч. группировка `ru-RU`, неразрывный пробел).
- **Превью «Итого»** в модалке web и в форме Expo считает ту же комбинацию (строки + верх), чтобы пользователь видел итог до сохранения.
- **Редактирование (`createInitialEditServiceEventValues`):** для **ADVANCED** в верхних строках формы показывается **остаток** относительно суммы по строкам (`event.partsCost` − сумма `partCost` по items, то же для работы), чтобы при повторном сохранении не произошло двойного учёта. В **BASIC** верхние поля по-прежнему отражают сохранённые **`partsCost` / `laborCost`** (или fallback к **`totalCost`** для legacy).

### Журнал: стоимости по строкам bundle

- В view model сервисной записи журнала у bundle-строк есть **`lineCostRu`** (и форматирование через **`formatBundleItemLineCostsRu`** в `packages/domain/src/service-log-view-models.ts`); web (`service-log/page.tsx`) и Expo (`service-log.tsx`) выводят эти подписи в карточке события там, где показываются строки пакета.

### «Готово к установке»: расходы и строки формы

- **Несколько чистых расходов (`source: "expense"`):** выбор целей для строк bundle разрешается через **`resolveInstallableExpenseTargetRow`** (web `BasicServiceEventModal`, Expo `basic-service-event-bundle-form`) — второй и следующие расходы не затирают строку 0.
- **Связь `ExpenseItem` ↔ событие:** после сохранения события **`linkInstalledExpenseItemsToServiceEvent`** (`src/lib/service-event-expense-links.ts`) идемпотентна относительно расходов, уже привязанных к этому же `serviceEventId` внутри транзакции (после `syncExpenseItemForServiceEvent`), и не требует повторного `update`, если статус уже **INSTALLED**. Это устраняет ложную ошибку вида «Selected expense items are not available for this service event».

## Web (`src/app/vehicles/[id]/service-log/page.tsx`)

Журнал — отдельная страница `/vehicles/[id]/service-log` (не модалка на карточке ТС). Добавление/редактирование/повтор сервисного события — **общая** модалка `BasicServiceEventModal` на этой странице.

- **Фильтр по узлу:** строка «Фильтр по узлу: …» и кнопка «Сбросить фильтр» (только подмножество по дереву); полный «Сбросить» сбрасывает и ручные фильтры, и сортировку, и фильтр по узлу, и **`paidOnly`**.
- **Только расходы:** баннер «Показаны события с расходами» и «Сбросить фильтр» при `paidOnly`; чекбокс в панели фильтров; query **`expandExpenses=1|true`** при открытии страницы включает режим «только расходы» (как handoff с блоков расходов).
- **Статистика расходов:** кнопка в шапке журнала ведёт на `/vehicles/[id]/expenses` (аналитика по мотоциклу), не в модалку журнала.
- Бейджи типа записи: русские подписи через `getServiceLogEventKindBadgeLabel`, без `SERVICE` / `STATE_UPDATE` как основного текста.
- Селектор «Тип записи»: опции «Сервис» и «Обновление состояния» (значения `SERVICE` / `STATE_UPDATE` без изменений).
- Месячная сводка: чипы «Обслуживание» и «Обновления состояния» показываются **только при ненулевом** счётчике (как на Expo); расходы — по-прежнему при наличии `costLabel`.
- Заголовок месяца: без принудительного `uppercase`, `capitalize` для согласования с Expo.
- Ключ секции месяца: стабильный `group.monthKey`.
- «Сбросить»: отключён, если запрос совпадает с дефолтом (`isServiceLogTimelineQueryActive`).
- Пустой журнал / пустой результат фильтра: те же формулировки, что на Expo («Журнал пуст» / «Ничего не найдено» + пояснение).
- Комментарий: обрезка по `SERVICE_LOG_COMMENT_PREVIEW_MAX_CHARS`.
- События, похожие на установку из списка покупок: под заголовком типа работы показывается `wishlistOriginLabelRu`, если сработала эвристика (см. таблицу выше). Если в `installedPartsJson` несколько wishlist-id, отображаются **несколько** кликабельных ссылок (нумерация), как на Expo.

## Expo (`apps/app/app/vehicles/[id]/service-log.tsx`)

- **Фильтр по узлу:** читается из query `nodeIds` (список через запятую, элементы URL-encoded) и `nodeLabel`; баннер с «Сбросить фильтр» делает `router.replace` на маршрут без узла, **сохраняя `paidOnly=1` при необходимости** (`buildVehicleServiceLogHref`). Полный «Сбросить» в блоке фильтров сбрасывает query целиком (узел и расходы).
- **`paidOnly`:** query `paidOnly=1` или `true`; баннер и чип «Только события с расходами»; сброс только расходов через `router.replace` без `paidOnly`, с сохранением `nodeIds` / `nodeLabel` при активном фильтре по узлу.
- Активность фильтров/сортировки: `isServiceLogTimelineQueryActive` вместо дублирования условий.
- Бейджи типа записи: `getServiceLogEventKindBadgeLabel`.
- Карточка `STATE_UPDATE`: заголовок `mainTitle` и подзаголовок `stateUpdateSubtitle` отдельно (как в web-модалке).
- Комментарий: свёртка и «Показать» / «Скрыть» для длинных текстов; то же ограничение длины, что на web.
- Сервисные карточки: при непустом `wishlistOriginLabelRu` — строка под `mainTitle`; при нескольких wishlist-id в `installedPartsJson` — несколько нажимаемых меток (как на web).

## Намеренные отличия платформ

- Web: отдельная страница журнала, **оверлей-модалка** для формы события, липкие заголовки месяцев, чипы сортировки с индикатором направления.
- Expo: полноэкранный список журнала, сворачиваемый блок фильтров, компактные даты (`dateStyle: "compact"` в `buildServiceLogTimelineProps`); создание/редактирование/повтор — **полноэкранный** маршрут `/vehicles/[id]/service-events/new` с тем же набором полей bundle внутри `basic-service-event-bundle-form` (query `source=service-log` и при необходимости `eventId` / `repeatFrom`); после сохранения возврат в журнал может использовать `feedback=created|updated`.

## Блок расходов на карточке ТС (не журнал)

- Web и Expo: секция **«Расходы на обслуживание»** **свёрнута по умолчанию**; полный журнал — из секции дерева узлов, не из отдельной кнопки **«Журнал»** в блоке расходов (кнопка убрана). Переход из развёрнутого блока расходов в журнал с фокусом на платных событиях использует query **`paidOnly`** и при необходимости **`expandExpenses`** — см. [expense-tracking-mvp.md](./expense-tracking-mvp.md) и [service-log-mvp.md](./service-log-mvp.md).

## Переход из «Требует внимания»

- **Журнал по узлу** из контекста внимания (web или Expo) открывает тот же **фильтр по поддереву**, что и действие «статус → журнал» в дереве (`createServiceLogNodeFilter` + на Expo query `nodeIds` / `nodeLabel`). Режим **«только расходы»** (`paidOnly`) при этом **не** включается (на web сбрасывается перед открытием журнала из внимания).

## QA (ручная проверка)

На одном и том же наборе данных с backend:

1. Совпадение чисел в месячных чипах «Обслуживание» / «Обновления состояния» / «Расходы» после одинаковых фильтров.
2. Фильтры: даты, узел (текст), тип записи, тип сервиса, **только расходы (`paidOnly`)**; фильтр по узлу из дерева; сочетание узла и `paidOnly`; сброс и отключение кнопки «Сбросить» в дефолтном состоянии.
3. Сортировка по всем полям из списка; порядок внутри месяца согласован с глобальной сортировкой отфильтрованного списка.
4. Визуальный приоритет: `SERVICE` — основная карточка; `STATE_UPDATE` — приглушённая, мелкий бейдж.
5. Комментарии > 120 символов: превью и разворот на web и Expo.
6. Событие с **несколькими** wishlist-id в `installedPartsJson`: в журнале (web и Expo) несколько ссылок в parts; каждая открывает нужную позицию.
7. Форма нового события: блок **«Готово к установке»** на web и кнопка **«Готово к установке…»** в Expo — одинаковые чипы фильтра, один и тот же ответ **`GET …/installable`**; отметка строки с wishlist+expense не должна удваивать сумму в «Запчасти» по сравнению с отдельной отметкой wishlist и expense.
8. **ADVANCED:** суммы в payload и превью «Итого» = строки + верх «Запчасти»/«Работа»; при редактировании верхние поля — остаток к сумме строк; ввод с пробелами/NBSP как в `ru-RU` парсится корректно.
9. В журнале у строк bundle отображаются **`lineCostRu`**, если в данных есть суммы по строкам.
10. Сохранение события с **несколькими** отмеченными чистыми расходами и с **wishlist+expense** не падает на линковке расходов.

## Проверки в репозитории

- `npx tsc --noEmit`
- `npx eslint` на изменённых файлах страницы ТС, экрана журнала Expo и `packages/domain` (service-log / service-log-view-models / index).

---

## Приложение: ранние заметки по Expo journal (объединено)

Ниже — сжатое содержание удалённых черновиков `expo-service-log-web-parity.md` и `expo-service-log-filter-sort-parity.md` (дублировали итог, который уже отражён в разделах выше).

**Визуальная итерация Expo (`service-log.tsx`):**

- Месячные группы с явной карточкой заголовка месяца; компактные чипы сводки (число SERVICE, STATE_UPDATE, расходы месяца при наличии).
- Лента: левый rail, точка типа события, карточка; SERVICE визуально главнее, STATE_UPDATE — вторичнее.
- Сохранены loading/error/empty, `useFocusEffect`, общий pipeline `buildServiceLogTimelineProps` (фильтры, сортировка, группы по месяцам).

**Фильтры и сортировка на клиенте:**

- Диапазон дат «с / по», текстовый фильтр узла (без учёта регистра), вид события (все / SERVICE / STATE_UPDATE), текст по типу сервиса; «Сбросить» возвращает фильтры и сортировку к умолчанию.
- Сортировка: поле (дата, пробег, узел, вид) и направление; по умолчанию дата по убыванию.
- Фильтрация и сортировка применяются до группировки по месяцам; пустое состояние при отсутствии совпадений.
