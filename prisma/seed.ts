import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.vehicle.deleteMany();
  await prisma.rideProfile.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.user.deleteMany();
  await prisma.modelVariant.deleteMany();
  await prisma.model.deleteMany();
  await prisma.brand.deleteMany();

  const testUser = await prisma.user.create({
    data: {
      email: "demo@mototwin.local",
      passwordHash: null,
      subscription: {
        create: {
          planType: "FREE",
          status: "ACTIVE",
        },
      },
    },
  });

  await prisma.brand.create({
    data: {
      name: "BMW",
      slug: "bmw",
      models: {
        create: [
          {
            name: "R 1250 GS",
            slug: "r-1250-gs",
            variants: {
              create: [
                {
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
                },
              ],
            },
          },
          {
            name: "F 850 GS",
            slug: "f-850-gs",
            variants: {
              create: [
                {
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
                },
              ],
            },
          },
        ],
      },
    },
  });

  await prisma.brand.create({
    data: {
      name: "KTM",
      slug: "ktm",
      models: {
        create: [
          {
            name: "890 Adventure",
            slug: "890-adventure",
            variants: {
              create: [
                {
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
                },
              ],
            },
          },
          {
            name: "690 Enduro R",
            slug: "690-enduro-r",
            variants: {
              create: [
                {
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
                },
              ],
            },
          },
        ],
      },
    },
  });

  console.log("Seed completed");
  console.log({
    brands: ["BMW", "KTM"],
    testUserEmail: testUser.email,
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