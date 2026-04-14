import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const topLevelNodes = [
  { code: "engine_oil", name: "Масло двигателя", displayOrder: 1 },
  { code: "oil_filter", name: "Масляный фильтр", displayOrder: 2 },
  { code: "air_filter", name: "Воздушный фильтр", displayOrder: 3 },
  { code: "spark_plug", name: "Свеча", displayOrder: 4 },
  { code: "brake_pads", name: "Тормозные колодки", displayOrder: 5 },
  { code: "brake_discs", name: "Тормозные диски", displayOrder: 6 },
  { code: "chain_drive", name: "Цепь и звезды", displayOrder: 7 },
  { code: "battery", name: "Аккумулятор", displayOrder: 8 },
  { code: "tires", name: "Шины", displayOrder: 9 },
  { code: "cooling_system", name: "Система охлаждения", displayOrder: 10 },
] as const;

async function main() {
  const testUser = await prisma.user.upsert({
    where: { email: "demo@mototwin.local" },
    update: {
      passwordHash: null,
    },
    create: {
      email: "demo@mototwin.local",
      passwordHash: null,
    },
  });

  await prisma.subscription.upsert({
    where: { userId: testUser.id },
    update: {
      planType: "FREE",
      status: "ACTIVE",
    },
    create: {
      userId: testUser.id,
      planType: "FREE",
      status: "ACTIVE",
    },
  });

  const bmw = await prisma.brand.upsert({
    where: { name: "BMW" },
    update: { slug: "bmw" },
    create: {
      name: "BMW",
      slug: "bmw",
    },
  });

  const ktm = await prisma.brand.upsert({
    where: { name: "KTM" },
    update: { slug: "ktm" },
    create: {
      name: "KTM",
      slug: "ktm",
    },
  });

  const r1250gs = await prisma.model.upsert({
    where: { brandId_slug: { brandId: bmw.id, slug: "r-1250-gs" } },
    update: {
      name: "R 1250 GS",
    },
    create: {
      brandId: bmw.id,
      name: "R 1250 GS",
      slug: "r-1250-gs",
    },
  });

  const f850gs = await prisma.model.upsert({
    where: { brandId_slug: { brandId: bmw.id, slug: "f-850-gs" } },
    update: {
      name: "F 850 GS",
    },
    create: {
      brandId: bmw.id,
      name: "F 850 GS",
      slug: "f-850-gs",
    },
  });

  const adventure890 = await prisma.model.upsert({
    where: { brandId_slug: { brandId: ktm.id, slug: "890-adventure" } },
    update: {
      name: "890 Adventure",
    },
    create: {
      brandId: ktm.id,
      name: "890 Adventure",
      slug: "890-adventure",
    },
  });

  const enduro690 = await prisma.model.upsert({
    where: { brandId_slug: { brandId: ktm.id, slug: "690-enduro-r" } },
    update: {
      name: "690 Enduro R",
    },
    create: {
      brandId: ktm.id,
      name: "690 Enduro R",
      slug: "690-enduro-r",
    },
  });

  await upsertModelVariant({
    modelId: r1250gs.id,
    year: 2023,
    versionName: "R 1250 GS Standard",
    generation: "K50",
    market: "EU",
    engineType: "4-stroke boxer",
    coolingType: "liquid/air",
    wheelSizes: "19/17",
    brakeSystem: "dual disc front / single disc rear",
    chainPitch: "shaft",
    stockSprockets: "shaft drive",
  });

  await upsertModelVariant({
    modelId: f850gs.id,
    year: 2022,
    versionName: "F 850 GS Standard",
    generation: "K81",
    market: "EU",
    engineType: "4-stroke parallel twin",
    coolingType: "liquid",
    wheelSizes: "21/17",
    brakeSystem: "dual disc front / single disc rear",
    chainPitch: "525",
    stockSprockets: "16/43",
  });

  await upsertModelVariant({
    modelId: adventure890.id,
    year: 2023,
    versionName: "890 Adventure Standard",
    generation: "Adventure",
    market: "EU",
    engineType: "4-stroke parallel twin",
    coolingType: "liquid",
    wheelSizes: "21/18",
    brakeSystem: "dual disc front / single disc rear",
    chainPitch: "525",
    stockSprockets: "16/45",
  });

  await upsertModelVariant({
    modelId: enduro690.id,
    year: 2022,
    versionName: "690 Enduro R Standard",
    generation: "Enduro",
    market: "EU",
    engineType: "4-stroke single",
    coolingType: "liquid",
    wheelSizes: "21/18",
    brakeSystem: "single disc front / single disc rear",
    chainPitch: "520",
    stockSprockets: "15/45",
  });

  const seededNodes = await Promise.all(
    topLevelNodes.map((node) =>
      prisma.node.upsert({
        where: { code: node.code },
        update: {
          name: node.name,
          parentId: null,
          level: 1,
          displayOrder: node.displayOrder,
          isActive: true,
        },
        create: {
          code: node.code,
          name: node.name,
          parentId: null,
          level: 1,
          displayOrder: node.displayOrder,
          isActive: true,
        },
      })
    )
  );

  const vehicles = await prisma.vehicle.findMany({
    select: { id: true },
  });

  const topNodeStateRows = vehicles.flatMap((vehicle) =>
    seededNodes.map((node) => ({
      vehicleId: vehicle.id,
      nodeId: node.id,
      status: "OK" as const,
      lastServiceEventId: null,
      note: null,
    }))
  );

  if (topNodeStateRows.length > 0) {
    await prisma.topNodeState.createMany({
      data: topNodeStateRows,
      skipDuplicates: true,
    });
  }

  console.log("Seed completed");
  console.log({
    brands: ["BMW", "KTM"],
    testUserEmail: testUser.email,
    topLevelNodes: seededNodes.length,
    topNodeStates: topNodeStateRows.length,
  });
}

async function upsertModelVariant(data: {
  modelId: string;
  year: number;
  versionName: string;
  generation: string | null;
  market: string | null;
  engineType: string | null;
  coolingType: string | null;
  wheelSizes: string | null;
  brakeSystem: string | null;
  chainPitch: string | null;
  stockSprockets: string | null;
}) {
  const existing = await prisma.modelVariant.findFirst({
    where: {
      modelId: data.modelId,
      year: data.year,
      versionName: data.versionName,
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.modelVariant.update({
      where: { id: existing.id },
      data,
    });
    return;
  }

  await prisma.modelVariant.create({
    data,
  });
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });