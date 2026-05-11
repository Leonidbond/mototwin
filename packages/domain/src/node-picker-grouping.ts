/** Stable key for options with no path; shown as «Прочее». */
export const NODE_PICKER_OTHER_GROUP_KEY = "__node_picker_other__";

function pathLabelHierarchySegments(raw: string): string[] {
  const s = raw.trim();
  if (!s) return [];

  if (s.includes("›")) {
    return s.split("›").map((p) => p.trim()).filter(Boolean);
  }

  if (s.includes("→")) {
    return s.split("→").map((p) => p.trim()).filter(Boolean);
  }

  if (s.includes("/")) {
    return s.split("/").map((p) => p.trim()).filter(Boolean);
  }

  return [s];
}

export function nodePickerTopGroupKeyFromPathLabel(pathLabel?: string): string {
  const segments = pathLabel ? pathLabelHierarchySegments(pathLabel) : [];
  if (segments.length === 0) return NODE_PICKER_OTHER_GROUP_KEY;
  return segments[0] || NODE_PICKER_OTHER_GROUP_KEY;
}

export function nodePickerGroupHeadingRu(groupKey: string): string {
  return groupKey === NODE_PICKER_OTHER_GROUP_KEY ? "Прочее" : groupKey;
}

export type NodePickerGroupableOption = {
  id: string;
  name: string;
  pathLabel?: string;
  /** When set, pickers can show catalog node icon */
  code?: string;
};

/**
 * Groups leaf options by top path segment for modal headings.
 * Preserves **input order** (expected: same preorder as the vehicle node tree / `flattenNodeTreeToSelectOptions`).
 * Group order = first appearance in that list; «Прочее» is always last.
 */
export function groupNodePickerOptionsByTopLevel<T extends NodePickerGroupableOption>(
  options: T[]
): { groupKey: string; items: T[] }[] {
  const groupKeyOrder: string[] = [];
  const buckets = new Map<string, T[]>();

  for (const opt of options) {
    const key = nodePickerTopGroupKeyFromPathLabel(opt.pathLabel);
    const existing = buckets.get(key);
    if (existing) {
      existing.push(opt);
    } else {
      buckets.set(key, [opt]);
      groupKeyOrder.push(key);
    }
  }

  const primaryKeys = groupKeyOrder.filter((k) => k !== NODE_PICKER_OTHER_GROUP_KEY);
  const otherKeys = groupKeyOrder.filter((k) => k === NODE_PICKER_OTHER_GROUP_KEY);
  const orderedKeys = [...primaryKeys, ...otherKeys];

  return orderedKeys.map((groupKey) => ({
    groupKey,
    items: buckets.get(groupKey) ?? [],
  }));
}
