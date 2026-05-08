# Форма сервисного события (Web): `ServiceEventForm` и страницы

Описание **функционала** создания / редактирования / повтора сервисного события на Next.js после переноса с модалки на **полноэкранные страницы**. Контракт данных и нормализация — [`shared-form-contracts.md`](./shared-form-contracts.md); паритет с Expo и деньги в **ADVANCED** — [`web-expo-service-log-parity-fixes.md`](./web-expo-service-log-parity-fixes.md).

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
| Исполнитель | `performedBy` (`SELF` \| `SERVICE` \| `OTHER`). |
| Вложения | `attachReceiptRequested`, `attachFileRequested`. |
| Напоминание | `nextReminderEnabled`, даты/пробег/моточасы напоминания. |
| Bundle | `items[]` — `key`, `nodeId`, `actionType`, деталь, SKU, количество, цена детали за единицу, работа, комментарий узла. |
| Установки | `installedPartsJson`, `installedExpenseItemIds`. |

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
- **Нет** sticky «Предварительный итог» слева, **нет** `PostSaveExplainer`.
- Кнопка **«Готово к установке»** в шапке бандла **не показывается** (только в ADVANCED при создании).

### ADVANCED («Подробно»)

- **Слева:** та же карточка основной информации (**`BasicInfoPrimaryFields`**), стоимость, **`AdditionalCardExtended`**.
- **Справа:** **`BundleNodeCardExtended`**, панель SKU, **`BundleTotals`** `variant="extended"`.
- В карточке узла подробного режима строка детали содержит название/SKU, количество и цену детали за единицу. Отображаемая «Стоимость деталей» считается как **количество × цена**; при сохранении в payload уходит рассчитанная сумма.
- Нижняя кнопка «Добавить узел» в подробном режиме не показывается; добавление узлов выполняется через кнопку в шапке `BundleHeader`.
- **`PostSaveExplainer`** — полоса под основным телом формы на всю ширину карточки.
- **`BundleHeader`**: кнопки «Готово к установке» (только при создании) и «Добавить узел».

---

## 7. Шапка страницы формы

- **`pageChrome="partsCart"`** (экраны `service-events/new` и `…/edit`): корневая сетка и **`mainColumnServiceEvent`** — плотнее по вертикали. **Шапка** (`headerServiceEvent`): слева круг «Назад», справа колонка **заголовок → `ServiceEventModeControl` (segmented) → подзаголовок** (`pageSubtitle`), а справа в той же строке — CTA **«Сохранить событие» / «Сохранить изменения»**.
- **Встроенный chrome** (без `partsCart`): верхняя полоса с «Назад», заголовком, под ним **segmented**-режим и при необходимости **`contextHint`**; тело с `max-w-[1500px]`, скругление, тень.
- Нижний футер формы удалён: нет кнопок **«Отмена»** и **«Предпросмотр»**. Сохранение выполняется верхним CTA.

Адаптив: ниже 1024px колонки **`ServiceEventModalBodyUnified`** складываются в одну (aside → section).

Нумерация секций: в BASIC **1–2–3** (основная, стоимость, узлы); в ADVANCED **1–2–3–4** (добавляется «Дополнительно» перед узлами).

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

---

## 13. Редактирование

- Нет выбора шаблона; нет кнопки installable в шапке.
- Lock вложений в **Extended** при уже выставленных флагах в записи; в **Fast** — disabled у соответствующих кнопок.

---

## 14. Каталог `service-event-form/`

| Файл | Роль |
|------|------|
| `ServiceEventForm.tsx` | Состояние формы, загрузки, submit, сбор дочерних блоков; ветки `pageChrome` (partsCart / default). |
| `ServiceEventModeControl.tsx` | Режим BASIC/ADVANCED: **`segmented`** или плитки **`tiles`**. |
| `PostSaveExplainer.tsx` | Полоса после сохранения (ADVANCED). |
| `styles.ts`, `utils.ts` | Локальная холодная палитра формы, поля (**`FIELD_IN_STACK`** — колонка «подпись + поле» без лишнего `marginTop`), дата, breadcrumb, клон формы. |
| `body/ServiceEventModalBodyUnified.tsx` | Двухколоночный layout (matchMedia + grid), плотные отступы в карточке узлов. |
| `cards/BasicInfoCard.tsx` | Заголовок секции «1. Основная информация» + **`BasicInfoPrimaryFields`**. |
| `cards/basic-info-primary-fields.tsx` | **Общие** поля основной информации для обоих режимов (шаблон → название → дата/пробег/моточасы → …). |
| `cards/*` (остальные) | Cost, Additional fast/extended. `PreliminarySummaryCard` сохранён в каталоге, но не выводится в текущем layout. |
| `bundle/*` | Header, строки fast, карточки extended, totals. |
| `node-picker/NodePickerModal.tsx` | Общая модалка выбора узла (single/multi); см. [node-picker-reuse.md](./node-picker-reuse.md). |
| `overlays/*` | AddNode, TemplateContents, InstallablePicker. `PreviewOverlay` сохранён в каталоге, но не используется текущей страницей формы. |
| `index.ts` | Экспорт `ServiceEventForm`, тип пропсов. |

---

## 15. Смоук (ручной чеклист)

1. **`/vehicles/{id}/service-events/new`** — форма открывается, BASIC по умолчанию, переключение ADVANCED, «Назад» возвращает с учётом `returnTo`, верхний CTA сохраняет событие.
2. **Создание** — валидация пустых полей; успешный submit и редирект по логике клиента.
3. **`/vehicles/{id}/service-events/{eventId}/edit`** — загрузка события, шаблон скрыт, CTA «Сохранить изменения».
4. Из **service-log** — переходы new / repeat / edit с **`returnTo`**.
5. Из **vehicle-detail** — new, edit, wishlist / узел (query-параметры), без регрессии навигации.

Линт по области формы (в zsh квадратные скобки в пути — в кавычках):

```bash
npx eslint 'src/app/vehicles/[id]/_components/service-event-form' 'src/app/vehicles/[id]/service-events'
```
