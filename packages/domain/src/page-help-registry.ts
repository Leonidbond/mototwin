/**
 * Single source of truth for per-page help content and the shared `pageKey`
 * concept that links web + mobile screens together.
 *
 * One logical screen is described once via {@link PageHelpEntry} and reused by
 * both platforms. Where the UX diverges (e.g. bottom-nav "Узлы" on mobile) the
 * `web` / `mobile` overrides patch only the differing fields on top of `base`.
 *
 * The same `pageKey` is attached to every feedback submission so admins can
 * group reports by screen regardless of platform.
 */

/** Stable identifier for a logical screen, shared across web and mobile. */
export type AppPageKey =
  | "home"
  | "garage"
  | "vehicle.overview"
  | "vehicle.nodes"
  | "vehicle.state"
  | "vehicle.expenses"
  | "vehicle.service-log"
  | "vehicle.service-event-new"
  | "vehicle.parts"
  | "vehicle.parts-picker"
  | "vehicle.parts-community"
  | "vehicle.fitment-report"
  | "expenses"
  | "profile"
  | "subscription"
  | "notifications"
  | "trash";

/** Platform an end user is viewing help on. */
export type PageHelpPlatform = "web" | "mobile";

/** Platform recorded on a feedback submission (mobile splits ios/android). */
export type FeedbackPlatform = "web" | "ios" | "android";

export interface PageHelpContent {
  /** One-paragraph description of what the screen is for. */
  summary: string;
  /** Ordered "how to" steps. */
  steps: string[];
  /** Optional extra hints shown below the steps. */
  tips?: string[];
}

export interface PageHelpEntry {
  key: AppPageKey;
  title: string;
  /** Shared content used by both platforms unless overridden. */
  base: PageHelpContent;
  /** Patches `base` fields on web only. */
  web?: Partial<PageHelpContent>;
  /** Patches `base` fields on mobile only. */
  mobile?: Partial<PageHelpContent>;
  /** Next.js route pattern, e.g. "/vehicles/[id]/service-log". */
  webPathPattern?: string;
  /** Expo Router route pattern, e.g. "/vehicles/[id]/service-log". */
  mobileRoute?: string;
}

/** Resolved help content for a single screen + platform. */
export interface ResolvedPageHelp {
  key: AppPageKey;
  title: string;
  content: PageHelpContent;
}

export const PAGE_HELP_ENTRIES: readonly PageHelpEntry[] = [
  {
    key: "garage",
    title: "Мой гараж",
    webPathPattern: "/garage",
    mobileRoute: "/garage",
    base: {
      summary:
        "Список ваших мотоциклов. Отсюда вы открываете цифрового двойника каждого мотоцикла и добавляете новые.",
      steps: [
        "Нажмите на карточку мотоцикла, чтобы открыть его обзор.",
        "Кнопкой «Добавить мотоцикл» заведите новый мотоцикл из каталога.",
        "Следите за плашкой «Требует внимания» — она подсвечивает мотоциклы с задачами по ТО.",
      ],
      tips: ["Удалённые мотоциклы можно восстановить из раздела «Свалка»."],
    },
  },
  {
    key: "vehicle.overview",
    title: "Обзор мотоцикла",
    webPathPattern: "/vehicles/[id]",
    mobileRoute: "/vehicles/[id]",
    base: {
      summary:
        "Главный экран мотоцикла: текущее состояние, узлы, требующие внимания, и быстрые действия.",
      steps: [
        "Проверьте блок «Требует внимания» — это узлы с приближающимся или просроченным ТО.",
        "Откройте интересующий узел, чтобы увидеть историю и регламент.",
        "Используйте быстрые действия, чтобы добавить сервисное событие или позицию в список покупок.",
      ],
    },
  },
  {
    key: "vehicle.nodes",
    title: "Узлы мотоцикла",
    webPathPattern: "/vehicles/[id]/nodes",
    mobileRoute: "/vehicles/[id]/nodes",
    base: {
      summary:
        "Дерево узлов мотоцикла со статусами обслуживания. Здесь видно, что в порядке, а что требует внимания.",
      steps: [
        "Разверните верхний узел, чтобы увидеть вложенные.",
        "Цвет статуса показывает состояние: зелёный — в норме, жёлтый/красный — нужно ТО.",
        "Нажмите на узел, чтобы открыть контекст: историю, регламент и действия.",
      ],
    },
    mobile: {
      summary:
        "Дерево узлов мотоцикла со статусами обслуживания. Открывается из нижней навигации «Узлы».",
    },
  },
  {
    key: "vehicle.state",
    title: "Текущее состояние",
    webPathPattern: "/vehicles/[id]/state",
    mobileRoute: "/vehicles/[id]/state",
    base: {
      summary:
        "Актуальные показания мотоцикла: пробег и моточасы. На их основе рассчитываются напоминания о ТО.",
      steps: [
        "Введите текущий пробег и при необходимости моточасы.",
        "Сохраните — система пересчитает сроки регламентных работ.",
        "Обновляйте показания регулярно, чтобы напоминания были точными.",
      ],
    },
  },
  {
    key: "vehicle.expenses",
    title: "Расходы по мотоциклу",
    webPathPattern: "/vehicles/[id]/expenses",
    mobileRoute: "/vehicles/[id]/expenses",
    base: {
      summary:
        "Все траты по этому мотоциклу: запчасти, расходники, работы и топливо с разбивкой по категориям.",
      steps: [
        "Нажмите «Добавить расход» и выберите категорию.",
        "Укажите сумму, дату и при необходимости узел.",
        "Смотрите аналитику по годам и категориям внизу экрана.",
      ],
      tips: ["Категория «Топливо» не требует выбора узла."],
    },
  },
  {
    key: "vehicle.service-log",
    title: "Журнал обслуживания",
    webPathPattern: "/vehicles/[id]/service-log",
    mobileRoute: "/vehicles/[id]/service-log",
    base: {
      summary:
        "Хронология сервисных событий и обновлений состояния мотоцикла.",
      steps: [
        "Используйте фильтры, чтобы найти события по узлу или периоду.",
        "Нажмите на событие, чтобы увидеть детали и стоимость.",
        "Добавляйте новые сервисные события кнопкой на экране мотоцикла.",
      ],
    },
  },
  {
    key: "vehicle.service-event-new",
    title: "Новое сервисное событие",
    webPathPattern: "/vehicles/[id]/service-events/new",
    mobileRoute: "/vehicles/[id]/service-events/new",
    base: {
      summary:
        "Регистрация выполненных работ: какой узел обслужили, что сделали, сколько потратили.",
      steps: [
        "Выберите узел и заполните, что было сделано.",
        "Укажите пробег/моточасы на момент работ и стоимость.",
        "Сохраните — событие появится в журнале и обновит сроки ТО узла.",
      ],
    },
  },
  {
    key: "vehicle.parts",
    title: "Список покупок",
    webPathPattern: "/vehicles/[id]/parts",
    mobileRoute: "/vehicles/[id]/wishlist",
    base: {
      summary:
        "Запчасти и расходники, которые вы планируете купить для этого мотоцикла.",
      steps: [
        "Добавьте позицию вручную или подберите через каталог совместимых деталей.",
        "Переводите позицию в статусы «Куплено» и «Установлено» по мере работы.",
        "При установке создайте сервисное событие, чтобы зафиксировать работу.",
      ],
    },
  },
  {
    key: "vehicle.parts-picker",
    title: "Подбор деталей",
    webPathPattern: "/vehicles/[id]/parts/picker",
    mobileRoute: "/vehicles/[id]/wishlist/picker",
    base: {
      summary:
        "Каталог деталей, совместимых с вашим мотоциклом. Отсюда позиции попадают в список покупок.",
      steps: [
        "Выберите узел, чтобы увидеть подходящие детали.",
        "Проверьте уровень совместимости у каждой позиции.",
        "Добавьте нужные детали в список покупок.",
      ],
    },
  },
  {
    key: "vehicle.parts-community",
    title: "Опыт сообщества",
    webPathPattern: "/vehicles/[id]/parts/community",
    mobileRoute: "/vehicles/[id]/wishlist/community",
    base: {
      summary:
        "Отчёты других владельцев о совместимости деталей с такой же моделью мотоцикла.",
      steps: [
        "Изучите подтверждённые сообществом установки.",
        "Голосуйте за отчёты, чтобы повысить их достоверность.",
        "Используйте опыт сообщества при подборе деталей.",
      ],
    },
  },
  {
    key: "vehicle.fitment-report",
    title: "Отчёт о совместимости",
    webPathPattern: "/vehicles/[id]/parts/fitment-report",
    mobileRoute: "/vehicles/[id]/wishlist/fitment-report",
    base: {
      summary:
        "Ваш отчёт о том, подошла ли деталь на мотоцикл. Помогает сообществу и улучшает каталог.",
      steps: [
        "Укажите деталь и узел, на который её устанавливали.",
        "Отметьте результат: подошла, подошла с доработкой или не подошла.",
        "Отправьте отчёт — он попадёт на модерацию и в опыт сообщества.",
      ],
    },
  },
  {
    key: "expenses",
    title: "Расходы",
    webPathPattern: "/expenses",
    mobileRoute: "/expenses",
    base: {
      summary:
        "Сводные расходы по всем мотоциклам гаража с аналитикой по категориям и периодам.",
      steps: [
        "Выберите год, чтобы увидеть траты за период.",
        "Изучите разбивку по категориям расходов.",
        "Для детальных трат по одному мотоциклу откройте его экран расходов.",
      ],
    },
  },
  {
    key: "profile",
    title: "Профиль",
    webPathPattern: "/profile",
    mobileRoute: "/profile",
    base: {
      summary:
        "Ваш профиль и настройки приложения, а также управление подпиской.",
      steps: [
        "Проверьте данные аккаунта и настройки отображения.",
        "Настройте отслеживаемые узлы и предпочтения.",
        "Перейдите в раздел подписки, чтобы изменить план.",
      ],
    },
  },
  {
    key: "subscription",
    title: "Подписка",
    webPathPattern: "/subscription",
    mobileRoute: "/subscription",
    base: {
      summary:
        "Управление планом подписки MotoTwin и доступными возможностями.",
      steps: [
        "Сравните доступные планы и их возможности.",
        "Выберите подходящий план.",
        "Подтвердите изменение подписки.",
      ],
    },
  },
  {
    key: "notifications",
    title: "Уведомления",
    webPathPattern: "/notifications",
    mobileRoute: "/notifications",
    base: {
      summary:
        "Напоминания о ТО и важные события по вашим мотоциклам.",
      steps: [
        "Просматривайте новые уведомления вверху списка.",
        "Открывайте уведомление, чтобы перейти к нужному узлу или действию.",
        "Отмечайте обработанные напоминания.",
      ],
    },
  },
  {
    key: "trash",
    title: "Свалка",
    webPathPattern: "/trash",
    mobileRoute: "/trash",
    base: {
      summary:
        "Удалённые мотоциклы и записи. Их можно восстановить или удалить окончательно.",
      steps: [
        "Найдите нужную запись в списке удалённых.",
        "Нажмите «Восстановить», чтобы вернуть её в гараж.",
        "Окончательное удаление необратимо — используйте с осторожностью.",
      ],
    },
  },
  {
    key: "home",
    title: "MotoTwin",
    webPathPattern: "/",
    mobileRoute: "/",
    base: {
      summary:
        "Стартовый экран MotoTwin. Перейдите в «Мой гараж», чтобы начать работу с мотоциклами.",
      steps: [
        "Откройте «Мой гараж».",
        "Добавьте мотоцикл или выберите существующий.",
        "Ведите ТО, расходы и список покупок по каждому мотоциклу.",
      ],
    },
  },
];

const ENTRY_BY_KEY: ReadonlyMap<AppPageKey, PageHelpEntry> = new Map(
  PAGE_HELP_ENTRIES.map((entry) => [entry.key, entry])
);

/** Merge `base` with the platform-specific override into final content. */
export function getPageHelp(
  key: AppPageKey,
  platform: PageHelpPlatform
): ResolvedPageHelp | null {
  const entry = ENTRY_BY_KEY.get(key);
  if (!entry) return null;
  const override = platform === "web" ? entry.web : entry.mobile;
  return {
    key: entry.key,
    title: entry.title,
    content: {
      summary: override?.summary ?? entry.base.summary,
      steps: override?.steps ?? entry.base.steps,
      tips: override?.tips ?? entry.base.tips,
    },
  };
}

/** Title for a page key (or the key itself when unknown). Used by admin UI. */
export function getPageHelpTitle(key: string): string {
  const entry = ENTRY_BY_KEY.get(key as AppPageKey);
  return entry?.title ?? key;
}

/**
 * Convert a route pattern containing `[param]` segments into a matcher RegExp.
 * `[^/]+` also matches literal `[param]` placeholders, so the same matcher works
 * for both real-id paths (web/mobile runtime) and bracketed Expo segments.
 */
function patternToRegExp(pattern: string): RegExp {
  const normalized = normalizePath(pattern);
  const source = normalized
    .split("/")
    .map((segment) => (segment.startsWith("[") && segment.endsWith("]") ? "[^/]+" : escapeRegExp(segment)))
    .join("/");
  return new RegExp(`^${source}$`);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizePath(path: string): string {
  if (!path) return "/";
  let result = path.split("?")[0]?.split("#")[0] ?? path;
  if (!result.startsWith("/")) result = `/${result}`;
  if (result.length > 1 && result.endsWith("/")) result = result.slice(0, -1);
  return result;
}

function resolveByPattern(
  pathname: string,
  selectPattern: (entry: PageHelpEntry) => string | undefined
): AppPageKey | null {
  const normalized = normalizePath(pathname);
  for (const entry of PAGE_HELP_ENTRIES) {
    const pattern = selectPattern(entry);
    if (!pattern) continue;
    if (patternToRegExp(pattern).test(normalized)) {
      return entry.key;
    }
  }
  return null;
}

/** Resolve a `pageKey` from a Next.js `usePathname()` value. */
export function resolvePageKeyFromWebPath(pathname: string): AppPageKey | null {
  return resolveByPattern(pathname, (entry) => entry.webPathPattern);
}

/** Resolve a `pageKey` from Expo Router `useSegments()` output. */
export function resolvePageKeyFromMobileRoute(segments: string[]): AppPageKey | null {
  const path = `/${segments.filter(Boolean).join("/")}`;
  return resolveByPattern(path, (entry) => entry.mobileRoute);
}

/** Feedback workflow status (mirror of Prisma `FeedbackStatus`). */
export type FeedbackStatusKey = "NEW" | "IN_PROGRESS" | "RESOLVED" | "REJECTED";

/** Feedback kind chosen by the user (mirror of Prisma `FeedbackType`). */
export type FeedbackTypeKey = "PROBLEM" | "IDEA" | "QUESTION";

const FEEDBACK_STATUS_LABELS_RU: Record<FeedbackStatusKey, string> = {
  NEW: "Новое",
  IN_PROGRESS: "В работе",
  RESOLVED: "Решено",
  REJECTED: "Отклонено",
};

const FEEDBACK_TYPE_LABELS_RU: Record<FeedbackTypeKey, string> = {
  PROBLEM: "Проблема",
  IDEA: "Идея",
  QUESTION: "Вопрос",
};

export const FEEDBACK_STATUS_KEYS: readonly FeedbackStatusKey[] = [
  "NEW",
  "IN_PROGRESS",
  "RESOLVED",
  "REJECTED",
];

export const FEEDBACK_TYPE_KEYS: readonly FeedbackTypeKey[] = [
  "PROBLEM",
  "IDEA",
  "QUESTION",
];

export function getFeedbackStatusLabelRu(status: string): string {
  return FEEDBACK_STATUS_LABELS_RU[status as FeedbackStatusKey] ?? status;
}

export function getFeedbackTypeLabelRu(type: string): string {
  return FEEDBACK_TYPE_LABELS_RU[type as FeedbackTypeKey] ?? type;
}
