/**
 * Category chips for «Добавить свою деталь».
 * Node name is the primary Russian label; catalog partTypes are alternatives when several apply.
 */
export function buildCommunityPartCategoryOptions(input: {
  nodeName: string;
  recommendationPartTypes: readonly string[];
}): string[] {
  const nodeName = input.nodeName.trim();
  const fromRecs = [
    ...new Set(
      input.recommendationPartTypes.map((partType) => partType.trim()).filter(Boolean)
    ),
  ];

  if (!nodeName && fromRecs.length === 0) {
    return ["ЗАПЧАСТЬ"];
  }
  if (!nodeName) {
    return fromRecs;
  }
  if (fromRecs.length === 0) {
    return [nodeName];
  }
  if (fromRecs.length > 1) {
    return [nodeName, ...fromRecs];
  }
  return [nodeName];
}
