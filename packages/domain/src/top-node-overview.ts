import type { NodeStatus, TopNodeOverviewCard, TopServiceNodeItem } from "@mototwin/types";
import { getNodeStatusLabel, getNodeStatusPriority } from "./status";

const TOP_NODE_GROUP_DEFINITIONS: Array<{
  key: TopNodeOverviewCard["key"];
  title: string;
  codes: string[];
}> = [
  {
    key: "lubrication",
    title: "Смазка",
    codes: ["ENGINE.LUBE.OIL", "ENGINE.LUBE.FILTER"],
  },
  {
    key: "engine",
    title: "Двигатель / охлаждение",
    codes: ["INTAKE.FILTER", "ELECTRICS.IGNITION.SPARK", "COOLING.LIQUID.COOLANT"],
  },
  {
    key: "brakes",
    title: "Тормоза",
    codes: ["BRAKES.FRONT.PADS", "BRAKES.REAR.PADS", "BRAKES.FLUID"],
  },
  {
    key: "tires",
    title: "Шины",
    codes: ["TIRES.FRONT", "TIRES.REAR"],
  },
  {
    key: "chain",
    title: "Цепь / звезды",
    codes: ["DRIVETRAIN.CHAIN", "DRIVETRAIN.FRONT_SPROCKET", "DRIVETRAIN.REAR_SPROCKET"],
  },
  {
    key: "suspension",
    title: "Подвеска",
    codes: ["SUSPENSION.FRONT.SEALS", "SUSPENSION.FRONT.OIL"],
  },
];

function pickAggregateStatus(statuses: NodeStatus[]): NodeStatus | null {
  if (!statuses.length) {
    return null;
  }
  return statuses.sort((a, b) => getNodeStatusPriority(b) - getNodeStatusPriority(a))[0] ?? null;
}

export function buildTopNodeOverviewCards(
  nodes: TopServiceNodeItem[],
  statusByCode: Map<string, NodeStatus | null>
): TopNodeOverviewCard[] {
  const nodeByCode = new Map(nodes.map((node) => [node.code, node]));
  const availableCodes = new Set(nodeByCode.keys());

  return TOP_NODE_GROUP_DEFINITIONS.map((group) => {
    const nodeCodes = group.codes.filter((code) => availableCodes.has(code));
    const cardNodes = nodeCodes.map((code) => {
      const node = nodeByCode.get(code);
      const nodeStatus = statusByCode.get(code) ?? null;
      return {
        id: node?.id ?? code,
        code,
        name: node?.name ?? code,
        status: nodeStatus,
        statusLabel: nodeStatus ? getNodeStatusLabel(nodeStatus) : "Нет данных",
      };
    });
    const statuses = nodeCodes
      .map((code) => statusByCode.get(code))
      .filter((status): status is NodeStatus => Boolean(status));
    const status = pickAggregateStatus(statuses);
    const statusLabel = status ? getNodeStatusLabel(status) : "Нет данных";
    const details =
      nodeCodes.length > 0
        ? `${nodeCodes.length} узл. в группе`
        : "Нет TOP-узлов в текущем наборе";

    return {
      key: group.key,
      title: group.title,
      status,
      statusLabel,
      details,
      nodeCodes,
      nodes: cardNodes,
    };
  });
}
