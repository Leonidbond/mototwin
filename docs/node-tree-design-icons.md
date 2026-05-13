# Иконки узлов дерева (design → runtime)

Пиксельные иконки для **строк дерева узлов** (каталог `Node.code` в UI дерева обслуживания): web (`getNodeTreeIconWebSrc`) и Expo (`getNodeTreeIconSource`). Отдельно от [TOP-node иконок](./top-node-icons.md) (карточки «Состояние узлов»).

## Канонический источник

Финальные иконки лежат в **`images/node-tree-icons/from-design/by-label/<SECTION>/<CODE>.png`** (имя файла = код узла + `.png`, как в `prisma/seed.ts`). Папка **`images/node-tree-icons-new/`** при желании хранит старые макеты и экспорты из дизайна; на сборку приложения она не влияет.

| Путь | Назначение |
|------|------------|
| `images/node-tree-icons/from-design/by-label/<SECTION>/` | Канонические PNG по кодам каталога. |
| `images/node-tree-icons/nodes/` | Копии для рантайма: `<normalized-code>.png` (см. `sync-node-icons-from-slices.mjs`). |
| `scripts/data/node-code-icon-source.json` | Код узла → относительный путь файла в `from-design`. |
| `src/node-tree-icons.ts` | Генерируется: `require` на каждый `nodes/*.png`. |
| `images/node-tree-icons/manifest.json` | Генерируется: список файлов для сборки и `npm run icons:audit-node-tree`. |

## Обновление после правки PNG

1. Положить или заменить файл в `from-design/by-label/...` согласно `outRel` в `node-code-icon-source.json` (или обновить запись в JSON при новом узле).
2. Синхронизировать в `nodes/` и пересобрать модуль:

```bash
npm run icons:rebuild-node-tree-from-design
```

Это эквивалентно:

```bash
node scripts/sync-node-icons-from-slices.mjs
node scripts/generate-node-tree-icons-ts.mjs
```

Проверка целостности: `npm run icons:audit-node-tree`.

## BRAKES и прочие секции

Маппинг для всех секций (включая `BRAKES`) задаётся в **`node-code-icon-source.json`**; отдельные вспомогательные JSON для нарезки/OCR удалены как неиспользуемые.

## UI

Иконки дерева отображаются небольшим квадратом (**22×22** pt, `contain`) в web и Expo; исходник 128×128 даёт запас под чёткость.
