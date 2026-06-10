import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ServiceEventItem } from "@mototwin/types";
import { resolveServiceEventCost } from "./service-event-expenses";

function baseEvent(overrides: Partial<ServiceEventItem> = {}): ServiceEventItem {
  return {
    id: "evt-1",
    eventKind: "SERVICE",
    eventDate: "2026-06-01T00:00:00.000Z",
    nodeId: "node-1",
    title: "ТО",
    mode: "ADVANCED",
    entryMode: "DETAILED",
    createdUnderPlan: "FREE",
    odometer: 1000,
    engineHours: null,
    installedPartsJson: null,
    partsCost: null,
    laborCost: null,
    totalCost: null,
    currency: "RUB",
    comment: null,
    performedBy: null,
    serviceProviderNote: null,
    installLocationAddress: null,
    installLocationLat: null,
    installLocationLng: null,
    servicePlace: null,
    servicePlaceSnapshot: null,
    attachReceiptRequested: false,
    attachFileRequested: false,
    nextReminderEnabled: false,
    nextReminderDate: null,
    nextReminderOdometer: null,
    nextReminderEngineHours: null,
    rotatedOutAt: null,
    rotatedOutReason: null,
    items: [],
    serviceType: "ТО",
    costAmount: null,
    partSku: null,
    partName: null,
    expenseItems: [],
    createdAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("resolveServiceEventCost", () => {
  it("uses partsCost + laborCost when totalCost is missing", () => {
    const resolved = resolveServiceEventCost(
      baseEvent({
        partsCost: 1200,
        laborCost: 800,
        totalCost: null,
      })
    );
    assert.equal(resolved.hasCost, true);
    assert.equal(resolved.totalAmount, 2000);
    assert.equal(resolved.currency, "RUB");
    assert.match(resolved.totalsLabel ?? "", /2\s?000/);
  });

  it("sums bundle line costs when event totals are missing", () => {
    const resolved = resolveServiceEventCost(
      baseEvent({
        items: [
          {
            id: "line-1",
            nodeId: "node-1",
            actionType: "REPLACE",
            partName: "Фильтр",
            sku: null,
            quantity: 1,
            partCost: 1500,
            laborCost: 500,
            comment: null,
            sortOrder: 0,
          },
        ],
      })
    );
    assert.equal(resolved.hasCost, true);
    assert.equal(resolved.totalAmount, 2000);
  });
});
