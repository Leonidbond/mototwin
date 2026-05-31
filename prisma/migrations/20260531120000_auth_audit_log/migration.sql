-- MT-SEC-054: forensic audit trail for authentication events.

CREATE TABLE "auth_audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "event" TEXT NOT NULL,
    "reasonCode" TEXT,
    "metadata" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "auth_audit_logs_userId_createdAt_idx" ON "auth_audit_logs"("userId", "createdAt");
CREATE INDEX "auth_audit_logs_event_createdAt_idx" ON "auth_audit_logs"("event", "createdAt");
CREATE INDEX "auth_audit_logs_createdAt_idx" ON "auth_audit_logs"("createdAt");

ALTER TABLE "auth_audit_logs" ADD CONSTRAINT "auth_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
