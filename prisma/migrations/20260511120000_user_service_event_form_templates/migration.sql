-- Per-user saved snapshots of the «add service event» form (templates).

CREATE TABLE "user_service_event_form_templates" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "formJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_service_event_form_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_service_event_form_templates_userId_idx" ON "user_service_event_form_templates"("userId");

ALTER TABLE "user_service_event_form_templates" ADD CONSTRAINT "user_service_event_form_templates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
