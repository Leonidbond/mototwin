import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createInitialMotorcycleCatalogPickerState,
  isCatalogPickerComplete,
  isFullCatalogPath,
  requiresCatalogRequest,
  resetPickerFromLevel,
  setPickerLevelMode,
  toCatalogRequestDraft,
  validateCatalogPickerState,
} from "./motorcycle-catalog-picker.ts";

describe("motorcycle-catalog-picker", () => {
  it("detects full catalog path", () => {
    const state = createInitialMotorcycleCatalogPickerState({
      brandMode: "catalog",
      brandId: "b1",
      familyMode: "catalog",
      familyId: "f1",
      variantMode: "catalog",
      variantId: "v1",
      generationMode: "catalog",
      generationId: "g1",
    });
    assert.equal(isFullCatalogPath(state), true);
    assert.equal(requiresCatalogRequest(state), false);
    assert.equal(isCatalogPickerComplete(state), true);
  });

  it("requires catalog request for custom brand cascade", () => {
    const state = createInitialMotorcycleCatalogPickerState({
      brandMode: "custom",
      brandName: "Beta",
      familyMode: "custom",
      familyName: "RR",
      variantMode: "custom",
      variantName: "Racing",
      generationMode: "custom",
      yearFrom: "2024",
    });
    assert.equal(requiresCatalogRequest(state), true);
    assert.equal(isCatalogPickerComplete(state), true);
    const draft = toCatalogRequestDraft(state);
    assert.equal(draft.brandName, "Beta");
    assert.equal(draft.familyName, "RR");
    assert.equal(draft.variantName, "Racing");
    assert.equal(draft.yearFrom, 2024);
  });

  it("supports catalog variant with custom generation years", () => {
    const state = createInitialMotorcycleCatalogPickerState({
      brandMode: "catalog",
      brandId: "b1",
      familyMode: "catalog",
      familyId: "f1",
      variantMode: "catalog",
      variantId: "v1",
      generationMode: "custom",
      yearFrom: "2023",
      yearTo: "2025",
    });
    const draft = toCatalogRequestDraft(state);
    assert.equal(draft.motorcycleVariantId, "v1");
    assert.equal(draft.variantName, undefined);
    assert.equal(draft.yearFrom, 2023);
    assert.equal(draft.yearTo, 2025);
  });

  it("resets downstream levels when switching brand to custom", () => {
    const initial = createInitialMotorcycleCatalogPickerState({
      brandMode: "catalog",
      brandId: "b1",
      familyMode: "catalog",
      familyId: "f1",
      variantMode: "catalog",
      variantId: "v1",
      generationMode: "catalog",
      generationId: "g1",
    });
    const next = setPickerLevelMode(initial, "brand", "custom");
    assert.equal(next.brandId, "");
    assert.equal(next.familyId, "");
    assert.equal(next.variantId, "");
    assert.equal(next.generationId, "");
    assert.equal(next.familyMode, "custom");
    assert.equal(next.variantMode, "custom");
    assert.equal(next.generationMode, "custom");
  });

  it("validates missing generation year on custom path", () => {
    const state = createInitialMotorcycleCatalogPickerState({
      brandMode: "custom",
      brandName: "Beta",
      familyMode: "custom",
      familyName: "RR",
      variantMode: "custom",
      variantName: "Racing",
      generationMode: "custom",
      yearFrom: "",
    });
    const result = validateCatalogPickerState(state);
    assert.ok(result.errors.length > 0);
    assert.ok(result.fieldErrors.yearFrom);
  });

  it("resetPickerFromLevel clears generation fields", () => {
    const state = createInitialMotorcycleCatalogPickerState({
      generationMode: "custom",
      yearFrom: "2020",
      yearTo: "2024",
      userComment: "note",
    });
    const next = resetPickerFromLevel(state, "generation");
    assert.equal(next.yearFrom, "");
    assert.equal(next.yearTo, "");
    assert.equal(next.userComment, "");
  });
});
