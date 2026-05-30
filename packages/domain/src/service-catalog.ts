/** Flat service-node row (`parentId` links), e.g. from `GET /api/nodes/service`. */
export type ServiceCatalogNodeRef = {
  id: string;
  code: string;
  parentId: string | null;
};

/** Nodes that are not parents of any other node in the catalog (selectable leaves). */
export function filterServiceCatalogLeafNodes<T extends ServiceCatalogNodeRef>(
  nodes: T[]
): T[] {
  const parentIds = new Set<string>();
  for (const node of nodes) {
    if (node.parentId) {
      parentIds.add(node.parentId);
    }
  }
  return nodes.filter((node) => !parentIds.has(node.id));
}

/** Keeps only codes that refer to catalog leaf nodes (case-insensitive). */
export function filterFavoriteNodeCodesToCatalogLeaves(
  codes: string[],
  catalogNodes: ServiceCatalogNodeRef[]
): string[] {
  const leafCodeSet = new Set(
    filterServiceCatalogLeafNodes(catalogNodes).map((node) => node.code.trim().toUpperCase())
  );
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of codes) {
    const normalized = raw.trim().toUpperCase();
    if (!normalized || !leafCodeSet.has(normalized) || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}
