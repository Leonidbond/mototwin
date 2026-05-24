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

const ALL_DEFINED_CODES = new Set(TOP_NODE_GROUP_DEFINITIONS.flatMap((g) => g.codes));

function pickAggregateStatus(statuses: NodeStatus[]): NodeStatus | null {
  if (!statuses.length) {
    return null;
  }
  return statuses.sort((a, b) => getNodeStatusPriority(b) - getNodeStatusPriority(a))[0] ?? null;
}

function buildCard(
  key: TopNodeOverviewCard["key"],
  title: string,
  nodeCodes: string[],
  nodeByCode: Map<string, TopServiceNodeItem>,
  statusByCode: Map<string, NodeStatus | null>
): TopNodeOverviewCard {
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

  return { key, title, status, statusLabel, details, nodeCodes, nodes: cardNodes };
}

export function buildTopNodeOverviewCards(
  nodes: TopServiceNodeItem[],
  statusByCode: Map<string, NodeStatus | null>
): TopNodeOverviewCard[] {
  const nodeByCode = new Map(nodes.map((node) => [node.code, node]));
  const availableCodes = new Set(nodeByCode.keys());

  const cards: TopNodeOverviewCard[] = TOP_NODE_GROUP_DEFINITIONS.flatMap((group) => {
    const nodeCodes = group.codes.filter((code) => availableCodes.has(code));
    if (nodeCodes.length === 0) {
      return [];
    }
    return [buildCard(group.key, group.title, nodeCodes, nodeByCode, statusByCode)];
  });

  const otherCodes = [...availableCodes].filter((code) => !ALL_DEFINED_CODES.has(code));
  if (otherCodes.length > 0) {
    cards.push(buildCard("other", "Прочее", otherCodes, nodeByCode, statusByCode));
  }

  return cards;
}

export type TopNodeProfileGroupNode = {
  id: string;
  code: string;
  name: string;
};

export type TopNodeProfileGroup = {
  key: TopNodeOverviewCard["key"];
  title: string;
  nodes: TopNodeProfileGroupNode[];
};

type TopNodeProfileSource = {
  id: string;
  code: string;
  name: string;
};

export function buildTopNodeProfileGroups(nodes: TopNodeProfileSource[]): TopNodeProfileGroup[] {
  const nodeByCode = new Map(nodes.map((node) => [node.code, node]));
  const availableCodes = new Set(nodeByCode.keys());

  const groups: TopNodeProfileGroup[] = TOP_NODE_GROUP_DEFINITIONS.map((group) => ({
    key: group.key,
    title: group.title,
    nodes: group.codes
      .filter((code) => availableCodes.has(code))
      .map((code) => {
        const node = nodeByCode.get(code);
        return {
          id: node?.id ?? code,
          code,
          name: node?.name ?? code,
        };
      }),
  })).filter((group) => group.nodes.length > 0);

  const otherCodes = [...availableCodes].filter((code) => !ALL_DEFINED_CODES.has(code));
  if (otherCodes.length > 0) {
    groups.push({
      key: "other",
      title: "Прочее",
      nodes: otherCodes.map((code) => {
        const node = nodeByCode.get(code);
        return {
          id: node?.id ?? code,
          code,
          name: node?.name ?? code,
        };
      }),
    });
  }

  return groups;
}

/** При первом редактировании копирует текущий эффективный ТОП в пользовательский список. */
export function resolveEditableFavoriteNodeCodes(
  favoriteNodeCodes: string[],
  effectiveTopNodeCodes: string[]
): string[] {
  if (favoriteNodeCodes.length > 0) {
    return favoriteNodeCodes;
  }
  return [...effectiveTopNodeCodes];
}
