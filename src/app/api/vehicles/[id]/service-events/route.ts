import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

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
});

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      select: { id: true, odometer: true },
    });

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
      },
    });

    return NextResponse.json({ serviceEvents });
  } catch (error) {
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

    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      select: { id: true, odometer: true },
    });

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

    let currentNodeId = node.id;
    let currentParentId = node.parentId;

    while (currentParentId) {
      const parentNode = await prisma.node.findUnique({
        where: { id: currentParentId },
        select: { id: true, parentId: true },
      });

      if (!parentNode) {
        return NextResponse.json({ error: "Node not found" }, { status: 404 });
      }

      currentNodeId = parentNode.id;
      currentParentId = parentNode.parentId;
    }

    const topNodeState = await prisma.topNodeState.findUnique({
      where: {
        vehicleId_nodeId: {
          vehicleId: id,
          nodeId: currentNodeId,
        },
      },
      select: { id: true },
    });

    if (!topNodeState) {
      return NextResponse.json(
        { error: "Top node state not found for this vehicle" },
        { status: 400 }
      );
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

    const serviceEvent = await prisma.serviceEvent.create({
      data: {
        vehicleId: id,
        nodeId: data.nodeId,
        eventDate,
        odometer: data.odometer,
        engineHours: data.engineHours ?? null,
        serviceType: data.serviceType,
        installedPartsJson: data.installedPartsJson ?? null,
        costAmount: data.costAmount ?? null,
        currency: data.currency || null,
        comment: data.comment || null,
      },
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
      },
    });

    await prisma.topNodeState.update({
      where: {
        vehicleId_nodeId: {
          vehicleId: id,
          nodeId: currentNodeId,
        },
      },
      data: {
        status: "RECENTLY_REPLACED",
        lastServiceEventId: serviceEvent.id,
      },
    });

    return NextResponse.json({ serviceEvent }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.issues },
        { status: 400 }
      );
    }

    console.error("Failed to create service event:", error);
    return NextResponse.json(
      { error: "Failed to create service event" },
      { status: 500 }
    );
  }
}
