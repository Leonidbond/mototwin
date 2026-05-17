CREATE TYPE "AdminRole" AS ENUM (
  'SUPER_ADMIN',
  'CATALOG_MANAGER',
  'MODERATOR',
  'ANALYST'
);

CREATE TYPE "ImportBatchType" AS ENUM (
  'PARTS',
  'FITMENT_RULES',
  'SERVICE_RULES',
  'MODELS',
  'CONFIGURATIONS',
  'OEM_CROSS',
  'PART_ALIASES'
);

CREATE TYPE "ImportBatchStatus" AS ENUM (
  'DRAFT',
  'VALIDATING',
  'READY',
  'IMPORTING',
  'COMMITTED',
  'ROLLED_BACK',
  'FAILED'
);

ALTER TABLE "users"
  ADD COLUMN "adminRole" "AdminRole";

CREATE INDEX "users_adminRole_idx" ON "users"("adminRole");

CREATE TABLE "admin_audit_logs" (
  "id"            TEXT NOT NULL,
  "actorId"       TEXT NOT NULL,
  "action"        TEXT NOT NULL,
  "entityType"    TEXT NOT NULL,
  "entityId"      TEXT NOT NULL,
  "before"        JSONB,
  "after"         JSONB,
  "reason"        TEXT,
  "importBatchId" TEXT,
  "ip"            TEXT,
  "userAgent"     TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_audit_logs_entityType_entityId_idx"
  ON "admin_audit_logs"("entityType", "entityId");

CREATE INDEX "admin_audit_logs_actorId_createdAt_idx"
  ON "admin_audit_logs"("actorId", "createdAt");

CREATE INDEX "admin_audit_logs_action_createdAt_idx"
  ON "admin_audit_logs"("action", "createdAt");

CREATE INDEX "admin_audit_logs_importBatchId_idx"
  ON "admin_audit_logs"("importBatchId");

ALTER TABLE "admin_audit_logs"
  ADD CONSTRAINT "admin_audit_logs_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "import_batches" (
  "id"           TEXT NOT NULL,
  "type"         "ImportBatchType" NOT NULL,
  "status"       "ImportBatchStatus" NOT NULL DEFAULT 'DRAFT',
  "fileName"     TEXT NOT NULL,
  "fileUrl"      TEXT,
  "createdById"  TEXT NOT NULL,
  "mapping"      JSONB,
  "summary"      JSONB,
  "dryRunAt"     TIMESTAMP(3),
  "committedAt"  TIMESTAMP(3),
  "rolledBackAt" TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,

  CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "import_batches_type_status_idx"
  ON "import_batches"("type", "status");

CREATE INDEX "import_batches_createdById_createdAt_idx"
  ON "import_batches"("createdById", "createdAt");

ALTER TABLE "import_batches"
  ADD CONSTRAINT "import_batches_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "import_batch_rows" (
  "id"             TEXT NOT NULL,
  "batchId"        TEXT NOT NULL,
  "rowIndex"       INTEGER NOT NULL,
  "raw"            JSONB NOT NULL,
  "action"         TEXT,
  "status"         TEXT NOT NULL DEFAULT 'ok',
  "errorMessage"   TEXT,
  "mappedEntityId" TEXT,

  CONSTRAINT "import_batch_rows_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "import_batch_rows_batchId_rowIndex_idx"
  ON "import_batch_rows"("batchId", "rowIndex");

CREATE INDEX "import_batch_rows_batchId_status_idx"
  ON "import_batch_rows"("batchId", "status");

ALTER TABLE "import_batch_rows"
  ADD CONSTRAINT "import_batch_rows_batchId_fkey"
  FOREIGN KEY ("batchId") REFERENCES "import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "part_aliases" (
  "id"           TEXT NOT NULL,
  "partMasterId" TEXT NOT NULL,
  "alias"        TEXT NOT NULL,
  "normalized"   TEXT NOT NULL,
  "source"       TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "part_aliases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "part_aliases_partMasterId_normalized_key"
  ON "part_aliases"("partMasterId", "normalized");

CREATE INDEX "part_aliases_partMasterId_idx"
  ON "part_aliases"("partMasterId");

CREATE INDEX "part_aliases_normalized_idx"
  ON "part_aliases"("normalized");

ALTER TABLE "part_aliases"
  ADD CONSTRAINT "part_aliases_partMasterId_fkey"
  FOREIGN KEY ("partMasterId") REFERENCES "part_masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
