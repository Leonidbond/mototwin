import type { ExpenseItem } from "./expense-item";

export type ServiceEventKind = "SERVICE" | "STATE_UPDATE";

/**
 * Bundle режим — режим заполнения формы Service Event:
 * - `BASIC` — несколько узлов с общим `actionType` без per-item полей.
 * - `ADVANCED` — каждый item имеет собственные partName/sku/quantity/partCost/laborCost.
 */
export type ServiceEventMode = "BASIC" | "ADVANCED";

/** Тип сервисного действия по узлу. */
export type ServiceActionType =
  | "REPLACE"
  | "SERVICE"
  | "INSPECT"
  | "CLEAN"
  | "ADJUST";

export type ServiceEventNode = {
  id: string;
  code: string;
  name: string;
  level: number;
  displayOrder: number;
};

/**
 * Один пункт «комплексного» сервисного события — целевой узел + действие
 * (+ опциональные детали в `ADVANCED` режиме).
 */
export type ServiceBundleItem = {
  id: string;
  nodeId: string;
  actionType: ServiceActionType;
  partName?: string | null;
  sku?: string | null;
  quantity?: number | null;
  partCost?: number | null;
  laborCost?: number | null;
  comment?: string | null;
  sortOrder: number;
  node?: ServiceEventNode;
};

/**
 * DTO события из API. Поле `items` — обязательная коллекция узлов в bundle (>= 1 строка).
 *
 * **Legacy-поля** (`serviceType`, `costAmount`, `partSku`, `partName`) сохранены
 * для обратной совместимости и синтезируются API из `title`/`totalCost`/`items[0]`.
 * Новый код должен опираться на `title` / `totalCost` / `items[]`.
 */
export type ServiceEventItem = {
  id: string;
  eventKind?: ServiceEventKind;
  eventDate: string;
  /** Anchor leaf node — основной узел события (как правило `items[0].nodeId`). */
  nodeId: string;
  node?: ServiceEventNode;
  /** Bundle title (free-form), e.g. «ТО 10 000 км». */
  title: string | null;
  /** Bundle mode (BASIC / ADVANCED). */
  mode: ServiceEventMode;
  odometer: number;
  engineHours: number | null;
  installedPartsJson?: unknown | null;
  /** Сумма partCost по всем items (или ручной ввод верхнего уровня в BASIC). */
  partsCost: number | null;
  /** Сумма laborCost по всем items (или ручной ввод верхнего уровня в BASIC). */
  laborCost: number | null;
  /** Канонический итог bundle = partsCost + laborCost (replaces legacy `costAmount`). */
  totalCost: number | null;
  currency: string | null;
  comment: string | null;
  /** Дочерние строки bundle (>= 1). */
  items: ServiceBundleItem[];

  // ---------------------------------------------------------------------------
  // LEGACY synthesized read-only fields (do not write).
  // Старый журнал/расходы читают эти поля; API синтезирует их из bundle.
  // ---------------------------------------------------------------------------
  /**
   * @deprecated Используйте `title` или RU-лейбл по `items[0].actionType`.
   * Synth: `title` || `getServiceActionTypeLabelRu(items[0].actionType)`.
   */
  serviceType: string;
  /** @deprecated Используйте `totalCost`. */
  costAmount: number | null;
  /** @deprecated Используйте `items[0]?.sku` (или сводку по items в Advanced). */
  partSku?: string | null;
  /** @deprecated Используйте `items[0]?.partName` (или сводку по items в Advanced). */
  partName?: string | null;
  expenseItems?: ExpenseItem[];
  createdAt: string;
};

/**
 * Один элемент создаваемого/редактируемого события (input).
 * В BASIC режиме допустимы только `nodeId` + `actionType` (+ опциональный comment).
 * В ADVANCED — все поля.
 */
export type CreateServiceBundleItemInput = {
  nodeId: string;
  actionType: ServiceActionType;
  partName?: string | null;
  sku?: string | null;
  quantity?: number | null;
  partCost?: number | null;
  laborCost?: number | null;
  comment?: string | null;
};

/** Payload создания/обновления события (bundle-форма). */
export type CreateServiceEventInput = {
  /** Основной узел (anchor) — обычно совпадает с `items[0].nodeId`; может быть опущен на клиенте, тогда вычисляется на сервере. */
  nodeId?: string;
  title: string;
  mode: ServiceEventMode;
  eventDate: string;
  odometer: number;
  engineHours?: number | null;
  partsCost?: number | null;
  laborCost?: number | null;
  /** Если не задан — сервер посчитает `partsCost + laborCost` (или сумму по items в ADVANCED). */
  totalCost?: number | null;
  currency?: string | null;
  comment?: string | null;
  installedPartsJson?: unknown | null;
  installedExpenseItemIds?: string[];
  items: CreateServiceBundleItemInput[];
};

export type UpdateServiceEventInput = CreateServiceEventInput;
