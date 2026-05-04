import { NextRequest, NextResponse } from "next/server";
import { ServiceEventMode } from "@prisma/client";
import { z } from "zod";
import {
  SERVICE_EVENT_BUNDLE_INCLUDE,
  createBundleServiceEventInTransaction,
} from "@/lib/bundle-service-event-transaction";
import { syncExpenseItemForServiceEvent } from "@/lib/expense-items";
import { linkInstalledExpenseItemsToServiceEvent } from "@/lib/service-event-expense-links";
import { prisma } from "@/lib/prisma";
import {
  serializeServiceEventRow,
  type RawServiceEventRow,
} from "@/lib/service-event-serialize";
import { getVehicleInCurrentContext } from "../../../_shared/vehicle-context";
import { toCurrentUserContextErrorResponse } from "../../../_shared/current-user-context";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const ACTION_TYPE_VALUES = ["REPLACE", "SERVICE", "INSPECT", "CLEAN", "ADJUST"] as const;

const createServiceBundleItemSchema = z.object({
  nodeId: z.string().trim().min(1),
  actionType: z.enum(ACTION_TYPE_VALUES),
  partName: z.string().trim().nullable().optional(),
  sku: z.string().trim().nullable().optional(),
  quantity: z.number().int().positive().nullable().optional(),
  partCost: z.number().nonnegative().nullable().optional(),
  laborCost: z.number().nonnegative().nullable().optional(),
  comment: z.string().trim().nullable().optional(),
});

const createServiceEventSchema = z
  .object({
    nodeId: z.string().trim().min(1).optional(),
    title: z.string().trim().min(1),
    mode: z.enum(["BASIC", "ADVANCED"]),
    eventDate: z
      .string()
      .trim()
      .min(1)
      .refine((value) => !Number.isNaN(Date.parse(value)), {
        message: "eventDate must be a valid ISO date string",
      }),
    odometer: z.number().int().min(0),
    engineHours: z.number().int().min(0).nullable().optional(),
    installedPartsJson: z.any().nullable().optional(),
    partsCost: z.number().nonnegative().nullable().optional(),
    laborCost: z.number().nonnegative().nullable().optional(),
    totalCost: z.number().nonnegative().nullable().optional(),
    currency: z.string().trim().nullable().optional(),
    comment: z.string().trim().nullable().optional(),
    installedExpenseItemIds: z.array(z.string().trim().min(1)).optional(),
    items: z.array(createServiceBundleItemSchema).min(1),
  })
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
  });

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const vehicle = await getVehicleInCurrentContext(id, { id: true, odometer: true });

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const serviceEvents = await prisma.serviceEvent.findMany({
      where: { vehicleId: id },
      orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
      include: {
        ...SERVICE_EVENT_BUNDLE_INCLUDE,
        expenseItems: {
          include: { node: { select: { id: true, name: true } } },
          orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
        },
      },
    });

    return NextResponse.json({
      serviceEvents: serviceEvents.map((event) => serializeServiceEventRow(event as unknown as RawServiceEventRow)),
    });
  } catch (error) {
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
    const json = await request.json();
    const data = createServiceEventSchema.parse(json);

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

    // Выбираем total: явный → partsCost+laborCost → null.
    const partsCost = data.partsCost ?? null;
    const laborCost = data.laborCost ?? null;
    const explicitTotal = data.totalCost ?? null;
    const computedTotal =
      partsCost != null || laborCost != null ? (partsCost ?? 0) + (laborCost ?? 0) : null;
    const totalCost = explicitTotal ?? computedTotal;

    const serviceEvent = await prisma.$transaction(async (tx) => {
      const created = await createBundleServiceEventInTransaction(tx, {
        vehicleId: id,
        anchorNodeId,
        title: data.title,
        mode: data.mode === "ADVANCED" ? ServiceEventMode.ADVANCED : ServiceEventMode.BASIC,
        eventDate,
        odometer: data.odometer,
        engineHours: data.engineHours ?? null,
        partsCost,
        laborCost,
        totalCost,
        currency: data.currency || null,
        comment: data.comment || null,
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
      return created;
    });

    return NextResponse.json(
      { serviceEvent: serializeServiceEventRow(serviceEvent as unknown as RawServiceEventRow) },
      { status: 201 }
    );
  } catch (error) {
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
