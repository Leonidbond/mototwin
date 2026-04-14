/*
  Warnings:

  - You are about to drop the column `nodeCode` on the `top_node_states` table. All the data in the column will be lost.
  - You are about to drop the column `nodeName` on the `top_node_states` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[vehicleId,nodeId]` on the table `top_node_states` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `nodeId` to the `top_node_states` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "top_node_states_vehicleId_nodeCode_key";

-- AlterTable
ALTER TABLE "top_node_states" DROP COLUMN "nodeCode",
DROP COLUMN "nodeName",
ADD COLUMN     "nodeId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "nodes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "level" INTEGER NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nodes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nodes_code_key" ON "nodes"("code");

-- CreateIndex
CREATE INDEX "nodes_parentId_idx" ON "nodes"("parentId");

-- CreateIndex
CREATE INDEX "top_node_states_nodeId_idx" ON "top_node_states"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "top_node_states_vehicleId_nodeId_key" ON "top_node_states"("vehicleId", "nodeId");

-- AddForeignKey
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "top_node_states" ADD CONSTRAINT "top_node_states_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
