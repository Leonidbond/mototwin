import { Prisma } from "@prisma/client";

export async function linkInstalledExpenseItemsToServiceEvent(
  tx: Prisma.TransactionClient,
  args: {
    vehicleId: string;
    serviceEventId: string;
    expenseItemIds: string[];
    installedAt: Date;
    odometer: number;
    engineHours: number | null;
  }
): Promise<void> {
  const ids = Array.from(new Set(args.expenseItemIds.map((id) => id.trim()).filter(Boolean)));
  if (ids.length === 0) {
    return;
  }

  const expenses = await tx.expenseItem.findMany({
    where: {
      id: { in: ids },
      vehicleId: args.vehicleId,
      purchaseStatus: "PURCHASED",
      installationStatus: "NOT_INSTALLED",
      serviceEventId: null,
    },
    select: {
      id: true,
      shoppingListItemId: true,
    },
  });

  if (expenses.length !== ids.length) {
    throw new Error("Selected expense items are not available for this service event");
  }

  for (const expense of expenses) {
    await tx.expenseItem.update({
      where: { id: expense.id },
      data: {
        serviceEvent: { connect: { id: args.serviceEventId } },
        installStatus: "INSTALLED",
        installationStatus: "INSTALLED",
        installedAt: args.installedAt,
      },
    });
  }

  await tx.$executeRaw`
    UPDATE "expense_items"
    SET
      "odometer" = ${args.odometer},
      "engineHours" = ${args.engineHours}
    WHERE "id" IN (${Prisma.join(ids)})
      AND "vehicleId" = ${args.vehicleId}
  `;

  const wishlistItemIds = expenses
    .map((expense) => expense.shoppingListItemId)
    .filter((id): id is string => Boolean(id));

  if (wishlistItemIds.length > 0) {
    await tx.partWishlistItem.updateMany({
      where: {
        id: { in: wishlistItemIds },
        vehicleId: args.vehicleId,
      },
      data: { status: "INSTALLED" },
    });
  }
}
