-- Structured part identity for service journal (SKU + name), separate from freeform comment.
ALTER TABLE "service_events" ADD COLUMN "partSku" TEXT;
ALTER TABLE "service_events" ADD COLUMN "partName" TEXT;
