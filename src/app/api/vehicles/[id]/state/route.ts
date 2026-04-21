import { NextRequest, NextResponse } from "next/server";
import { Prisma, TopNodeStatus } from "@prisma/client";
import { z } from "zod";
import {
  calculateAllRootEffectiveStatuses,
  type LatestServiceEventView,
  type NodeMaintenanceRuleView,
} from "@/lib/maintenance-status";
import { prisma } from "@/lib/prisma";
import { getVehicleInCurrentContext } from "../../../_shared/vehicle-context";
import { toCurrentUserContextErrorResponse } from "../../../_shared/current-user-context";

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

    const vehicle = await getVehicleInCurrentContext(id, { id: true });

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
          installedPartsJson: Prisma.JsonNull,
          costAmount: null,
          currency: null,
          comment: "Системная запись: обновлено текущее состояние мотоцикла",
        },
      });

      const allNodes = await tx.node.findMany({
        select: { id: true, parentId: true },
      });

      const nodeStates = await tx.nodeState.findMany({
        where: { vehicleId: id },
        select: { nodeId: true, status: true },
      });
      const nodeStateByNodeId = new Map<string, { status: string | null }>(
        nodeStates.map((state) => [state.nodeId, { status: state.status }])
      );

      const nodeMaintenanceRuleModel = (tx as typeof tx & {
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
        where: { vehicleId: id },
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
        where: { vehicleId: id },
        select: { nodeId: true, status: true },
      });
      const existingTopNodeStatusByNodeId = new Map(
        existingTopNodeStates.map((item) => [item.nodeId, item.status])
      );

      const calculatedTopNodeStatuses = calculateAllRootEffectiveStatuses({
        nodes: allNodes,
        nodeStateByNodeId,
        maintenanceRuleByNodeId,
        latestServiceEventByNodeId,
        currentOdometer: vehicleAfterUpdate.odometer,
        currentEngineHours: vehicleAfterUpdate.engineHours,
        now: new Date(),
      });

      const toPersistedTopNodeStatus = (
        effectiveStatus: string | null,
        fallbackStatus: TopNodeStatus | null
      ): TopNodeStatus => {
        if (effectiveStatus === "OVERDUE") {
          return TopNodeStatus.OVERDUE;
        }
        if (effectiveStatus === "SOON") {
          return TopNodeStatus.SOON;
        }
        if (effectiveStatus === "RECENTLY_REPLACED") {
          return TopNodeStatus.RECENTLY_REPLACED;
        }
        if (effectiveStatus === "OK") {
          return TopNodeStatus.OK;
        }

        return fallbackStatus ?? TopNodeStatus.OK;
      };

      for (const calculatedStatus of calculatedTopNodeStatuses) {
        const fallbackStatus =
          existingTopNodeStatusByNodeId.get(calculatedStatus.rootNodeId) ?? null;
        const persistedStatus = toPersistedTopNodeStatus(
          calculatedStatus.effectiveStatus,
          fallbackStatus
        );

        await tx.topNodeState.upsert({
          where: {
            vehicleId_nodeId: {
              vehicleId: id,
              nodeId: calculatedStatus.rootNodeId,
            },
          },
          update: {
            status: persistedStatus,
          },
          create: {
            vehicleId: id,
            nodeId: calculatedStatus.rootNodeId,
            status: persistedStatus,
            lastServiceEventId: null,
            note: null,
          },
        });
      }

      return vehicleAfterUpdate;
    });

    return NextResponse.json({ vehicle: updatedVehicle });
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

    console.error("Failed to update vehicle state:", error);
    return NextResponse.json(
      { error: "Failed to update vehicle state" },
      { status: 500 }
    );
  }
}
