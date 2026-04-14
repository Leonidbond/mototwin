import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const createServiceEventSchema = z.object({
  node: z.string().trim().min(1),
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
      select: { id: true },
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const serviceEvents = await prisma.serviceEvent.findMany({
      where: { vehicleId: id },
      orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
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
      select: { id: true },
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const serviceEvent = await prisma.serviceEvent.create({
      data: {
        vehicleId: id,
        node: data.node,
        eventDate: new Date(data.eventDate),
        odometer: data.odometer,
        engineHours: data.engineHours ?? null,
        serviceType: data.serviceType,
        installedPartsJson: data.installedPartsJson ?? null,
        costAmount: data.costAmount ?? null,
        currency: data.currency || null,
        comment: data.comment || null,
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
