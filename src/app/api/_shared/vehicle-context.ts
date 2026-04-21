import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUserContext } from "./current-user-context";

export async function getVehicleInCurrentContext<TSelect extends Prisma.VehicleSelect>(
  vehicleId: string,
  select: TSelect
) {
  const currentUser = await getCurrentUserContext();
  return prisma.vehicle.findFirst({
    where: {
      id: vehicleId,
      garageId: currentUser.garageId,
      garage: {
        ownerUserId: currentUser.userId,
      },
    },
    select,
  });
}

export async function isVehicleInCurrentContext(vehicleId: string): Promise<boolean> {
  const row = await getVehicleInCurrentContext(vehicleId, { id: true });
  return row != null;
}
