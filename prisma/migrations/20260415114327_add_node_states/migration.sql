-- CreateEnum
CREATE TYPE "NodeStatus" AS ENUM ('OK', 'SOON', 'OVERDUE', 'RECENTLY_REPLACED');

-- CreateTable
CREATE TABLE "node_states" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "status" "NodeStatus" NOT NULL,
    "lastServiceEventId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "node_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "node_states_vehicleId_idx" ON "node_states"("vehicleId");

-- CreateIndex
CREATE INDEX "node_states_nodeId_idx" ON "node_states"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "node_states_vehicleId_nodeId_key" ON "node_states"("vehicleId", "nodeId");

-- AddForeignKey
ALTER TABLE "node_states" ADD CONSTRAINT "node_states_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "node_states" ADD CONSTRAINT "node_states_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
