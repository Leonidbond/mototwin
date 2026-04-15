import { NextRequest, NextResponse } from "next/server";
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

const STATUS_PRIORITY = ["OVERDUE", "SOON", "RECENTLY_REPLACED", "OK"] as const;

const pickHigherPriorityStatus = (
  left: string | null,
  right: string | null
): string | null => {
  if (!left) {
    return right;
  }

  if (!right) {
    return left;
  }

  const leftPriority = STATUS_PRIORITY.indexOf(left as (typeof STATUS_PRIORITY)[number]);
  const rightPriority = STATUS_PRIORITY.indexOf(right as (typeof STATUS_PRIORITY)[number]);

  if (leftPriority === -1 && rightPriority === -1) {
    return left;
  }

  if (leftPriority === -1) {
    return right;
  }

  if (rightPriority === -1) {
    return left;
  }

  return leftPriority <= rightPriority ? left : right;
};

const MS_IN_DAY = 24 * 60 * 60 * 1000;

const getReasonShort = (
  status: string | null,
  triggeredBy: "km" | "hours" | "days" | null
): string | null => {
  if (!status || !triggeredBy) {
    return null;
  }

  const dimensionText =
    triggeredBy === "km"
      ? "по пробегу"
      : triggeredBy === "hours"
        ? "по моточасам"
        : "по времени";

  if (status === "SOON") {
    return `Скоро ${dimensionText}`;
  }

  if (status === "OVERDUE") {
    return `Просрочено ${dimensionText}`;
  }

  return null;
};

const evaluateLeafStatus = ({
  nodeCode,
  rule,
  latestServiceEvent,
  currentOdometer,
  currentEngineHours,
  now,
}: {
  nodeCode: string;
  rule: NodeMaintenanceRuleView | undefined;
  latestServiceEvent: LatestServiceEventView | undefined;
  currentOdometer: number;
  currentEngineHours: number | null;
  now: Date;
}): {
  computedStatus: string | null;
  statusExplanation: TreeNode["statusExplanation"];
} => {
  const current = {
    odometer: currentOdometer,
    engineHours: currentEngineHours,
    date: now.toISOString(),
  };

  if (!rule) {
    return {
      computedStatus: null,
      statusExplanation: {
        reasonShort: null,
        reasonDetailed: "Нет правила обслуживания",
        triggerMode: null,
        current,
        lastService: latestServiceEvent
          ? {
              eventDate: latestServiceEvent.eventDate.toISOString(),
              odometer: latestServiceEvent.odometer,
              engineHours: latestServiceEvent.engineHours,
            }
          : null,
        rule: null,
        usage: null,
        triggeredBy: null,
      },
    };
  }

  if (!rule || !rule.isActive) {
    return {
      computedStatus: null,
      statusExplanation: {
        reasonShort: null,
        reasonDetailed: "Правило обслуживания неактивно",
        triggerMode: rule.triggerMode,
        current,
        lastService: latestServiceEvent
          ? {
              eventDate: latestServiceEvent.eventDate.toISOString(),
              odometer: latestServiceEvent.odometer,
              engineHours: latestServiceEvent.engineHours,
            }
          : null,
        rule: {
          intervalKm: rule.intervalKm,
          intervalHours: rule.intervalHours,
          intervalDays: rule.intervalDays,
          warningKm: rule.warningKm,
          warningHours: rule.warningHours,
          warningDays: rule.warningDays,
        },
        usage: null,
        triggeredBy: null,
      },
    };
  }

  if (!latestServiceEvent) {
    return {
      computedStatus: null,
      statusExplanation: {
        reasonShort: null,
        reasonDetailed:
          "Нет сервисного события для узла, расчет статуса пока недоступен",
        triggerMode: rule.triggerMode,
        current,
        lastService: null,
        rule: {
          intervalKm: rule.intervalKm,
          intervalHours: rule.intervalHours,
          intervalDays: rule.intervalDays,
          warningKm: rule.warningKm,
          warningHours: rule.warningHours,
          warningDays: rule.warningDays,
        },
        usage: null,
        triggeredBy: null,
      },
    };
  }

  const elapsedKm =
    rule.intervalKm !== null
      ? Math.max(0, currentOdometer - latestServiceEvent.odometer)
      : null;
  const elapsedHours =
    rule.intervalHours !== null &&
    currentEngineHours !== null &&
    latestServiceEvent.engineHours !== null
      ? Math.max(0, currentEngineHours - latestServiceEvent.engineHours)
      : null;
  const elapsedDays =
    rule.intervalDays !== null
      ? Math.max(
          0,
          Math.floor((now.getTime() - latestServiceEvent.eventDate.getTime()) / MS_IN_DAY)
        )
      : null;

  const remainingKm =
    elapsedKm !== null && rule.intervalKm !== null ? rule.intervalKm - elapsedKm : null;
  const remainingHours =
    elapsedHours !== null && rule.intervalHours !== null
      ? rule.intervalHours - elapsedHours
      : null;
  const remainingDays =
    elapsedDays !== null && rule.intervalDays !== null ? rule.intervalDays - elapsedDays : null;

  const intervalExceededBy = {
    km: elapsedKm !== null && rule.intervalKm !== null ? elapsedKm >= rule.intervalKm : false,
    hours:
      elapsedHours !== null && rule.intervalHours !== null
        ? elapsedHours >= rule.intervalHours
        : false,
    days:
      elapsedDays !== null && rule.intervalDays !== null ? elapsedDays >= rule.intervalDays : false,
  };

  const warningReachedBy = {
    km:
      elapsedKm !== null && rule.intervalKm !== null && rule.warningKm !== null
        ? elapsedKm >= Math.max(0, rule.intervalKm - rule.warningKm)
        : false,
    hours:
      elapsedHours !== null && rule.intervalHours !== null && rule.warningHours !== null
        ? elapsedHours >= Math.max(0, rule.intervalHours - rule.warningHours)
        : false,
    days:
      elapsedDays !== null && rule.intervalDays !== null && rule.warningDays !== null
        ? elapsedDays >= Math.max(0, rule.intervalDays - rule.warningDays)
        : false,
  };

  const intervalExceededChecks = Object.values(intervalExceededBy);
  const warningReachedChecks = Object.values(warningReachedBy);
  if (intervalExceededChecks.length === 0) {
    return {
      computedStatus: null,
      statusExplanation: {
        reasonShort: null,
        reasonDetailed:
          "Недостаточно данных для расчета: активные размерности не удалось вычислить",
        triggerMode: rule.triggerMode,
        current,
        lastService: {
          eventDate: latestServiceEvent.eventDate.toISOString(),
          odometer: latestServiceEvent.odometer,
          engineHours: latestServiceEvent.engineHours,
        },
        rule: {
          intervalKm: rule.intervalKm,
          intervalHours: rule.intervalHours,
          intervalDays: rule.intervalDays,
          warningKm: rule.warningKm,
          warningHours: rule.warningHours,
          warningDays: rule.warningDays,
        },
        usage: {
          elapsedKm,
          elapsedHours,
          elapsedDays,
          remainingKm,
          remainingHours,
          remainingDays,
        },
        triggeredBy: null,
      },
    };
  }

  let computedStatus: string = "OK";
  let triggeredBy: "km" | "hours" | "days" | null = null;

  if (rule.triggerMode === "ALL") {
    if (intervalExceededChecks.every(Boolean)) {
      computedStatus = "OVERDUE";
      triggeredBy =
        intervalExceededBy.km ? "km" : intervalExceededBy.hours ? "hours" : "days";
    } else if (warningReachedChecks.length > 0 && warningReachedChecks.every(Boolean)) {
      computedStatus = "SOON";
      triggeredBy = warningReachedBy.km ? "km" : warningReachedBy.hours ? "hours" : "days";
    }
  } else {
    // MVP main mode: WHICHEVER_COMES_FIRST (ANY behaves the same)
    if (intervalExceededChecks.some(Boolean)) {
      computedStatus = "OVERDUE";
      triggeredBy =
        intervalExceededBy.km ? "km" : intervalExceededBy.hours ? "hours" : intervalExceededBy.days ? "days" : null;
    } else if (warningReachedChecks.some(Boolean)) {
      computedStatus = "SOON";
      triggeredBy =
        warningReachedBy.km ? "km" : warningReachedBy.hours ? "hours" : warningReachedBy.days ? "days" : null;
    }
  }

  const reasonShort = getReasonShort(computedStatus, triggeredBy);
  let reasonDetailed: string | null = null;
  if (computedStatus === "OVERDUE") {
    reasonDetailed =
      triggeredBy === "km"
        ? `Превышен интервал по пробегу: ${elapsedKm} км при лимите ${rule.intervalKm} км`
        : triggeredBy === "hours"
          ? `Превышен интервал по моточасам: ${elapsedHours} ч при лимите ${rule.intervalHours} ч`
          : triggeredBy === "days"
            ? `Превышен интервал по времени: ${elapsedDays} дн при лимите ${rule.intervalDays} дн`
            : "Превышен интервал обслуживания";
  } else if (computedStatus === "SOON") {
    reasonDetailed =
      triggeredBy === "km"
        ? `До лимита по пробегу осталось ${remainingKm} км (warning ${rule.warningKm} км)`
        : triggeredBy === "hours"
          ? `До лимита по моточасам осталось ${remainingHours} ч (warning ${rule.warningHours} ч)`
          : triggeredBy === "days"
            ? `До лимита по времени осталось ${remainingDays} дн (warning ${rule.warningDays} дн)`
            : "Узел вошел в warning-зону";
  } else if (computedStatus === "OK") {
    reasonDetailed = "Ресурс в норме, warning-порог не достигнут";
  }

  return {
    computedStatus,
    statusExplanation: {
      reasonShort,
      reasonDetailed,
      triggerMode: rule.triggerMode,
      current,
      lastService: {
        eventDate: latestServiceEvent.eventDate.toISOString(),
        odometer: latestServiceEvent.odometer,
        engineHours: latestServiceEvent.engineHours,
      },
      rule: {
        intervalKm: rule.intervalKm,
        intervalHours: rule.intervalHours,
        intervalDays: rule.intervalDays,
        warningKm: rule.warningKm,
        warningHours: rule.warningHours,
        warningDays: rule.warningDays,
      },
      usage: {
        elapsedKm,
        elapsedHours,
        elapsedDays,
        remainingKm,
        remainingHours,
        remainingDays,
      },
      triggeredBy,
    },
  };
};

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
            nodeCode: node.code,
            rule: maintenanceRuleByNodeId.get(node.id),
            latestServiceEvent: latestServiceEventByNodeId.get(node.id),
            currentOdometer: vehicle.odometer,
            currentEngineHours: vehicle.engineHours,
            now,
          })
        : null;
      const computedStatus = leafStatusEvaluation?.computedStatus ?? null;

      let nodeSelfEffectiveStatus = directStatus;
      if (isLeaf) {
        if (computedStatus === "OVERDUE" || computedStatus === "SOON") {
          nodeSelfEffectiveStatus = computedStatus;
        } else if (
          directStatus === "RECENTLY_REPLACED" &&
          (computedStatus === "OK" || computedStatus === null)
        ) {
          nodeSelfEffectiveStatus = "RECENTLY_REPLACED";
        } else {
          nodeSelfEffectiveStatus = computedStatus ?? directStatus;
        }
      }

      let effectiveStatus = nodeSelfEffectiveStatus;

      for (const child of childrenWithStatuses) {
        effectiveStatus = pickHigherPriorityStatus(
          effectiveStatus,
          child.effectiveStatus
        );
      }

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
