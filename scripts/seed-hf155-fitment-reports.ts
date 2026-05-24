/**
 * Seed community fitment reports for Hiflofiltro HF155 on ENGINE.LUBE.FILTER (KTM 690 variant).
 *
 *   npx tsx scripts/seed-hf155-fitment-reports.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { backfillPartMastersFromSkus } from "../prisma/backfill-part-masters";
import { recalculateFitmentConfidenceForKey } from "../src/lib/fitment-confidence-prisma";

/**
 * NOTE: IDs below are placeholders captured from the previous catalog wipe; on the
 * unified `motorcycle_*` schema they MUST be re-resolved at runtime by the new lookup
 * (see {@link resolveSeedAnchors}). The script no longer hard-codes a `modelVariantId`
 * — fitment reports anchor on `motorcycleGenerationId` (KTM 690 Enduro R, 2019-current).
 */
const HF155_SKU_PART_NUMBER = "HF155";

const SEED_MARKER = "[seed:hf155-fitment]";

function makePrisma() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

type ReportSpec = {
  ownerEmail: string;
  reporterEmail: string;
  fitmentResult:
    | "DIRECT_FIT"
    | "OEM_REPLACEMENT"
    | "PARTIAL_FIT"
    | "FIT_WITH_MODIFICATION";
  installationStatus: "INSTALLED" | "TESTED_NOT_INSTALLED";
  modificationRequired: boolean;
  modificationDetails?: string;
  rating: number;
  installedAtMileage?: number;
  comment: string;
  rideProfile: {
    usageType: "CITY" | "HIGHWAY" | "MIXED" | "OFFROAD";
    ridingStyle: "CALM" | "ACTIVE" | "AGGRESSIVE";
    loadType: "SOLO" | "PASSENGER" | "LUGGAGE" | "PASSENGER_LUGGAGE";
    usageIntensity: "LOW" | "MEDIUM" | "HIGH";
  };
};

const DEMO_OWNER_EMAIL = "demo@mototwin.local";
const USER_A_EMAIL = "user-a@mototwin.local";
const USER_B_EMAIL = "user-b@mototwin.local";

/**
 * Stable seed reports keyed by (ownerEmail, reporterEmail). The seed script
 * (`prisma/seed.ts`) deterministically creates one KTM 690 Enduro R vehicle per
 * test user (by `userId + nickname`); we resolve them by `ownerEmail` at runtime
 * so the reports don't break after `prisma migrate reset`.
 */
const REPORT_SPECS: ReportSpec[] = [
  {
    ownerEmail: DEMO_OWNER_EMAIL,
    reporterEmail: DEMO_OWNER_EMAIL,
    fitmentResult: "DIRECT_FIT",
    installationStatus: "INSTALLED",
    modificationRequired: false,
    rating: 5,
    installedAtMileage: 4800,
    comment: `${SEED_MARKER} Встал без доработок: резьба M22×1,5, уплотнительное кольцо как у штатного KTM.`,
    rideProfile: {
      usageType: "MIXED",
      ridingStyle: "ACTIVE",
      loadType: "SOLO",
      usageIntensity: "MEDIUM",
    },
  },
  {
    ownerEmail: USER_B_EMAIL,
    reporterEmail: USER_B_EMAIL,
    fitmentResult: "OEM_REPLACEMENT",
    installationStatus: "INSTALLED",
    modificationRequired: false,
    rating: 4,
    installedAtMileage: 11200,
    comment: `${SEED_MARKER} Замена OEM-фильтра на ТО; посадочное место и момент затяжки как в мануале KTM 690.`,
    rideProfile: {
      usageType: "OFFROAD",
      ridingStyle: "ACTIVE",
      loadType: "PASSENGER_LUGGAGE",
      usageIntensity: "HIGH",
    },
  },
  {
    ownerEmail: DEMO_OWNER_EMAIL,
    reporterEmail: USER_A_EMAIL,
    fitmentResult: "DIRECT_FIT",
    installationStatus: "INSTALLED",
    modificationRequired: false,
    rating: 5,
    installedAtMileage: 6200,
    comment: `${SEED_MARKER} Ставил на чужой 690 Enduro R (2022): фильтр HF155, утечек нет после 800 км.`,
    rideProfile: {
      usageType: "HIGHWAY",
      ridingStyle: "CALM",
      loadType: "SOLO",
      usageIntensity: "LOW",
    },
  },
  {
    ownerEmail: USER_B_EMAIL,
    reporterEmail: DEMO_OWNER_EMAIL,
    fitmentResult: "FIT_WITH_MODIFICATION",
    installationStatus: "INSTALLED",
    modificationRequired: true,
    modificationDetails: "Дополнительная прокладка под корпус (0,5 мм) для плотной посадки.",
    rating: 4,
    installedAtMileage: 9100,
    comment: `${SEED_MARKER} Без тонкой прокладки садился с лёгким люфтом; с прокладкой — норм.`,
    rideProfile: {
      usageType: "MIXED",
      ridingStyle: "AGGRESSIVE",
      loadType: "LUGGAGE",
      usageIntensity: "HIGH",
    },
  },
  {
    ownerEmail: DEMO_OWNER_EMAIL,
    reporterEmail: USER_B_EMAIL,
    fitmentResult: "PARTIAL_FIT",
    installationStatus: "TESTED_NOT_INSTALLED",
    modificationRequired: false,
    rating: 3,
    comment: `${SEED_MARKER} На примерке: резьба совпадает, но высота корпуса чуть больше — мешает съёму крышки без выкручивания.`,
    rideProfile: {
      usageType: "CITY",
      ridingStyle: "CALM",
      loadType: "SOLO",
      usageIntensity: "LOW",
    },
  },
];

async function resolveSeedAnchors(prisma: PrismaClient): Promise<{
  partMasterId: string;
  primaryNodeId: string;
  motorcycleGenerationId: string;
} | null> {
  const partNumber = await prisma.partNumber.findFirst({
    where: { normalizedNumber: HF155_SKU_PART_NUMBER },
    select: {
      sku: {
        select: {
          partMasterId: true,
          primaryNodeId: true,
        },
      },
    },
  });
  const partMasterId = partNumber?.sku?.partMasterId ?? null;
  const primaryNodeId = partNumber?.sku?.primaryNodeId ?? null;
  if (!partMasterId || !primaryNodeId) {
    return null;
  }

  const generation = await prisma.motorcycleGeneration.findFirst({
    where: {
      name: "690 Enduro R / 2019-current",
      variant: {
        name: "690 Enduro R",
        family: { name: "690 Enduro R", brand: { name: "KTM" } },
      },
    },
    select: { id: true },
  });
  if (!generation) {
    return null;
  }
  return {
    partMasterId,
    primaryNodeId,
    motorcycleGenerationId: generation.id,
  };
}

async function resolveUserIdByEmail(
  prisma: PrismaClient,
  email: string
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) {
    throw new Error(`Seed user not found: ${email}. Run \`npm run db:seed\` first.`);
  }
  return user.id;
}

/**
 * Stable lookup: each test user owns exactly one KTM 690 Enduro R vehicle in the
 * dev seed (created by `upsertOwnedVehicle` keyed on `userId + nickname`). We
 * pick the first matching vehicle pinned to the canonical generation.
 */
async function resolveOwnedKtm690VehicleId(
  prisma: PrismaClient,
  userId: string,
  motorcycleGenerationId: string
): Promise<string> {
  const vehicle = await prisma.vehicle.findFirst({
    where: { userId, motorcycleGenerationId },
    select: { id: true },
  });
  if (!vehicle) {
    throw new Error(
      `No KTM 690 Enduro R vehicle for user ${userId}; expected one from \`prisma/seed.ts\`.`
    );
  }
  return vehicle.id;
}

async function main() {
  const prisma = makePrisma();
  try {
    const backfill = await backfillPartMastersFromSkus(prisma);
    const anchors = await resolveSeedAnchors(prisma);
    if (!anchors) {
      throw new Error(
        "Unable to resolve HF155 PartMaster + KTM 690 Enduro R generation — run prisma db seed first."
      );
    }
    const { partMasterId, primaryNodeId: nodeId, motorcycleGenerationId } = anchors;

    const existing = await prisma.fitmentReport.count({
      where: { partMasterId, comment: { contains: SEED_MARKER } },
    });
    if (existing >= REPORT_SPECS.length) {
      console.log(`Skip: ${existing} HF155 seed reports already present.`);
      return;
    }

    const emailCache = new Map<string, string>();
    const vehicleCache = new Map<string, string>();
    async function userIdFor(email: string): Promise<string> {
      const cached = emailCache.get(email);
      if (cached) return cached;
      const id = await resolveUserIdByEmail(prisma, email);
      emailCache.set(email, id);
      return id;
    }
    async function vehicleIdFor(ownerEmail: string): Promise<string> {
      const cached = vehicleCache.get(ownerEmail);
      if (cached) return cached;
      const ownerId = await userIdFor(ownerEmail);
      const id = await resolveOwnedKtm690VehicleId(
        prisma,
        ownerId,
        motorcycleGenerationId
      );
      vehicleCache.set(ownerEmail, id);
      return id;
    }

    let created = 0;
    for (const spec of REPORT_SPECS) {
      const vehicleId = await vehicleIdFor(spec.ownerEmail);
      const createdByUserId = await userIdFor(spec.reporterEmail);
      const dup = await prisma.fitmentReport.findFirst({
        where: {
          partMasterId,
          vehicleId,
          createdByUserId,
          fitmentResult: spec.fitmentResult,
          comment: spec.comment,
        },
        select: { id: true },
      });
      if (dup) continue;

      await prisma.fitmentReport.create({
        data: {
          partMasterId,
          vehicleId,
          motorcycleGenerationId,
          nodeId,
          fitmentResult: spec.fitmentResult,
          installationStatus: spec.installationStatus,
          modificationRequired: spec.modificationRequired,
          modificationDetails: spec.modificationDetails ?? null,
          comment: spec.comment,
          installedAtMileage: spec.installedAtMileage ?? null,
          rating: spec.rating,
          rideProfileSnapshot: spec.rideProfile,
          moderationStatus: "PUBLISHED",
          createdByUserId,
        },
      });
      created += 1;
    }

    await recalculateFitmentConfidenceForKey(prisma, {
      partMasterId,
      motorcycleGenerationId,
      nodeId,
    });

    const master = await prisma.partMaster.findUnique({
      where: { id: partMasterId },
      select: { id: true, brandName: true, sku: true, title: true },
    });

    console.log(
      JSON.stringify(
        {
          partMaster: master,
          nodeId,
          motorcycleGenerationId,
          backfill,
          reportsCreated: created,
          totalSeedReports: await prisma.fitmentReport.count({
            where: { partMasterId, comment: { contains: SEED_MARKER } },
          }),
        },
        null,
        2
      )
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
