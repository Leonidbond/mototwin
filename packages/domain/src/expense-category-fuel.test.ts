import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  expenseCategoryRequiresNode,
  getDefaultExpenseInstallStatusForCategory,
  expenseCategoryLabelsRu,
} from "./expense-summary.ts";

describe("expense category FUEL", () => {
  it("has Russian label", () => {
    assert.equal(expenseCategoryLabelsRu.FUEL, "Топливо");
  });

  it("does not require a node", () => {
    assert.equal(expenseCategoryRequiresNode("FUEL"), false);
    assert.equal(expenseCategoryRequiresNode("PART"), true);
  });

  it("defaults to NOT_APPLICABLE install status", () => {
    assert.equal(getDefaultExpenseInstallStatusForCategory("FUEL"), "NOT_APPLICABLE");
  });
});
