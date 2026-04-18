import { NextRequest, NextResponse } from "next/server";
import {
  aggregateEffectiveStatus,
  evaluateLeafStatus,
  resolveNodeSelfEffectiveStatus,
} from "@/lib/maintenance-status";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type FlatNode = {
  id: string;
  code: string;
  name: string;
  level: number;
  displayOrder: number;
  parentId: string | null;
};

type TreeNode = {
  id: string;
  code: string;
  name: string;
  level: number;
  displayOrder: number;
  status: string | null;
  directStatus: string | null;
  computedStatus: string | null;
  effectiveStatus: string | null;
  statusExplanation: {
    reasonShort: string | null;
    reasonDetailed: string | null;
    triggerMode: string | null;
    current: {
      odometer: number | null;
      engineHours: number | null;
      date: string;
    };
    lastService: {
      eventDate: string | null;
      odometer: number | null;
      engineHours: number | null;
    } | null;
    rule: {
      intervalKm: number | null;
      intervalHours: number | null;
      intervalDays: number | null;
      warningKm: number | null;
      warningHours: number | null;
      warningDays: number | null;
    } | null;
    usage: {
      elapsedKm: number | null;
      elapsedHours: number | null;
      elapsedDays: number | null;
      remainingKm: number | null;
      remainingHours: number | null;
      remainingDays: number | null;
    } | null;
    triggeredBy: "km" | "hours" | "days" | null;
  } | null;
  note: string | null;
  updatedAt: Date | null;
  children: TreeNode[];
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

const TOP_LEVEL_NODE_CODES = new Set([
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

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      select: { id: true, odometer: true, engineHours: true },
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const nodes = await prisma.node.findMany({
      orderBy: [{ level: "asc" }, { displayOrder: "asc" }, { code: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        level: true,
        displayOrder: true,
        parentId: true,
      },
    });

    const leafNodeIds = new Set<string>();
    const parentNodeIds = new Set<string>();

    for (const node of nodes) {
      if (node.parentId) {
        parentNodeIds.add(node.parentId);
      }
    }

    for (const node of nodes) {
      if (!parentNodeIds.has(node.id)) {
        leafNodeIds.add(node.id);
      }
    }

    const nodeMaintenanceRuleModel = (prisma as typeof prisma & {
      nodeMaintenanceRule?: {
        findMany: typeof prisma.nodeState.findMany;
      };
    }).nodeMaintenanceRule;

    const [nodeStates, maintenanceRules, serviceEvents] = await Promise.all([
      prisma.nodeState.findMany({
        where: { vehicleId: id },
        select: {
          nodeId: true,
          status: true,
          note: true,
          updatedAt: true,
        },
      }),
      nodeMaintenanceRuleModel
        ? nodeMaintenanceRuleModel.findMany({
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
        : Promise.resolve([]),
      prisma.serviceEvent.findMany({
        where: {
          vehicleId: id,
          nodeId: { in: [...leafNodeIds] },
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

    const nodeStateByNodeId = new Map<string, NodeStateView>(
      nodeStates.map((state) => [
        state.nodeId,
        {
          status: state.status,
          note: state.note,
          updatedAt: state.updatedAt,
        },
      ])
    );

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

    const latestServiceEventByNodeId = new Map<string, LatestServiceEventView>();
    for (const serviceEvent of serviceEvents) {
      if (!latestServiceEventByNodeId.has(serviceEvent.nodeId)) {
        latestServiceEventByNodeId.set(serviceEvent.nodeId, {
          eventDate: serviceEvent.eventDate,
          odometer: serviceEvent.odometer,
          engineHours: serviceEvent.engineHours,
        });
      }
    }

    const childrenByParentId = new Map<string, FlatNode[]>();

    for (const node of nodes) {
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

    const buildChildren = (parentId: string): TreeNode[] => {
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
        children: buildChildren(child.id),
      }));
    };

    const topLevelNodes = nodes
      .filter(
        (node) =>
          node.level === 1 &&
          node.parentId === null &&
          TOP_LEVEL_NODE_CODES.has(node.code)
      )
      .sort((a, b) => a.displayOrder - b.displayOrder);

    const now = new Date();

    const applyStatuses = (node: TreeNode): TreeNode => {
      const childrenWithStatuses = node.children.map(applyStatuses);
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
    };

    const nodeTree = topLevelNodes.map((node) =>
      applyStatuses({
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
        children: buildChildren(node.id),
      })
    );

    return NextResponse.json({ nodeTree });
  } catch (error) {
    console.error("Failed to fetch node tree:", error);
    return NextResponse.json(
      { error: "Failed to fetch node tree" },
      { status: 500 }
    );
  }
}
