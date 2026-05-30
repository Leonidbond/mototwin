import { describe, expect, it } from "vitest";
import {
  filterFavoriteNodeCodesToCatalogLeaves,
  filterServiceCatalogLeafNodes,
} from "./service-catalog";

describe("filterServiceCatalogLeafNodes", () => {
  const catalog = [
    { id: "root", code: "ENGINE", parentId: null },
    { id: "mid", code: "ENGINE.LUBE", parentId: "root" },
    { id: "leaf", code: "ENGINE.LUBE.OIL", parentId: "mid" },
  ];

  it("returns only nodes with no children", () => {
    expect(filterServiceCatalogLeafNodes(catalog).map((n) => n.code)).toEqual(["ENGINE.LUBE.OIL"]);
  });
});

describe("filterFavoriteNodeCodesToCatalogLeaves", () => {
  const catalog = [
    { id: "root", code: "ENGINE", parentId: null },
    { id: "leaf", code: "ENGINE.LUBE.OIL", parentId: "root" },
  ];

  it("drops parent codes and keeps leaves", () => {
    expect(
      filterFavoriteNodeCodesToCatalogLeaves(["ENGINE", "engine.lube.oil"], catalog)
    ).toEqual(["ENGINE.LUBE.OIL"]);
  });
});
