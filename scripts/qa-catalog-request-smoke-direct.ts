/**
 * Direct DB/API-layer smoke (no HTTP server required).
 * Validates migration tables, placeholder seed, request create, vehicle bind, admin loaders.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { ensureCatalogPlaceholder } from "../src/lib/motorcycle-catalog-placeholder";
import { loadAdminModerationQueue } from "../src/lib/admin-moderation";
import { approveMotorcycleCatalogRequest } from "../src/lib/motorcycle-catalog-request-service";
import { toGarageVehicleItem, vehicleWireInclude } from "../src/lib/vehicle-wire";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  console.log("catalog-request direct smoke");

  const placeholder = await ensureCatalogPlaceholder(prisma);
  assert(placeholder.generationId, "placeholder generation must exist");
  console.log("  ✓ placeholder catalog chain");

  const demoUser = await prisma.user.findUnique({
    where: { email: "demo@mototwin.local" },
    select: { id: true },
  });
  assert(demoUser?.id, "demo@mototwin.local must exist (run db:seed)");
  const garage = await prisma.garage.findFirst({
    where: { ownerUserId: demoUser.id },
    select: { id: true },
  });
  assert(garage?.id, "demo user must have a garage");

  const suffix = Date.now();
  const request = await prisma.motorcycleCatalogRequest.create({
    data: {
      submittedByUserId: demoUser.id,
      brandName: `Direct Smoke Brand ${suffix}`,
      familyName: `Direct Smoke Family ${suffix}`,
      variantName: `Direct Smoke Variant ${suffix}`,
      yearFrom: 2023,
      resolvedBrandName: `Direct Smoke Brand ${suffix}`,
      resolvedFamilyName: `Direct Smoke Family ${suffix}`,
      resolvedVariantName: `Direct Smoke Variant ${suffix}`,
      resolvedYearFrom: 2023,
    },
  });
  console.log(`  ✓ created request ${request.id}`);

  const vehicle = await prisma.vehicle.create({
    data: {
      userId: demoUser.id,
      garageId: garage.id,
      motorcycleBrandId: placeholder.brandId,
      motorcycleModelFamilyId: placeholder.familyId,
      motorcycleVariantId: placeholder.variantId,
      motorcycleGenerationId: placeholder.generationId,
      pendingCatalogRequestId: request.id,
      odometer: 500,
      rideProfile: {
        create: {
          usageType: "MIXED",
          ridingStyle: "ACTIVE",
          loadType: "SOLO",
          usageIntensity: "MEDIUM",
        },
      },
    },
    include: vehicleWireInclude,
  });
  const wire = toGarageVehicleItem(vehicle);
  assert(wire.catalogRequest?.status === "PENDING", "vehicle wire must expose pending catalogRequest");
  assert(wire.motorcycleVariant.name.includes("Direct Smoke Variant"), "wire must show user variant name");
  console.log(`  ✓ vehicle ${vehicle.id} bound to pending request`);

  const queue = await loadAdminModerationQueue("pendingCatalogRequests");
  assert(queue.queue === "pendingCatalogRequests", "queue key");
  assert(
    queue.items.some((item) => item.id === request.id && item.kind === "CATALOG_REQUEST"),
    "admin queue must include request"
  );
  assert(typeof queue.counts.pendingCatalogRequests === "number", "counts.pendingCatalogRequests");
  console.log("  ✓ admin moderation queue loader");

  const superAdmin = await prisma.user.findUnique({
    where: { email: "super@mototwin.local" },
    select: { id: true },
  });
  assert(superAdmin?.id, "super@mototwin.local must exist");

  await approveMotorcycleCatalogRequest({
    requestId: request.id,
    reviewerUserId: superAdmin.id,
  });

  const approved = await prisma.motorcycleCatalogRequest.findUnique({
    where: { id: request.id },
    select: { status: true, resolvedGenerationId: true },
  });
  assert(approved?.status === "APPROVED", "request must be APPROVED");
  assert(approved.resolvedGenerationId, "resolvedGenerationId must be set");

  const updatedVehicle = await prisma.vehicle.findUnique({
    where: { id: vehicle.id },
    select: {
      pendingCatalogRequestId: true,
      motorcycleGenerationId: true,
      motorcycleBrand: { select: { isCatalogPlaceholder: true } },
    },
  });
  assert(updatedVehicle?.pendingCatalogRequestId == null, "vehicle must be unlinked from pending request");
  assert(
    updatedVehicle?.motorcycleGenerationId === approved.resolvedGenerationId,
    "vehicle must point to approved generation"
  );
  assert(updatedVehicle?.motorcycleBrand.isCatalogPlaceholder === false, "vehicle must leave placeholder brand");
  console.log("  ✓ approve flow updates vehicle FKs");

  const notification = await prisma.notification.findFirst({
    where: {
      userId: demoUser.id,
      type: "CATALOG_REQUEST_APPROVED",
      dedupeKey: `catalog-request:${request.id}:approved`,
    },
  });
  assert(notification, "in-app notification must be created on approve");
  console.log("  ✓ approval notification");

  const publicBrands = await prisma.motorcycleBrand.findMany({
    where: { isCatalogPlaceholder: false },
    select: { slug: true },
  });
  assert(
    !publicBrands.some((brand) => brand.slug === "pending-catalog-review"),
    "placeholder brand must be filterable"
  );
  console.log("  ✓ placeholder excluded from public brand query");

  console.log("\n✓ catalog-request direct smoke passed");
}

main()
  .catch((error) => {
    console.error("\n✗ catalog-request direct smoke failed");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
