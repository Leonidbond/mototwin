# MotoTwin UI Spec: Корзина замен и расходников + Подбор детали

Версия: 1.0  
Назначение: точный UI-спек для реализации в Cursor / Next.js / TypeScript  
Экраны: desktop + mobile  
Стиль: MotoTwin dark UI  

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
  - Детали
  - Профиль
- активный пункт: `Детали`, orange accent слева;
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

# Часть B. Подбор детали

---

## 6. Экран: Подбор детали — common

Файлы-референсы:

- `Подбор Поиск web.png`
- `Подбор Рекомендации web.png`
- `Подбор Комплекты web.png`
- `Подбор Поиск mobile.png`
- `Подбор Рекомендации mobile.png`
- `Подбор Комплекты mobile.png`

### 6.1. Назначение

Экран помогает выбрать новую деталь или комплект для добавления в корзину замен.

Три режима:

1. `Поиск (SKU)`
2. `Рекомендации`
3. `Комплекты`

Главное правило: layout сохраняется, меняется только содержимое активной вкладки.

---

## 7. Подбор детали — desktop layout

```txt
┌ Sidebar ┐ ┌ Modal/Page container: Подбор детали                              ┐
│         │ │ Header                                                           │
│         │ │ Tabs: Search / Recommendations / Kits                            │
│         │ │ ┌ Context panel ┐ ┌ Active tab content               ┐ ┌ Detail ┐ │
│         │ │ │ Node/qty/etc  │ │ Search results / recommendations │ │ panel  │ │
│         │ │ │ Selected SKU  │ │ kits list                        │ │        │ │
│         │ │ └───────────────┘ └──────────────────────────────────┘ └────────┘ │
│         │ │ Bottom actions: Cancel + Add detail / Add kit                    │
└─────────┘ └──────────────────────────────────────────────────────────────────┘
```

Width:

- использовать широкий контейнер почти на всю рабочую область;
- modal/page max width: `calc(100vw - 220px)`;
- right detail panel: 340–380 px;
- left context panel: 300–340 px;
- center content: flexible.

Recommended CSS grid:

```tsx
<div className="grid grid-cols-[320px_1fr_360px] gap-5">
  <PartPickerContextPanel />
  <PartPickerContent />
  <PartPickerSelectionPanel />
</div>
```

---

## 8. Подбор детали — mobile layout

Mobile uses one vertical flow, not three columns.

Order:

1. Top header
2. Vehicle card
3. Tabs
4. Active tab content
5. Sticky selected item / selected kit bottom bar
6. Bottom navigation

Context fields are not shown as a full left panel on mobile. They are folded into:

- selected vehicle card;
- selected node title;
- filters/chips;
- selected item sticky bar.

---

## 9. Components: common picker

### `PartPickerPage`

Props:

```ts
type PartPickerPageProps = {
  vehicle: VehicleSummary;
  initialNodeId?: string;
  initialTab?: PartPickerTab;
};

type PartPickerTab = "search" | "recommendations" | "kits";
```

Responsibilities:

- manage active tab;
- manage selected node;
- manage selected SKU;
- manage selected kit;
- manage quantity, status, price, comment;
- submit add detail / add kit.

---

### `PartPickerHeader`

Desktop:

- title: `Подбор детали`;
- subtitle: `BMW F 850 GS Adventure • 2021 • 42 180 км`;
- close button.

Mobile:

- back button;
- centered title: `Подбор детали`;
- menu button;
- `VehiclePickerCard` below.

---

### `VehiclePickerCard`

Mobile required, desktop optional.

Content:

- motorcycle image;
- `BMW F 850 GS Adventure`;
- `2021 • 42 180 км • Mixed Touring`;
- chevron.

---

### `PartPickerTabs`

Tabs:

- `Поиск (SKU)` with search icon
- `Рекомендации` with star icon
- `Комплекты` with box icon

Active:

- orange underline;
- text white;
- icon white/orange.

Desktop: full width row.  
Mobile: segmented control.

---

### `PartPickerContextPanel` desktop

Left context block. Required on all desktop picker tabs.

Fields:

1. `Узел *`
   - selected node card
   - example: `Задняя шина`
   - path: `WHEELS > Шины > Rear`
2. `Количество`
   - stepper `- 1 +`
3. `Статус`
   - default: `Нужно купить`
4. `Стоимость (опционально)`
   - input + currency select
5. `Комментарий (опционально)`
   - textarea
6. `Выбранный SKU (опционально)`
   - compact SKU card if selected
   - `Очистить выбор`

For kits tab:

- keep the same context block for layout consistency;
- selected SKU block may remain optional or show selected kit preview depending on implementation.

Validation:

- node is required;
- quantity must be > 0;
- status required;
- price optional;
- currency defaults to `RUB`.

---

### `PartPickerSelectionPanel` desktop

Right detail panel.

Search / recommendations mode:

Title: `Выбранная деталь`

Content:

- product image;
- SKU name;
- specs;
- brand + article;
- tag;
- compatibility status;
- node;
- quantity;
- price/currency;
- comment;
- description;
- compatibility checklist;
- actions:
  - `Добавить в список`
  - `Открыть в каталоге` optional.

Kits mode:

Title: `Выбранный комплект`

Content:

- kit image;
- kit name;
- tag;
- node/category;
- included items list;
- estimated amount;
- duplicate warning;
- `Предварительный просмотр`;
- action area.

---

### `PartPickerBottomActions`

Desktop:

- bottom-right sticky inside modal/page;
- buttons:
  - `Отмена`
  - primary:
    - `Добавить деталь` for search/recommendations
    - `Добавить комплект` for kits

Mobile:

- sticky bottom selected bar above bottom navigation;
- shows selected item/kit state;
- disabled primary button if nothing selected.

---

# Вкладка 1. Поиск (SKU)

---

## 10. Search tab desktop

### Layout

Center content:

- search input with typed query;
- filters button;
- result count;
- vertical list of SKU result rows;
- info note at bottom.

### Components

#### `PartSkuSearchTab`

Props:

```ts
type PartSkuSearchTabProps = {
  nodeId: string;
  query: string;
  results: PartSku[];
  selectedSkuId?: string;
  onQueryChange: (value: string) => void;
  onSelectSku: (sku: PartSku) => void;
};
```

#### `PartSkuSearchInput`

Placeholder:

`Поиск по SKU или названию`

Behavior:

- search from 2 characters;
- debounce 250–400 ms;
- clear button when query is not empty.

#### `PartSkuFilterButton`

Opens filters panel / popover.

Filters:

- OEM
- Аналоги
- Дешевле
- В наличии
- Brand
- Category
- Compatibility only

#### `PartSkuResultRow`

Content:

- image;
- name;
- specs;
- brand + article;
- tag;
- price;
- green `Подходит`;
- add/select button `+`.

Click behavior:

- row click selects SKU and updates right panel;
- plus click selects SKU and can optionally submit immediately only if UX says so. Recommended: select only.

---

## 11. Search tab mobile

Content order:

1. Search input
2. filter chips
3. result count + sorting
4. result cards
5. sticky selected bar

Components:

- `MobilePartSkuSearchInput`
- `MobileFilterChips`
- `MobilePartSkuCard`
- `MobileSelectedSkuBar`

Mobile chips:

- `Все`
- `OEM`
- `Аналоги`
- `Дешевле`
- `В наличии`

Selected bar empty state:

- icon placeholder;
- `Ничего не выбрано`;
- `Выберите деталь, чтобы добавить её`;
- disabled button `Добавить деталь`.

Selected bar filled state:

- SKU image;
- SKU name;
- price;
- enabled button `Добавить деталь`.

---

# Вкладка 2. Рекомендации

---

## 12. Recommendations tab desktop

### Layout

Center content:

- title: `Рекомендации для узла «Задняя шина»`
- subtitle: `Подобрано на основе вашего мотоцикла, профиля езды и условий эксплуатации`
- ride style chip: `Стиль езды: Mixed / Touring`
- 3 recommendation cards:
  - `Best fit`
  - `Best value`
  - `For your ride`
- alternative variants row;
- disclaimer note.

### Components

#### `PartRecommendationsTab`

Props:

```ts
type PartRecommendationsTabProps = {
  node: NodeSummary;
  rideProfile: RideProfileSummary;
  recommendations: RecommendationCardData[];
  alternatives: PartSku[];
  selectedSkuId?: string;
  onSelectSku: (sku: PartSku) => void;
};
```

#### `RecommendationCard`

Content:

- recommendation label:
  - `BEST FIT`
  - `BEST VALUE`
  - `FOR YOUR RIDE`
- image;
- SKU name;
- specs;
- brand/article;
- price;
- reasons list;
- compatibility green label;
- add/select button.

Visual accents:

- Best fit: orange border/accent.
- Best value: yellow border/accent.
- For your ride: blue border/accent.

Reason examples:

- `Полное соответствие OEM`
- `Отличная износостойкость`
- `Оптимальная цена`
- `Ресурс до 11 000 км`
- `Максимальное сцепление`

---

## 13. Recommendations tab mobile

Content order:

1. title and subtitle;
2. filter/settings icon on the right;
3. context chips:
   - `Для вашего стиля езды`
   - `Mixed / Touring`
   - `90% асфальт / 10% грунт`
4. recommendation cards stacked vertically;
5. alternative variants section;
6. sticky selected bar.

Mobile card:

- image on left;
- content on right;
- price top-right;
- green compatibility;
- plus button bottom-right;
- `Почему рекомендован` expandable row.

Expandable state:

- closed by default for most cards;
- tapping expands explanation.

---

# Вкладка 3. Комплекты

---

## 14. Kits tab desktop

### Layout

Center content:

- title: `Комплекты обслуживания`
- subtitle: `Добавьте готовый комплект — все позиции будут добавлены в корзину замен и расходников.`
- vertical list of kit rows;
- info note.

Right panel:

- selected kit details;
- included items;
- amount;
- warning about duplicates;
- preview button;
- add kit action.

### Components

#### `ServiceKitsTab`

Props:

```ts
type ServiceKitsTabProps = {
  nodeId?: string;
  kits: ServiceKit[];
  selectedKitId?: string;
  onSelectKit: (kit: ServiceKit) => void;
};
```

#### `ServiceKitRow`

Content:

- kit image;
- kit name;
- tag:
  - `Популярный`
  - `Лучшее соотношение`
  - `Выгодный`
- category/path;
- number of positions;
- item chips;
- amount;
- green positions count;
- button `Добавить комплект`.

Click behavior:

- row click selects kit and updates right panel;
- button can open preview before adding.

#### `SelectedKitPanel`

Content:

- image;
- kit name;
- tag;
- category/path;
- included items list:
  - item name;
  - quantity;
- estimated amount;
- duplicate warning;
- button `Предварительный просмотр`.

Duplicate warning text:

`Дубликаты активных позиций не будут добавлены. Вы сможете проверить и подтвердить состав перед добавлением.`

---

## 15. Kits tab mobile

Important: mobile screen title remains `Подбор детали`, active tab can be `Комплекты` or, if product decision requires, section title can be `Рекомендуемые комплекты`.

Content order:

1. `Рекомендуемые комплекты`
2. subtitle:
   `Готовые наборы для обслуживания узлов вашего мотоцикла. Экономия времени и денег.`
3. filter/settings icon;
4. category chips:
   - `Все узлы`
   - `Тормоза`
   - `Цепь и звезды`
   - `Фильтры`
   - `Масла`
5. kit cards stacked vertically;
6. sticky selected kit bar;
7. bottom navigation.

#### `MobileServiceKitCard`

Content:

- image;
- label:
  - `BEST FIT`
  - `BEST VALUE`
  - `FOR YOUR RIDE`
- kit title;
- subtitle;
- compatibility green label;
- included bullet list;
- current price;
- old price if discount exists;
- discount badge;
- button `Подробнее`;
- primary button `Добавить комплект`.

Selected bar empty:

- `Ничего не выбрано`
- `Выберите комплект, чтобы добавить его`
- disabled `Добавить комплект`

Selected bar filled:

- kit icon/image;
- kit name;
- amount;
- enabled `Добавить комплект`.

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
  oldAmount?: number;
  currency: CurrencyCode;
  discountPercent?: number;
  compatibility: "fits" | "partial" | "unknown";
};
```

---

# Business logic requirements

---

## 17. Add detail flow

When user adds a selected SKU:

Create `WishlistItem`:

- vehicleId from current vehicle;
- nodeId from selected node or SKU node;
- name from SKU name unless user overrides;
- quantity from context;
- status default `needed`;
- amount from SKU price or manual price;
- currency default `RUB`;
- skuId attached;
- comment from context.

Success:

- show toast: `Деталь добавлена в корзину замен`
- navigate to cart or stay on picker depending on route.

Recommended: stay on picker and show selected bar success, unless user came from cart.

---

## 18. Add kit flow

Kit is not stored as one cart item. It creates multiple `WishlistItem` records.

Before adding:

- open preview modal/sheet;
- show:
  - will be added;
  - already exists;
  - conflicts / missing node;
- allow user to confirm.

When confirmed:

- create one WishlistItem per kit item;
- set status = selected status, default `needed`;
- preserve `kitName` as UI marker;
- skip duplicates unless user chooses to add duplicates.

Success toast:

`Комплект добавлен в корзину замен`

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

1. Create shared visual primitives:
   - `MtCard`
   - `MtButton`
   - `MtBadge`
   - `MtTabs`
   - `MtSearchInput`
   - `MtStatusBadge`
2. Build cart desktop page with static data.
3. Build cart mobile responsive layout.
4. Add item selection and detail panel.
5. Add status filters and search.
6. Build picker shell with tabs and context panel.
7. Build search tab.
8. Build recommendations tab.
9. Build kits tab.
10. Add sticky mobile bars.
11. Connect APIs.
12. Add install flow via service event.
13. Add empty/loading/error states.

---

# File / component structure

---

## 23. Suggested files

```txt
src/app/(app)/vehicles/[vehicleId]/parts-cart/page.tsx
src/app/(app)/vehicles/[vehicleId]/part-picker/page.tsx

src/components/mototwin/shell/desktop-shell.tsx
src/components/mototwin/shell/mobile-shell.tsx
src/components/mototwin/ui/mt-card.tsx
src/components/mototwin/ui/mt-button.tsx
src/components/mototwin/ui/mt-badge.tsx
src/components/mototwin/ui/mt-tabs.tsx
src/components/mototwin/ui/mt-search-input.tsx
src/components/mototwin/ui/mt-status-badge.tsx

src/features/parts-cart/components/cart-header.tsx
src/features/parts-cart/components/cart-summary-cards.tsx
src/features/parts-cart/components/cart-search-and-filters.tsx
src/features/parts-cart/components/cart-grouped-list.tsx
src/features/parts-cart/components/cart-item-row.tsx
src/features/parts-cart/components/cart-item-detail-panel.tsx
src/features/parts-cart/components/cart-mobile-bottom-actions.tsx

Web (Next.js) — текущая реализация корзины в монорепо:

src/app/vehicles/[id]/parts/_components/PartsCartPage.tsx
src/app/vehicles/[id]/parts/_components/PartsCartPage.module.css
src/app/vehicles/[id]/_components/VehicleDashboard.tsx
packages/domain/src/parts-cart-summary.ts

Expo — список покупок и превью на экране мотоцикла:

apps/app/app/vehicles/[id]/wishlist/index.tsx
apps/app/app/vehicles/[id]/index.tsx
apps/app/app/components/vehicles/CompactVehicleContextRow.tsx

src/features/part-picker/components/part-picker-header.tsx
src/features/part-picker/components/part-picker-tabs.tsx
src/features/part-picker/components/part-picker-context-panel.tsx
src/features/part-picker/components/part-picker-selection-panel.tsx
src/features/part-picker/components/part-sku-search-tab.tsx
src/features/part-picker/components/part-recommendations-tab.tsx
src/features/part-picker/components/service-kits-tab.tsx
src/features/part-picker/components/mobile-selected-bar.tsx

src/features/part-picker/types.ts
src/features/parts-cart/types.ts
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
- add position button opens picker;
- add kit button opens picker kits tab;
- installed action opens service event flow, not direct status change.

---

## 25. Подбор детали

Done when:

- desktop picker preserves three-column structure on all tabs;
- left context panel is visible on all desktop tabs;
- changing tabs only changes center content and right panel details;
- search tab shows SKU search and result list;
- recommendations tab shows best fit / best value / for your ride;
- kits tab shows service kits and selected kit details;
- mobile search tab matches stacked search UI;
- mobile recommendations tab matches recommendation card UI;
- mobile kits tab matches recommended kits UI;
- selected item/kit sticky bar works on mobile;
- add detail creates one cart item;
- add kit creates multiple cart items with duplicate preview.

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
