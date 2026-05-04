-- Service bundle templates (wave 3.1 MVP)

CREATE TABLE "service_bundle_templates" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "isRegulationBased" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_bundle_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_bundle_template_items" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "defaultActionType" "ServiceActionType" NOT NULL DEFAULT 'SERVICE',
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "service_bundle_template_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "service_bundle_template_items_templateId_idx" ON "service_bundle_template_items"("templateId");
CREATE INDEX "service_bundle_template_items_nodeId_idx" ON "service_bundle_template_items"("nodeId");

ALTER TABLE "service_bundle_template_items" ADD CONSTRAINT "service_bundle_template_items_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "service_bundle_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_bundle_template_items" ADD CONSTRAINT "service_bundle_template_items_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
