-- AlterTable
ALTER TABLE "nodes" ADD COLUMN     "isTopNode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "topNodeOrder" INTEGER;
