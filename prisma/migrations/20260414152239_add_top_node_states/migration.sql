-- CreateEnum
CREATE TYPE "TopNodeStatus" AS ENUM ('OK', 'SOON', 'OVERDUE', 'RECENTLY_REPLACED');

-- CreateTable
CREATE TABLE "top_node_states" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "nodeCode" TEXT NOT NULL,
    "nodeName" TEXT NOT NULL,
    "status" "TopNodeStatus" NOT NULL,
    "lastServiceEventId" TEXT,
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "top_node_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "top_node_states_vehicleId_idx" ON "top_node_states"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "top_node_states_vehicleId_nodeCode_key" ON "top_node_states"("vehicleId", "nodeCode");

-- AddForeignKey
ALTER TABLE "top_node_states" ADD CONSTRAINT "top_node_states_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
