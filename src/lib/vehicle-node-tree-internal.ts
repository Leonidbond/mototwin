import { buildAttentionSummaryFromNodeTree } from "@mototwin/domain";
import type { NodeStatus, NodeTreeItem } from "@mototwin/types";
import {
  aggregateEffectiveStatus,
  evaluateLeafStatus,
  resolveNodeSelfEffectiveStatus,
} from "@/lib/maintenance-status";
import type { PrismaClient } from "@prisma/client";

export const TOP_LEVEL_NODE_CODES = new Set([
  "ENGINE",
  "FUEL",
  "COOLING",
  "EXHAUST",
  "ELECTRICS",
  "CHASSIS",
  "STEERING",
  "SUSPENSION",
  "WHEELS",
  "BRAKES",
  "DRIVETRAIN",
  "CONTROLS",
]);

type FlatNode = {
  id: string;
  code: string;
  name: string;
  level: number;
  displayOrder: number;
  parentId: string | null;
};

type CatalogNodeRow = FlatNode & {
  isServiceRelevant: boolean;
};

export type MaintenanceTreeNode = {
  id: string;
  code: string;
  name: string;
  level: number;
  displayOrder: number;
  status: string | null;
  directStatus: string | null;
  computedStatus: string | null;
  effectiveStatus: string | null;
  statusExplanation: unknown;
  note: string | null;
  updatedAt: Date | null;
  children: MaintenanceTreeNode[];
};

type NodeStateView = {
  status: string;
  note: string | null;
  updatedAt: Date;
};

type NodeMaintenanceRuleView = {
  triggerMode: string;
  intervalKm: number | null;
  intervalHours: number | null;
  intervalDays: number | null;
  warningKm: number | null;
  warningHours: number | null;
  warningDays: number | null;
  isActive: boolean;
};

type LatestServiceEventView = {
  eventDate: Date;
  odometer: number;
  engineHours: number | null;
};

export type CatalogNodeContext = {
  leafNodeIds: Set<string>;
  maintenanceRuleByNodeId: Map<string, NodeMaintenanceRuleView>;
  childrenByParentId: Map<string, FlatNode[]>;
  topLevelNodes: FlatNode[];
};

function getNodeMaintenanceRuleModel(prisma: PrismaClient) {
  return (prisma as typeof prisma & {
    nodeMaintenanceRule?: {
      findMany: typeof prisma.nodeState.findMany;
    };
  }).nodeMaintenanceRule;
}

export async function loadCatalogNodeContext(
  prisma: PrismaClient
): Promise<CatalogNodeContext> {
  const nodes = await prisma.node.findMany({
    where: {
      isActive: true,
    },
    orderBy: [{ level: "asc" }, { displayOrder: "asc" }, { code: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      level: true,
      displayOrder: true,
      parentId: true,
      isServiceRelevant: true,
    },
  });

  const nodeIdByCode = new Map(nodes.map((node) => [node.code, node.id]));
  const wheelsFrontId = nodeIdByCode.get("WHEELS.FRONT") ?? null;
  const wheelsRearId = nodeIdByCode.get("WHEELS.REAR") ?? null;
  const remappedNodes = nodes.map((node) => {
    if (node.code === "TIRES.FRONT" && wheelsFrontId) {
      return { ...node, parentId: wheelsFrontId };
    }
    if ((node.code === "TIRES.REAR" || node.code === "TIRES.RIMLOCK") && wheelsRearId) {
      return { ...node, parentId: wheelsRearId };
    }
    return node;
  });
  const effectiveNodes = remappedNodes;

  const parentNodeIds = new Set<string>();
  for (const node of effectiveNodes) {
    if (node.parentId) {
      parentNodeIds.add(node.parentId);
    }
  }

  const leafNodeIds = new Set<string>();
  for (const node of effectiveNodes) {
    if (!parentNodeIds.has(node.id)) {
      leafNodeIds.add(node.id);
    }
  }

  const nodeMaintenanceRuleModel = getNodeMaintenanceRuleModel(prisma);

  const maintenanceRules = nodeMaintenanceRuleModel
    ? await nodeMaintenanceRuleModel.findMany({
        where: {
          nodeId: { in: [...leafNodeIds] },
        },
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

  const childrenByParentId = new Map<string, FlatNode[]>();
  for (const node of effectiveNodes) {
    if (!node.parentId) {
      continue;
    }
    const siblings = childrenByParentId.get(node.parentId) ?? [];
    siblings.push(node);
    childrenByParentId.set(node.parentId, siblings);
  }

  for (const children of childrenByParentId.values()) {
    children.sort((a, b) => a.displayOrder - b.displayOrder);
  }

  const topLevelNodes = effectiveNodes
    .filter(
      (node) =>
        node.level === 1 &&
        node.parentId === null &&
        TOP_LEVEL_NODE_CODES.has(node.code)
    )
    .sort((a, b) => a.displayOrder - b.displayOrder);

  return {
    leafNodeIds,
    maintenanceRuleByNodeId,
    childrenByParentId,
    topLevelNodes,
  };
}

function buildChildrenSkeleton(
  parentId: string,
  childrenByParentId: Map<string, FlatNode[]>
): MaintenanceTreeNode[] {
  const children = childrenByParentId.get(parentId) ?? [];
  return children.map((child) => ({
    id: child.id,
    code: child.code,
    name: child.name,
    level: child.level,
    displayOrder: child.displayOrder,
    status: null,
    directStatus: null,
    computedStatus: null,
    effectiveStatus: null,
    statusExplanation: null,
    note: null,
    updatedAt: null,
    children: buildChildrenSkeleton(child.id, childrenByParentId),
  }));
}

export function buildSkeletonRoots(ctx: CatalogNodeContext): MaintenanceTreeNode[] {
  return ctx.topLevelNodes.map((node) => ({
    id: node.id,
    code: node.code,
    name: node.name,
    level: node.level,
    displayOrder: node.displayOrder,
    status: null,
    directStatus: null,
    computedStatus: null,
    effectiveStatus: null,
    statusExplanation: null,
    note: null,
    updatedAt: null,
    children: buildChildrenSkeleton(node.id, ctx.childrenByParentId),
  }));
}

function applyStatuses(
  node: MaintenanceTreeNode,
  vehicle: { odometer: number; engineHours: number | null },
  nodeStateByNodeId: Map<string, NodeStateView>,
  maintenanceRuleByNodeId: Map<string, NodeMaintenanceRuleView>,
  latestServiceEventByNodeId: Map<string, LatestServiceEventView>,
  now: Date
): MaintenanceTreeNode {
  const childrenWithStatuses = node.children.map((c) =>
    applyStatuses(c, vehicle, nodeStateByNodeId, maintenanceRuleByNodeId, latestServiceEventByNodeId, now)
  );
  const directState = nodeStateByNodeId.get(node.id);
  const directStatus = directState?.status ?? null;
  const isLeaf = childrenWithStatuses.length === 0;
  const leafStatusEvaluation = isLeaf
    ? evaluateLeafStatus({
        rule: maintenanceRuleByNodeId.get(node.id),
        latestServiceEvent: latestServiceEventByNodeId.get(node.id),
        currentOdometer: vehicle.odometer,
        currentEngineHours: vehicle.engineHours,
        now,
      })
    : null;
  const computedStatus = leafStatusEvaluation?.computedStatus ?? null;

  const nodeSelfEffectiveStatus = resolveNodeSelfEffectiveStatus({
    isLeaf,
    directStatus,
    computedStatus,
  });

  const effectiveStatus = aggregateEffectiveStatus(
    nodeSelfEffectiveStatus,
    childrenWithStatuses.map((child) => child.effectiveStatus)
  );

  return {
    ...node,
    status: effectiveStatus,
    directStatus,
    computedStatus,
    effectiveStatus,
    statusExplanation: leafStatusEvaluation?.statusExplanation ?? null,
    note: directState?.note ?? null,
    updatedAt: directState?.updatedAt ?? null,
    children: childrenWithStatuses,
  };
}

export function buildMaintainedTreeForVehicle(
  skeletonRoots: MaintenanceTreeNode[],
  vehicle: { odometer: number; engineHours: number | null },
  nodeStateByNodeId: Map<string, NodeStateView>,
  maintenanceRuleByNodeId: Map<string, NodeMaintenanceRuleView>,
  latestServiceEventByNodeId: Map<string, LatestServiceEventView>,
  now: Date
): MaintenanceTreeNode[] {
  return skeletonRoots.map((root) =>
    applyStatuses(root, vehicle, nodeStateByNodeId, maintenanceRuleByNodeId, latestServiceEventByNodeId, now)
  );
}

function maintenanceNodeToNodeTreeItem(node: MaintenanceTreeNode): NodeTreeItem {
  return {
    id: node.id,
    code: node.code,
    name: node.name,
    level: node.level,
    displayOrder: node.displayOrder,
    status: (node.status as NodeStatus) ?? null,
    directStatus: (node.directStatus as NodeStatus) ?? null,
    computedStatus: (node.computedStatus as NodeStatus) ?? null,
    effectiveStatus: (node.effectiveStatus as NodeStatus) ?? null,
    statusExplanation: null,
    note: node.note,
    updatedAt: null,
    children: node.children.map(maintenanceNodeToNodeTreeItem),
  };
}

export function attentionSummaryCountsFromMaintenanceRoots(roots: MaintenanceTreeNode[]): {
  totalCount: number;
  overdueCount: number;
  soonCount: number;
} {
  const domainRoots = roots.map(maintenanceNodeToNodeTreeItem);
  const summary = buildAttentionSummaryFromNodeTree(domainRoots);
  return {
    totalCount: summary.totalCount,
    overdueCount: summary.overdueCount,
    soonCount: summary.soonCount,
  };
}

function mapNodeStates(rows: { nodeId: string; status: string; note: string | null; updatedAt: Date }[]) {
  return new Map<string, NodeStateView>(
    rows.map((state) => [
      state.nodeId,
      {
        status: state.status,
        note: state.note,
        updatedAt: state.updatedAt,
      },
    ])
  );
}

function latestEventsByNodeFromRows(
  rows: {
    nodeId: string;
    eventDate: Date;
    odometer: number;
    engineHours: number | null;
  }[]
) {
  const latestServiceEventByNodeId = new Map<string, LatestServiceEventView>();
  for (const serviceEvent of rows) {
    if (!latestServiceEventByNodeId.has(serviceEvent.nodeId)) {
      latestServiceEventByNodeId.set(serviceEvent.nodeId, {
        eventDate: serviceEvent.eventDate,
        odometer: serviceEvent.odometer,
        engineHours: serviceEvent.engineHours,
      });
    }
  }
  return latestServiceEventByNodeId;
}

export async function loadVehicleNodeTreeJson(
  prisma: PrismaClient,
  vehicleId: string
): Promise<{ nodeTree: MaintenanceTreeNode[] } | { error: string; status: number }> {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { id: true, odometer: true, engineHours: true },
  });

  if (!vehicle) {
    return { error: "Vehicle not found", status: 404 };
  }

  const ctx = await loadCatalogNodeContext(prisma);

  const [nodeStates, serviceEvents] = await Promise.all([
    prisma.nodeState.findMany({
      where: { vehicleId },
      select: {
        nodeId: true,
        status: true,
        note: true,
        updatedAt: true,
      },
    }),
    prisma.serviceEvent.findMany({
      where: {
        vehicleId,
        nodeId: { in: [...ctx.leafNodeIds] },
      },
      orderBy: [{ nodeId: "asc" }, { eventDate: "desc" }, { createdAt: "desc" }],
      select: {
        nodeId: true,
        eventDate: true,
        odometer: true,
        engineHours: true,
      },
    }),
  ]);

  const nodeStateByNodeId = mapNodeStates(nodeStates);
  const latestServiceEventByNodeId = latestEventsByNodeFromRows(serviceEvents);
  const skeleton = buildSkeletonRoots(ctx);
  const now = new Date();
  const nodeTree = buildMaintainedTreeForVehicle(
    skeleton,
    vehicle,
    nodeStateByNodeId,
    ctx.maintenanceRuleByNodeId,
    latestServiceEventByNodeId,
    now
  );

  return { nodeTree };
}

export async function computeGarageAttentionByVehicleId(
  prisma: PrismaClient,
  vehicles: Array<{ id: string; odometer: number; engineHours: number | null }>
): Promise<Map<string, { totalCount: number; overdueCount: number; soonCount: number }>> {
  const out = new Map<string, { totalCount: number; overdueCount: number; soonCount: number }>();
  if (vehicles.length === 0) {
    return out;
  }

  const ctx = await loadCatalogNodeContext(prisma);
  const vehicleIds = vehicles.map((v) => v.id);

  const [allNodeStates, allServiceEvents] = await Promise.all([
    prisma.nodeState.findMany({
      where: { vehicleId: { in: vehicleIds } },
      select: {
        vehicleId: true,
        nodeId: true,
        status: true,
        note: true,
        updatedAt: true,
      },
    }),
    prisma.serviceEvent.findMany({
      where: {
        vehicleId: { in: vehicleIds },
        nodeId: { in: [...ctx.leafNodeIds] },
      },
      orderBy: [
        { vehicleId: "asc" },
        { nodeId: "asc" },
        { eventDate: "desc" },
        { createdAt: "desc" },
      ],
      select: {
        vehicleId: true,
        nodeId: true,
        eventDate: true,
        odometer: true,
        engineHours: true,
      },
    }),
  ]);

  const statesByVehicle = new Map<string, typeof allNodeStates>();
  for (const row of allNodeStates) {
    const list = statesByVehicle.get(row.vehicleId) ?? [];
    list.push(row);
    statesByVehicle.set(row.vehicleId, list);
  }

  const eventsByVehicle = new Map<string, typeof allServiceEvents>();
  for (const row of allServiceEvents) {
    const list = eventsByVehicle.get(row.vehicleId) ?? [];
    list.push(row);
    eventsByVehicle.set(row.vehicleId, list);
  }

  const skeleton = buildSkeletonRoots(ctx);
  const now = new Date();

  for (const vehicle of vehicles) {
    const stateRows = statesByVehicle.get(vehicle.id) ?? [];
    const nodeStateByNodeId = mapNodeStates(
      stateRows.map((s) => ({
        nodeId: s.nodeId,
        status: s.status,
        note: s.note,
        updatedAt: s.updatedAt,
      }))
    );
    const eventRows = eventsByVehicle.get(vehicle.id) ?? [];
    const latestServiceEventByNodeId = latestEventsByNodeFromRows(eventRows);

    const nodeTree = buildMaintainedTreeForVehicle(
      skeleton,
      vehicle,
      nodeStateByNodeId,
      ctx.maintenanceRuleByNodeId,
      latestServiceEventByNodeId,
      now
    );

    out.set(vehicle.id, attentionSummaryCountsFromMaintenanceRoots(nodeTree));
  }

  return out;
}
