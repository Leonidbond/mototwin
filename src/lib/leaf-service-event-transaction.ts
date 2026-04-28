import { Prisma, TopNodeStatus } from "@prisma/client";
import {
  calculateRootEffectiveStatus,
  type LatestServiceEventView,
  type NodeMaintenanceRuleView,
} from "@/lib/maintenance-status";

export type CreateLeafServiceEventInTxInput = {
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
};

/**
 * Creates a SERVICE event for a leaf node and recalculates NodeState + TopNodeState
 * for the subtree root — same behavior as POST /api/vehicles/[id]/service-events.
 * Call only after validating the node is a leaf and belongs to the vehicle context.
 */
export async function createLeafServiceEventInTransaction(
  tx: Prisma.TransactionClient,
  input: CreateLeafServiceEventInTxInput
) {
  const { vehicleId, leafNodeId, eventDate } = input;

  const node = await tx.node.findUnique({
    where: { id: leafNodeId },
    select: { id: true, parentId: true },
  });

  if (!node) {
    throw new Error("Node not found");
  }

  let subtreeRootNodeId = node.id;
  let parentId = node.parentId;
  while (parentId) {
    const parentNode = await tx.node.findUnique({
      where: { id: parentId },
      select: { id: true, parentId: true },
    });
    if (!parentNode) {
      throw new Error("Node not found");
    }
    subtreeRootNodeId = parentNode.id;
    parentId = parentNode.parentId;
  }

  const createdServiceEvent = await tx.serviceEvent.create({
    data: {
      vehicleId,
      nodeId: leafNodeId,
      eventDate,
      odometer: input.odometer,
      engineHours: input.engineHours,
      serviceType: input.serviceType,
      installedPartsJson:
        input.installedPartsJson === null || input.installedPartsJson === undefined
          ? Prisma.JsonNull
          : input.installedPartsJson,
      costAmount: input.costAmount ?? null,
      currency: input.currency || null,
      comment: input.comment || null,
      partSku: input.partSku,
      partName: input.partName,
    },
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
  });

  await tx.nodeState.upsert({
    where: {
      vehicleId_nodeId: {
        vehicleId,
        nodeId: leafNodeId,
      },
    },
    update: {
      status: "RECENTLY_REPLACED",
      lastServiceEventId: createdServiceEvent.id,
      note: null,
    },
    create: {
      vehicleId,
      nodeId: leafNodeId,
      status: "RECENTLY_REPLACED",
      lastServiceEventId: createdServiceEvent.id,
      note: null,
    },
  });

  const vehicleState = await tx.vehicle.findUnique({
    where: { id: vehicleId },
    select: { odometer: true, engineHours: true },
  });

  if (!vehicleState) {
    throw new Error("Vehicle not found");
  }

  const allNodes = await tx.node.findMany({
    select: { id: true, parentId: true },
  });

  const descendantIds = new Set<string>([subtreeRootNodeId]);
  let expanded = true;
  while (expanded) {
    expanded = false;
    for (const candidate of allNodes) {
      if (!candidate.parentId) {
        continue;
      }
      if (descendantIds.has(candidate.parentId) && !descendantIds.has(candidate.id)) {
        descendantIds.add(candidate.id);
        expanded = true;
      }
    }
  }

  const descendantNodeIds = [...descendantIds];
  const subtreeNodeStates = await tx.nodeState.findMany({
    where: {
      vehicleId,
      nodeId: { in: descendantNodeIds },
    },
    select: { nodeId: true, status: true },
  });
  const nodeStateByNodeId = new Map<string, { status: string | null }>(
    subtreeNodeStates.map((state) => [state.nodeId, { status: state.status }])
  );

  const nodeMaintenanceRuleModel = (tx as typeof tx & {
    nodeMaintenanceRule?: {
      findMany: typeof tx.nodeState.findMany;
    };
  }).nodeMaintenanceRule;

  const maintenanceRules = nodeMaintenanceRuleModel
    ? await nodeMaintenanceRuleModel.findMany({
        where: { nodeId: { in: descendantNodeIds } },
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

  const serviceEvents = await tx.serviceEvent.findMany({
    where: {
      vehicleId,
      nodeId: { in: descendantNodeIds },
    },
    orderBy: [{ nodeId: "asc" }, { eventDate: "desc" }, { createdAt: "desc" }],
    select: { nodeId: true, eventDate: true, odometer: true, engineHours: true },
  });
  const latestServiceEventByNodeId = new Map<string, LatestServiceEventView>();
  for (const serviceEventItem of serviceEvents) {
    if (!latestServiceEventByNodeId.has(serviceEventItem.nodeId)) {
      latestServiceEventByNodeId.set(serviceEventItem.nodeId, {
        eventDate: serviceEventItem.eventDate,
        odometer: serviceEventItem.odometer,
        engineHours: serviceEventItem.engineHours,
      });
    }
  }

  const effectiveTopNodeStatus = calculateRootEffectiveStatus({
    rootNodeId: subtreeRootNodeId,
    nodes: allNodes.map((item) => ({ id: item.id, parentId: item.parentId })),
    nodeStateByNodeId,
    maintenanceRuleByNodeId,
    latestServiceEventByNodeId,
    currentOdometer: vehicleState.odometer,
    currentEngineHours: vehicleState.engineHours,
    now: new Date(),
  });

  if (!effectiveTopNodeStatus) {
    throw new Error("Failed to calculate top node status");
  }

  const persistedTopNodeStatus =
    effectiveTopNodeStatus === "OVERDUE"
      ? TopNodeStatus.OVERDUE
      : effectiveTopNodeStatus === "SOON"
        ? TopNodeStatus.SOON
        : effectiveTopNodeStatus === "RECENTLY_REPLACED"
          ? TopNodeStatus.RECENTLY_REPLACED
          : TopNodeStatus.OK;

  const shouldLinkLastServiceEvent = persistedTopNodeStatus === TopNodeStatus.RECENTLY_REPLACED;

  await tx.topNodeState.upsert({
    where: {
      vehicleId_nodeId: {
        vehicleId,
        nodeId: subtreeRootNodeId,
      },
    },
    update: {
      status: persistedTopNodeStatus,
      lastServiceEventId: shouldLinkLastServiceEvent ? createdServiceEvent.id : null,
    },
    create: {
      vehicleId,
      nodeId: subtreeRootNodeId,
      status: persistedTopNodeStatus,
      lastServiceEventId: shouldLinkLastServiceEvent ? createdServiceEvent.id : null,
      note: null,
    },
  });

  return createdServiceEvent;
}
