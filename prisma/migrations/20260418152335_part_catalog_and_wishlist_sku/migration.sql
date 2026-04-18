-- AlterTable
ALTER TABLE "part_wishlist_items" ADD COLUMN     "skuId" TEXT;

-- CreateTable
CREATE TABLE "part_skus" (
    "id" TEXT NOT NULL,
    "seedKey" TEXT,
    "primaryNodeId" TEXT,
    "brandName" TEXT NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "partType" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "priceAmount" DECIMAL(12,2),
    "currency" TEXT,
    "sourceUrl" TEXT,
    "isOem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "part_skus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_numbers" (
    "id" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "normalizedNumber" TEXT NOT NULL,
    "numberType" TEXT NOT NULL,
    "brandName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "part_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_sku_node_links" (
    "id" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL DEFAULT 80,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "part_sku_node_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_fitments" (
    "id" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "brandId" TEXT,
    "modelId" TEXT,
    "modelVariantId" TEXT,
    "yearFrom" INTEGER,
    "yearTo" INTEGER,
    "market" TEXT,
    "engineCode" TEXT,
    "vinFrom" TEXT,
    "vinTo" TEXT,
    "fitmentType" TEXT,
    "confidence" INTEGER NOT NULL DEFAULT 80,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "part_fitments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_offers" (
    "id" TEXT NOT NULL,
    "skuId" TEXT,
    "sourceName" TEXT NOT NULL,
    "externalOfferId" TEXT,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "priceAmount" DECIMAL(12,2),
    "currency" TEXT,
    "availability" TEXT,
    "sellerName" TEXT,
    "rawBrand" TEXT,
    "rawArticle" TEXT,
    "rawDataJson" JSONB,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "part_offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "part_skus_seedKey_key" ON "part_skus"("seedKey");

-- CreateIndex
CREATE INDEX "part_skus_primaryNodeId_idx" ON "part_skus"("primaryNodeId");

-- CreateIndex
CREATE INDEX "part_skus_brandName_idx" ON "part_skus"("brandName");

-- CreateIndex
CREATE INDEX "part_skus_partType_idx" ON "part_skus"("partType");

-- CreateIndex
CREATE INDEX "part_skus_isActive_idx" ON "part_skus"("isActive");

-- CreateIndex
CREATE INDEX "part_numbers_skuId_idx" ON "part_numbers"("skuId");

-- CreateIndex
CREATE INDEX "part_numbers_normalizedNumber_idx" ON "part_numbers"("normalizedNumber");

-- CreateIndex
CREATE UNIQUE INDEX "part_numbers_skuId_normalizedNumber_numberType_key" ON "part_numbers"("skuId", "normalizedNumber", "numberType");

-- CreateIndex
CREATE INDEX "part_sku_node_links_skuId_idx" ON "part_sku_node_links"("skuId");

-- CreateIndex
CREATE INDEX "part_sku_node_links_nodeId_idx" ON "part_sku_node_links"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "part_sku_node_links_skuId_nodeId_relationType_key" ON "part_sku_node_links"("skuId", "nodeId", "relationType");

-- CreateIndex
CREATE INDEX "part_fitments_skuId_idx" ON "part_fitments"("skuId");

-- CreateIndex
CREATE INDEX "part_fitments_brandId_idx" ON "part_fitments"("brandId");

-- CreateIndex
CREATE INDEX "part_fitments_modelId_idx" ON "part_fitments"("modelId");

-- CreateIndex
CREATE INDEX "part_fitments_modelVariantId_idx" ON "part_fitments"("modelVariantId");

-- CreateIndex
CREATE INDEX "part_offers_skuId_idx" ON "part_offers"("skuId");

-- CreateIndex
CREATE INDEX "part_offers_sourceName_idx" ON "part_offers"("sourceName");

-- CreateIndex
CREATE INDEX "part_offers_externalOfferId_idx" ON "part_offers"("externalOfferId");

-- CreateIndex
CREATE INDEX "part_wishlist_items_skuId_idx" ON "part_wishlist_items"("skuId");

-- AddForeignKey
ALTER TABLE "part_skus" ADD CONSTRAINT "part_skus_primaryNodeId_fkey" FOREIGN KEY ("primaryNodeId") REFERENCES "nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_numbers" ADD CONSTRAINT "part_numbers_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "part_skus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_sku_node_links" ADD CONSTRAINT "part_sku_node_links_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "part_skus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_sku_node_links" ADD CONSTRAINT "part_sku_node_links_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_fitments" ADD CONSTRAINT "part_fitments_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "part_skus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_offers" ADD CONSTRAINT "part_offers_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "part_skus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_wishlist_items" ADD CONSTRAINT "part_wishlist_items_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "part_skus"("id") ON DELETE SET NULL ON UPDATE CASCADE;
