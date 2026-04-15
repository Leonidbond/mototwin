-- CreateEnum
CREATE TYPE "MaintenanceTriggerMode" AS ENUM ('WHICHEVER_COMES_FIRST', 'ANY', 'ALL');

-- CreateTable
CREATE TABLE "node_maintenance_rules" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "intervalKm" INTEGER,
    "intervalHours" INTEGER,
    "intervalDays" INTEGER,
    "triggerMode" "MaintenanceTriggerMode" NOT NULL,
    "warningKm" INTEGER,
    "warningHours" INTEGER,
    "warningDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "node_maintenance_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "node_maintenance_rules_nodeId_idx" ON "node_maintenance_rules"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "node_maintenance_rules_nodeId_key" ON "node_maintenance_rules"("nodeId");

-- AddForeignKey
ALTER TABLE "node_maintenance_rules" ADD CONSTRAINT "node_maintenance_rules_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
