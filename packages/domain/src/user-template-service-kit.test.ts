import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PartRecommendationViewModel, PartSkuViewModel } from "@mototwin/types";
import { chooseBestSkuForKitItem, SERVICE_KIT_DEFINITIONS } from "./service-kits.ts";
import {
  USER_SERVICE_KIT_CODE_PREFIX,
  advancedServiceKitSnapshotFromPickerLines,
  buildUserServiceKitCode,
  filterUserTemplateKitsByContextNode,
  inferKitItemPartBinding,
  parseUserServiceKitTemplateId,
  wishlistRowsToAdvancedFormForTemplate,
} from "./user-template-service-kit.ts";

describe("user-template-service-kit", () => {
  it("buildUserServiceKitCode / parseUserServiceKitTemplateId round-trip", () => {
    const id = "clxyz123";
    const code = buildUserServiceKitCode(id);
    assert.ok(code.startsWith(USER_SERVICE_KIT_CODE_PREFIX));
    assert.equal(parseUserServiceKitTemplateId(code), id);
    assert.equal(parseUserServiceKitTemplateId("ENGINE_OIL_CHANGE_KIT"), null);
  });

  it("filterUserTemplateKitsByContextNode keeps kits intersecting context", () => {
    const kits = SERVICE_KIT_DEFINITIONS.filter((k) => k.code === "ENGINE_OIL_CHANGE_KIT");
    const out = filterUserTemplateKitsByContextNode(kits, "ENGINE.LUBE.OIL");
    assert.equal(out.length, 1);
    assert.equal(filterUserTemplateKitsByContextNode(kits, "TIRES.FRONT").length, 0);
    assert.equal(filterUserTemplateKitsByContextNode(kits, null).length, 1);
  });

  it("inferKitItemPartBinding prefers SKU id match", () => {
    const recs: PartRecommendationViewModel[] = [
      {
        skuId: "sku-a",
        partMasterId: null,
        canonicalName: "Other",
        brandName: "B",
        partType: "OIL_FILTER",
        partNumbers: [],
        priceAmount: 100,
        currency: "RUB",
        primaryNode: null,
        relationType: "x",
        confidence: 50,
        recommendationType: "MODEL_FIT",
        recommendationLabel: "",
        whyRecommended: "",
        fitmentNote: null,
        compatibilityWarning: null,
        trustBadge: null,
        communityReportCount: 0,
        communityScore: 0,
        communityStatus: null,
        communityLineRu: null,
        communitySortBoost: 0,
        catalogEvidence: [],
        applicationType: null,
        recommendedQuantity: null,
        marketMismatch: false,
        catalogSafetyCritical: false,
        isSpecificationOnly: false,
      },
      {
        skuId: "sku-b",
        partMasterId: null,
        canonicalName: "Target",
        brandName: "B",
        partType: "ENGINE_OIL",
        partNumbers: [],
        priceAmount: 200,
        currency: "RUB",
        primaryNode: null,
        relationType: "x",
        confidence: 90,
        recommendationType: "EXACT_FIT",
        recommendationLabel: "",
        whyRecommended: "",
        fitmentNote: null,
        compatibilityWarning: null,
        trustBadge: null,
        communityReportCount: 0,
        communityScore: 0,
        communityStatus: null,
        communityLineRu: null,
        communitySortBoost: 0,
        catalogEvidence: [],
        applicationType: null,
        recommendedQuantity: null,
        marketMismatch: false,
        catalogSafetyCritical: false,
        isSpecificationOnly: false,
      },
    ];
    const picked = chooseBestSkuForKitItem(recs, {
      key: "k",
      title: "Oil",
      nodeCode: "ENGINE.LUBE.OIL",
      partType: "OIL_FILTER",
      quantity: 1,
      role: "PRIMARY",
      required: true,
      preferredSkuId: "sku-b",
    });
    assert.equal(picked?.skuId, "sku-b");
  });

  it("chooseBestSkuForKitItem returns null without partType match", () => {
    const recs: PartRecommendationViewModel[] = [
      {
        skuId: "sku-oil",
        partMasterId: null,
        canonicalName: "Масло 10W-40",
        brandName: "Motul",
        partType: "ENGINE_OIL",
        partNumbers: [],
        priceAmount: 1200,
        currency: "RUB",
        primaryNode: null,
        relationType: "x",
        confidence: 90,
        recommendationType: "EXACT_FIT",
        recommendationLabel: "",
        whyRecommended: "",
        fitmentNote: null,
        compatibilityWarning: null,
        trustBadge: null,
        communityReportCount: 0,
        communityScore: 0,
        communityStatus: null,
        communityLineRu: null,
        communitySortBoost: 0,
        catalogEvidence: [],
        applicationType: null,
        recommendedQuantity: null,
        marketMismatch: false,
        catalogSafetyCritical: false,
        isSpecificationOnly: false,
      },
    ];
    const picked = chooseBestSkuForKitItem(recs, {
      key: "washer",
      title: "Прокладка/шайба сливной пробки",
      nodeCode: "ENGINE.LUBE.OIL",
      partType: "DRAIN_PLUG_WASHER",
      quantity: 1,
      role: "RELATED_CONSUMABLE",
      required: false,
    });
    assert.equal(picked, null);
  });

  it("advancedServiceKitSnapshotFromPickerLines builds ADVANCED snapshot", () => {
    const now = new Date().toISOString();
    const sku: PartSkuViewModel = {
      id: "sku-1",
      seedKey: null,
      partMasterId: null,
      primaryNodeId: "node-leaf",
      brandName: "Motul",
      canonicalName: "Масло",
      partType: "ENGINE_OIL",
      description: null,
      category: null,
      priceAmount: 100,
      currency: "RUB",
      sourceUrl: null,
      isOem: false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      primaryNode: { id: "node-leaf", code: "ENGINE.LUBE.OIL", name: "Масло" },
      partNumbers: [{ id: "pn1", skuId: "sku-1", number: "7100", normalizedNumber: "7100", numberType: "OEM", brandName: null, createdAt: now }],
      nodeLinks: [],
      fitments: [],
      offers: [],
    };
    const form = advancedServiceKitSnapshotFromPickerLines({
      title: "Тестовый комплект",
      lines: [{ nodeId: "node-leaf", sku, quantity: 2 }],
    });
    assert.ok(form);
    assert.equal(form.mode, "ADVANCED");
    assert.equal(form.items.length, 1);
    assert.equal(form.items[0]?.nodeId, "node-leaf");
    assert.equal(form.items[0]?.quantity, "2");
  });

  it("wishlistRowsToAdvancedFormForTemplate maps rows", () => {
    const form = wishlistRowsToAdvancedFormForTemplate({
      rows: [
        {
          nodeId: "n1",
          skuId: "s1",
          displaySku: "ABC",
          partName: "Колодки",
          quantity: 2,
        },
      ],
      source: { kitTitle: "Тормоза", kitCode: "FRONT_BRAKE_SERVICE_KIT", builtIn: true },
    });
    assert.equal(form.mode, "ADVANCED");
    assert.equal(form.items[0]?.sku, "ABC");
    assert.equal(form.items[0]?.partName, "Колодки");
  });

  it("inferKitItemPartBinding matches part number", () => {
    const recs: PartRecommendationViewModel[] = [
      {
        skuId: "sku-1",
        partMasterId: null,
        canonicalName: "X",
        brandName: "B",
        partType: "TYPE_A",
        partNumbers: [
          {
            id: "pn-99",
            skuId: "sku-1",
            number: "PN-99",
            normalizedNumber: "pn99",
            numberType: "OEM",
            brandName: null,
            createdAt: new Date().toISOString(),
          },
        ],
        priceAmount: null,
        currency: null,
        primaryNode: null,
        relationType: "x",
        confidence: 1,
        recommendationType: "GENERIC_NODE_MATCH",
        recommendationLabel: "",
        whyRecommended: "",
        fitmentNote: null,
        compatibilityWarning: null,
        trustBadge: null,
        communityReportCount: 0,
        communityScore: 0,
        communityStatus: null,
        communityLineRu: null,
        communitySortBoost: 0,
        catalogEvidence: [],
        applicationType: null,
        recommendedQuantity: null,
        marketMismatch: false,
        catalogSafetyCritical: false,
        isSpecificationOnly: false,
      },
    ];
    const b = inferKitItemPartBinding({
      skuField: "PN-99",
      partNameField: "",
      recommendations: recs,
    });
    assert.equal(b.preferredSkuId, "sku-1");
    assert.equal(b.partType, "TYPE_A");
  });
});
