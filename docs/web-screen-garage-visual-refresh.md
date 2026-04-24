# Web Screen: Garage Visual Refresh

## Context

Продолжение работы по `docs/mototwin_ui_refactor_playbook.md` и приведению экрана
`src/app/garage/page.tsx` к референсу `images/examples/garage web.png`.
Фокус этого шага — плотность макета, отдельная сворачиваемая левая панель,
устойчивый layout при сужении окна и дружелюбный empty state.

Бизнес-логика и API не менялись. Изменения затрагивают только `src/app/garage/**`
и глобальные стили `src/app/globals.css`.

## Density pass

Макет был «разреженным» относительно референса. Уплотнили отступы без потери
читаемости:

- `src/app/garage/page.tsx`
  - Внешняя сетка `gap 24 → 20`, секция `gap 24 → 16`.
  - Внешний padding страницы `24/24 → 16/24` и перенесен на внутренний `<section>`,
    чтобы сайдбар прилегал к левому краю.
  - Сетка карточек `gap 16 → 12`, `minmax(440px → min(100%, 420px))`.
- `src/app/garage/_components/GarageHeader.tsx`
  - Заголовок `32 → 28 px`, подзаголовок `marginTop 6 → 4`.
- `src/app/garage/_components/GarageSummary.tsx`
  - Card `padding md → sm`, `gap 12 → 10`, иконки `56 → 48 px`, значение `30 → 26 px`,
    колонки `min 220 → 210`.
- `src/app/garage/_components/VehicleCard.tsx`
  - Card `padding lg → md`.
  - Заголовок ↔ сетка `marginTop 12 → 8`; сетка ↔ attention `16 → 12`;
    attention ↔ actions `16 → 12`.
  - Колонки `gap 16 → 12`, правая колонка `180 → 170`.
  - Attention row `padding 10/12 → 8/10`, `gap 12 → 10`.
  - TopNodeIconAvatar `44 → 38 px`, картинка `30 → 26 px`.
  - Score-панель `padding 12 → 10`, легенда `gap 6 → 4`.
- `src/app/garage/_components/VehicleSilhouette.tsx`
  - Высота `260 → 200 px`.
- `src/app/garage/_components/GarageTasksStrip.tsx`
  - Card `padding md → sm`, иконки `44 → 36 px`, строка `padding 10/16 → 6/12`.

## Collapsible sidebar

Сайдбар перестал быть «ещё одной карточкой» и теперь работает как отдельная
сворачиваемая панель приложения.

- `src/app/garage/_components/GarageSidebar.tsx` (client component):
  - Принимает пропсы `collapsed: boolean`, `onToggle: () => void`.
  - Кнопка-toggle (`ChevronIcon`) рядом с брендом; в свёрнутом состоянии
    «всплывает» на правую границу панели.
  - В свёрнутом состоянии (`64 px`) показываются только иконки навигации,
    компактный лого `M` вместо `MOTOTWIN`, аватар пользователя без текста,
    PRO-карточка скрывается. Для иконок и аватара проставляются `title`/`aria-label`.
  - Визуально: без `borderRadius` и внешней рамки, только `borderRight` и
    `backgroundColor: card`, `transition: padding 0.18s`.
- `src/app/garage/page.tsx`:
  - Состояние `sidebarCollapsed` поднято на уровень страницы и сохраняется в
    `localStorage` по ключу `garage.sidebar.collapsed`.
  - `gridTemplateColumns: \`${collapsed ? 64 : 220}px minmax(0, 1fr)\``
    с `transition: grid-template-columns 0.18s`.

## Layout robustness (белая полоса справа)

Починили появление белой полосы справа при сужении браузера:

- `src/app/globals.css` и `src/app/layout.tsx`:
  - корневой документ получил явный тёмный фон (`#080d12`);
  - для `html/body` включена `color-scheme: dark`;
  - scrollbars приведены к тёмной теме через минимальные global styles без
    переопределения размеров и aggressive overflow-хаков.
- Практический вывод: проблема была не только в фоне документа, но и в том, что
  браузер рисовал native scrollbar area в светлой теме.
- `src/app/garage/page.tsx`:
  - Основной grid: `1fr → minmax(0, 1fr)` и `minWidth: 0` на `<section>`.
    Блокирует выталкивание правой колонки минимальной шириной внутренних grid-элементов.
  - Сетка карточек: `minmax(420px, 1fr) → minmax(min(100%, 420px), 1fr)`.
    На узких экранах одна карточка сжимается до 100% ширины родителя вместо
    жесткого минимума 420 px.
- Временная попытка решить проблему через `overflow-x: hidden` на корне была
  откатена, потому что ломала прокрутку. Финальное решение оставляет scroll
  рабочим.

## Empty state

Пустой гараж теперь представлен иллюстрацией и короткой подписью.

- Изображение: `images/empty_garage.png` (копия `images/empty garage.png`
  с безопасным именем для статического импорта).
- `src/app/garage/_components/GarageEmptyState.tsx`:
  - Убрана `Card`-обёртка и набор кнопок.
  - Центрированная иллюстрация `min(320px, 70vw)` и подпись
    `«В вашем гараже пока нет мотоциклов»`.
  - Кнопка `Добавить мотоцикл` остаётся в `GarageHeader`, поэтому в самом
    empty state действия не дублируются.
  - `onReload` сохранён в сигнатуре, чтобы не ломать вызов из `page.tsx`.

## What remains

- Инструментальная шкала Garage Score (почти замкнутый круг с сегментами)
  намеренно убрана и будет добавлена позже.
- Перенос плотности и паттерна сворачиваемой навигации на другие web-экраны
  (`/vehicles/[id]`, `/onboarding`).
- Экспо-сторона не затрагивается этим шагом; визуальная синхронизация — отдельной
  задачей.

## Related

- `docs/mototwin_ui_refactor_playbook.md`
- `docs/garage-dashboard-mvp.md`
- `docs/frontend-web.md`
