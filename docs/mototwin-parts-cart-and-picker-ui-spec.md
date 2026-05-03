# MotoTwin UI Spec: Корзина замен и расходников + Подбор детали

Версия: 2.0  
Назначение: точный UI-спек для реализации в Cursor / Next.js / TypeScript  
Экраны: desktop + mobile  
Стиль: MotoTwin dark UI

В версии 2.0 Часть B полностью переработана: модальный picker с тремя вкладками (Поиск / Рекомендации / Комплекты) удалён, вместо него — отдельная страница «Подбор детали» (single-page), на которой рекомендации, комплекты и поиск показаны одновременно, а справа — локальная **черновая корзина**, которая отправляет позиции в wishlist по `«Перейти к оформлению»`.  

---

## 1. Общий принцип

Эти экраны относятся к service-centered workflow MotoTwin: пользователь управляет обслуживанием мотоцикла, списком замен, расходниками, SKU и комплектами ТО.

Важно: это не marketplace checkout. Это рабочий интерфейс владения мотоциклом.

Главные сущности интерфейса:

- `WishlistItem` / позиция корзины замен и расходников
- `PartSku` / конкретный SKU детали
- `ServiceKit` / комплект обслуживания
- `Node` / leaf-узел дерева мотоцикла
- `Vehicle` / выбранный мотоцикл
- `ServiceEvent` / событие обслуживания, создается при установке позиции

---

## 2. Общие визуальные правила MotoTwin

### Цвета

```ts
const colors = {
  bg: "#070B10",
  surface: "#0D131B",
  surface2: "#121A24",
  surface3: "#17212D",
  border: "#233040",
  borderSoft: "#1A2633",
  text: "#F3F6FA",
  textMuted: "#A7B0BD",
  textSubtle: "#6F7B89",
  orange: "#FF5A00",
  orange2: "#FF7A1A",
  red: "#FF3B30",
  yellow: "#FFC400",
  blue: "#36A3FF",
  green: "#30D158",
};
```

### Радиусы

```ts
const radius = {
  card: "18px",
  button: "14px",
  input: "14px",
  chip: "999px",
  modal: "24px",
};
```

### Тени и фон

- Основной фон: почти черный.
- Карточки: темные поверхности с тонкой границей.
- Активные элементы: orange border / underline / filled CTA.
- Не использовать яркие случайные цвета.
- Статусы цветом, но без визуального шума.

### Типографика

- Заголовок страницы desktop: 28–32 px, semibold.
- Заголовок mobile: 24–28 px, semibold.
- Название карточки: 16–18 px, semibold.
- Технический путь узла: 12–13 px, uppercase или muted.
- Цена: 16–22 px, semibold.

---

## 3. Навигация и оболочка

### Desktop App Shell

Компонент: `MotoTwinDesktopShell`

Состав:

- левый sidebar шириной 180–200 px;
- логотип MotoTwin сверху;
- пункты меню:
  - Обзор
  - Узлы
  - Журнал
  - Расходы
  - Подбор деталей
  - Профиль
- пункт `Подбор деталей` (ранее `Детали`) ведёт на **корзину замен и расходников** `/vehicles/[id]/parts` (Часть A);
- активный пункт подсвечивается orange accent слева;
- блок Pro внизу;
- user card и выход.

Layout:

```tsx
<div className="min-h-screen bg-mt-bg text-mt-text grid grid-cols-[180px_1fr]">
  <Sidebar active="parts" />
  <main>{children}</main>
</div>
```

### Mobile App Shell

Компонент: `MotoTwinMobileShell`

Состав:

- top safe area;
- верхний логотип или заголовок в зависимости от экрана;
- bottom tab bar:
  - Гараж
  - Узлы
  - Журнал
  - Расходы
  - Профиль
- активный пункт: `Узлы` или `Детали`, orange.

Bottom bar фиксированная.

---

# Часть A. Корзина замен и расходников

---

## 4. Экран: Корзина замен и расходников — desktop

Файл-референс: `Корзина запчастей web.png`

### 4.1. Назначение

Экран показывает все позиции, которые нужно купить, заказаны, куплены или уже установлены. Пользователь управляет статусами, открывает детали позиции, добавляет новую позицию или комплект.

### 4.2. Desktop layout

```txt
┌ Sidebar ┐ ┌ Header + actions                                      ┐ ┌ Detail panel ┐
│         │ │ Summary cards (status filter: Все + по статусам)       │ │ Selected item │
│         │ │ Search + filters                                       │ │ Status        │
│         │ │ Grouped list: Needed / Ordered / Bought / Installed    │ │ Actions       │
│         │ │                                                        │ │ History       │
└─────────┘ └────────────────────────────────────────────────────────┘ └──────────────┘
```

Основной контейнер:

```tsx
<div className="grid grid-cols-[1fr_360px] gap-6 p-6">
  <div className="space-y-5">
    <CartHeader />
    <CartSummaryCards />
    <CartSearchAndFilters />
    <CartGroupedList />
  </div>
  <CartItemDetailPanel />
</div>
```

### 4.3. Components

#### `CartPage`

Props:

```ts
type CartPageProps = {
  vehicle: VehicleSummary;
  items: WishlistItem[];
  selectedItemId?: string;
};
```

Responsibilities:

- загрузить список позиций;
- держать выбранную позицию;
- управлять фильтрами;
- передавать grouped data в список.

---

#### `CartHeader`

Desktop:

- back icon / breadcrumb;
- title: `Корзина замен и расходников`;
- subtitle: `Список запчастей и расходников для вашего мотоцикла`;
- actions справа:
  - secondary: `Добавить комплект`
  - primary orange: `+ Добавить позицию`

Mobile:

- logo MotoTwin сверху;
- notification icon;
- card-like header с back icon, title, subtitle, menu.

---

#### `VehicleCompactCard`

Показывает:

- изображение / силуэт мотоцикла;
- `BMW F 850 GS Adventure`;
- `2021 • 42 180 км`;
- chevron.

Desktop может быть внутри header или отсутствовать, если контекст уже ясен.  
Mobile обязателен.

---

#### Превью «Подбор деталей» на обзоре мотоцикла (garage / dashboard)

Web (`VehicleDashboard`) и Expo (`VehicleDetailScreen`): одна секция с заголовком **«Подбор деталей»**, действие **«Список»** → полная корзина (`/parts` на web, `/wishlist` в Expo). Три **вертикальные** компактные карточки в один ряд (равные колонки): статусы **Нужно купить**, **Заказано**, **Куплено** — число активных позиций, цветная полоска сверху и иконка в цвет статуса (как на мобильном); клик открывает полный список с **фильтром по статусу** (`partsStatus` в query). Под рядом — primary CTA **«Добавить деталь»** (web: модалка создания; Expo: `/wishlist/new`). Пустые и «только установленные» состояния — короткие тексты-подсказки в стиле MVP.

Реализация сводки: **`buildPartsCartSummary`** (`@mototwin/domain`, модуль `parts-cart-summary.ts`) по активным позициям; число **`INSTALLED`** для подписи передаётся отдельно с родителя.

---

#### `CartSummaryCards`

Пять карточек в одном ряду (кликабельный фильтр списка; дублирующей строки вкладок под панелью поиска нет):

1. `Все` — количество всех позиций и сумма по стоимости позиций (`costAmount`, в продукте — преимущественно ₽).
2. `Нужно купить`
3. `Заказано`
4. `Куплено`
5. `Установлено`

На карточке: подпись статуса, одна строка **число** и **сумма** рядом (компактно). Отдельной карточки «Куплено, но не установлено» в UI корзины нет (это метрика расходов на `/expenses`).

Data shape (реализация: `buildPartsCartSummary` в `@mototwin/domain`):

```ts
type CartSummary = {
  all: { count: number; amount: number };
  needed: { count: number; amount: number };
  ordered: { count: number; amount: number };
  bought: { count: number; amount: number };
  installed: { count: number; amount: number };
};
```

Visual:

- `Все`: оранжевый акцент, иконка «список».
- Needed: red accent.
- Ordered: yellow accent.
- Bought: blue accent.
- Installed: green accent.

Desktop: horizontal row, карточки без лишней минимальной высоты.  
Mobile: horizontal scroll row of compact cards.

Фильтр статуса: `ALL` | `NEEDED` | `ORDERED` | `BOUGHT` | `INSTALLED`; активная карточка — оранжевая обводка.

---

#### `CartStatusTabs` (устарело для web)

На web **не используется**: фильтр по статусу только через **`CartSummaryCards`**. На Expo экран wishlist использует **сводные карточки** и выбор фильтра по статусу в том же духе, что web-корзина (см. `parts-wishlist-mvp.md`).

---

#### `CartSearchAndFilters`

Desktop:

- wide search input;
- button `Фильтры`.

Mobile:

- search input full width;
- filter button справа.

Placeholder:

`Поиск по названию, SKU, узлу...`

Search fields:

- item name;
- SKU name;
- SKU article;
- node path;
- comment.

---

#### `CartGroupedList`

Группы:

1. `Нужно купить`
2. `Заказано`
3. `Куплено`
4. `Установлено`

Desktop:

- search, фильтры и группы живут внутри одного bordered `listPanel` (вкладок статусов внутри панели нет);
- rows are compact table-like item cards with preview placeholder, status accent line on the left, SKU, quantity, price, status badge and kebab menu;
- group headers are neutral, separated by thin dividers;
- сворачивание и `Показать ещё` работают только при фильтре **«Все»** (`ALL`) без поиска;
- в свернутой группе показывается до 5 строк и CTA `Показать все ...`;
- при выборе статусной карточки сводки или при поиске список сразу показывает все элементы группы.

Mobile:

- каждая группа — отдельный блок;
- строки крупнее;
- кнопка `Показать ещё N` после первых 3–4 позиций.

Props:

```ts
type CartGroupedListProps = {
  groups: CartGroup[];
  selectedItemId?: string;
  onSelectItem: (id: string) => void;
  onOpenItemMenu: (id: string) => void;
};

type CartGroup = {
  status: WishlistItemStatus;
  title: string;
  count: number;
  items: WishlistItem[];
};
```

---

#### `CartItemRow`

Desktop row contents:

- image/icon;
- title;
- node path;
- SKU short name;
- quantity;
- price;
- status badge;
- kebab menu.

Mobile row contents:

- image/icon;
- title;
- node path;
- quantity;
- price;
- status badge;
- kebab menu.

Props:

```ts
type CartItemRowProps = {
  item: WishlistItem;
  selected?: boolean;
  onClick: () => void;
  onMenuClick: () => void;
};
```

Selected desktop:

- subtle outline plus left status-color accent line;
- right detail panel updates from local selected state, without URL navigation, so row selection does not re-render the route.

Status colors:

```ts
const statusStyle = {
  needed: { color: "red", label: "Нужно купить" },
  ordered: { color: "yellow", label: "Заказано" },
  bought: { color: "blue", label: "Куплено" },
  installed: { color: "green", label: "Установлено" },
};
```

---

#### `CartItemDetailPanel`

Desktop only as right panel.  
Mobile opens as bottom sheet / full-screen detail.

Content:

- title: item name;
- current status;
- product image/placeholder;
- SKU block;
- node path;
- quantity;
- price + currency;
- comment;
- kit source if exists;
- compact expandable history with its own scroll viewport;
- actions.

Actions:

- `Редактировать`
- `Заказано`
- `Куплено`
- `Установлено`
- `Удалить`
- `Перейти в журнал обслуживания`

Rules:

- If current status is `needed`, show `Заказано`, `Куплено`, `Установлено`.
- If current status is `ordered`, show `Куплено`, `Установлено`.
- If current status is `bought`, show `Установлено`.
- If current status is `installed`, show `Перейти в журнал обслуживания`.
- History events are shown newest first. Status events should include the transition label, e.g. `Статус: Нужно купить → Заказано`.

Important install flow:

Click `Установлено` must not directly set status. It opens service event creation flow.

---

#### `CartBottomActionsMobile`

Sticky mobile actions:

- secondary: `Добавить комплект`
- primary orange: `+ Добавить позицию`

Behavior:

- fixed above bottom nav;
- hidden/condensed when detail bottom sheet is open.

---

## 5. Корзина: states

### 5.1. Loading

- skeleton summary cards;
- skeleton rows;
- right panel skeleton.

### 5.2. Empty

Text:

`Корзина замен пуста`

Subtitle:

`Добавьте деталь или готовый комплект обслуживания.`

Actions:

- `Добавить позицию`
- `Добавить комплект`

### 5.3. Search empty

Text:

`Ничего не найдено`

Subtitle:

`Попробуйте изменить поиск или фильтры.`

### 5.4. Error

Text:

`Не удалось загрузить корзину`

Action:

`Повторить`

### 5.5. Delete confirmation

Modal/bottom sheet:

Title: `Удалить позицию?`  
Body: `Позиция будет удалена из корзины замен. История обслуживания не изменится.`  
Actions: `Отмена`, `Удалить`

### 5.6. Mark as installed flow

When user clicks `Установлено`:

Open `CreateServiceEventFromCartItemModal`.

Prefill:

- node;
- date = today;
- mileage = vehicle current mileage;
- type = `Установка запчасти`;
- item name;
- SKU;
- cost;
- currency;
- comment.

Only after service event is saved:

- wishlist item status becomes `installed`;
- link to created service event is stored;
- detail panel shows `Перейти в журнал обслуживания`.

---

# Часть B. Подбор детали (single-page)

---

## 6. Экран: Подбор детали — общее

Файлы-референсы:

- `Подбор детали web.png`
- `Подбор детали mobile.png`

### 6.1. Назначение

Отдельная страница, на которой пользователь одновременно видит:

- **рекомендации SKU для выбранного узла** (3 крупные карточки `BEST FIT` / `BEST VALUE` / `FOR YOUR RIDE`);
- **комплекты обслуживания** для мотоцикла (горизонтальные строки с тегами `Популярный` / `Выгодный` / `Рекомендуем`);
- **поиск SKU и фильтры** (всегда вверху страницы, без отдельной вкладки).

Справа — **черновая корзина (draft buffer)**, куда добавляются выбранные SKU и комплекты до отправки в `wishlist` единым batch-запросом по `«Перейти к оформлению»`.

### 6.2. Точки входа

- **Web:** только страница `«Корзина замен и расходников»` (`/vehicles/[id]/parts`):
  - кнопка `«+ Добавить позицию»` → `/vehicles/[id]/parts/picker`
  - кнопка `«Добавить комплект»` → `/vehicles/[id]/parts/picker?focus=kits`
  - быстрое действие из дерева узлов и блока «Требует внимания» → `/vehicles/[id]/parts/picker?nodeId=...`
  - дашборд мотоцикла, секция «Подбор деталей», `«+ Добавить деталь»` → `/vehicles/[id]/parts/picker`
- **Mobile (Expo):** только экран wishlist (`/vehicles/[id]/wishlist`):
  - `«+ Добавить деталь»` / `«+ Добавить комплект»` → `/vehicles/[id]/wishlist/picker[?focus=kits]`
  - дашборд мотоцикла, секция «Подбор деталей», `«+ Добавить деталь»` → `/vehicles/[id]/wishlist/picker`
  - быстрое действие из дерева узлов и attention → `/vehicles/[id]/wishlist/picker?nodeId=...`
  - старый маршрут `/vehicles/[id]/wishlist/new` остаётся **редиректом** на picker с пробросом query.

В sidebar и tab-bar **отдельного пункта меню** для picker нет: пункт `«Подбор деталей»` ведёт на корзину (см. раздел «Навигация»).

### 6.3. Поведение черновой корзины (draft buffer)

- `«+»` на карточке SKU и `«Добавить комплект»` на строке комплекта добавляют запись в локальный draft (state страницы / экрана). **БД не пишется.**
- Кит хранится в драфте как одна агрегированная строка с `kitCode`, общим количеством позиций и общей ориентировочной суммой.
- `«Очистить корзину»` чистит только локальный draft.
- `«Перейти к оформлению»` открывает preview-модалку (web) или bottom-sheet (mobile), показывает «будет добавлено / уже есть в активном wishlist / будет пропущено», и по подтверждению делает batch-вызовы:
  - для каждого одиночного SKU — `POST /api/vehicles/[id]/wishlist`;
  - для каждого кита — `POST /api/vehicles/[id]/wishlist/kits`;
  - агрегирует `created/skipped/warnings`, на успехе ведёт на `/vehicles/[id]/parts` (web) или `/vehicles/[id]/wishlist` (Expo) с тостом и подсветкой созданных позиций.
- При частичной ошибке picker остаётся открыт, draft сохраняет невыполненные позиции, в preview показываются ошибки.

### 6.4. Merchandising-метки и теги

| Сущность | Метка | Как считается (MVP) |
|----------|-------|---------------------|
| Recommendation card 1 | `BEST FIT` (orange) | первый по `sortPartRecommendations` среди `EXACT_FIT` / `MODEL_FIT` |
| Recommendation card 2 | `BEST VALUE` (yellow) | минимальный `priceAmount` среди тех же fits-групп (исключая bestFit) |
| Recommendation card 3 | `FOR YOUR RIDE` (blue) | следующий «не bestFit/bestValue» из `EXACT_FIT` / `MODEL_FIT` / `GENERIC_NODE_MATCH` |
| Service kit | `Популярный` / `Выгодный` / `Рекомендуем` | статичный лукап `{ kitCode → tag }` в `@mototwin/domain` |

Реализация: `classifyRecommendationsForPicker` и `getServiceKitTagRu` в `@mototwin/domain` (см. раздел 16.2 «Domain helpers»). Если сигналов нет — карточка `FOR YOUR RIDE` скрывается, тег кита не показывается.

### 6.5. Ride style chip

Чип `«Стиль езды: Mixed / Touring»` (с карандашом-edit) формируется из `RideProfile` хелпером `formatRideStyleChipRu`. Пустой профиль → `«Стиль езды: не задан»`. Клик на карандаш ведёт на форму ride profile (существующая страница / экран).

### 6.6. «Почему это подходит»

Под draft cart на web — небольшой блок `«Почему это подходит»` с 3–4 чекмарками (`buildWhyMatchesReasons`). На mobile — раскрываемая секция в самом низу скролла.

---

## 7. Подбор детали — desktop layout

```txt
┌ Sidebar ┐ ┌ /vehicles/[id]/parts/picker                                            ┐
│ Подбор  │ │ Header: «Подбор детали»                                                │
│ деталей │ │ Top chips: VehicleChip · NodeChip · ResetSelectionChip                 │
│         │ │ Search bar: PickerSearchBar (search + Фильтры)                         │
│         │ │ ┌ Center column ──────────────────────────┐ ┌ Right column ─────────┐ │
│         │ │ │ RecommendationsSection                  │ │ PickerDraftCartPanel  │ │
│         │ │ │   • title + ride style chip             │ │   • Корзина (N поз.)  │ │
│         │ │ │   • 3 cards: BEST FIT / VALUE / RIDE    │ │   • DraftCartItemRow  │ │
│         │ │ │ KitsSection                             │ │   • Очистить корзину  │ │
│         │ │ │   • title + Показать ещё (N)            │ │   • Сумма + CTA       │ │
│         │ │ │   • horizontal kit rows                 │ │ WhyMatchesPanel       │ │
│         │ │ │ PickerLegalFooter                       │ │                       │ │
│         │ │ └─────────────────────────────────────────┘ └───────────────────────┘ │
└─────────┘ └────────────────────────────────────────────────────────────────────────┘
```

Width:

- основной контейнер `max-w-[1280px]` на всю рабочую область;
- right column: `360 px` фиксированной ширины (sticky);
- center column: flexible.

Recommended CSS grid:

```tsx
<div className="grid grid-cols-[1fr_360px] gap-5">
  <PartPickerCenterColumn />
  <PartPickerRightColumn />
</div>
```

При ширине `<1280 px` правая колонка сворачивается в **sticky bottom bar** с тем же CTA, как mobile.

---

## 8. Подбор детали — mobile layout

Mobile использует один вертикальный поток, без трёх колонок и без вкладок.

Порядок:

1. `MobilePickerHeader` (back · «Подбор детали» · `…`).
2. `VehiclePickerCard` (мото image, name, year/km, ride style label).
3. **`PickerNodeCtaBar`** — выбор leaf-узла: первичный CTA `«Выберите узел мотоцикла»` или строка `«Узел … · Изменить»`; открывает тот же bottom-sheet выбора узла. Блок **всегда над** строкой поиска (и в режиме поиска по каталогу, и при показе рекомендаций).
4. `PickerSearchBar` (search input + кнопка `«Фильтры»`).
5. При пустом / коротком поиске — `PickerRecommendationsSection` (реализация Expo; аналог `RecommendationsSection` на web):
   - заголовок `«Рекомендации для узла «...»»` + info icon;
   - chip справа `«Стиль езды: ...»` с карандашом;
   - при отсутствии узла — подсказка в пунктирной рамке («сначала выберите узел над строкой поиска»), без дублирующего CTA выбора узла;
   - при выбранном узле — 3 vertical-карточки в горизонтальном `ScrollView` (BEST FIT / BEST VALUE / FOR YOUR RIDE);
   - кнопка `«Показать ещё рекомендации (N)»`.
   При поиске ≥ 2 символов — **`PickerSearchResultsSection`** вместо рекомендаций; отдельной строки узла внутри результатов нет (узел — только в `PickerNodeCtaBar` выше).
6. `KitsSection`:
   - заголовок `«Комплекты обслуживания»`;
   - subtitle `«Готовые наборы для обслуживания узлов вашего мотоцикла»`;
   - вертикальные kit rows;
   - кнопка `«Показать ещё комплекты (N)»`.
7. `WhyMatchesPanel` свернутая секция (опционально, в самом низу скролла).
8. `MobileDraftCartBar` sticky внизу: cart-icon + `«Корзина (N позиций)»` + сумма + primary `«Перейти к оформлению»`.
9. Bottom tab bar (Гараж / Узлы / Журнал / Расходы / Профиль) — без отдельного пункта picker.

Контекст мото — в `VehiclePickerCard`; **текущий leaf-узел** — в `PickerNodeCtaBar` над поиском; имя узла дополнительно фигурирует в заголовке секции рекомендаций.

---

## 9. Components: shared picker

### `PartPickerPage` (web) / `MobilePickerScreen` (Expo)

Props:

```ts
type PartPickerPageProps = {
  vehicle: VehicleSummary;
  initialNodeId?: string;
  initialFocus?: PickerFocus; // "all" | "kits"
  initialDraft?: PickerDraftCart; // optional rehydrate from URL/localStorage
};

type PickerFocus = "all" | "kits";
```

Responsibilities:

- держать `selectedNodeId`, `searchQuery`, `searchFilters`, `draftCart`, `pendingSubmission`;
- грузить `recommendations` через `getRecommendedSkusForNode(vehicleId, nodeId)` при изменении `selectedNodeId`;
- грузить `kits` через `getServiceKits({ vehicleId, nodeId })` при изменении `selectedNodeId`;
- грузить `searchResults` через `getPartSkus({ nodeId, search })` при ненулевом `searchQuery`;
- управлять draft cart и сабмитом.

---

### `PickerHeader`

Desktop:

- большой заголовок `«Подбор детали»` слева;
- три chips справа от заголовка через flex/wrap (см. ниже).

Mobile:

- back button слева;
- centered title `«Подбор детали»`;
- `…` menu справа;
- `VehiclePickerCard` ниже.

### `VehicleChip` (top chip 1)

Desktop:

- широкая chip-карточка: motorcycle thumbnail + `BMW F 850 GS Adventure` + `2021 • 42 180 км • Mixed Touring` + chevron;
- клик открывает picker мотоцикла (если в гараже несколько мото).

Mobile: используется `VehiclePickerCard` под header (тот же контент в полную ширину).

### `NodeChip` (top chip 2)

Desktop:

- chip-карточка: leaf icon + label `«Узел»` + name + path (`WHEELS / Шины > Rear`) + chevron;
- клик открывает popover/modal выбора узла (дерево или поиск).

Mobile: компонент **`PickerNodeCtaBar`** (`apps/app/app/vehicles/[id]/wishlist/picker-node-cta.tsx`) — полоса **над** `PickerSearchBar` (не внутри секции рекомендаций).

### `ResetSelectionChip` (top chip 3)

Desktop only chip с иконкой обновления и текстом `«Сбросить выбор»`. Сбрасывает выбранный узел и текущий draft cart (с подтверждением, если draft не пустой).

### `PickerSearchBar`

Desktop:

- широкий search input с иконкой;
- placeholder: `«Поиск по SKU, названию или бренду»`;
- кнопка `«Фильтры»` справа (popover).

Mobile:

- search input full width;
- кнопка `«Фильтры»` справа (опционально вместе с chip-row фильтров).

Фильтры popover (одинаковые на web и mobile):

- OEM
- Аналоги
- Дешевле
- В наличии
- Бренд (multi)

Поведение поиска:

- search активен от 2 символов;
- debounce 250–400 ms;
- очистка по `×`;
- при пустом search показываются обычные секции (рекомендации + комплекты);
- при заполненном search центральная колонка показывает `SearchResultsSection` (vertical SKU rows) **вместо** рекомендаций; секция комплектов остаётся ниже.

---

## 10. Recommendations section

### `RecommendationsSection`

Header:

- title: `«Рекомендации для узла «{nodeName}»»`
- subtitle: `«Подобрано на основе вашего мотоцикла, профиля езды и условий эксплуатации»`
- справа: `«Стиль езды: {chip}»` + edit-icon (карандаш) → ride profile form

Body:

- 3 vertical карточки `RecommendationCard` в горизонтальном grid (`grid-cols-3` на desktop, horizontal scroll на mobile);
- ниже: кнопка `«Показать ещё рекомендации (N)»` (если есть alternatives).

### `RecommendationCard`

Содержание:

- `MerchandiseLabel` сверху (`BEST FIT` orange / `BEST VALUE` yellow / `FOR YOUR RIDE` blue);
- product image / placeholder: **компактная** панель-превью (web: `RecommendationCard.tsx` — высота слота **~55 px**, emoji **~16 px**, `minHeight` карточки **~305 px**; Expo: `picker-recommendation-card.tsx` — **~48 px** / **~18 px** / `minHeight` **~312 px**);
- brand bold + model;
- specs (моноширинный текст);
- `MtTagBadge` (`TOURING` / `DUAL SPORT` / `RALLY` — берётся из `partType` или meta);
- bullet-list `whyRecommended` (3–4 строки с зелёными чекмарками);
- цена внизу слева крупно (`12 600 ₽`);
- `«Подходит»` зелёная подпись;
- primary `+` button справа внизу (добавить в draft cart).

Visual accents:

- `BEST FIT`: orange border + orange label background.
- `BEST VALUE`: yellow border + yellow label background.
- `FOR YOUR RIDE`: blue border + blue label background.

При отсутствии данных для одной из меток (например, нет дешёвого варианта) карточка скрывается.

---

## 11. Search results section

Показывается **вместо** `RecommendationsSection`, когда `searchQuery.length >= 2`.

### `SearchResultsSection`

Header:

- title: `«Найдено: N»` или `«Поиск: «{query}»»`;
- кнопка `«Сбросить поиск»`.

Body:

- vertical список `SearchResultRow` (3–6 видимых, остальные через scroll).

### `SearchResultRow`

- product image / placeholder;
- brand + name;
- specs / category;
- цена;
- `«Подходит»` / `«Требует проверки»` / `«Не подходит»` (по `compatibility`);
- primary `+` button (добавить в draft cart).

Empty state: «Ничего не найдено» + подсказка изменить запрос или сбросить фильтры.

---

## 12. Kits section

### `KitsSection`

Header:

- title: `«Комплекты обслуживания»`;
- subtitle: `«Готовые наборы для обслуживания узлов вашего мотоцикла. Экономия времени и денег.»`;
- справа: кнопка `«Показать ещё (N)»`.

Body:

- horizontal-list `ServiceKitRow` (на desktop в одну строку из 3 карточек или вертикальный список — выбирается по дизайну; на mobile — vertical stack с компактными rows).

### `ServiceKitRow` (mobile-style горизонтальная строка)

- kit image слева (квадрат);
- центр: kit title bold + subtitle (`«Колодки + тормозная жидкость»`) + `MtTagBadge` (`«Популярный»` / `«Выгодный»` / `«Рекомендуем»`) + count `«Включает N позиций»`;
- справа: цена + (deferred) `oldAmount` + (deferred) `−10%` discount badge + `«Подходит»` зелёная подпись;
- primary CTA `«Добавить комплект»` или chevron.

Поведение:

- `«Добавить комплект»` добавляет кит в draft cart как одну агрегированную строку (`kind: "kit"`);
- если кит уже в drafte — кнопка `«В корзине ✓»` (disabled);
- если все items кита уже в активном wishlist — кнопка disabled с tooltip.

> Discount/oldAmount/изображения SKU и китов **не реализуются в этой итерации** (нет полей в данных). Спека описывает целевой UI, реальный код пока показывает только `priceAmount` и иконку-плейсхолдер.

---

## 13. Draft cart panel

### `PickerDraftCartPanel` (web, sticky right column)

Содержимое:

- header: `«Корзина (N позиций)»`;
- list of `DraftCartItemRow` (см. ниже);
- ghost button `«Очистить корзину»`;
- divider;
- `«Сумма»` + total amount;
- primary CTA `«Перейти к оформлению»`.

### `DraftCartItemRow`

Для одиночного SKU:

- product thumbnail / иконка;
- brand + name;
- specs (одна строка);
- `1 шт.` + цена справа;
- кнопка `×` (удалить из draft).

Для кита (агрегированная строка):

- kit thumbnail / иконка-комплект;
- kit title;
- `«N позиций»`;
- `1 шт.` + общая цена;
- кнопка `×`.

Empty state:

- иконка корзины;
- `«Корзина пуста»`;
- `«Добавьте позиции из рекомендаций или комплектов»`;
- CTA disabled.

### `MobileDraftCartBar` (mobile sticky bottom)

- cart-icon слева;
- `«Корзина (N позиций)»` + сумма (две строки);
- primary CTA `«Перейти к оформлению»` справа.

Tap по бару (где не CTA) разворачивает sheet со списком draft items и `«Очистить корзину»`.

---

## 14. Why matches panel

### `WhyMatchesPanel`

Web: компактный блок под draft cart с 3–4 чекмарками:

- `«Полная совместимость с вашим мотоциклом»`
- `«Соответствует штатным размерам»`
- `«Проверено владельцами {model}»`
- `«Оптимально для вашего стиля езды»` (только при наличии ride profile)

Mobile: collapsible секция в самом низу скролла с тем же содержимым.

Reasons формируются `buildWhyMatchesReasons(input)` (см. раздел 16.2).

---

## 15. Submit preview & flow

### `PickerSubmitPreviewModal` (web) / `PickerSubmitSheet` (mobile)

Открывается по `«Перейти к оформлению»` если draft не пустой.

Содержимое:

- title: `«Подтвердите состав»`;
- список draft items, разбитых на:
  - `«Будет добавлено»` (зелёная иконка);
  - `«Уже в активном wishlist»` (синяя иконка, будет пропущено);
  - `«Невозможно добавить»` (красная иконка, с причиной — `«Узел не выбран»` / `«SKU неактивен»`);
- сводка: `«Будет добавлено: N позиций, ~{total} ₽»`;
- кнопки: `«Назад»`, primary `«Подтвердить»`.

При submit:

- последовательно `POST /api/vehicles/[id]/wishlist` для каждого `kind: "sku"` и `POST /api/vehicles/[id]/wishlist/kits` для каждого `kind: "kit"`;
- агрегируется итоговый `created/skipped/warnings`;
- toast: `«Добавлено: {n} позиций. Пропущено: {m}»`;
- redirect: web → `/vehicles/[id]/parts?picked={ids}`; Expo → `/vehicles/[id]/wishlist?picked={ids}`;
- cart-страница / wishlist-экран подсвечивает первые `picked` позиции и скроллит к ним.

При частичной ошибке:

- preview закрывается;
- draft сохраняет невыполненные позиции;
- inline-баннер на picker `«N позиций не удалось добавить — попробуйте ещё раз»`.

---

# Data contracts

---

## 16. Types

```ts
type CurrencyCode = "RUB" | "USD" | "EUR";

type VehicleSummary = {
  id: string;
  name: string;
  year: number;
  mileageKm: number;
  rideProfileLabel?: string;
  imageUrl?: string;
};

type NodeSummary = {
  id: string;
  name: string;
  path: string;
  icon?: string;
};

type WishlistItemStatus = "needed" | "ordered" | "bought" | "installed";

type WishlistItem = {
  id: string;
  vehicleId: string;
  node: NodeSummary;
  name: string;
  quantity: number;
  unitLabel: string;
  status: WishlistItemStatus;
  amount?: number;
  currency: CurrencyCode;
  comment?: string;
  sku?: PartSku;
  kitName?: string;
  serviceEventId?: string;
  createdAt: string;
  updatedAt: string;
};

type PartSku = {
  id: string;
  name: string;
  brand: string;
  article: string;
  specs?: string;
  category?: string;
  imageUrl?: string;
  price?: number;
  currency: CurrencyCode;
  tags?: string[];
  compatibility: "fits" | "unknown" | "not_fit";
  node: NodeSummary;
  description?: string;
};

type RecommendationCardData = {
  type: "best_fit" | "best_value" | "for_your_ride";
  sku: PartSku;
  reasons: string[];
  explanation?: string;
};

type ServiceKitItem = {
  id: string;
  name: string;
  quantity: number;
  unitLabel: string;
  sku?: PartSku;
  node: NodeSummary;
};

type ServiceKit = {
  id: string;
  name: string;
  subtitle?: string;
  categoryPath?: string;
  imageUrl?: string;
  tag?: string;
  items: ServiceKitItem[];
  amount?: number;
  oldAmount?: number; // deferred — нет в данных
  currency: CurrencyCode;
  discountPercent?: number; // deferred — нет в данных
  compatibility: "fits" | "partial" | "unknown";
};

// Picker draft cart (новое в v2.0)
type PickerDraftItem =
  | { kind: "sku"; sku: PartSku; quantity: number }
  | { kind: "kit"; kit: ServiceKit; addableCount: number };

type PickerDraftCart = {
  vehicleId: string;
  items: PickerDraftItem[];
  totalAmount: number;
  currency: CurrencyCode;
};

type PickerSubmitResult = {
  createdSkuIds: string[];
  createdKitCodes: string[];
  skipped: { kind: "sku" | "kit"; reason: string; label: string }[];
  warnings: string[];
};
```

### 16.2. Domain helpers (`@mototwin/domain`)

| Helper | Назначение |
|--------|------------|
| `classifyRecommendationsForPicker(recs)` | Возвращает `{ bestFit, bestValue, forYourRide, alternatives }` для трёх крупных карточек на picker. |
| `getServiceKitTagRu(kit)` | Возвращает `{ kind, labelRu }` для бейджа кита (`Популярный` / `Выгодный` / `Рекомендуем`) или `null`. |
| `formatRideStyleChipRu(profile)` | Формирует строку `«Mixed / Touring»` из `RideProfile` (или `«Стиль езды: не задан»`). |
| `buildWhyMatchesReasons(input)` | Возвращает 3–4 фразы для `WhyMatchesPanel` по контексту мото и draft. |
| `addSkuToDraft / addKitToDraft / removeFromDraft / clearDraft / getDraftTotals` | Чистые операции над `PickerDraftCart` (модуль `picker-draft-cart`). |

---

# Business logic requirements

---

## 17. Add detail flow (через draft cart)

Шаги пользователя:

1. На picker нажимает `«+»` на recommendation card / search row → SKU попадает в **draft cart** (БД не трогается).
2. Может добавить ещё SKU и/или комплекты.
3. Нажимает `«Перейти к оформлению»` → preview-модалка / sheet (см. секцию 15).
4. Подтверждает → выполняется batch:
   - для каждого `kind: "sku"` — `POST /api/vehicles/[id]/wishlist`:
     - `vehicleId` из текущего мото;
     - `nodeId` из контекста picker (`selectedNodeId`) или из `sku.primaryNodeId`;
     - `title` из `sku.canonicalName`;
     - `quantity = 1` (количество правится позже на cart-странице);
     - `status = NEEDED`;
     - `costAmount = sku.priceAmount`, `currency = sku.currency` (если есть);
     - `skuId` привязан;
     - `comment` пустой (можно дописать после на cart-странице).

Toast после успеха:

`«Добавлено: {n} позиций»`

Redirect на `/vehicles/[id]/parts?picked={ids}` с подсветкой первых добавленных позиций.

---

## 18. Add kit flow (через draft cart)

Кит в draft cart хранится как **одна агрегированная строка**. На сабмит:

- для каждого `kind: "kit"` — `POST /api/vehicles/[id]/wishlist/kits` с `{ kitCode, contextNodeId? }`;
- backend сам делает duplicate-фильтрацию и создаёт несколько `PartWishlistItem` записей;
- ответ возвращает `createdItems`, `skippedItems`, `warnings`.

Preview-модалка / sheet перед сабмитом показывает merge всех drafts (SKU + kit items) против активного wishlist:

- `«Будет добавлено»`;
- `«Уже в активном wishlist»` (skipped);
- `«Невозможно добавить»` (с причиной).

Success toast:

`«Добавлено: {n} позиций. Пропущено: {m}»`

---

## 19. Duplicate logic

A duplicate is active if:

- same vehicleId;
- same nodeId;
- same SKU id or same normalized name;
- status is not `installed`.

Default behavior:

- do not add duplicates;
- show warning in preview.

---

## 20. Compatibility logic

UI labels:

- `Подходит` green
- `Требует проверки` yellow
- `Не подходит` red

For MVP:

- only allow add for `fits` and `unknown` with warning;
- block or strongly warn for `not_fit`.

---

# API expectations

---

## 21. Suggested endpoints

```txt
GET    /api/vehicles/:vehicleId/wishlist
POST   /api/vehicles/:vehicleId/wishlist
PATCH  /api/wishlist/:itemId
DELETE /api/wishlist/:itemId

GET    /api/vehicles/:vehicleId/part-skus?nodeId=&query=
GET    /api/vehicles/:vehicleId/recommendations?nodeId=
GET    /api/vehicles/:vehicleId/service-kits?nodeId=

POST   /api/vehicles/:vehicleId/wishlist/add-kit
POST   /api/wishlist/:itemId/create-service-event
```

All POST/PATCH input must be validated with Zod.

---

# Implementation order for Cursor

---

## 22. Recommended build order

Часть A (Корзина) — уже реализована, см. раздел 4.

Часть B (Подбор детали v2.0):

1. **Domain helpers** в `@mototwin/domain`: `picker-merchandising`, `service-kit-tags`, `ride-style-chip`, `picker-why-matches`, `picker-draft-cart` + типы в `@mototwin/types`.
2. **Web каркас**: новый маршрут `/vehicles/[id]/parts/picker` с `PartPickerPage`, заглушки секций.
3. **Web данные**: подключить `getRecommendedSkusForNode`, `getServiceKits`, `getPartSkus`.
4. **Web draft cart**: реализовать `PickerDraftCartPanel`, `DraftCartItemRow`, кнопки `+` и `Добавить комплект`.
5. **Web submit flow**: `submitPickerDraft` в `@mototwin/api-client` (`picker-submit-draft.ts`) + `PickerSubmitPreviewModal`, batch POST, redirect с подсветкой.
6. **Web cleanup**: переименовать sidebar `«Детали»` → `«Подбор деталей»`, переключить точки входа на новый маршрут, выделить `WishlistItemEditModal` (для edit-only), удалить `PartPickerShell`.
7. **Web polish**: skeletons, empty/error состояния, `?focus=kits`, стили под референс.
8. **Mobile (Expo) экран**: `wishlist/picker.tsx` с тем же flow, `MobileDraftCartBar`, submit sheet.
9. **Mobile cleanup**: переключить точки входа (`wishlist/index`, `wishlist/new` redirect, дашборд, дерево, attention), упростить `wishlist-item-editor` до edit-only.
10. **Mobile polish**: keyboard-aware, scroll-on-focus, обработка частичных ошибок submit.
11. **Verification**: tsc/eslint/тесты домена; ручная проверка 5 сценариев (см. План 4 / Этап C).

---

# File / component structure

---

## 23. Suggested files

### Web (Next.js)

Корзина (Часть A — уже существует):

```txt
src/app/vehicles/[id]/parts/page.tsx
src/app/vehicles/[id]/parts/_components/PartsCartPage.tsx
src/app/vehicles/[id]/parts/_components/PartsCartPage.module.css
src/app/vehicles/[id]/_components/VehicleDashboard.tsx
src/app/garage/_components/GarageSidebar.tsx        # переименовать «Детали» → «Подбор деталей»
```

Picker (Часть B v2.0 — новый маршрут):

```txt
src/app/vehicles/[id]/parts/picker/page.tsx
src/app/vehicles/[id]/parts/picker/_components/PartPickerPage.tsx
src/app/vehicles/[id]/parts/picker/_components/PickerHeader.tsx
src/app/vehicles/[id]/parts/picker/_components/VehicleChip.tsx
src/app/vehicles/[id]/parts/picker/_components/NodeChip.tsx
src/app/vehicles/[id]/parts/picker/_components/ResetSelectionChip.tsx
src/app/vehicles/[id]/parts/picker/_components/PickerSearchBar.tsx
src/app/vehicles/[id]/parts/picker/_components/RecommendationsSection.tsx
src/app/vehicles/[id]/parts/picker/_components/RecommendationCard.tsx
src/app/vehicles/[id]/parts/picker/_components/SearchResultsSection.tsx
src/app/vehicles/[id]/parts/picker/_components/SearchResultRow.tsx
src/app/vehicles/[id]/parts/picker/_components/KitsSection.tsx
src/app/vehicles/[id]/parts/picker/_components/ServiceKitRow.tsx
src/app/vehicles/[id]/parts/picker/_components/PickerDraftCartPanel.tsx
src/app/vehicles/[id]/parts/picker/_components/DraftCartItemRow.tsx
src/app/vehicles/[id]/parts/picker/_components/WhyMatchesPanel.tsx
src/app/vehicles/[id]/parts/picker/_components/PickerLegalFooter.tsx
src/app/vehicles/[id]/parts/picker/_components/PickerSubmitPreviewModal.tsx

src/app/vehicles/[id]/parts/picker/_utils/picker-page-state.ts
packages/api-client/src/picker-submit-draft.ts

# edit-only модалка для редактирования существующей wishlist-позиции (вместо PartPickerShell)
src/app/vehicles/[id]/parts/_components/WishlistItemEditModal.tsx
```

К удалению после миграции:

```txt
src/app/vehicles/[id]/parts/_components/WishlistItemEditModal.tsx
src/app/vehicles/[id]/parts/_components/part-picker-utils.ts  # перенести в picker/_utils
```

### Expo (Mobile)

```txt
apps/app/app/vehicles/[id]/wishlist/picker.tsx               # новый экран picker (single-page)
apps/app/app/vehicles/[id]/wishlist/index.tsx                # точка входа (+ Добавить деталь → /picker)
apps/app/app/vehicles/[id]/wishlist/new.tsx                  # станет Redirect на /picker
apps/app/app/vehicles/[id]/wishlist/[itemId].tsx             # edit-only режим
apps/app/app/vehicles/[id]/wishlist/wishlist-item-editor.tsx # упрощается до edit-only
apps/app/app/vehicles/[id]/index.tsx                         # точки входа из дашборда + дерева

apps/app/app/components/wishlist/picker/MobilePickerHeader.tsx
apps/app/app/components/wishlist/picker/VehiclePickerCard.tsx
apps/app/app/components/wishlist/picker/MobileDraftCartBar.tsx
apps/app/app/components/wishlist/picker/MobilePickerSubmitSheet.tsx
```

### Shared packages

```txt
packages/domain/src/picker-merchandising.ts
packages/domain/src/service-kit-tags.ts
packages/domain/src/ride-style-chip.ts
packages/domain/src/picker-why-matches.ts
packages/domain/src/picker-draft-cart.ts
packages/domain/__tests__/picker-merchandising.test.ts
packages/domain/__tests__/picker-draft-cart.test.ts
packages/domain/__tests__/service-kit-tags.test.ts
packages/domain/__tests__/ride-style-chip.test.ts

packages/types/src/picker.ts
```

Keep components small. If a component exceeds 250–300 lines, split it.

---

# Acceptance criteria

---

## 24. Корзина

Done when:

- desktop layout matches reference structure;
- mobile layout matches reference structure;
- summary cards display correct counts and amounts;
- summary cards (including «Все») filter the list; duplicate status tabs are not required on web;
- search filters by title, SKU, node path, comment;
- rows are grouped by status;
- selected desktop row opens detail panel;
- mobile row opens detail bottom sheet or detail page;
- add position button навигирует на `/vehicles/[id]/parts/picker`;
- add kit button навигирует на `/vehicles/[id]/parts/picker?focus=kits`;
- installed action opens service event flow, not direct status change.

---

## 25. Подбор детали (v2.0)

Done when:

- web: новый маршрут `/vehicles/[id]/parts/picker` показывает single-page layout (header + chips + search + recommendations + kits + draft cart + why matches + footer);
- web: вкладок (Поиск / Рекомендации / Комплекты) **нет**;
- web: 3 recommendation карточки показывают `BEST FIT` / `BEST VALUE` / `FOR YOUR RIDE` метки и `whyRecommended` bullets;
- web: kit rows показывают тег `Популярный` / `Выгодный` / `Рекомендуем` (если есть в лукапе);
- web: `«+»` на карточке SKU и `«Добавить комплект»` добавляют в **локальный** draft cart, БД не пишется;
- web: `«Очистить корзину»` чистит только draft;
- web: `«Перейти к оформлению»` открывает preview, делает batch-вызовы, redirect на `/parts?picked=...` с подсветкой;
- web: при ширине `<1280 px` правая колонка сворачивается в sticky bottom bar;
- web: sidebar показывает `«Подбор деталей»` (не `«Детали»`), маршрут остаётся `/parts`;
- web: точки входа (cart `«Добавить позицию»`/`«Добавить комплект»`, дашборд, дерево узлов, attention) ведут на новый picker, `PartPickerShell` удалён;
- web: редактирование существующей позиции открывает компактный `WishlistItemEditModal` (без секций рекомендаций/китов, без поиска нового SKU кроме привязки);
- mobile: новый экран `/vehicles/[id]/wishlist/picker` показывает тот же flow в одну колонку с `MobileDraftCartBar`;
- mobile: точки входа из wishlist/дашборда/дерева/attention ведут на новый picker;
- mobile: `/wishlist/new` редиректит на `/wishlist/picker`;
- mobile: `wishlist-item-editor` упрощён до edit-only;
- domain: `classifyRecommendationsForPicker`, `getServiceKitTagRu`, `formatRideStyleChipRu`, `buildWhyMatchesReasons`, `picker-draft-cart` покрыты unit-тестами;
- одноимённый CTA `«Перейти к оформлению»` отключён, если draft пустой.

Cart-страница (Часть A) при этом:

- кнопка `«Добавить позицию»` ведёт на picker (а не модалку);
- кнопка `«Добавить комплект»` ведёт на picker с `?focus=kits`.

---

## 26. Non-goals

Do not implement in this step:

- marketplace checkout;
- external purchase links as primary scenario;
- social/community features;
- telemetry;
- full VIN decoding;
- advanced fitment scoring UI;
- payment/subscription flow.

---

## 27. Final note for Cursor

Implement this as a focused MVP workflow. Use explicit TypeScript types, simple component composition, deterministic business logic, and avoid speculative abstractions. UI text may be Russian; code, filenames, types and functions must be English.
