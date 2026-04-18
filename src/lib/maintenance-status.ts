export type MaintenanceStatus = "OVERDUE" | "SOON" | "RECENTLY_REPLACED" | "OK";

export type NodeStatusExplanation = {
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
};

export type NodeMaintenanceRuleView = {
  triggerMode: string;
  intervalKm: number | null;
  intervalHours: number | null;
  intervalDays: number | null;
  warningKm: number | null;
  warningHours: number | null;
  warningDays: number | null;
  isActive: boolean;
};

export type LatestServiceEventView = {
  eventDate: Date;
  odometer: number;
  engineHours: number | null;
};

const STATUS_PRIORITY: MaintenanceStatus[] = [
  "OVERDUE",
  "SOON",
  "RECENTLY_REPLACED",
  "OK",
];
const MS_IN_DAY = 24 * 60 * 60 * 1000;

export function pickHigherPriorityStatus(
  left: string | null,
  right: string | null
): string | null {
  if (!left) {
    return right;
  }
  if (!right) {
    return left;
  }

  const leftPriority = STATUS_PRIORITY.indexOf(left as MaintenanceStatus);
  const rightPriority = STATUS_PRIORITY.indexOf(right as MaintenanceStatus);

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
}

function getReasonShort(
  status: string | null,
  triggeredBy: "km" | "hours" | "days" | null
): string | null {
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
}

export function evaluateLeafStatus(args: {
  rule: NodeMaintenanceRuleView | undefined;
  latestServiceEvent: LatestServiceEventView | undefined;
  currentOdometer: number;
  currentEngineHours: number | null;
  now: Date;
}): {
  computedStatus: string | null;
  statusExplanation: NodeStatusExplanation;
} {
  const { rule, latestServiceEvent, currentOdometer, currentEngineHours, now } = args;

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

  if (!rule.isActive) {
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
        reasonDetailed: "Нет сервисного события для узла, расчет статуса пока недоступен",
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
    rule.intervalKm !== null ? Math.max(0, currentOdometer - latestServiceEvent.odometer) : null;
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
        reasonDetailed: "Недостаточно данных для расчета: активные размерности не удалось вычислить",
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
      triggeredBy = intervalExceededBy.km ? "km" : intervalExceededBy.hours ? "hours" : "days";
    } else if (warningReachedChecks.length > 0 && warningReachedChecks.every(Boolean)) {
      computedStatus = "SOON";
      triggeredBy = warningReachedBy.km ? "km" : warningReachedBy.hours ? "hours" : "days";
    }
  } else {
    if (intervalExceededChecks.some(Boolean)) {
      computedStatus = "OVERDUE";
      triggeredBy = intervalExceededBy.km
        ? "km"
        : intervalExceededBy.hours
          ? "hours"
          : intervalExceededBy.days
            ? "days"
            : null;
    } else if (warningReachedChecks.some(Boolean)) {
      computedStatus = "SOON";
      triggeredBy = warningReachedBy.km
        ? "km"
        : warningReachedBy.hours
          ? "hours"
          : warningReachedBy.days
            ? "days"
            : null;
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
}

export function resolveNodeSelfEffectiveStatus(args: {
  isLeaf: boolean;
  directStatus: string | null;
  computedStatus: string | null;
}): string | null {
  const { isLeaf, directStatus, computedStatus } = args;

  if (!isLeaf) {
    return directStatus;
  }

  if (computedStatus === "OVERDUE" || computedStatus === "SOON") {
    return computedStatus;
  }

  if (directStatus === "RECENTLY_REPLACED" && (computedStatus === "OK" || computedStatus === null)) {
    return "RECENTLY_REPLACED";
  }

  return computedStatus ?? directStatus;
}

/**
 * Rolls up child statuses with the node's own effective status.
 * If there is no direct/computed/child evidence anywhere, the result stays `null`
 * (do not substitute OK — callers must not treat null as “healthy”).
 */
export function aggregateEffectiveStatus(
  nodeSelfEffectiveStatus: string | null,
  childStatuses: Array<string | null>
): string | null {
  let effectiveStatus = nodeSelfEffectiveStatus;

  for (const childStatus of childStatuses) {
    effectiveStatus = pickHigherPriorityStatus(effectiveStatus, childStatus);
  }

  return effectiveStatus;
}

export function calculateRootEffectiveStatus(args: {
  rootNodeId: string;
  nodes: Array<{ id: string; parentId: string | null }>;
  nodeStateByNodeId: Map<string, { status: string | null }>;
  maintenanceRuleByNodeId: Map<string, NodeMaintenanceRuleView>;
  latestServiceEventByNodeId: Map<string, LatestServiceEventView>;
  currentOdometer: number;
  currentEngineHours: number | null;
  now: Date;
}): string | null {
  const {
    rootNodeId,
    nodes,
    nodeStateByNodeId,
    maintenanceRuleByNodeId,
    latestServiceEventByNodeId,
    currentOdometer,
    currentEngineHours,
    now,
  } = args;

  const childrenByParentId = new Map<string, string[]>();
  for (const node of nodes) {
    if (!node.parentId) {
      continue;
    }
    const siblings = childrenByParentId.get(node.parentId) ?? [];
    siblings.push(node.id);
    childrenByParentId.set(node.parentId, siblings);
  }

  const evaluateNode = (nodeId: string): string | null => {
    const childIds = childrenByParentId.get(nodeId) ?? [];
    const directStatus = nodeStateByNodeId.get(nodeId)?.status ?? null;
    const isLeaf = childIds.length === 0;

    let computedStatus: string | null = null;
    if (isLeaf) {
      computedStatus = evaluateLeafStatus({
        rule: maintenanceRuleByNodeId.get(nodeId),
        latestServiceEvent: latestServiceEventByNodeId.get(nodeId),
        currentOdometer,
        currentEngineHours,
        now,
      }).computedStatus;
    }

    const nodeSelfEffectiveStatus = resolveNodeSelfEffectiveStatus({
      isLeaf,
      directStatus,
      computedStatus,
    });

    const childStatuses = childIds.map((childId) => evaluateNode(childId));
    return aggregateEffectiveStatus(nodeSelfEffectiveStatus, childStatuses);
  };

  return evaluateNode(rootNodeId);
}

export function calculateAllRootEffectiveStatuses(args: {
  nodes: Array<{ id: string; parentId: string | null }>;
  nodeStateByNodeId: Map<string, { status: string | null }>;
  maintenanceRuleByNodeId: Map<string, NodeMaintenanceRuleView>;
  latestServiceEventByNodeId: Map<string, LatestServiceEventView>;
  currentOdometer: number;
  currentEngineHours: number | null;
  now: Date;
}): Array<{ rootNodeId: string; effectiveStatus: string | null }> {
  const { nodes } = args;
  const rootNodes = nodes.filter((node) => node.parentId === null);

  return rootNodes.map((rootNode) => ({
    rootNodeId: rootNode.id,
    effectiveStatus: calculateRootEffectiveStatus({
      rootNodeId: rootNode.id,
      nodes: args.nodes,
      nodeStateByNodeId: args.nodeStateByNodeId,
      maintenanceRuleByNodeId: args.maintenanceRuleByNodeId,
      latestServiceEventByNodeId: args.latestServiceEventByNodeId,
      currentOdometer: args.currentOdometer,
      currentEngineHours: args.currentEngineHours,
      now: args.now,
    }),
  }));
}
