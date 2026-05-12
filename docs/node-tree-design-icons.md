# Иконки узлов дерева (design → runtime)

Пиксельные иконки для **строк дерева узлов** (каталог `Node.code` в UI дерева обслуживания): web (`getNodeTreeIconWebSrc`) и Expo (`getNodeTreeIconSource`). Отдельно от [TOP-node иконок](./top-node-icons.md) (карточки «Состояние узлов»).

## Источники и папки

| Путь | Назначение |
|------|------------|
| `images/node-tree-icons-new/` | Исходные спрайты и экспорты из дизайна (в т.ч. `CHASSIS/7 Рама и кузов + разделы ВАР 1 (3).png`, `(4).png`, корневой `… ВАР 1 2.png` для `CHASSIS.png`). |
| `images/node-tree-icons/from-design/by-label/<SECTION>/` | Нарезанные PNG по кодам каталога (`BRAKES.*`, `CHASSIS.*`). Имена файлов совпадают с ключами в маппинге. |
| `images/node-tree-icons/nodes/` | Копии для рантайма: `<normalized-code>.png` (см. `sync-node-icons-from-slices.mjs`). |
| `scripts/data/node-code-icon-source.json` | Код узла → относительный путь слайса в `from-design`. |
| `src/node-tree-icons.ts` | Генерируется: `require` на каждый `nodes/*.png`. |
| `images/node-tree-icons/manifest.json` | Генерируется: список файлов для сборки/аудита. |

## Скрипты

### Нарезка спрайтов CHASSIS

- `scripts/slice-chassis-row-7.mjs` — один ряд из **7** колонок из `(3).png` → `CHASSIS.FRAME`, `SUBFRAME`, `MOUNTS`, `SEAT`, `PLASTICS`, `PLASTICS.FENDERS`, `PLASTICS.SIDE`.
- `scripts/slice-chassis-row-6-protection.mjs` — один ряд из **6** колонок из `(4).png` → `PLASTICS.FORK_GUARDS`, `PLASTICS.HANDGUARDS`, `PROTECTION`, `PROTECTION.SKID`, `PROTECTION.RADIATOR`, `PROTECTION.FRAME`.

Корневой `CHASSIS.png` в `from-design` приходит из отдельного файла макета (`… ВАР 1 2.png`), не из скриптов нарезки ряда.

### Постобработка слайсов CHASSIS

`scripts/postprocess-chassis-node-icons.mjs` обрабатывает **все** `by-label/CHASSIS/*.png`, кроме `CHASSIS.png`:

1. Обрезка по высоте снизу (убрать подписи Cyrillic под глифом; в части колонок две зоны текста — см. `CROP_HEIGHT_BY_FILE` в скрипте).
2. Чёрный фон → прозрачный (порог яркости в коде).
3. `trim` по альфе.
4. Вписывание в квадрат **128×128** (`contain`, прозрачный фон).

После смены исходного спрайта или сетки колонок обновите нарезку и при необходимости значения в `CROP_HEIGHT_BY_FILE`.

### Синхронизация в приложение

```bash
node scripts/sync-node-icons-from-slices.mjs
node scripts/generate-node-tree-icons-ts.mjs
```

Полная цепочка после правок спрайта CHASSIS:

```bash
node scripts/slice-chassis-row-7.mjs
node scripts/slice-chassis-row-6-protection.mjs
node scripts/postprocess-chassis-node-icons.mjs
node scripts/sync-node-icons-from-slices.mjs
node scripts/generate-node-tree-icons-ts.mjs
```

## Покрытие каталога (CHASSIS)

В `node-code-icon-source.json` заданы иконки для корня `CHASSIS` и детей из нарезанных рядов `(3)` и `(4)`. Узлы каталога без отдельного PNG по-прежнему получают fallback в `getNodeTreeIconAsset` / `getNodeTreeIconWebSrc` (см. `src/node-tree-icons.ts`).

## BRAKES

Иконки тормозов уже лежат в `from-design/by-label/BRAKES/`; маппинг в том же `node-code-icon-source.json`. Перенарезка описана в комментариях к записям с `note` и в `scripts/data/slice-inventory-BRAKES.json` (для OCR/матчера при необходимости).

## UI

Иконки дерева отображаются небольшим квадратом (**22×22** pt, `contain`) в web и Expo; исходник 128×128 даёт запас под чёткость.
