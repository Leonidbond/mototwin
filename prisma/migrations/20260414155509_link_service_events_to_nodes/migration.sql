/*
  Warnings:

  - You are about to drop the column `node` on the `service_events` table. All the data in the column will be lost.
  - Added the required column `nodeId` to the `service_events` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "service_events" DROP COLUMN "node",
ADD COLUMN     "nodeId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "service_events_nodeId_idx" ON "service_events"("nodeId");

-- AddForeignKey
ALTER TABLE "service_events" ADD CONSTRAINT "service_events_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
