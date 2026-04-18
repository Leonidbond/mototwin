import { NextRequest, NextResponse } from "next/server";
import { TopNodeStatus } from "@prisma/client";
import { z } from "zod";
import { calculateRootEffectiveStatus, type NodeMaintenanceRuleView, type LatestServiceEventView } from "@/lib/maintenance-status";
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
      const createdServiceEvent = await tx.serviceEvent.create({
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

      await tx.nodeState.upsert({
        where: {
          vehicleId_nodeId: {
            vehicleId: id,
            nodeId: data.nodeId,
          },
        },
        update: {
          status: "RECENTLY_REPLACED",
          lastServiceEventId: createdServiceEvent.id,
          note: null,
        },
        create: {
          vehicleId: id,
          nodeId: data.nodeId,
          status: "RECENTLY_REPLACED",
          lastServiceEventId: createdServiceEvent.id,
          note: null,
        },
      });

      const vehicleState = await tx.vehicle.findUnique({
        where: { id },
        select: { odometer: true, engineHours: true },
      });

      if (!vehicleState) {
        throw new Error("Vehicle not found");
      }

      const allNodes = await tx.node.findMany({
        select: { id: true, parentId: true },
      });

      const descendantIds = new Set<string>([currentNodeId]);
      let expanded = true;
      while (expanded) {
        expanded = false;
        for (const candidate of allNodes) {
          if (!candidate.parentId) {
            continue;
          }
          if (descendantIds.has(candidate.parentId) && !descendantIds.has(candidate.id)) {
            descendantIds.add(candidate.id);
            expanded = true;
          }
        }
      }

      const descendantNodeIds = [...descendantIds];
      const subtreeNodeStates = await tx.nodeState.findMany({
        where: {
          vehicleId: id,
          nodeId: { in: descendantNodeIds },
        },
        select: { nodeId: true, status: true },
      });
      const nodeStateByNodeId = new Map<string, { status: string | null }>(
        subtreeNodeStates.map((state) => [state.nodeId, { status: state.status }])
      );

      const nodeMaintenanceRuleModel = (tx as typeof tx & {
        nodeMaintenanceRule?: {
          findMany: typeof tx.nodeState.findMany;
        };
      }).nodeMaintenanceRule;

      const maintenanceRules = nodeMaintenanceRuleModel
        ? await nodeMaintenanceRuleModel.findMany({
            where: { nodeId: { in: descendantNodeIds } },
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
          vehicleId: id,
          nodeId: { in: descendantNodeIds },
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

      const effectiveTopNodeStatus = calculateRootEffectiveStatus({
        rootNodeId: currentNodeId,
        nodes: allNodes.map((item) => ({ id: item.id, parentId: item.parentId })),
        nodeStateByNodeId,
        maintenanceRuleByNodeId,
        latestServiceEventByNodeId,
        currentOdometer: vehicleState.odometer,
        currentEngineHours: vehicleState.engineHours,
        now: new Date(),
      });

      if (!effectiveTopNodeStatus) {
        throw new Error("Failed to calculate top node status");
      }

      const persistedTopNodeStatus =
        effectiveTopNodeStatus === "OVERDUE"
          ? TopNodeStatus.OVERDUE
          : effectiveTopNodeStatus === "SOON"
            ? TopNodeStatus.SOON
            : effectiveTopNodeStatus === "RECENTLY_REPLACED"
              ? TopNodeStatus.RECENTLY_REPLACED
              : TopNodeStatus.OK;

      const shouldLinkLastServiceEvent = persistedTopNodeStatus === TopNodeStatus.RECENTLY_REPLACED;

      await tx.topNodeState.upsert({
        where: {
          vehicleId_nodeId: {
            vehicleId: id,
            nodeId: currentNodeId,
          },
        },
        update: {
          status: persistedTopNodeStatus,
          lastServiceEventId: shouldLinkLastServiceEvent ? createdServiceEvent.id : null,
        },
        create: {
          vehicleId: id,
          nodeId: currentNodeId,
          status: persistedTopNodeStatus,
          lastServiceEventId: shouldLinkLastServiceEvent ? createdServiceEvent.id : null,
          note: null,
        },
      });

      return createdServiceEvent;
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
