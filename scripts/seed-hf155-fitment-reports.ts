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

const HF155_SKU_ID = "cmp1bqxb9008b47l4g9u7xhmh";
const FILTER_NODE_ID = "cmp1bqx1z001747l4jbvmmebs";
const KTM_VARIANT_ID = "cmp1bqx1a000j47l421pucdlz";

const SEED_MARKER = "[seed:hf155-fitment]";

function makePrisma() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

const REPORT_SPECS = [
  {
    vehicleId: "cmp1bqx1h000m47l461eschhg",
    createdByUserId: "cmp1bqwsf000047l4mcwz4qye",
    fitmentResult: "DIRECT_FIT" as const,
    installationStatus: "INSTALLED" as const,
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
    vehicleId: "cmp1bqx1l000p47l4te34b5oh",
    createdByUserId: "cmp1bqwz5000447l41bb9qza7",
    fitmentResult: "OEM_REPLACEMENT" as const,
    installationStatus: "INSTALLED" as const,
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
    vehicleId: "cmp1bqx1h000m47l461eschhg",
    createdByUserId: "cmp1bqwyu000247l42ae1qv98",
    fitmentResult: "DIRECT_FIT" as const,
    installationStatus: "INSTALLED" as const,
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
    vehicleId: "cmp1bqx1l000p47l4te34b5oh",
    createdByUserId: "cmp1bqwsf000047l4mcwz4qye",
    fitmentResult: "FIT_WITH_MODIFICATION" as const,
    installationStatus: "INSTALLED" as const,
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
    vehicleId: "cmp1bqx1h000m47l461eschhg",
    createdByUserId: "cmp1bqwz5000447l41bb9qza7",
    fitmentResult: "PARTIAL_FIT" as const,
    installationStatus: "TESTED_NOT_INSTALLED" as const,
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
] as const;

async function main() {
  const prisma = makePrisma();
  try {
    const sku = await prisma.partSku.findUnique({
      where: { id: HF155_SKU_ID },
      select: {
        id: true,
        canonicalName: true,
        partMasterId: true,
        brandName: true,
        primaryNodeId: true,
      },
    });
    if (!sku) {
      throw new Error(`PartSku ${HF155_SKU_ID} not found — run prisma db seed first.`);
    }

    const backfill = await backfillPartMastersFromSkus(prisma);
    const skuAfter = await prisma.partSku.findUnique({
      where: { id: HF155_SKU_ID },
      select: { partMasterId: true, canonicalName: true },
    });
    const partMasterId = skuAfter?.partMasterId;
    if (!partMasterId) {
      throw new Error("PartMaster for HF155 QA SKU was not linked after backfill.");
    }

    const nodeId = sku.primaryNodeId ?? FILTER_NODE_ID;
    const existing = await prisma.fitmentReport.count({
      where: { partMasterId, comment: { contains: SEED_MARKER } },
    });
    if (existing >= REPORT_SPECS.length) {
      console.log(`Skip: ${existing} HF155 seed reports already present.`);
      return;
    }

    let created = 0;
    for (const spec of REPORT_SPECS) {
      const dup = await prisma.fitmentReport.findFirst({
        where: {
          partMasterId,
          vehicleId: spec.vehicleId,
          createdByUserId: spec.createdByUserId,
          fitmentResult: spec.fitmentResult,
          comment: spec.comment,
        },
        select: { id: true },
      });
      if (dup) continue;

      await prisma.fitmentReport.create({
        data: {
          partMasterId,
          vehicleId: spec.vehicleId,
          modelVariantId: KTM_VARIANT_ID,
          nodeId,
          fitmentResult: spec.fitmentResult,
          installationStatus: spec.installationStatus,
          modificationRequired: spec.modificationRequired,
          modificationDetails:
            "modificationDetails" in spec ? spec.modificationDetails ?? null : null,
          comment: spec.comment,
          installedAtMileage: "installedAtMileage" in spec ? spec.installedAtMileage : null,
          rating: spec.rating,
          rideProfileSnapshot: spec.rideProfile,
          moderationStatus: "PUBLISHED",
          createdByUserId: spec.createdByUserId,
        },
      });
      created += 1;
    }

    await recalculateFitmentConfidenceForKey(prisma, {
      partMasterId,
      modelVariantId: KTM_VARIANT_ID,
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
          modelVariantId: KTM_VARIANT_ID,
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
