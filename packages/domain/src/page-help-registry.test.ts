import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PAGE_HELP_ENTRIES,
  getPageHelp,
  getPageHelpTitle,
  resolvePageKeyFromWebPath,
  resolvePageKeyFromMobileRoute,
  getFeedbackStatusLabelRu,
  getFeedbackTypeLabelRu,
} from "./page-help-registry.ts";

describe("page help registry", () => {
  it("merges base content when no platform override is present", () => {
    const help = getPageHelp("garage", "web");
    assert.ok(help);
    assert.equal(help.title, "Мой гараж");
    assert.equal(help.content.summary, help.content.summary);
    assert.ok(help.content.steps.length > 0);
  });

  it("applies mobile override on top of base", () => {
    const web = getPageHelp("vehicle.nodes", "web");
    const mobile = getPageHelp("vehicle.nodes", "mobile");
    assert.ok(web && mobile);
    assert.notEqual(web.content.summary, mobile.content.summary);
    // steps are not overridden, so they stay shared
    assert.deepEqual(web.content.steps, mobile.content.steps);
  });

  it("returns null for unknown keys", () => {
    assert.equal(getPageHelp("does-not-exist" as never, "web"), null);
  });

  it("resolves web paths with dynamic ids", () => {
    assert.equal(resolvePageKeyFromWebPath("/garage"), "garage");
    assert.equal(resolvePageKeyFromWebPath("/vehicles/abc123"), "vehicle.overview");
    assert.equal(
      resolvePageKeyFromWebPath("/vehicles/abc123/service-log"),
      "vehicle.service-log"
    );
    assert.equal(
      resolvePageKeyFromWebPath("/vehicles/abc123/parts/picker?node=foo"),
      "vehicle.parts-picker"
    );
    assert.equal(resolvePageKeyFromWebPath("/unknown/path"), null);
  });

  it("resolves mobile routes from segments (web parts -> mobile wishlist)", () => {
    assert.equal(
      resolvePageKeyFromMobileRoute(["vehicles", "[id]", "wishlist"]),
      "vehicle.parts"
    );
    assert.equal(
      resolvePageKeyFromMobileRoute(["vehicles", "abc123", "nodes"]),
      "vehicle.nodes"
    );
    assert.equal(resolvePageKeyFromMobileRoute(["garage"]), "garage");
  });

  it("exposes Russian labels for status and type", () => {
    assert.equal(getFeedbackStatusLabelRu("NEW"), "Новое");
    assert.equal(getFeedbackStatusLabelRu("IN_PROGRESS"), "В работе");
    assert.equal(getFeedbackTypeLabelRu("PROBLEM"), "Проблема");
    assert.equal(getFeedbackTypeLabelRu("IDEA"), "Идея");
  });

  it("getPageHelpTitle falls back to the raw key", () => {
    assert.equal(getPageHelpTitle("garage"), "Мой гараж");
    assert.equal(getPageHelpTitle("weird.key"), "weird.key");
  });

  it("every entry has at least one route pattern", () => {
    for (const entry of PAGE_HELP_ENTRIES) {
      assert.ok(
        entry.webPathPattern || entry.mobileRoute,
        `entry ${entry.key} must declare a route`
      );
    }
  });
});
