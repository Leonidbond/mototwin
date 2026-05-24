/**
 * Russian-only string catalog for the admin panel.
 * Wrap every literal in `t(...)` so we can swap to next-intl later
 * without re-touching components.
 */
export const ruAdmin = {
  brand: {
    title: "MOTOTWIN",
    subtitle: "ADMIN",
  },
  nav: {
    dashboard: "Дашборд",
    reports: "Отчеты",
    users: "Пользователи",
    vehicles: "Мотоциклы",
    models: "Модели и поддержка",
    catalog: "Каталог деталей",
    fitment: "Совместимость",
    moderation: "Модерация",
    imports: "Массовые загрузки",
    serviceRules: "Регламенты ТО",
    dictionaries: "Справочники",
    notifications: "Уведомления",
    subscriptions: "Подписки",
    audit: "Аудит",
    settings: "Настройки админки",
    collapse: "Свернуть",
    expand: "Развернуть",
  },
  topbar: {
    searchPlaceholder: "Поиск по пользователям, моделям, SKU",
    searchHint: "⌘K",
    period7d: "7 дней",
    notifications: "Уведомления",
    role: {
      SUPER_ADMIN: "Super Admin",
      CATALOG_MANAGER: "Catalog Manager",
      MODERATOR: "Moderator",
      ANALYST: "Analyst",
    },
  },
  dashboard: {
    title: "Дашборд",
    refresh: "Обновить",
    period: {
      "1d": "За сутки",
      "7d": "7 дней",
      "14d": "14 дней",
      "30d": "30 дней",
      "90d": "90 дней",
      custom: "Свой период",
    },
    kpi: {
      users: "Пользователи",
      vehicles: "Мотоциклы в гаражах",
      newFitmentReports: "Новые fitment-отчеты",
      moderationPending: "Ожидают модерации",
      verifiedParts: "Verified детали",
      conflicts: "Конфликты совместимости",
      deltaPerPeriod: (n: number) =>
        `${n >= 0 ? "+" : ""}${formatNumber(n)} за период`,
    },
    workQueue: {
      title: "Очередь работы",
      seeAll: "Открыть всю очередь работы",
      tabs: {
        all: "Все",
        "new-parts": "Новые детали",
        fitment: "Fitment",
        conflicts: "Конфликты",
        safety: "Safety",
      },
      columns: {
        priority: "Приоритет",
        partLabel: "Деталь / Отчет",
        modelLabel: "Модель",
        nodeLabel: "Узел",
        status: "Статус",
        confirmations: "Подтверждения",
        review: "Проверить",
        details: "Открыть",
      },
      empty: "Очередь пуста — отличная работа",
    },
    fastestModels: {
      title: "Модели, которые растут быстрее всего",
      seeAll: "Смотреть все модели",
      columns: {
        rank: "#",
        model: "Модель",
        garages: "В гаражах",
        active: "Активные",
        reports: "Reports",
        support: "Support level",
      },
    },
    problemAreas: {
      title: "Проблемные зоны данных",
      seeAll: "Смотреть все проблемные зоны",
    },
    fitmentQuality: {
      title: "Качество fitment",
      total: "всего",
      seeAll: "Подробнее о качестве",
    },
    catalogCoverage: {
      title: "Покрытие каталога",
      seeAll: "Перейти в каталог",
      columns: {
        node: "Узел",
      },
    },
    activitySignals: {
      title: "Активность и сигналы",
      legend: {
        newVehicles: "Новые мотоциклы",
        serviceEvents: "Service events",
        fitmentReports: "Fitment reports",
      },
      seeAll: "Открыть аналитические отчеты",
    },
    quickActions: {
      title: "Быстрые действия",
      addPart: "Добавить деталь",
      uploadCsv: "Загрузить CSV",
      createFitmentRule: "Создать правило совместимости",
      openModeration: "Открыть модерацию",
      recalculateConfidence: "Пересчитать confidence",
    },
    states: {
      loading: "Загружаем данные…",
      empty: "Нет данных за выбранный период",
      error: "Не удалось загрузить блок",
      retry: "Повторить",
    },
  },
  search: {
    title: "Глобальный поиск",
    placeholder: "Начните вводить имя пользователя, SKU или модель",
    empty: "Ничего не найдено",
    groups: {
      user: "Пользователи",
      vehicle: "Мотоциклы",
      model: "Модели",
      part: "Детали",
      "fitment-report": "Fitment-отчеты",
    },
  },
  alerts: {
    title: "Требуют внимания",
    keys: {
      "moderation-pending": "Ожидают модерации",
      "fitment-pending": "Fitment в очереди",
      conflicts: "Конфликты совместимости",
      "safety-critical": "Safety-critical",
      "import-errors": "Ошибки импорта",
      "service-rules": "Правила ТО на проверку",
    },
    empty: "Все спокойно",
  },
  status: {
    "safety-critical": "Safety-critical",
    pending: "Pending",
    "mixed-reports": "Mixed reports",
    "low-confidence": "Low confidence",
    verified: "Verified by MotoTwin",
    community: "Community confirmed",
    rejected: "Rejected",
    modification: "Fits with modification",
    mixed: "Mixed reports",
    low: "Low confidence",
  },
  support: {
    MVP_CORE: "Полная поддержка (MVP-core)",
    MVP_CORE_LEGACY: "Поддержка (legacy MVP-core)",
    COMMUNITY_SUPPORT: "Community support",
    EARLY_BETA: "Early beta",
    NO_FITMENT_DATA_YET: "Нет данных по совместимости",
  },
  access: {
    forbidden: "Этот раздел доступен только администраторам.",
    forbiddenAction: "Недостаточно прав для этого действия.",
    backToApp: "Открыть приложение",
  },
} as const;

export type AdminLocale = typeof ruAdmin;

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(value);
}

export function formatPercent(value: number, fractionDigits = 0): string {
  return `${new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)}%`;
}

export function formatDelta(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "" : "±";
  return `${sign}${formatNumber(value)}`;
}
