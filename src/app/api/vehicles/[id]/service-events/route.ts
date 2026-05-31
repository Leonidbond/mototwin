import { NextRequest, NextResponse } from "next/server";
import { PlanType, ServiceEventEntryMode, ServiceEventMode, ServicePerformedBy } from "@prisma/client";
import { z } from "zod";
import {
  SERVICE_EVENT_BUNDLE_INCLUDE,
  createBundleServiceEventInTransaction,
} from "@/lib/bundle-service-event-transaction";
import { syncExpenseItemForServiceEvent } from "@/lib/expense-items";
import { linkInstalledExpenseItemsToServiceEvent } from "@/lib/service-event-expense-links";
import { prisma } from "@/lib/prisma";
import { buildSuggestFitmentReportPayload } from "@/lib/suggest-fitment-report";
import {
  serializeServiceEventRow,
  type RawServiceEventRow,
} from "@/lib/service-event-serialize";
import { getVehicleInCurrentContext } from "../../../_shared/vehicle-context";
import {
  getCurrentUserContext,
  toCurrentUserContextErrorResponse,
} from "../../../_shared/current-user-context";
import { boundedJsonValue, strictObject } from "@/lib/http/input-validation";
import { BodyParseError, parseJsonBody } from "@/lib/http/parse-json-body";
import { getCapabilities } from "@/lib/subscription/capabilities";
import { subscriptionErrorResponse } from "@/lib/subscription/errors";
import { getOrCreateUserSubscription } from "@/lib/subscription/resolve-plan";
import {
  canUseEntryMode,
  loadNodesForSelection,
  rotateFreeServiceEventsIfNeeded,
  validateNodesForPlan,
} from "@/lib/subscription/service-events";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const ACTION_TYPE_VALUES = ["REPLACE", "SERVICE", "INSPECT", "CLEAN", "ADJUST"] as const;

/** Matches client payload: `null` when reminder is off or only odo/hours are set. */
const nextReminderDateInputSchema = z
  .union([
    z.null(),
    z
      .string()
      .trim()
      .min(1)
      .refine((value) => !Number.isNaN(Date.parse(value)), {
        message: "nextReminderDate must be a valid date string",
      }),
  ])
  .optional();

// MT-SEC-068 + MT-SEC-070: strict bound text + numeric fields on the per-item schema.
const createServiceBundleItemSchema = strictObject({
  nodeId: z.string().trim().min(1).max(64),
  actionType: z.enum(ACTION_TYPE_VALUES),
  partName: z.string().trim().max(300).nullable().optional(),
  sku: z.string().trim().max(200).nullable().optional(),
  quantity: z.number().int().positive().max(10_000).nullable().optional(),
  partCost: z.number().nonnegative().max(1_000_000_000).nullable().optional(),
  laborCost: z.number().nonnegative().max(1_000_000_000).nullable().optional(),
  comment: z.string().trim().max(2_000).nullable().optional(),
});

const createServiceEventSchema = strictObject({
    nodeId: z.string().trim().max(64).optional(),
    title: z.string().trim().min(1).max(300),
    mode: z.enum(["BASIC", "ADVANCED"]),
    entryMode: z.enum(["QUICK", "DETAILED"]).optional(),
    performedBy: z.enum(["SELF", "SERVICE", "OTHER"]).optional(),
    serviceProviderNote: z.string().trim().max(500).nullable().optional(),
    installLocationAddress: z.string().trim().max(500).nullable().optional(),
    installLocationLat: z.number().min(-90).max(90).nullable().optional(),
    installLocationLng: z.number().min(-180).max(180).nullable().optional(),
    servicePlaceId: z.string().trim().min(1).max(64).nullable().optional(),
    servicePlaceSnapshot: boundedJsonValue({ maxSerializedBytes: 64 * 1024, maxDepth: 24 }).nullable().optional(),
    attachReceiptRequested: z.boolean().optional(),
    attachFileRequested: z.boolean().optional(),
    nextReminderEnabled: z.boolean().optional(),
    nextReminderDate: nextReminderDateInputSchema,
    nextReminderOdometer: z.number().int().min(0).max(10_000_000).nullable().optional(),
    nextReminderEngineHours: z.number().int().min(0).max(1_000_000).nullable().optional(),
    eventDate: z
      .string()
      .trim()
      .min(1)
      .refine((value) => !Number.isNaN(Date.parse(value)), {
        message: "eventDate must be a valid ISO date string",
      }),
    odometer: z.number().int().min(0).max(10_000_000),
    engineHours: z.number().int().min(0).max(1_000_000).nullable().optional(),
    // MT-SEC-066: `z.any()` previously accepted arbitrarily deep / huge JSON.
    // Cap at 64 KB serialized and 24 levels of nesting (generous for real
    // service-event payloads but stops abuse).
    installedPartsJson: boundedJsonValue({ maxSerializedBytes: 64 * 1024, maxDepth: 24 }).nullable().optional(),
    partsCost: z.number().nonnegative().max(1_000_000_000).nullable().optional(),
    laborCost: z.number().nonnegative().max(1_000_000_000).nullable().optional(),
    totalCost: z.number().nonnegative().max(1_000_000_000).nullable().optional(),
    currency: z.string().trim().max(12).nullable().optional(),
    comment: z.string().trim().max(2_000).nullable().optional(),
    // MT-SEC-070: cap array lengths to prevent DoS via huge service-event payloads.
  installedExpenseItemIds: z.array(z.string().trim().min(1).max(64)).max(500).optional(),
  items: z.array(createServiceBundleItemSchema).min(1).max(200),
})
  // MT-SEC-068: cross-field rules; `strictObject` already rejects unknown keys.
  .superRefine((value, ctx) => {
    if (value.mode === "BASIC") {
      value.items.forEach((item, index) => {
        if (item.partName || item.sku || item.quantity != null || item.partCost != null || item.laborCost != null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["items", index],
            message: "Per-item part/cost fields are not allowed in BASIC mode",
          });
        }
      });
    }
    const seenNodeIds = new Set<string>();
    value.items.forEach((item, index) => {
      if (seenNodeIds.has(item.nodeId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", index, "nodeId"],
          message: "Duplicate nodeId in items",
        });
      }
      seenNodeIds.add(item.nodeId);
    });
    if (value.nextReminderEnabled) {
      const d = (value.nextReminderDate ?? "").trim();
      const hasOdo = value.nextReminderOdometer != null;
      const hasHours = value.nextReminderEngineHours != null;
      if (!d && !hasOdo && !hasHours) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["nextReminderDate"],
          message: "When next reminder is enabled, provide date and/or odometer and/or engine hours",
        });
      }
      if (d && Number.isNaN(Date.parse(d))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["nextReminderDate"],
          message: "nextReminderDate must be a valid date string",
        });
      }
    }
  });

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const currentUser = await getCurrentUserContext();

    const vehicle = await getVehicleInCurrentContext(id, { id: true, odometer: true });

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const subscription = await getOrCreateUserSubscription(currentUser.userId);
    const capabilities = getCapabilities(subscription.plan);
    const visibleLimit = capabilities.maxVisibleServiceEvents;

    const serviceEvents = await prisma.serviceEvent.findMany({
      where: {
        vehicleId: id,
        ...(subscription.plan === "FREE" ? { rotatedOutAt: null } : {}),
      },
      orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
      ...(visibleLimit != null ? { take: visibleLimit } : {}),
      include: {
        ...SERVICE_EVENT_BUNDLE_INCLUDE,
        expenseItems: {
          include: { node: { select: { id: true, name: true } } },
          orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
        },
      },
    });

    let hiddenCount = 0;
    if (subscription.plan === "FREE") {
      const totalServiceEvents = await prisma.serviceEvent.count({
        where: {
          vehicleId: id,
          eventKind: "SERVICE",
        },
      });
      hiddenCount = Math.max(0, totalServiceEvents - serviceEvents.length);
    }

    return NextResponse.json({
      serviceEvents: serviceEvents.map((event) => serializeServiceEventRow(event as unknown as RawServiceEventRow)),
      meta: {
        visibleLimit,
        hiddenCount,
        plan: subscription.plan,
      },
    });
  } catch (error) {
    if (error instanceof BodyParseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const currentUserContextError = toCurrentUserContextErrorResponse(error);
    if (currentUserContextError) {
      return currentUserContextError;
    }
    console.error("Failed to fetch service events:", error);
    const isDev = process.env.NODE_ENV === "development";
    const devHint =
      isDev && error instanceof Error ? { devMessage: error.message } : {};
    const hint = isDev
      ? {
          hint: "If the DB predates Service Bundle, run: npx prisma migrate deploy",
        }
      : {};
    return NextResponse.json(
      {
        error: "Failed to fetch service events",
        ...hint,
        ...devHint,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const currentUser = await getCurrentUserContext();
    const json = await parseJsonBody<unknown>(request, { maxBytes: 256 * 1024 });
    const data = createServiceEventSchema.parse(json);
    const entryMode =
      data.entryMode === "DETAILED" || data.mode === "ADVANCED" ? "DETAILED" : "QUICK";
    const subscription = await getOrCreateUserSubscription(currentUser.userId);
    const capabilities = getCapabilities(subscription.plan);
    if (!canUseEntryMode(subscription.plan, entryMode)) {
      return subscriptionErrorResponse({
        code: "SERVICE_EVENT_MODE_NOT_ALLOWED",
        requiredPlan: "RIDER",
        message: "Подробный режим ТО доступен в Rider и Pro.",
      });
    }

    const vehicle = await getVehicleInCurrentContext(id, { id: true, odometer: true });

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const eventDate = new Date(data.eventDate);
    if (eventDate.getTime() > Date.now()) {
      return NextResponse.json(
        { error: "Event date cannot be in the future" },
        { status: 400 }
      );
    }
    if (data.odometer > vehicle.odometer) {
      return NextResponse.json(
        {
          error: `Event odometer cannot be greater than current vehicle odometer (${vehicle.odometer})`,
        },
        { status: 400 }
      );
    }

    const anchorNodeId = (data.nodeId ?? data.items[0]?.nodeId)?.trim();
    if (!anchorNodeId) {
      return NextResponse.json({ error: "Anchor nodeId required" }, { status: 400 });
    }
    const selectedNodeIds = Array.from(new Set([anchorNodeId, ...data.items.map((item) => item.nodeId)]));
    const nodeMap = await loadNodesForSelection(prisma, selectedNodeIds);
    const selectedNodes = selectedNodeIds
      .map((nodeId) => nodeMap.get(nodeId) ?? null)
      .filter((row): row is NonNullable<typeof row> => row != null);
    if (selectedNodes.length !== selectedNodeIds.length) {
      return NextResponse.json({ error: "Node not found" }, { status: 404 });
    }
    const nodeValidation = validateNodesForPlan(subscription.plan, selectedNodes);
    if (!nodeValidation.ok) {
      if (nodeValidation.reason === "missing") {
        return NextResponse.json({ error: "Node not found" }, { status: 404 });
      }
      return subscriptionErrorResponse({
        code: "CHILD_NODE_REQUIRES_PRO",
        requiredPlan: "PRO",
        message: "Выбор дочерних узлов доступен только в Pro.",
      });
    }

    // Выбираем total: явный → partsCost+laborCost → null.
    const partsCost = data.partsCost ?? null;
    const laborCost = data.laborCost ?? null;
    const explicitTotal = data.totalCost ?? null;
    const computedTotal =
      partsCost != null || laborCost != null ? (partsCost ?? 0) + (laborCost ?? 0) : null;
    const totalCost = explicitTotal ?? computedTotal;
    const servicePlaceId = data.servicePlaceId?.trim() || null;
    if (servicePlaceId) {
      const existingPlace = await prisma.servicePlace.findFirst({
        where: {
          id: servicePlaceId,
          userId: currentUser.userId,
        },
        select: { id: true },
      });
      if (!existingPlace) {
        return NextResponse.json({ error: "Service place not found" }, { status: 404 });
      }
    }

    const serviceEvent = await prisma.$transaction(async (tx) => {
      const nextReminderRaw = data.nextReminderDate?.trim();
      const nextReminderDate =
        data.nextReminderEnabled && nextReminderRaw
          ? new Date(nextReminderRaw)
          : null;

      const created = await createBundleServiceEventInTransaction(tx, {
        vehicleId: id,
        anchorNodeId,
        title: data.title,
        mode: data.mode === "ADVANCED" ? ServiceEventMode.ADVANCED : ServiceEventMode.BASIC,
        entryMode: entryMode === "DETAILED" ? ServiceEventEntryMode.DETAILED : ServiceEventEntryMode.QUICK,
        createdUnderPlan:
          subscription.plan === "PRO"
            ? PlanType.PRO
            : subscription.plan === "RIDER"
              ? PlanType.RIDER
              : PlanType.FREE,
        eventDate,
        odometer: data.odometer,
        engineHours: data.engineHours ?? null,
        partsCost,
        laborCost,
        totalCost,
        currency: data.currency || null,
        comment: data.comment || null,
        performedBy: (data.performedBy as ServicePerformedBy | undefined) ?? null,
        serviceProviderNote: data.serviceProviderNote?.trim() || null,
        installLocationAddress: data.installLocationAddress?.trim() || null,
        installLocationLat: data.installLocationLat ?? null,
        installLocationLng: data.installLocationLng ?? null,
        servicePlaceId,
        servicePlaceSnapshot: data.servicePlaceSnapshot ?? null,
        attachReceiptRequested: data.attachReceiptRequested ?? false,
        attachFileRequested: data.attachFileRequested ?? false,
        nextReminderEnabled: data.nextReminderEnabled ?? false,
        nextReminderDate: data.nextReminderEnabled ? nextReminderDate : null,
        nextReminderOdometer: data.nextReminderEnabled ? (data.nextReminderOdometer ?? null) : null,
        nextReminderEngineHours: data.nextReminderEnabled ? (data.nextReminderEngineHours ?? null) : null,
        installedPartsJson: data.installedPartsJson ?? null,
        items: data.items.map((item) => ({
          nodeId: item.nodeId,
          actionType: item.actionType,
          partName: item.partName ?? null,
          sku: item.sku ?? null,
          quantity: item.quantity ?? null,
          partCost: item.partCost ?? null,
          laborCost: item.laborCost ?? null,
          comment: item.comment ?? null,
        })),
      });
      await syncExpenseItemForServiceEvent(tx, {
        id: created.id,
        vehicleId: created.vehicleId,
        nodeId: created.nodeId,
        eventKind: created.eventKind,
        eventDate: created.eventDate,
        mode: created.mode,
        title: created.title,
        totalCost: created.totalCost,
        currency: created.currency,
        comment: created.comment,
        installedPartsJson: created.installedPartsJson,
        items: created.items?.map((item) => ({
          nodeId: item.nodeId,
          partName: item.partName,
          sku: item.sku,
          quantity: item.quantity,
          partCost: item.partCost,
          laborCost: item.laborCost,
          comment: item.comment,
          node: item.node ? { name: item.node.name } : undefined,
        })),
        createdAt: created.createdAt,
      });
      await linkInstalledExpenseItemsToServiceEvent(tx, {
        vehicleId: id,
        serviceEventId: created.id,
        expenseItemIds: data.installedExpenseItemIds ?? [],
        installedAt: eventDate,
        odometer: created.odometer,
        engineHours: created.engineHours,
      });
      if (subscription.plan === "FREE" && capabilities.maxVisibleServiceEvents != null) {
        await rotateFreeServiceEventsIfNeeded(tx, id);
      }
      return created;
    });

    const suggestFitmentReport = await buildSuggestFitmentReportPayload(prisma, {
      vehicleId: id,
      serviceEventId: serviceEvent.id,
      items: (serviceEvent.items ?? []).map((item) => ({
        nodeId: item.nodeId,
        sku: item.sku,
      })),
    });

    return NextResponse.json(
      {
        serviceEvent: serializeServiceEventRow(serviceEvent as unknown as RawServiceEventRow),
        suggestFitmentReport,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof BodyParseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const currentUserContextError = toCurrentUserContextErrorResponse(error);
    if (currentUserContextError) {
      return currentUserContextError;
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.issues },
        { status: 400 }
      );
    }
    if (error instanceof Error) {
      if (error.message === "Selected expense items are not available for this service event") {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (error.message === "Node not found") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message === "Service events can only be created for the last available node level") {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    console.error("Failed to create service event:", error);
    return NextResponse.json(
      { error: "Failed to create service event" },
      { status: 500 }
    );
  }
}
