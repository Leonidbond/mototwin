# Переиспользование выбора узла дерева (Web + Expo)

Один продуктовый UX для выбора **листового узла** (или **мультивыбора листьев**) из дерева ТС: поиск, опционально «Топ-узлы», группировка списка по верхнему уровню пути, одинаковый формат подписи пути.

**Правило для разработки:** при новом сценарии «пользователь выбирает узел» используйте описанные ниже компоненты и доменные хелперы; не дублируйте отдельные модалки со скролл-списком узлов без причины (см. [coding-rules.md](./coding-rules.md) §14).

---

## 1. Web (Next.js)

| Компонент | Путь | Назначение |
|-----------|------|------------|
| **`NodePickerModal`** | `src/app/vehicles/[id]/_components/node-picker/NodePickerModal.tsx` | Базовый модальный список: `mode="single"` \| `"multi"`, `options`, опционально `topOptions`, `onSelect` / `onConfirm`. |
| **`NodePickerPopover`** | `src/app/vehicles/[id]/parts/picker/_components/NodePickerPopover.tsx` | Тонкая обёртка над `NodePickerModal` для каталога запчастей (single). |

Тип опции для модалки: **`SharedNodePickerOption`** — `{ id, name, pathLabel?, level? }`.

**Мультивыбор** в форме сервисного события: **`AddNodeSheet`** (`service-event-form/overlays/AddNodeSheet.tsx`) внутри рендерит **`NodePickerModal`** с `mode="multi"`.

---

## 2. Expo (React Native)

| Компонент | Путь | Назначение |
|-----------|------|------------|
| **`MobileNodePickerModal`** | `apps/app/app/vehicles/[id]/_components/mobile-node-picker-modal.tsx` | Одиночный выбор узла; `options`, опционально `topOptions`, `selectedId`, `onSelect`. |

Тип опции: **`MobileNodePickerOption`** — тот же смысл, что `SharedNodePickerOption` на web.

Паритет с web: те же правила группировки и подписей (через `@mototwin/domain`, см. §3).

---

## 3. Данные и домен (`@mototwin/domain`)

- **`nodeAncestorPathLabelRu(nodeTree, nodeId)`** — подпись пути **предков** в одном стиле с формой сервисного события (`›`). Используйте для `pathLabel` в опциях пикера, чтобы строка в списке совпадала с multi/single и между платформами.
- **`groupNodePickerOptionsByTopLevel(options)`**, **`nodePickerGroupHeadingRu`**, **`nodePickerTopGroupKeyFromPathLabel`** — группировка блоков в модалке; порядок групп и строк — **как обход дерева**, не алфавит.
- Список листьев: **`getLeafNodeOptions`** / **`flattenNodeTreeToSelectOptions`** + фильтр `!hasChildren` — по соглашению проекта.

Фильтр «Топ-узлы» (подмножество листьев под выбранными топ-предками): **`filterLeafOptionsUnderTopNodeAncestors`**, плюс **`getOrderedTopNodeIdsPresentInNodeTree`** — как в part picker и форме события.

---

## 4. Что не делать

- Не вводить второй самостоятельный «полноэкранный список всех узлов» для того же сценария выбора листа, если достаточно **`NodePickerModal`** / **`MobileNodePickerModal`**.
- Не задавать `pathLabel` в разных форматах в разных экранах без необходимости: для пикера предпочтительно **`nodeAncestorPathLabelRu`** (или согласованный полный путь, если продукт явно требует другой вид — тогда документируйте исключение рядом с UI).

---

## 5. Текущие места использования (ориентир)

- Web: форма сервисного события (**`AddNodeSheet`**, расширенный bundle), wishlist edit (**`WishlistItemEditModal`**), part picker (**`NodePickerPopover`**).
- Expo: wishlist picker / item editor, **`basic-service-event-bundle-form`** и др. — **`MobileNodePickerModal`**.

При добавлении нового экрана обновите этот список одной строкой в PR / здесь по соглашению команды.

---

## 6. Связанные документы

- [coding-rules.md](./coding-rules.md) — обязательное использование общих пикеров (§14).
- [web-service-event-form.md](./web-service-event-form.md) — bundle, **`AddNodeSheet`**.
- [cross-platform-parity.md](./cross-platform-parity.md) — §3.9, паритет web/Expo для выбора узла.
