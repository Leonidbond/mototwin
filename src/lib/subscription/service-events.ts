import type { Prisma, PrismaClient, SubscriptionStatus } from "@prisma/client";
import type { SubscriptionPlan, ServiceEventEntryMode } from "@mototwin/types";
import { getCapabilities } from "./capabilities";
import { DEFAULT_TOP_SERVICE_NODE_CODES } from "@/lib/top-service-nodes";

type DbClient = PrismaClient | Prisma.TransactionClient;

export type NodeLevelRow = {
  id: string;
  code: string;
  level: number;
  parentId: string | null;
};

const TOP_SERVICE_NODE_CODE_SET = new Set<string>(DEFAULT_TOP_SERVICE_NODE_CODES);

export async function loadNodesForSelection(
  db: DbClient,
  nodeIds: string[]
): Promise<Map<string, NodeLevelRow>> {
  const rows = await db.node.findMany({
    where: { id: { in: nodeIds } },
    select: { id: true, code: true, level: true, parentId: true },
  });
  return new Map(rows.map((row) => [row.id, row]));
}

export function isTopLevelNode(node: NodeLevelRow): boolean {
  return TOP_SERVICE_NODE_CODE_SET.has(node.code);
}

export function canUseEntryMode(plan: SubscriptionPlan, entryMode: ServiceEventEntryMode): boolean {
  const capabilities = getCapabilities(plan);
  return capabilities.allowedEntryModes.includes(entryMode);
}

export function validateNodesForPlan(
  plan: SubscriptionPlan,
  nodes: NodeLevelRow[]
): { ok: true } | { ok: false; reason: "missing" | "child_requires_pro" } {
  if (nodes.length === 0) {
    return { ok: false, reason: "missing" };
  }
  if (plan === "PRO") {
    return { ok: true };
  }
  const hasChildNode = nodes.some((node) => !isTopLevelNode(node));
  if (hasChildNode) {
    return { ok: false, reason: "child_requires_pro" };
  }
  return { ok: true };
}

export async function rotateFreeServiceEventsIfNeeded(
  db: DbClient,
  vehicleId: string
): Promise<void> {
  const maxVisible = getCapabilities("FREE").maxVisibleServiceEvents;
  if (maxVisible == null) {
    return;
  }
  const visible = await db.serviceEvent.findMany({
    where: {
      vehicleId,
      eventKind: "SERVICE",
      rotatedOutAt: null,
    },
    orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
    select: { id: true },
  });
  if (visible.length <= maxVisible) {
    return;
  }
  const overflowIds = visible.slice(maxVisible).map((event) => event.id);
  await db.serviceEvent.updateMany({
    where: { id: { in: overflowIds } },
    data: {
      rotatedOutAt: new Date(),
      rotatedOutReason: "FREE_LIMIT",
    },
  });
}

export function formatSubscriptionStatus(status: SubscriptionStatus): string {
  return status;
}
