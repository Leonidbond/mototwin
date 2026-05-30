import { describe, expect, it } from "vitest";
import {
  catalogNodeAncestorPathLabelRu,
  resolveNodePickerPathLabelRu,
} from "./node-tree";
import type { NodeTreeItem } from "@mototwin/types";

describe("catalogNodeAncestorPathLabelRu", () => {
  const catalog = [
    { id: "engine", parentId: null, name: "Двигатель" },
    { id: "lube", parentId: "engine", name: "Смазка" },
    { id: "oil", parentId: "lube", name: "Масло" },
  ];

  it("returns ancestor names joined with ›", () => {
    expect(catalogNodeAncestorPathLabelRu(catalog, "oil")).toBe("Двигатель › Смазка");
  });

  it("returns empty for root", () => {
    expect(catalogNodeAncestorPathLabelRu(catalog, "engine")).toBe("");
  });
});

describe("resolveNodePickerPathLabelRu", () => {
  const catalog = [
    { id: "a", parentId: null, name: "A" },
    { id: "b", parentId: "a", name: "B" },
  ];
  const flatVehicleTree: NodeTreeItem[] = [
    { id: "b", code: "A.B", name: "B", level: 2, children: [] },
  ];

  it("uses catalog when vehicle tree has no ancestors", () => {
    expect(resolveNodePickerPathLabelRu(flatVehicleTree, catalog, "b")).toBe("A");
  });
});
