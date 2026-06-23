-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('PROBLEM', 'IDEA', 'QUESTION');

-- CreateTable
CREATE TABLE "feedback" (
    "id" TEXT NOT NULL,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'NEW',
    "type" "FeedbackType" NOT NULL DEFAULT 'PROBLEM',
    "message" TEXT NOT NULL,
    "pageKey" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "routePath" TEXT NOT NULL,
    "appVersion" TEXT,
    "locale" TEXT,
    "vehicleId" TEXT,
    "userAgent" TEXT,
    "contextJson" JSONB,
    "submittedByUserId" TEXT,
    "adminNote" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feedback_status_idx" ON "feedback"("status");

-- CreateIndex
CREATE INDEX "feedback_pageKey_idx" ON "feedback"("pageKey");

-- CreateIndex
CREATE INDEX "feedback_platform_idx" ON "feedback"("platform");

-- CreateIndex
CREATE INDEX "feedback_createdAt_idx" ON "feedback"("createdAt");

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
