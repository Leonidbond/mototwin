import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const updateVehicleStateSchema = z.object({
  odometer: z.number().int().min(0),
  engineHours: z.number().int().min(0).nullable(),
});

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const json = await request.json();
    const data = updateVehicleStateSchema.parse(json);

    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const stateUpdateLogNode = await prisma.node.findFirst({
      orderBy: [{ level: "asc" }, { displayOrder: "asc" }, { code: "asc" }],
      select: { id: true },
    });

    if (!stateUpdateLogNode) {
      return NextResponse.json(
        { error: "No node available for state update log entry" },
        { status: 400 }
      );
    }

    const updatedVehicle = await prisma.$transaction(async (tx) => {
      const vehicleAfterUpdate = await tx.vehicle.update({
        where: { id },
        data: {
          odometer: data.odometer,
          engineHours: data.engineHours,
        },
        select: {
          id: true,
          odometer: true,
          engineHours: true,
          updatedAt: true,
        },
      });

      await tx.serviceEvent.create({
        data: {
          vehicleId: id,
          eventKind: "STATE_UPDATE",
          nodeId: stateUpdateLogNode.id,
          eventDate: new Date(),
          odometer: vehicleAfterUpdate.odometer,
          engineHours: vehicleAfterUpdate.engineHours,
          serviceType: "Vehicle state updated",
          installedPartsJson: null,
          costAmount: null,
          currency: null,
          comment: "Системная запись: обновлено текущее состояние мотоцикла",
        },
      });

      return vehicleAfterUpdate;
    });

    return NextResponse.json({ vehicle: updatedVehicle });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.issues },
        { status: 400 }
      );
    }

    console.error("Failed to update vehicle state:", error);
    return NextResponse.json(
      { error: "Failed to update vehicle state" },
      { status: 500 }
    );
  }
}
