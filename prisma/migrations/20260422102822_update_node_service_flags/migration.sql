-- AlterTable
ALTER TABLE "nodes" ADD COLUMN     "defaultServiceOperations" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "isAdvanced" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isMvpVisible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isServiceRelevant" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "serviceGroup" TEXT;
