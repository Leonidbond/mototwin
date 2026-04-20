import { NextRequest, NextResponse } from "next/server";
import { Prisma, TopNodeStatus } from "@prisma/client";
import { z } from "zod";
import {
  calculateAllRootEffectiveStatuses,
  type LatestServiceEventView,
  type NodeMaintenanceRuleView,
} from "@/lib/maintenance-status";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
    eventId: string;
  }>;
};

const updateServiceEventSchema = z
  .object({
    nodeId: z.string().trim().min(1),
    eventDate: z
      .string()
      .trim()
      .min(1)
      .refine((value) => !Number.isNaN(Date.parse(value)), {
        message: "eventDate must be a valid ISO date string",
      }),
    odometer: z.number().int().min(0).optional(),
    engineHours: z.number().int().min(0).nullable().optional(),
    serviceType: z.string().trim().min(1),
    installedPartsJson: z.unknown().nullable().optional(),
    costAmount: z.number().min(0).nullable().optional(),
    currency: z.string().trim().nullable().optional(),
    comment: z.string().trim().nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.costAmount != null && !value.currency?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["currency"],
        message: "currency is required when costAmount is provided",
      });
    }
  });

type MutableTx = Prisma.TransactionClient;

function mapToPersistedTopNodeStatus(status: string | null, fallback: TopNodeStatus): TopNodeStatus {
  if (status === "OVERDUE") {
    return TopNodeStatus.OVERDUE;
  }
  if (status === "SOON") {
    return TopNodeStatus.SOON;
  }
  if (status === "RECENTLY_REPLACED") {
    return TopNodeStatus.RECENTLY_REPLACED;
  }
  if (status === "OK") {
    return TopNodeStatus.OK;
  }
  return fallback;
}

async function syncNodeStateForLeafNode(tx: MutableTx, vehicleId: string, nodeId: string) {
  const latestServiceEvent = await tx.serviceEvent.findFirst({
    where: {
      vehicleId,
      nodeId,
      eventKind: "SERVICE",
    },
    orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
    select: { id: true },
  });

  if (!latestServiceEvent) {
    await tx.nodeState.deleteMany({
      where: {
        vehicleId,
        nodeId,
      },
    });
    return;
  }

  await tx.nodeState.upsert({
    where: {
      vehicleId_nodeId: {
        vehicleId,
        nodeId,
      },
    },
    update: {
      status: "RECENTLY_REPLACED",
      lastServiceEventId: latestServiceEvent.id,
      note: null,
    },
    create: {
      vehicleId,
      nodeId,
      status: "RECENTLY_REPLACED",
      lastServiceEventId: latestServiceEvent.id,
      note: null,
    },
  });
}

async function recomputeTopNodeStates(tx: MutableTx, vehicleId: string) {
  const vehicle = await tx.vehicle.findUnique({
    where: { id: vehicleId },
    select: { id: true, odometer: true, engineHours: true },
  });
  if (!vehicle) {
    throw new Error("Vehicle not found");
  }

  const allNodes = await tx.node.findMany({
    select: { id: true, parentId: true },
  });

  const nodeStates = await tx.nodeState.findMany({
    where: { vehicleId },
    select: { nodeId: true, status: true },
  });
  const nodeStateByNodeId = new Map<string, { status: string | null }>(
    nodeStates.map((state) => [state.nodeId, { status: state.status }])
  );

  const nodeMaintenanceRuleModel = (tx as MutableTx & {
    nodeMaintenanceRule?: {
      findMany: typeof tx.nodeState.findMany;
    };
  }).nodeMaintenanceRule;
  const maintenanceRules = nodeMaintenanceRuleModel
    ? await nodeMaintenanceRuleModel.findMany({
        select: {
          nodeId: true,
          triggerMode: true,
          intervalKm: true,
          intervalHours: true,
          intervalDays: true,
          warningKm: true,
          warningHours: true,
          warningDays: true,
          isActive: true,
        },
      })
    : [];
  const maintenanceRuleByNodeId = new Map<string, NodeMaintenanceRuleView>(
    maintenanceRules.map((rule) => [
      rule.nodeId,
      {
        triggerMode: rule.triggerMode,
        intervalKm: rule.intervalKm,
        intervalHours: rule.intervalHours,
        intervalDays: rule.intervalDays,
        warningKm: rule.warningKm,
        warningHours: rule.warningHours,
        warningDays: rule.warningDays,
        isActive: rule.isActive,
      },
    ])
  );

  const serviceEvents = await tx.serviceEvent.findMany({
    where: {
      vehicleId,
      eventKind: "SERVICE",
    },
    orderBy: [{ nodeId: "asc" }, { eventDate: "desc" }, { createdAt: "desc" }],
    select: { nodeId: true, eventDate: true, odometer: true, engineHours: true },
  });
  const latestServiceEventByNodeId = new Map<string, LatestServiceEventView>();
  for (const serviceEventItem of serviceEvents) {
    if (!latestServiceEventByNodeId.has(serviceEventItem.nodeId)) {
      latestServiceEventByNodeId.set(serviceEventItem.nodeId, {
        eventDate: serviceEventItem.eventDate,
        odometer: serviceEventItem.odometer,
        engineHours: serviceEventItem.engineHours,
      });
    }
  }

  const existingTopNodeStates = await tx.topNodeState.findMany({
    where: { vehicleId },
    select: { nodeId: true, status: true },
  });
  const fallbackStatusByRootId = new Map(
    existingTopNodeStates.map((state) => [state.nodeId, state.status])
  );

  const calculatedTopNodeStatuses = calculateAllRootEffectiveStatuses({
    nodes: allNodes,
    nodeStateByNodeId,
    maintenanceRuleByNodeId,
    latestServiceEventByNodeId,
    currentOdometer: vehicle.odometer,
    currentEngineHours: vehicle.engineHours,
    now: new Date(),
  });

  for (const calculatedStatus of calculatedTopNodeStatuses) {
    const fallback = fallbackStatusByRootId.get(calculatedStatus.rootNodeId) ?? TopNodeStatus.OK;
    const persistedStatus = mapToPersistedTopNodeStatus(calculatedStatus.effectiveStatus, fallback);
    await tx.topNodeState.upsert({
      where: {
        vehicleId_nodeId: {
          vehicleId,
          nodeId: calculatedStatus.rootNodeId,
        },
      },
      update: {
        status: persistedStatus,
      },
      create: {
        vehicleId,
        nodeId: calculatedStatus.rootNodeId,
        status: persistedStatus,
        lastServiceEventId: null,
        note: null,
      },
    });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id: vehicleId, eventId } = await context.params;
    const payload = updateServiceEventSchema.parse(await request.json());

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { id: true, odometer: true },
    });
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

    const nextNode = await prisma.node.findUnique({
      where: { id: payload.nodeId },
      select: { id: true },
    });
    if (!nextNode) {
      return NextResponse.json({ error: "Node not found" }, { status: 404 });
    }

    const childCount = await prisma.node.count({
      where: { parentId: payload.nodeId },
    });
    if (childCount > 0) {
      return NextResponse.json(
        { error: "Service events can only be linked to a leaf node" },
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

    const updatedServiceEvent = await prisma.$transaction(async (tx) => {
      const updated = await tx.serviceEvent.update({
        where: { id: existingServiceEvent.id },
        data: {
          nodeId: payload.nodeId,
          eventDate,
          odometer: nextOdometer,
          engineHours: payload.engineHours ?? null,
          serviceType: payload.serviceType.trim(),
          installedPartsJson:
            payload.installedPartsJson === null || payload.installedPartsJson === undefined
              ? Prisma.JsonNull
              : payload.installedPartsJson,
          costAmount: payload.costAmount ?? null,
          currency: payload.costAmount != null ? payload.currency?.trim().toUpperCase() ?? null : null,
          comment: payload.comment || null,
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

      const affectedNodeIds = new Set<string>([existingServiceEvent.nodeId, payload.nodeId]);
      for (const nodeId of affectedNodeIds) {
        await syncNodeStateForLeafNode(tx, vehicleId, nodeId);
      }
      await recomputeTopNodeStates(tx, vehicleId);

      return updated;
    });

    return NextResponse.json({ serviceEvent: updatedServiceEvent });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.issues },
        { status: 400 }
      );
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

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { id: true },
    });
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

    await prisma.$transaction(async (tx) => {
      await tx.serviceEvent.delete({
        where: { id: serviceEvent.id },
      });

      await syncNodeStateForLeafNode(tx, vehicleId, serviceEvent.nodeId);
      await recomputeTopNodeStates(tx, vehicleId);
    });

    return NextResponse.json({
      deleted: true as const,
      eventId: serviceEvent.id,
      affectedNodeId: serviceEvent.nodeId,
    });
  } catch (error) {
    console.error("Failed to delete service event:", error);
    return NextResponse.json(
      { error: "Failed to delete service event" },
      { status: 500 }
    );
  }
}
