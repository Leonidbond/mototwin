ALTER TABLE "users"
ADD COLUMN "isBlocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "blockedAt" TIMESTAMP(3),
ADD COLUMN "blockReason" TEXT;

CREATE INDEX "users_isBlocked_idx" ON "users"("isBlocked");
