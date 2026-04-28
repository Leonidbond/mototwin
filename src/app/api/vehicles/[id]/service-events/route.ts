import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { ExpenseItem } from "@mototwin/types";
import { createLeafServiceEventInTransaction } from "@/lib/leaf-service-event-transaction";
import { syncExpenseItemForServiceEvent } from "@/lib/expense-items";
import { linkInstalledExpenseItemsToServiceEvent } from "@/lib/service-event-expense-links";
import { prisma } from "@/lib/prisma";
import { getVehicleInCurrentContext } from "../../../_shared/vehicle-context";
import { toCurrentUserContextErrorResponse } from "../../../_shared/current-user-context";

function normalizeServiceEventPartSku(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  const t = value.trim().slice(0, 200);
  return t.length > 0 ? t : null;
}

function normalizeServiceEventPartName(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  const t = value.trim().slice(0, 500);
  return t.length > 0 ? t : null;
}

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const createServiceEventSchema = z.object({
  nodeId: z.string().trim().min(1),
  eventDate: z
    .string()
    .trim()
    .min(1)
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: "eventDate must be a valid ISO date string",
    }),
  odometer: z.number().int().min(0),
  engineHours: z.number().int().min(0).nullable().optional(),
  serviceType: z.string().trim().min(1),
  installedPartsJson: z.any().nullable().optional(),
  costAmount: z.number().nullable().optional(),
  currency: z.string().trim().nullable().optional(),
  comment: z.string().trim().nullable().optional(),
  partSku: z.union([z.string(), z.null()]).optional(),
  partName: z.union([z.string(), z.null()]).optional(),
  installedExpenseItemIds: z.array(z.string().trim().min(1)).optional(),
});

function expenseItemToWire(row: {
  amount: { toString(): string } | number;
  expenseDate: Date;
  purchasedAt: Date | null;
  installedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: unknown;
}): ExpenseItem {
  return {
    ...(row as unknown as Omit<ExpenseItem, "amount" | "expenseDate" | "purchasedAt" | "installedAt" | "createdAt" | "updatedAt">),
    amount: Number(row.amount),
    expenseDate: row.expenseDate.toISOString(),
    purchasedAt: row.purchasedAt?.toISOString() ?? null,
    installedAt: row.installedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

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
        node: {
          select: {
            id: true,
            code: true,
            name: true,
            level: true,
            displayOrder: true,
          },
        },
        expenseItems: {
          include: { node: { select: { id: true, name: true } } },
          orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
        },
      },
    });

    return NextResponse.json({
      serviceEvents: serviceEvents.map((event) => ({
        ...event,
        expenseItems: event.expenseItems.map(expenseItemToWire),
      })),
    });
  } catch (error) {
    const currentUserContextError = toCurrentUserContextErrorResponse(error);
    if (currentUserContextError) {
      return currentUserContextError;
    }
    console.error("Failed to fetch service events:", error);
    return NextResponse.json(
      { error: "Failed to fetch service events" },
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

    const node = await prisma.node.findUnique({
      where: { id: data.nodeId },
      select: { id: true, parentId: true },
    });

    if (!node) {
      return NextResponse.json({ error: "Node not found" }, { status: 404 });
    }

    const nodeChildrenCount = await prisma.node.count({
      where: { parentId: node.id },
    });

    if (nodeChildrenCount > 0) {
      return NextResponse.json(
        {
          error: "Service events can only be created for the last available node level",
        },
        { status: 400 }
      );
    }

    let parentWalker = node.parentId;
    while (parentWalker) {
      const parentNode = await prisma.node.findUnique({
        where: { id: parentWalker },
        select: { id: true, parentId: true },
      });

      if (!parentNode) {
        return NextResponse.json({ error: "Node not found" }, { status: 404 });
      }

      parentWalker = parentNode.parentId;
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

    const serviceEvent = await prisma.$transaction(async (tx) => {
      const created = await createLeafServiceEventInTransaction(tx, {
        vehicleId: id,
        leafNodeId: data.nodeId,
        eventDate,
        odometer: data.odometer,
        engineHours: data.engineHours ?? null,
        serviceType: data.serviceType,
        installedPartsJson: data.installedPartsJson ?? null,
        costAmount: data.costAmount ?? null,
        currency: data.currency || null,
        comment: data.comment || null,
        partSku: normalizeServiceEventPartSku(data.partSku),
        partName: normalizeServiceEventPartName(data.partName),
      });
      await syncExpenseItemForServiceEvent(tx, created);
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

    return NextResponse.json({ serviceEvent }, { status: 201 });
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
    if (
      error instanceof Error &&
      error.message === "Selected expense items are not available for this service event"
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Failed to create service event:", error);
    return NextResponse.json(
      { error: "Failed to create service event" },
      { status: 500 }
    );
  }
}
