-- CreateEnum
CREATE TYPE "PartWishlistItemStatus" AS ENUM ('NEEDED', 'ORDERED', 'BOUGHT', 'INSTALLED');

-- CreateTable
CREATE TABLE "part_wishlist_items" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "nodeId" TEXT,
    "title" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" "PartWishlistItemStatus" NOT NULL DEFAULT 'NEEDED',
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "part_wishlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "part_wishlist_items_vehicleId_idx" ON "part_wishlist_items"("vehicleId");

-- CreateIndex
CREATE INDEX "part_wishlist_items_nodeId_idx" ON "part_wishlist_items"("nodeId");

-- CreateIndex
CREATE INDEX "part_wishlist_items_status_idx" ON "part_wishlist_items"("status");

-- AddForeignKey
ALTER TABLE "part_wishlist_items" ADD CONSTRAINT "part_wishlist_items_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_wishlist_items" ADD CONSTRAINT "part_wishlist_items_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
