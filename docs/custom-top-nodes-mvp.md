# Персональный ТОП узлов и вид дерева (MVP)

## Scope

Пользователь может настроить свой список **ТОП-узлов** (до 15) и **вид узлов по умолчанию** на экране полного дерева. Настройки хранятся в `UserSettings` и применяются на web и Expo.

Пустой `favoriteNodeCodes` означает **стандартный набор** из `DEFAULT_TOP_SERVICE_NODE_CODES` ([`src/lib/top-service-nodes.ts`](../src/lib/top-service-nodes.ts)).

## Настройки профиля

| Поле | UI | Значения | По умолчанию |
|------|-----|----------|--------------|
| `favoriteNodeCodes` | «Мой ТОП узлов» | массив кодов узлов, max 15 | `[]` → стандартный набор |
| `defaultNodeView` | «Вид узлов по умолчанию» | `top` \| `all` | `top` |

Дополнительные поля профиля — в [user-settings-mvp.md](./user-settings-mvp.md).

### UI профиля (web + Expo)

- **Текущий ТОП** отображается **по категориям** (как на дашборде мотоцикла): Смазка, Двигатель / охлаждение, Тормоза, Шины, Цепь / звезды, Подвеска, **Прочее** (узлы вне фиксированных групп).
- Пустые категории **не показываются** (ни в профиле, ни в блоке «Состояние узлов» на мотоцикле).
- У каждого узла: **Заменить** (picker с выбором одного узла), **Удалить**.
- **+ Добавить узел** — multi-select picker.
- **Сбросить до стандартного** — очищает `favoriteNodeCodes` (возврат к дефолту на API).

При **первом изменении** стандартного набора список копируется в `favoriteNodeCodes` на клиенте (`resolveEditableFavoriteNodeCodes` в `@mototwin/domain`).

## API

### `GET /api/nodes/top`

- Требует авторизованного контекста (`getCurrentUserContext`).
- Читает `UserSettings.favoriteNodeCodes` для текущего пользователя.
- Если массив не пустой — возвращает узлы по пользовательским кодам; иначе — `DEFAULT_TOP_SERVICE_NODE_CODES`.
- Response `200`: `{ nodes: TopServiceNodeItem[] }`

### `GET /api/nodes/service`

- Список всех `isActive && isServiceRelevant` узлов для picker в профиле.
- Response `200`: `{ nodes: ServiceNodeItem[] }` (`id`, `code`, `name`, `parentId`, `level`, `displayOrder`)

### `GET` / `PATCH /api/user-settings`

- Поля `favoriteNodeCodes` и `defaultNodeView` в select/update.
- PATCH: `favoriteNodeCodes` — zod `array(string).max(15)`; `defaultNodeView` — `enum(["top", "all"])`.

## Domain

- [`packages/domain/src/top-node-overview.ts`](../packages/domain/src/top-node-overview.ts)
  - `buildTopNodeOverviewCards` — карточки для дашборда; только группы с узлами; группа `other` / «Прочее».
  - `buildTopNodeProfileGroups` — те же группы для экрана профиля (без статусов).
  - `resolveEditableFavoriteNodeCodes` — база для редактирования при пустом `favoriteNodeCodes`.
- Константа лимита: `MAX_FAVORITE_NODE_CODES = 15` в `@mototwin/types`.

## Поведение на мотоцикле

### Блок «Состояние узлов»

- Данные: `GET /api/nodes/top` + статусы из node-tree.
- Группировка: `buildTopNodeOverviewCards`.
- Показываются **только карточки групп, в которых есть хотя бы один узел** в текущем ТОП-наборе.

### Полное дерево (`/vehicles/[id]/nodes`)

- Переключатель **«ТОП-узлы»** фильтрует дерево до узлов из overview-порядка (до 15 + родители).
- **Начальное состояние** переключателя: `defaultNodeView === "top"` из user settings (web: localStorage cache; Expo: `readUserLocalSettings`).
- При возврате из журнала/события сохранённый return-state имеет приоритет над `defaultNodeView`.

## Клиенты

| Поверхность | Web | Expo |
|-------------|-----|------|
| Профиль пользователя | [`src/app/profile/page.tsx`](../src/app/profile/page.tsx) | [`apps/app/app/profile.tsx`](../apps/app/app/profile.tsx) |
| Дашборд мотоцикла | [`VehicleDashboard.tsx`](../src/app/vehicles/[id]/_components/VehicleDashboard.tsx), [`vehicle-detail-client.tsx`](../src/app/vehicles/[id]/vehicle-detail-client.tsx) | [`apps/app/app/vehicles/[id]/index.tsx`](../apps/app/app/vehicles/[id]/index.tsx) |

## Миграция БД

`prisma/migrations/20260524093324_add_user_top_node_prefs/`:

- `UserSettings.favoriteNodeCodes String[] @default([])`
- `UserSettings.defaultNodeView String @default("top")`

## Связанные документы

- [user-settings-mvp.md](./user-settings-mvp.md) — общие настройки профиля
- [node-tree.md](./node-tree.md) — иерархия узлов и mapping TOP → overview
- [top-node-icons.md](./top-node-icons.md) — иконки групп (включая `other`)
- [parity/cross-platform-parity.md](./parity/cross-platform-parity.md) — parity web/Expo
