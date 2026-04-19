import type {
  NodeContextActionViewModel,
  NodeContextRecommendationSummary,
  NodeContextServiceEventSummary,
  NodeContextServiceKitSummary,
  NodeContextViewModel,
  NodeMaintenancePlanViewModel,
  NodeTreeItem,
  NodeTreeItemViewModel,
  PartRecommendationViewModel,
  ServiceEventItem,
  ServiceKitViewModel,
} from "@mototwin/types";
import { formatExpenseAmountRu } from "./expense-summary";
import { applyServiceLogNodeFilter, createServiceLogNodeFilter } from "./service-log-node-filter";

function findNodePathById<T extends { id: string; name: string; children: T[] }>(
  nodes: T[],
  targetNodeId: string,
  path: string[] = []
): string[] | null {
  for (const node of nodes) {
    const nextPath = [...path, node.name];
    if (node.id === targetNodeId) {
      return nextPath;
    }
    const nested = findNodePathById(node.children, targetNodeId, nextPath);
    if (nested) {
      return nested;
    }
  }
  return null;
}

export function buildNodeContextPathLabel(pathNames: string[]): string {
  return pathNames.join(" → ");
}

export function getRecentServiceEventsForNode(
  selectedNode: NodeTreeItem,
  serviceEvents: ServiceEventItem[],
  limit = 3
): NodeContextServiceEventSummary[] {
  const filter = createServiceLogNodeFilter(selectedNode);
  return applyServiceLogNodeFilter(serviceEvents, { nodeIds: filter.nodeIds })
    .slice()
    .sort((a, b) => {
      const byDate = b.eventDate.localeCompare(a.eventDate);
      if (byDate !== 0) return byDate;
      return b.createdAt.localeCompare(a.createdAt);
    })
    .slice(0, limit)
    .map((event) => ({
      id: event.id,
      eventDate: event.eventDate,
      serviceType: event.serviceType,
      odometer: event.odometer,
      costAmount: event.costAmount,
      currency: event.currency,
      costLabelRu:
        event.costAmount !== null
          ? `${formatExpenseAmountRu(event.costAmount)} ${event.currency ?? "RUB"}`
          : null,
    }));
}

export function getNodeContextActions(options: {
  isLeaf: boolean;
  hasServiceKits: boolean;
  hasStatusExplanation: boolean;
}): NodeContextActionViewModel[] {
  const actions: NodeContextActionViewModel[] = [{ key: "journal", label: "Журнал" }];
  if (options.isLeaf) {
    actions.push({ key: "add_service_event", label: "Добавить сервисное событие" });
    actions.push({ key: "add_wishlist", label: "Добавить в список покупок" });
  }
  if (options.hasServiceKits) {
    actions.push({ key: "add_kit", label: "Добавить комплект" });
  }
  if (options.hasStatusExplanation) {
    actions.push({ key: "open_status_explanation", label: "Пояснение статуса" });
  }
  return actions;
}

function toRecommendationSummary(
  recommendations: PartRecommendationViewModel[]
): NodeContextRecommendationSummary[] {
  return recommendations.map((item) => ({
    skuId: item.skuId,
    canonicalName: item.canonicalName,
    brandName: item.brandName,
    recommendationLabel: item.recommendationLabel,
    compatibilityWarning: item.compatibilityWarning,
  }));
}

function toServiceKitSummary(serviceKits: ServiceKitViewModel[]): NodeContextServiceKitSummary[] {
  return serviceKits.map((kit) => ({
    code: kit.code,
    title: kit.title,
    description: kit.description,
    itemCount: kit.items.length,
  }));
}

export function buildNodeContextViewModel(input: {
  node: NodeTreeItemViewModel;
  nodeTree: NodeTreeItemViewModel[];
  maintenancePlan: NodeMaintenancePlanViewModel | null;
  recentServiceEvents: NodeContextServiceEventSummary[];
  recommendations: PartRecommendationViewModel[];
  serviceKits: ServiceKitViewModel[];
}): NodeContextViewModel {
  const pathNames = findNodePathById(input.nodeTree, input.node.id) ?? [input.node.name];
  const isLeaf = !input.node.hasChildren;
  return {
    nodeId: input.node.id,
    nodeCode: input.node.code,
    nodeName: input.node.name,
    pathLabel: buildNodeContextPathLabel(pathNames),
    isLeaf,
    effectiveStatus: input.node.effectiveStatus,
    statusLabel: input.node.statusLabel,
    shortExplanationLabel: input.node.shortExplanationLabel,
    maintenancePlan: input.maintenancePlan,
    recentServiceEvents: input.recentServiceEvents,
    recommendations: toRecommendationSummary(input.recommendations),
    serviceKits: toServiceKitSummary(input.serviceKits),
    actions: getNodeContextActions({
      isLeaf,
      hasServiceKits: input.serviceKits.length > 0,
      hasStatusExplanation: Boolean(input.node.statusExplanation),
    }),
  };
}
