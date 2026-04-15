-- CreateEnum
CREATE TYPE "ServiceEventKind" AS ENUM ('SERVICE', 'STATE_UPDATE');

-- AlterTable
ALTER TABLE "service_events" ADD COLUMN     "eventKind" "ServiceEventKind" NOT NULL DEFAULT 'SERVICE';
