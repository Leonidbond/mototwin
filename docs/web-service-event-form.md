# Форма сервисного события (Web): `ServiceEventForm` и страницы

Описание **функционала** создания / редактирования / повтора сервисного события на Next.js после переноса с модалки на **полноэкранные страницы**. Контракт данных и нормализация — [`shared-form-contracts.md`](./shared-form-contracts.md); паритет с Expo и деньги в **ADVANCED** — [`web-expo-service-log-parity-fixes.md`](./parity/web-expo-service-log-parity-fixes.md).

**Код формы:** `src/app/vehicles/[id]/_components/service-event-form/` (корень — `ServiceEventForm.tsx`).

**Страницы:**

| Маршрут | Клиентский компонент |
|---------|----------------------|
| `/vehicles/[id]/service-events/new` | `service-events/new/ServiceEventCreateClient.tsx` |
| `/vehicles/[id]/service-events/[eventId]/edit` | `service-events/[eventId]/edit/ServiceEventEditClient.tsx` |

Оба экрана рендерят **`ServiceEventForm`** с одинаковым контрактом пропсов (различаются загрузкой `initialForm`, вызовом create vs update API и `returnTo` в query).

Визуальные ориентиры: **`images/examples/Service-event-fast.png`** (BASIC), **`images/examples/Service-event-extended.png`** (ADVANCED).

---

## 1. Назначение

- Собрать **`AddServiceEventFormValues`** и передать родителю через **`onSubmit(form)`** после **`validateAddServiceEventFormValues`**.
- Поддержать **создание**, **редактирование** (`editingServiceEventId`), предзаполнение (узел, wishlist, повтор — через `initialForm` + **`resetKey`**).
- Нормализация в API: **`normalizeAddServiceEventPayload`** / **`normalizeEditServiceEventPayload`** в `@mototwin/domain`.

---

## 2. Точки входа (навигация)

Раньше форма открывалась модалкой; теперь журнал и карточка ТС делают **`router.push` / `router.replace`** на страницы выше.

| Источник | Примеры |
|----------|---------|
| `src/app/vehicles/[id]/service-log/page.tsx` | Создать, повтор (`repeatOf`), редактировать событие; query **`returnTo`** для возврата в журнал. |
| `src/app/vehicles/[id]/vehicle-detail-client.tsx` | Создание, редактирование, узел дерева, wishlist (`wishlistItemId`, `pendingInstall`), deep link и т.д. |

Родитель страницы отвечает за загрузку **`nodeTree`**, сбор **`initialForm`**, инкремент **`resetKey`**, обработку **`submitError`**, **`isSubmitting`**, навигацию **`onCancel`** (обычно `router.back()` или переход на `returnTo`).

---

## 3. Пропсы (`ServiceEventFormProps`)

| Проп | Назначение |
|------|------------|
| `resetKey` | С **`key={resetKey}`** на внутреннем слое пересоздаёт форму из нового `initialForm`. |
| `initialForm` | Стартовое **`AddServiceEventFormValues`**. |
| `vehicleId` | ТС; installable / wishlist. |
| `nodeTree` | Дерево узлов → только **листовые** в селектах bundle. |
| `vehicleOdometer`, `vehicleEngineHours` | Контекст валидации и installable. |
| `todayDateYmd` | Верхняя граница даты события. |
| `editingServiceEventId` | `null` — создание; иначе — редактирование. |
| `submitError`, `onClearSubmitError` | Ошибка API после submit. |
| `isSubmitting` | Блокировка CTA. |
| `onSubmit` | `async (form) => void`. |
| `onCancel` | Выход со страницы через кнопку «Назад» в шапке формы. Нижнего футера с «Отмена» нет. |
| `title`, `pageSubtitle`, `contextHint` | Заголовок, подзаголовок под шапкой, опциональная подсказка (например wishlist). |
| `pageChrome` | `"partsCart"` — разметка как у страницы каталога (`PartsCartPage.module.css`: `headerServiceEvent`, `mainColumnServiceEvent`); иначе внутренний «карточный» chrome. |
| `eventDateMaxYmd`, `odometerInputMax` | Опциональные ограничения полей. |

Пропсов **`open` / `overlayClassName`** нет — хром страницы задаётся роутом и родителем-клиентом.

---

## 4. Жизненный цикл и сброс

- При изменениях через `updateForm` / `onPatch` сбрасываются локальная ошибка валидации и **`submitError`**.
- Смена сценария: новый **`initialForm`** + увеличенный **`resetKey`** — форма монтируется заново (шаблоны, SKU-строка, installable-выбор и т.д.).

Дата в UI: **ДД.ММ.ГГГГ** (`eventDateDisplay`), в `form.eventDate` после blur — **YYYY-MM-DD**.

---

## 5. Модель формы (`AddServiceEventFormValues`)

См. `packages/types/src/forms.ts`. Кратко:

| Область | Поля |
|---------|------|
| Заголовок и режим | `title`, `mode` (`BASIC` \| `ADVANCED`), `commonActionType` (в **BASIC** общий тип работ для всех строк). |
| Когда / пробег | `eventDate`, `odometer`, `engineHours`. |
| Деньги (верх «Стоимость») | `partsCost`, `laborCost`, `currency`; валюта выбирается в заголовке карточки «Стоимость». |
| Текст | `comment`, **`serviceProviderNote`** (поле названия сервиса показывается только при исполнителе **Сервис**). |
| Место установки | **`installLocationAddress`**, **`installLocationLat`**, **`installLocationLng`** — опционально; адрес вручную или через Яндекс.Карты (см. §5.1). |
| Исполнитель | `performedBy` (`SELF` \| `SERVICE` \| `OTHER`). |
| Вложения | `attachReceiptRequested`, `attachFileRequested`. |
| Напоминание | `nextReminderEnabled`, даты/пробег/моточасы напоминания. |
| Bundle | `items[]` — `key`, `nodeId`, `actionType`, деталь, SKU, количество, цена детали за единицу, работа, комментарий узла. |
| Установки (запчасти) | `installedPartsJson`, `installedExpenseItemIds`. |

### 5.1. Место установки и Яндекс.Карты (web)

**Где в UI:** карточка «Основная информация» — **`InstallLocationField`** (`cards/InstallLocationField.tsx`), сразу после блока исполнителя / поля «Сервис», перед «Комментарий».

**Поведение:**

- Подпись **«Место установки (опционально)»**; текстовое поле адреса (до 500 символов, `ADD_SERVICE_EVENT_INSTALL_LOCATION_MAX_LENGTH` в `@mototwin/domain`).
- Кнопка **«На карте»** открывает модалку **`YandexMapPlacePickerModal`** — встроенный поиск `SearchControl` Яндекса, клик по организации с подтверждением, клик по карте, обратное геокодирование; по **«Выбрать»** в форму подставляются адрес и координаты.
- Кнопка **×** очищает адрес и координаты.
- При заданных координатах под полем показывается строка «Координаты: …».

**Модуль интеграции** (переиспользуемый, только web):

| Путь | Назначение |
|------|------------|
| `src/components/integrations/yandex-maps/` | Модалка выбора точки на `@iminside/react-yandex-maps`, клиент `/api/geocode`, тип `YandexMapPlace`. |
| `index.ts` | Экспорт: `YandexMapPlacePickerModal`, `getYandexMapsApiKey`, `isYandexMapsConfigured`. |

**Переменная окружения** (корневой `.env`, см. `.env.example`):

```bash
NEXT_PUBLIC_YANDEX_MAPS_API_KEY="ключ-из-кабинета-разработчика"
YANDEX_GEOCODER_API_KEY="ключ-http-геокодера"
```

- Нужны оба ключа: JS API (карта + SearchControl) и HTTP Геокодер (fallback-поиск и reverse через `/api/geocode`).
- Без `NEXT_PUBLIC_YANDEX_MAPS_API_KEY` поле адреса работает; кнопка «На карте» скрыта, под полем — подсказка про ключ.
- Без `YANDEX_GEOCODER_API_KEY` карта откроется, но fallback-поиск и reverse геокодирование будут недоступны.
- После добавления ключа перезапустите `npm run dev` (переменные `NEXT_PUBLIC_*` читаются при старте Next.js).
- В кабинете Яндекса ограничьте ключ по **HTTP Referrer** (для локальной разработки — `localhost`).

**Сохранение:** `normalizeAddServiceEventPayload` отправляет в API `installLocationAddress` и, если адрес непустой и координаты валидны, `installLocationLat` / `installLocationLng`; иначе координаты в БД — `null`. Валидация формы: длина адреса; широта/долгота задаются парой (−90…90 / −180…180).

**Expo:** те же поля есть в **`AddServiceEventFormValues`** и API, но UI выбора на карте **пока только на web** (см. [shared-form-contracts.md](./shared-form-contracts.md)).

**Миграция БД:** `prisma/migrations/20260516143000_service_event_install_location/`.

---

## 6. Режимы BASIC и ADVANCED

Переключатель — **`ServiceEventModeControl`**:

- **`variant="segmented"`** (страницы create/edit с `pageChrome="partsCart"` и встроенный chrome без `partsCart`): одна строка «Быстро» / «Подробно», компактная рамка; краткие подсказки в **`title`** на кнопках.
- **`variant="tiles"`** (по умолчанию, если явно не передан `segmented`): две крупные плитки с иконками и подзаголовками — для плотных/альтернативных экранов.

Данные при переключении **не сбрасываются**; в BASIC тип работы первой строки попадает в **`commonActionType`**, все строки синхронизируются; в ADVANCED у строк свой **`actionType`**.

Компоновка колонок — **`ServiceEventModalBodyUnified`**: на ширине **≥ 1024px** задаётся **inline** `display: grid` и **`gridTemplateColumns: minmax(0, 2fr) minmax(0, 3fr)`** (`useLayoutEffect` + `matchMedia`), чтобы в текущем бандле Tailwind v4 не терялась двухколоночная вёрстка при сочетании flex/grid на предках. Вертикальные отступы в теле и карточках ужаты относительно ранней модалки для плотного экрана.

### BASIC («Быстро»)

- **Слева:** «Основная информация» (**`BasicInfoCard`** → **`BasicInfoPrimaryFields`**) + «Стоимость».
- **Справа:** карточка «Узлы и работы» — баннер быстрого режима, компактный выбор **типа работы**, строки **`BundleNodeRowFast`**, блок **«Дополнительно»** (`AdditionalCardFast`).
- В пустой строке узла клик по строке открывает **`AddNodeSheet`**; у выбранного узла справа показывается крестик очистки узла.
- В блоке «Узлы и работы» быстрого режима нет локального подвала стоимости: общие суммы вводятся только в карточке «Стоимость».
- **Нет** sticky «Предварительный итог» слева. Блок **`PostSaveExplainer`** («Что будет после сохранения») показывается **и в BASIC**, и в ADVANCED — под основным телом формы.
- Кнопка **«Готово к установке»** в шапке бандла **не показывается** (только в ADVANCED при создании).

### ADVANCED («Подробно»)

- **Слева:** та же карточка основной информации (**`BasicInfoPrimaryFields`**) и «Стоимость» (без «Дополнительно»).
- **Справа:** карточка «Узлы и работы» — **`BundleNodeCardExtended`**, панель SKU, **`BundleTotals`** `variant="extended"`; **под ней** тот же блок **«Дополнительно»**, что и в BASIC — **`AdditionalCardFast`** (общий для обоих режимов).
- В карточке узла подробного режима строка детали содержит название/SKU, количество и цену детали за единицу. Отображаемая «Стоимость деталей» считается как **количество × цена**; при сохранении в payload уходит рассчитанная сумма. Пустая строка узла открывает тот же **`AddNodeSheet`** (multi), что и в BASIC, а не отдельный single-picker.
- Нижняя кнопка «Добавить узел» в подробном режиме не показывается; добавление узлов выполняется через кнопку в шапке `BundleHeader`.
- **`PostSaveExplainer`** — полоса под основным телом формы (BASIC и ADVANCED).
- **`BundleHeader`**: кнопки «Готово к установке» (только при создании) и «Добавить узел».

---

## 7. Шапка страницы формы

- **`pageChrome="partsCart"`** (экраны `service-events/new` и `…/edit`): корневая сетка и **`mainColumnServiceEvent`** — плотнее по вертикали. **Шапка** (`headerServiceEvent`): слева круг «Назад», справа колонка **заголовок → `ServiceEventModeControl` (segmented) → подзаголовок** (`pageSubtitle`), а справа в той же строке — CTA **«Сохранить событие» / «Сохранить изменения»**.
- **Встроенный chrome** (без `partsCart`): верхняя полоса с «Назад», заголовком, под ним **segmented**-режим и при необходимости **`contextHint`**; тело с `max-w-[1500px]`, скругление, тень.
- Нижний футер формы удалён: нет кнопок **«Отмена»** и **«Предпросмотр»**. Сохранение выполняется верхним CTA.

Адаптив: ниже 1024px колонки **`ServiceEventModalBodyUnified`** складываются в одну (aside → section).

Нумерация секций: слева **1** и **2** (основная, стоимость); справа в бандле **3.** «Узлы и работы»; под бандлом **«Дополнительно»** — один и тот же **`AdditionalCardFast`** в BASIC и ADVANCED (без номера секции).

---

## 8. Шаблоны пакета

- Запрос шаблонов при монтировании; ошибка под селектом.
- **Один блок для BASIC и ADVANCED** (компонент **`BasicInfoPrimaryFields`**): сверху в одну строку **«Название события»** и **«Шаблон (опционально)»**. Состав шаблона открывается круглой кнопкой **`?`** рядом с подписью шаблона.
- Применение: **`mergeServiceBundleTemplateIntoAddFormValues`**; **`TemplateContentsOverlay`** для просмотра состава.
- При **редактировании** блок шаблона скрыт (`showTemplate === false`).

---

## 9. «Готово к установке»

- **`InstallablePickerOverlay`**; в ADVANCED кнопка в **`BundleHeader`** при **`!editingServiceEventId`**.
- Данные: **`getInstallableForServiceEvent(vehicleId)`**; фильтры и merge/revert — как в domain (wishlist, expense).

---

## 10. Bundle и SKU

- Минимум одна строка; уникальный листовой **`nodeId`**.
- **`AddNodeSheet`** — мультивыбор узлов (внутри общий **`NodePickerModal`**). Переиспользование UI выбора узла: **[`node-picker-reuse.md`](./node-picker-reuse.md)**.
- **BASIC:** `BundleNodeRowFast`; пустая строка открывает **`AddNodeSheet`**, выбранная строка очищается крестиком справа.
- **ADVANCED:** `BundleNodeCardExtended` + `BundleNodePartRow`, поиск SKU с debounce к **`getPartSkus`**. Цена детали в строке — цена за единицу; итоговая стоимость деталей строки — `quantity × partCost`.
- **`PreviewOverlay`** больше не используется на странице формы.

---

## 11. Оверлеи (z-index)

Пикеры узлов, состава шаблона и «Готово к установке» рендерятся с **`position: fixed`**, **`z-index: 60`**, на весь viewport (корректно поверх полноэкранной страницы).

---

## 12. Валидация и отправка

- **`validateAddServiceEventFormValues(form, { todayDateYmd, currentVehicleOdometer, leafNodeIds })`**.
- Первая ошибка — текст под основным телом формы.
- Успех → **`onSubmit(form)`**; родитель вызывает API и при ошибке выставляет **`submitError`**.

### Модалка «Обновить текущие показатели?»

После **`blur`** полей **Пробег** и **Моточасы**, если введённые числа **строго больше** текущих показателей ТС (из пропсов `vehicleOdometer` / `vehicleEngineHours` и локального состояния после успешного обновления), показывается полноэкранный оверлей поверх формы (**`z-index: 70`**) с вопросом, обновить ли текущее состояние мотоцикла через **`PATCH /api/vehicles/[id]/state`**.

- **«Обновить»** — запрос к API; при успехе локальные «текущие» пробег и моточасы синхронизируются с ответом, модалка закрывается; значения в полях формы события **остаются** такими, как ввёл пользователь (они согласованы с новым состоянием ТС).
- **«Не обновлять»**, **крестик** или клик по **затемнённому фону** (пока запрос не выполняется) — модалка закрывается **без** PATCH; поля **Пробег** и **Моточасы** в форме **возвращаются к текущим показателям ТС** на момент отмены, а не к введённому завышенному значению. Пока идёт сохранение «Обновить», закрытие по фону отключено.

Логика: `ServiceEventForm.tsx` — `maybeUpdateVehicleStateFromEventMetrics`, `confirmVehicleStateUpdate`, `cancelPendingVehicleStateUpdate`.

---

## 13. Редактирование

- Нет выбора шаблона; нет кнопки installable в шапке.
- Lock вложений в **Extended** при уже выставленных флагах в записи; в **Fast** — disabled у соответствующих кнопок.

### Mobile route strategy

Expo/mobile намеренно оставляет один экран **`apps/app/app/vehicles/[id]/service-events/new.tsx`** для create / edit / repeat. Редактирование включается query-параметром **`eventId`** (`service-events/new?eventId=...`), а не отдельным route shape как на web. Это platform-specific решение: экран переиспользует один loader/form, не ломает существующие deep links и сохраняет общий form contract. Отдельный Expo route `service-events/[eventId]/edit.tsx` стоит добавлять только если появятся внешние deep links или требования к chrome URL.

## 13.1. Mobile parity notes

- Mobile использует тот же `AddServiceEventFormValues`, domain validation/normalization и backend side effects, что web.
- Mobile теперь имеет read-only preview sheet из нижнего футера: название, режим, дата, пробег/моточасы, исполнитель, сервис, флаги вложений, число узлов, итог, напоминание и комментарий.
- Date/metric UX на mobile: дата нормализуется к `YYYY-MM-DD` на blur и блокируется, если позже сегодняшней; пробег/моточасы выше текущих вызывают prompt обновления состояния до submit.
- После create/update из service-log mobile возвращает `serviceEventId` вместе с `feedback`, поэтому журнал скроллит и подсвечивает сохранённое событие.
- Шаблоны остаются в блоке «Основная информация», а `Готово к установке` находится в header карточки узлов только в ADVANCED/create, как на web. Крестик удаления/очистки узла расположен в той же строке, что и выбранный узел.
- Mobile node picker держит `Топ-узлы` в одной строке с поиском; в ADVANCED поиск SKU показывается сразу после SKU текущей строки узла.
- Mobile currency UX: `RUB` по умолчанию, быстрый список `RUB / USD / EUR` и пункт «Другая валюта» с uppercase ISO-like code.

---

## 14. Каталог `service-event-form/`

| Файл | Роль |
|------|------|
| `ServiceEventForm.tsx` | Состояние формы, загрузки, submit, сбор дочерних блоков; ветки `pageChrome` (partsCart / default). |
| `ServiceEventModeControl.tsx` | Режим BASIC/ADVANCED: **`segmented`** или плитки **`tiles`**. |
| `PostSaveExplainer.tsx` | Полоса «Что будет после сохранения» (BASIC и ADVANCED). |
| `styles.ts`, `utils.ts` | Локальная холодная палитра формы, поля (**`FIELD_IN_STACK`** — колонка «подпись + поле» без лишнего `marginTop`), дата, breadcrumb, клон формы. |
| `body/ServiceEventModalBodyUnified.tsx` | Двухколоночный layout (matchMedia + grid), плотные отступы в карточке узлов. |
| `cards/BasicInfoCard.tsx` | Заголовок секции «1. Основная информация» + **`BasicInfoPrimaryFields`**. |
| `cards/basic-info-primary-fields.tsx` | **Общие** поля основной информации для обоих режимов (шаблон → название → дата/пробег/моточасы → …); подключает **`InstallLocationField`**. |
| `cards/InstallLocationField.tsx` | Поле «Место установки» + кнопка «На карте» → **`YandexMapPlacePickerModal`**. |
| `cards/*` (остальные) | Cost, **`AdditionalCardFast`** (общий для режимов). `AdditionalCardExtended`, `PreliminarySummaryCard` в каталоге, в текущем layout не выводятся. |
| `bundle/*` | Header, строки fast, карточки extended, totals. |
| `node-picker/NodePickerModal.tsx` | Общая модалка выбора узла (single/multi); см. [node-picker-reuse.md](./node-picker-reuse.md). |
| `overlays/*` | AddNode, TemplateContents, InstallablePicker. `PreviewOverlay` сохранён в каталоге, но не используется текущей страницей формы. |
| `src/components/integrations/yandex-maps/` | Интеграция Яндекс.Карт (см. §5.1); не внутри `service-event-form/`, но используется формой. |
| `index.ts` | Экспорт `ServiceEventForm`, тип пропсов. |

---

## 15. Смоук (ручной чеклист)

1. **`/vehicles/{id}/service-events/new`** — форма открывается, BASIC по умолчанию, переключение ADVANCED, «Назад» возвращает с учётом `returnTo`, верхний CTA сохраняет событие.
2. **Создание** — валидация пустых полей; успешный submit и редирект по логике клиента.
3. **`/vehicles/{id}/service-events/{eventId}/edit`** — загрузка события, шаблон скрыт, CTA «Сохранить изменения».
4. Из **service-log** — переходы new / repeat / edit с **`returnTo`**.
5. Из **vehicle-detail** — new, edit, wishlist / узел (query-параметры), без регрессии навигации.
6. Пробег/моточасы **выше текущих** → модалка; **«Не обновлять»** / фон / крестик → в полях снова **текущие** показатели ТС; **«Обновить»** → успешный PATCH и поля без отката.
7. **Место установки:** ручной ввод адреса; с **`NEXT_PUBLIC_YANDEX_MAPS_API_KEY`** — «На карте» → поиск через SearchControl/клик по карте → адрес и координаты в форме; при ошибке SearchControl включается fallback через `/api/geocode`; после сохранения события поля приходят в API и при повторном edit.

Линт по области формы (в zsh квадратные скобки в пути — в кавычках):

```bash
npx eslint 'src/app/vehicles/[id]/_components/service-event-form' 'src/app/vehicles/[id]/service-events'
```
