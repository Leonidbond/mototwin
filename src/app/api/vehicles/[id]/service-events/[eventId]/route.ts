import { NextRequest, NextResponse } from "next/server";
import { ServiceEventMode } from "@prisma/client";
import { z } from "zod";
import {
  recomputeTopNodeStates,
  syncNodeStateForLeafNode,
  updateBundleServiceEventInTransaction,
} from "@/lib/bundle-service-event-transaction";
import { syncExpenseItemForServiceEvent } from "@/lib/expense-items";
import { linkInstalledExpenseItemsToServiceEvent } from "@/lib/service-event-expense-links";
import { prisma } from "@/lib/prisma";
import {
  serializeServiceEventRow,
  type RawServiceEventRow,
} from "@/lib/service-event-serialize";
import { getVehicleInCurrentContext } from "../../../../_shared/vehicle-context";
import { toCurrentUserContextErrorResponse } from "../../../../_shared/current-user-context";

type RouteContext = {
  params: Promise<{
    id: string;
    eventId: string;
  }>;
};

const ACTION_TYPE_VALUES = ["REPLACE", "SERVICE", "INSPECT", "CLEAN", "ADJUST"] as const;

const updateServiceBundleItemSchema = z.object({
  nodeId: z.string().trim().min(1),
  actionType: z.enum(ACTION_TYPE_VALUES),
  partName: z.string().trim().nullable().optional(),
  sku: z.string().trim().nullable().optional(),
  quantity: z.number().int().positive().nullable().optional(),
  partCost: z.number().nonnegative().nullable().optional(),
  laborCost: z.number().nonnegative().nullable().optional(),
  comment: z.string().trim().nullable().optional(),
});

const updateServiceEventSchema = z
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
    odometer: z.number().int().min(0).optional(),
    engineHours: z.number().int().min(0).nullable().optional(),
    installedPartsJson: z.unknown().nullable().optional(),
    partsCost: z.number().nonnegative().nullable().optional(),
    laborCost: z.number().nonnegative().nullable().optional(),
    totalCost: z.number().nonnegative().nullable().optional(),
    currency: z.string().trim().nullable().optional(),
    comment: z.string().trim().nullable().optional(),
    installedExpenseItemIds: z.array(z.string().trim().min(1)).optional(),
    items: z.array(updateServiceBundleItemSchema).min(1),
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
    if (value.totalCost != null && !value.currency?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["currency"],
        message: "currency is required when totalCost is provided",
      });
    }
  });

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id: vehicleId, eventId } = await context.params;
    const payload = updateServiceEventSchema.parse(await request.json());

    const vehicle = await getVehicleInCurrentContext(vehicleId, { id: true, odometer: true });
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const existingServiceEvent = await prisma.serviceEvent.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        vehicleId: true,
        nodeId: true,
        eventKind: true,
        odometer: true,
      },
    });
    if (!existingServiceEvent || existingServiceEvent.vehicleId !== vehicleId) {
      return NextResponse.json({ error: "Service event not found" }, { status: 404 });
    }
    if (existingServiceEvent.eventKind !== "SERVICE") {
      return NextResponse.json(
        { error: "Only SERVICE events are editable in this flow" },
        { status: 400 }
      );
    }

    const eventDate = new Date(payload.eventDate);
    if (eventDate.getTime() > Date.now()) {
      return NextResponse.json(
        { error: "Event date cannot be in the future" },
        { status: 400 }
      );
    }

    const nextOdometer = payload.odometer ?? existingServiceEvent.odometer;
    if (nextOdometer > vehicle.odometer) {
      return NextResponse.json(
        {
          error: `Event odometer cannot be greater than current vehicle odometer (${vehicle.odometer})`,
        },
        { status: 400 }
      );
    }

    const anchorNodeId = (payload.nodeId ?? payload.items[0]?.nodeId)?.trim();
    if (!anchorNodeId) {
      return NextResponse.json({ error: "Anchor nodeId required" }, { status: 400 });
    }

    const partsCost = payload.partsCost ?? null;
    const laborCost = payload.laborCost ?? null;
    const explicitTotal = payload.totalCost ?? null;
    const computedTotal =
      partsCost != null || laborCost != null ? (partsCost ?? 0) + (laborCost ?? 0) : null;
    const totalCost = explicitTotal ?? computedTotal;

    const updatedServiceEvent = await prisma.$transaction(async (tx) => {
      const updated = await updateBundleServiceEventInTransaction(tx, eventId, {
        vehicleId,
        anchorNodeId,
        title: payload.title,
        mode: payload.mode === "ADVANCED" ? ServiceEventMode.ADVANCED : ServiceEventMode.BASIC,
        eventDate,
        odometer: nextOdometer,
        engineHours: payload.engineHours ?? null,
        partsCost,
        laborCost,
        totalCost,
        currency:
          totalCost != null
            ? (payload.currency?.trim().toUpperCase() ?? null)
            : payload.currency?.trim().toUpperCase() ?? null,
        comment: payload.comment || null,
        installedPartsJson:
          payload.installedPartsJson === null || payload.installedPartsJson === undefined
            ? null
            : (payload.installedPartsJson as Parameters<typeof updateBundleServiceEventInTransaction>[2]["installedPartsJson"]),
        items: payload.items.map((item) => ({
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
        id: updated.id,
        vehicleId: updated.vehicleId,
        nodeId: updated.nodeId,
        eventKind: updated.eventKind,
        eventDate: updated.eventDate,
        mode: updated.mode,
        title: updated.title,
        totalCost: updated.totalCost,
        currency: updated.currency,
        comment: updated.comment,
        installedPartsJson: updated.installedPartsJson,
        items: updated.items?.map((item) => ({
          nodeId: item.nodeId,
          partName: item.partName,
          sku: item.sku,
          quantity: item.quantity,
          partCost: item.partCost,
          laborCost: item.laborCost,
          comment: item.comment,
          node: item.node ? { name: item.node.name } : undefined,
        })),
        createdAt: updated.createdAt,
      });
      await linkInstalledExpenseItemsToServiceEvent(tx, {
        vehicleId,
        serviceEventId: updated.id,
        expenseItemIds: payload.installedExpenseItemIds ?? [],
        installedAt: eventDate,
        odometer: updated.odometer,
        engineHours: updated.engineHours,
      });

      return updated;
    });

    return NextResponse.json({
      serviceEvent: serializeServiceEventRow(updatedServiceEvent as unknown as RawServiceEventRow),
    });
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
        return NextResponse.json(
          { error: "Service events can only be linked to a leaf node" },
          { status: 400 }
        );
      }
    }

    console.error("Failed to update service event:", error);
    return NextResponse.json(
      { error: "Failed to update service event" },
      { status: 500 }
    );
  }
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  try {
    const { id: vehicleId, eventId } = await context.params;

    const vehicle = await getVehicleInCurrentContext(vehicleId, { id: true });
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const serviceEvent = await prisma.serviceEvent.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        vehicleId: true,
        nodeId: true,
        eventKind: true,
        items: { select: { nodeId: true } },
      },
    });
    if (!serviceEvent || serviceEvent.vehicleId !== vehicleId) {
      return NextResponse.json({ error: "Service event not found" }, { status: 404 });
    }
    if (serviceEvent.eventKind !== "SERVICE") {
      return NextResponse.json(
        { error: "Only SERVICE events are deletable in this flow" },
        { status: 400 }
      );
    }

    const affectedNodeIds = new Set<string>([serviceEvent.nodeId, ...serviceEvent.items.map((item) => item.nodeId)]);

    await prisma.$transaction(async (tx) => {
      const expenseDb = tx as unknown as {
        expenseItem: { deleteMany(args: unknown): Promise<unknown> };
      };
      await expenseDb.expenseItem.deleteMany({ where: { serviceEventId: serviceEvent.id } });
      // Items сами каскадятся (onDelete: Cascade); удаляем event целиком.
      await tx.serviceEvent.delete({
        where: { id: serviceEvent.id },
      });

      for (const nodeId of affectedNodeIds) {
        await syncNodeStateForLeafNode(tx, vehicleId, nodeId);
      }
      await recomputeTopNodeStates(tx, vehicleId);
    });

    return NextResponse.json({
      deleted: true as const,
      eventId: serviceEvent.id,
      affectedNodeId: serviceEvent.nodeId,
      affectedNodeIds: Array.from(affectedNodeIds),
    });
  } catch (error) {
    const currentUserContextError = toCurrentUserContextErrorResponse(error);
    if (currentUserContextError) {
      return currentUserContextError;
    }
    console.error("Failed to delete service event:", error);
    return NextResponse.json(
      { error: "Failed to delete service event" },
      { status: 500 }
    );
  }
}
