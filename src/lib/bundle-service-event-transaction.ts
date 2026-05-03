import { Prisma, ServiceActionType, ServiceEventMode, TopNodeStatus } from "@prisma/client";
import {
  calculateAllRootEffectiveStatuses,
  type LatestServiceEventView,
  type NodeMaintenanceRuleView,
} from "@/lib/maintenance-status";

export type CreateServiceBundleItemInTxInput = {
  nodeId: string;
  actionType: ServiceActionType;
  partName?: string | null;
  sku?: string | null;
  quantity?: number | null;
  partCost?: number | null;
  laborCost?: number | null;
  comment?: string | null;
};

export type CreateBundleServiceEventInTxInput = {
  vehicleId: string;
  /** Anchor leaf node — обычно `items[0].nodeId`. Должен быть листом и принадлежать ТС. */
  anchorNodeId: string;
  title: string;
  mode: ServiceEventMode;
  eventDate: Date;
  odometer: number;
  engineHours: number | null;
  partsCost: number | null;
  laborCost: number | null;
  totalCost: number | null;
  currency: string | null;
  comment: string | null;
  installedPartsJson: Prisma.InputJsonValue | null;
  items: CreateServiceBundleItemInTxInput[];
};

export type ServiceEventInclude = {
  id: string;
  vehicleId: string;
  nodeId: string;
  eventKind: string;
  mode: ServiceEventMode | string;
  title: string | null;
  eventDate: Date;
  odometer: number;
  engineHours: number | null;
  partsCost: Prisma.Decimal | number | null;
  laborCost: Prisma.Decimal | number | null;
  totalCost: Prisma.Decimal | number | null;
  currency: string | null;
  comment: string | null;
  createdAt: Date;
  installedPartsJson?: Prisma.JsonValue | null;
  node?: {
    id: string;
    code: string;
    name: string;
    level: number;
    displayOrder: number;
  };
  items?: Array<{
    id: string;
    nodeId: string;
    actionType: ServiceActionType;
    partName: string | null;
    sku: string | null;
    quantity: number | null;
    partCost: Prisma.Decimal | number | null;
    laborCost: Prisma.Decimal | number | null;
    comment: string | null;
    sortOrder: number;
    node?: {
      id: string;
      code: string;
      name: string;
      level: number;
      displayOrder: number;
    };
  }>;
};

const SERVICE_EVENT_INCLUDE = {
  node: {
    select: {
      id: true,
      code: true,
      name: true,
      level: true,
      displayOrder: true,
    },
  },
  items: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      node: {
        select: {
          id: true,
          code: true,
          name: true,
          level: true,
          displayOrder: true,
        },
      },
    },
  },
} satisfies Prisma.ServiceEventInclude;

export const SERVICE_EVENT_BUNDLE_INCLUDE = SERVICE_EVENT_INCLUDE;

function decimalToNumberOrNull(value: number | null | undefined): Prisma.Decimal | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  return new Prisma.Decimal(value);
}

/** Verify a node is a leaf (has no children) and belongs to the global tree. */
async function assertLeafNode(tx: Prisma.TransactionClient, nodeId: string): Promise<void> {
  const node = await tx.node.findUnique({
    where: { id: nodeId },
    select: { id: true },
  });
  if (!node) {
    throw new Error("Node not found");
  }
  const childCount = await tx.node.count({ where: { parentId: nodeId } });
  if (childCount > 0) {
    throw new Error("Service events can only be created for the last available node level");
  }
}

/**
 * Recompute NodeState for a single leaf node based on its latest SERVICE event
 * (whether attached as anchor or via ServiceEventItem).
 */
export async function syncNodeStateForLeafNode(
  tx: Prisma.TransactionClient,
  vehicleId: string,
  nodeId: string
): Promise<void> {
  // 1. Найдём последнее SERVICE-событие, в котором этот узел фигурирует
  //    (anchor или один из items).
  const latestAnchorEvent = await tx.serviceEvent.findFirst({
    where: { vehicleId, nodeId, eventKind: "SERVICE" },
    orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
    select: { id: true, eventDate: true, createdAt: true },
  });
  const latestItemEvent = await tx.serviceEventItem.findFirst({
    where: {
      nodeId,
      serviceEvent: { vehicleId, eventKind: "SERVICE" },
    },
    orderBy: [
      { serviceEvent: { eventDate: "desc" } },
      { serviceEvent: { createdAt: "desc" } },
    ],
    select: {
      serviceEvent: { select: { id: true, eventDate: true, createdAt: true } },
    },
  });

  const candidates: Array<{ id: string; eventDate: Date; createdAt: Date }> = [];
  if (latestAnchorEvent) {
    candidates.push(latestAnchorEvent);
  }
  if (latestItemEvent?.serviceEvent) {
    candidates.push({
      id: latestItemEvent.serviceEvent.id,
      eventDate: latestItemEvent.serviceEvent.eventDate,
      createdAt: latestItemEvent.serviceEvent.createdAt,
    });
  }

  if (candidates.length === 0) {
    await tx.nodeState.deleteMany({ where: { vehicleId, nodeId } });
    return;
  }

  candidates.sort((left, right) => {
    const dateDiff = right.eventDate.getTime() - left.eventDate.getTime();
    if (dateDiff !== 0) {
      return dateDiff;
    }
    return right.createdAt.getTime() - left.createdAt.getTime();
  });
  const latest = candidates[0];

  await tx.nodeState.upsert({
    where: { vehicleId_nodeId: { vehicleId, nodeId } },
    update: {
      status: "RECENTLY_REPLACED",
      lastServiceEventId: latest.id,
      note: null,
    },
    create: {
      vehicleId,
      nodeId,
      status: "RECENTLY_REPLACED",
      lastServiceEventId: latest.id,
      note: null,
    },
  });
}

/**
 * Recompute every TopNodeState for the vehicle. Mirrors the same calculation
 * as the legacy update PATCH path; safe to call multiple times.
 */
export async function recomputeTopNodeStates(
  tx: Prisma.TransactionClient,
  vehicleId: string
): Promise<void> {
  const vehicle = await tx.vehicle.findUnique({
    where: { id: vehicleId },
    select: { id: true, odometer: true, engineHours: true },
  });
  if (!vehicle) {
    throw new Error("Vehicle not found");
  }

  const allNodes = await tx.node.findMany({
    select: { id: true, parentId: true },
  });

  const nodeStates = await tx.nodeState.findMany({
    where: { vehicleId },
    select: { nodeId: true, status: true },
  });
  const nodeStateByNodeId = new Map<string, { status: string | null }>(
    nodeStates.map((state) => [state.nodeId, { status: state.status }])
  );

  const nodeMaintenanceRuleModel = (tx as Prisma.TransactionClient & {
    nodeMaintenanceRule?: {
      findMany: typeof tx.nodeState.findMany;
    };
  }).nodeMaintenanceRule;
  const maintenanceRules = nodeMaintenanceRuleModel
    ? await nodeMaintenanceRuleModel.findMany({
        select: {
          nodeId: true,
          triggerMode: true,
          intervalKm: true,
          intervalHours: true,
          intervalDays: true,
          warningKm: true,
          warningHours: true,
          warningDays: true,
          isActive: true,
        },
      })
    : [];
  const maintenanceRuleByNodeId = new Map<string, NodeMaintenanceRuleView>(
    maintenanceRules.map((rule) => [
      rule.nodeId,
      {
        triggerMode: rule.triggerMode,
        intervalKm: rule.intervalKm,
        intervalHours: rule.intervalHours,
        intervalDays: rule.intervalDays,
        warningKm: rule.warningKm,
        warningHours: rule.warningHours,
        warningDays: rule.warningDays,
        isActive: rule.isActive,
      },
    ])
  );

  // Latest service event per node (anchor + items): берём максимум по eventDate.
  const anchorEvents = await tx.serviceEvent.findMany({
    where: { vehicleId, eventKind: "SERVICE" },
    orderBy: [{ nodeId: "asc" }, { eventDate: "desc" }, { createdAt: "desc" }],
    select: { nodeId: true, eventDate: true, odometer: true, engineHours: true },
  });
  const itemEvents = await tx.serviceEventItem.findMany({
    where: { serviceEvent: { vehicleId, eventKind: "SERVICE" } },
    orderBy: [
      { serviceEvent: { eventDate: "desc" } },
      { serviceEvent: { createdAt: "desc" } },
    ],
    select: {
      nodeId: true,
      serviceEvent: {
        select: { eventDate: true, odometer: true, engineHours: true },
      },
    },
  });

  const latestServiceEventByNodeId = new Map<string, LatestServiceEventView>();
  for (const event of anchorEvents) {
    if (!latestServiceEventByNodeId.has(event.nodeId)) {
      latestServiceEventByNodeId.set(event.nodeId, {
        eventDate: event.eventDate,
        odometer: event.odometer,
        engineHours: event.engineHours,
      });
    }
  }
  for (const item of itemEvents) {
    const existing = latestServiceEventByNodeId.get(item.nodeId);
    if (!existing || existing.eventDate < item.serviceEvent.eventDate) {
      latestServiceEventByNodeId.set(item.nodeId, {
        eventDate: item.serviceEvent.eventDate,
        odometer: item.serviceEvent.odometer,
        engineHours: item.serviceEvent.engineHours,
      });
    }
  }

  const existingTopNodeStates = await tx.topNodeState.findMany({
    where: { vehicleId },
    select: { nodeId: true, status: true },
  });
  const fallbackStatusByRootId = new Map(
    existingTopNodeStates.map((state) => [state.nodeId, state.status])
  );

  const calculatedTopNodeStatuses = calculateAllRootEffectiveStatuses({
    nodes: allNodes,
    nodeStateByNodeId,
    maintenanceRuleByNodeId,
    latestServiceEventByNodeId,
    currentOdometer: vehicle.odometer,
    currentEngineHours: vehicle.engineHours,
    now: new Date(),
  });

  for (const calculatedStatus of calculatedTopNodeStatuses) {
    const fallback = fallbackStatusByRootId.get(calculatedStatus.rootNodeId) ?? TopNodeStatus.OK;
    const persistedStatus = mapToPersistedTopNodeStatus(calculatedStatus.effectiveStatus, fallback);
    await tx.topNodeState.upsert({
      where: {
        vehicleId_nodeId: {
          vehicleId,
          nodeId: calculatedStatus.rootNodeId,
        },
      },
      update: {
        status: persistedStatus,
      },
      create: {
        vehicleId,
        nodeId: calculatedStatus.rootNodeId,
        status: persistedStatus,
        lastServiceEventId: null,
        note: null,
      },
    });
  }
}

function mapToPersistedTopNodeStatus(status: string | null, fallback: TopNodeStatus): TopNodeStatus {
  if (status === "OVERDUE") {
    return TopNodeStatus.OVERDUE;
  }
  if (status === "SOON") {
    return TopNodeStatus.SOON;
  }
  if (status === "RECENTLY_REPLACED") {
    return TopNodeStatus.RECENTLY_REPLACED;
  }
  if (status === "OK") {
    return TopNodeStatus.OK;
  }
  return fallback;
}

/**
 * Создаёт Service Bundle событие + N items за одну транзакцию.
 * Делает upsert NodeState (`RECENTLY_REPLACED`) для каждого `item.nodeId` и
 * пересчитывает все TopNodeState (т.к. items могут затрагивать разные roots).
 */
export async function createBundleServiceEventInTransaction(
  tx: Prisma.TransactionClient,
  input: CreateBundleServiceEventInTxInput
): Promise<ServiceEventInclude> {
  if (input.items.length === 0) {
    throw new Error("Service event must have at least one item");
  }

  await assertLeafNode(tx, input.anchorNodeId);
  for (const item of input.items) {
    await assertLeafNode(tx, item.nodeId);
  }

  const createdServiceEvent = await tx.serviceEvent.create({
    data: {
      vehicleId: input.vehicleId,
      nodeId: input.anchorNodeId,
      mode: input.mode,
      title: input.title,
      eventDate: input.eventDate,
      odometer: input.odometer,
      engineHours: input.engineHours,
      installedPartsJson:
        input.installedPartsJson === null || input.installedPartsJson === undefined
          ? Prisma.JsonNull
          : input.installedPartsJson,
      partsCost: decimalToNumberOrNull(input.partsCost),
      laborCost: decimalToNumberOrNull(input.laborCost),
      totalCost: decimalToNumberOrNull(input.totalCost),
      currency: input.currency || null,
      comment: input.comment || null,
      items: {
        create: input.items.map((item, index) => ({
          nodeId: item.nodeId,
          actionType: item.actionType,
          partName: item.partName?.trim() || null,
          sku: item.sku?.trim() || null,
          quantity: item.quantity ?? null,
          partCost: decimalToNumberOrNull(item.partCost ?? null),
          laborCost: decimalToNumberOrNull(item.laborCost ?? null),
          comment: item.comment?.trim() || null,
          sortOrder: index,
        })),
      },
    },
    include: SERVICE_EVENT_INCLUDE,
  });

  const affectedNodeIds = new Set<string>(input.items.map((item) => item.nodeId));
  affectedNodeIds.add(input.anchorNodeId);
  for (const nodeId of affectedNodeIds) {
    await syncNodeStateForLeafNode(tx, input.vehicleId, nodeId);
  }
  await recomputeTopNodeStates(tx, input.vehicleId);

  return createdServiceEvent as unknown as ServiceEventInclude;
}

/**
 * Обновление существующего bundle-события: полная замена items[] +
 * пересчёт статусов для union(oldNodeIds, newNodeIds).
 */
export async function updateBundleServiceEventInTransaction(
  tx: Prisma.TransactionClient,
  serviceEventId: string,
  input: CreateBundleServiceEventInTxInput
): Promise<ServiceEventInclude> {
  if (input.items.length === 0) {
    throw new Error("Service event must have at least one item");
  }
  await assertLeafNode(tx, input.anchorNodeId);
  for (const item of input.items) {
    await assertLeafNode(tx, item.nodeId);
  }

  const oldItems = await tx.serviceEventItem.findMany({
    where: { serviceEventId },
    select: { nodeId: true },
  });
  const oldEvent = await tx.serviceEvent.findUnique({
    where: { id: serviceEventId },
    select: { nodeId: true },
  });
  const oldNodeIds = new Set<string>(oldItems.map((item) => item.nodeId));
  if (oldEvent?.nodeId) {
    oldNodeIds.add(oldEvent.nodeId);
  }

  await tx.serviceEventItem.deleteMany({ where: { serviceEventId } });

  const updated = await tx.serviceEvent.update({
    where: { id: serviceEventId },
    data: {
      nodeId: input.anchorNodeId,
      mode: input.mode,
      title: input.title,
      eventDate: input.eventDate,
      odometer: input.odometer,
      engineHours: input.engineHours,
      installedPartsJson:
        input.installedPartsJson === null || input.installedPartsJson === undefined
          ? Prisma.JsonNull
          : input.installedPartsJson,
      partsCost: decimalToNumberOrNull(input.partsCost),
      laborCost: decimalToNumberOrNull(input.laborCost),
      totalCost: decimalToNumberOrNull(input.totalCost),
      currency: input.currency || null,
      comment: input.comment || null,
      items: {
        create: input.items.map((item, index) => ({
          nodeId: item.nodeId,
          actionType: item.actionType,
          partName: item.partName?.trim() || null,
          sku: item.sku?.trim() || null,
          quantity: item.quantity ?? null,
          partCost: decimalToNumberOrNull(item.partCost ?? null),
          laborCost: decimalToNumberOrNull(item.laborCost ?? null),
          comment: item.comment?.trim() || null,
          sortOrder: index,
        })),
      },
    },
    include: SERVICE_EVENT_INCLUDE,
  });

  const affectedNodeIds = new Set<string>([...oldNodeIds, ...input.items.map((item) => item.nodeId), input.anchorNodeId]);
  for (const nodeId of affectedNodeIds) {
    await syncNodeStateForLeafNode(tx, input.vehicleId, nodeId);
  }
  await recomputeTopNodeStates(tx, input.vehicleId);

  return updated as unknown as ServiceEventInclude;
}

/**
 * @deprecated Используйте {@link createBundleServiceEventInTransaction}. Сохранён
 * для совместимости с одним вызовом из POST /api/vehicles/[id]/service-events
 * и одной legacy-точкой расхождения. Принимает старую сигнатуру и обёрнут поверх
 * нового bundle-апи.
 */
export async function createLeafServiceEventInTransaction(
  tx: Prisma.TransactionClient,
  input: {
    vehicleId: string;
    leafNodeId: string;
    eventDate: Date;
    odometer: number;
    engineHours: number | null;
    serviceType: string;
    installedPartsJson: Prisma.InputJsonValue | null;
    costAmount: number | null;
    currency: string | null;
    comment: string | null;
    partSku: string | null;
    partName: string | null;
  }
): Promise<ServiceEventInclude> {
  return createBundleServiceEventInTransaction(tx, {
    vehicleId: input.vehicleId,
    anchorNodeId: input.leafNodeId,
    title: input.serviceType,
    mode: ServiceEventMode.BASIC,
    eventDate: input.eventDate,
    odometer: input.odometer,
    engineHours: input.engineHours,
    partsCost: null,
    laborCost: null,
    totalCost: input.costAmount,
    currency: input.currency,
    comment: input.comment,
    installedPartsJson: input.installedPartsJson,
    items: [
      {
        nodeId: input.leafNodeId,
        actionType: mapLegacyServiceTypeToActionType(input.serviceType),
        partName: input.partName,
        sku: input.partSku,
      },
    ],
  });
}

/** Та же RU-эвристика, что и в `mapServiceTypeStringToActionType` (domain). */
function mapLegacyServiceTypeToActionType(value: string | null | undefined): ServiceActionType {
  const lc = (value ?? "").trim().toLowerCase();
  if (!lc) return ServiceActionType.SERVICE;
  if (lc.includes("замен")) return ServiceActionType.REPLACE;
  if (lc.includes("проверк") || lc.includes("диагност")) return ServiceActionType.INSPECT;
  if (lc.includes("чистк") || lc.includes("очистк")) return ServiceActionType.CLEAN;
  if (lc.includes("регулир") || lc.includes("настройк")) return ServiceActionType.ADJUST;
  return ServiceActionType.SERVICE;
}
