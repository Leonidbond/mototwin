import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCommunityPartCategoryOptions } from "./community-part-category.ts";

describe("buildCommunityPartCategoryOptions", () => {
  it("uses node name only when catalog suggests one partType for the node", () => {
    assert.deepEqual(
      buildCommunityPartCategoryOptions({
        nodeName: "Воздушный фильтр",
        recommendationPartTypes: ["AIR_FILTER"],
      }),
      ["Воздушный фильтр"]
    );
  });

  it("offers node name plus distinct catalog types when several apply", () => {
    assert.deepEqual(
      buildCommunityPartCategoryOptions({
        nodeName: "Масло двигателя",
        recommendationPartTypes: ["ENGINE_OIL", "DRAIN_PLUG_WASHER"],
      }),
      ["Масло двигателя", "ENGINE_OIL", "DRAIN_PLUG_WASHER"]
    );
  });

  it("falls back to node name without recommendations", () => {
    assert.deepEqual(
      buildCommunityPartCategoryOptions({
        nodeName: "Воздушный фильтр",
        recommendationPartTypes: [],
      }),
      ["Воздушный фильтр"]
    );
  });

  it("uses recommendation partTypes when node name is missing", () => {
    assert.deepEqual(
      buildCommunityPartCategoryOptions({
        nodeName: "",
        recommendationPartTypes: ["AIR_FILTER", "AIR_FILTER"],
      }),
      ["AIR_FILTER"]
    );
  });

  it("falls back to generic label when nothing is known", () => {
    assert.deepEqual(
      buildCommunityPartCategoryOptions({
        nodeName: "",
        recommendationPartTypes: [],
      }),
      ["ЗАПЧАСТЬ"]
    );
  });
});
