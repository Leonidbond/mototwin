/**
 * Seeds a BMW R 1250 GS with demo service/expense data for a beta QA account.
 * Idempotent — safe to re-run.
 *
 * Usage:
 *   npx tsx scripts/seed-beta-test-vehicle.ts
 *   npx tsx scripts/seed-beta-test-vehicle.ts test1@mototwin.online
 */
import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const DEFAULT_EMAIL = "test1@mototwin.online";
const VEHICLE_NICKNAME = "BMW R 1250 GS";
const ODOMETER = 12_400;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

type MotorcycleVehicleAnchor = {
  motorcycleBrandId: string;
  motorcycleModelFamilyId: string;
  motorcycleVariantId: string;
  motorcycleGenerationId: string;
};

async function resolveBmwR1250GsAnchor(): Promise<MotorcycleVehicleAnchor | null> {
  const generation = await prisma.motorcycleGeneration.findFirst({
    where: {
      name: "R 1250 GS / K50 EU5",
      variant: {
        name: "R 1250 GS",
        family: {
          name: "R 1250 GS",
          brand: { name: "BMW" },
        },
      },
    },
    select: {
      id: true,
      variant: {
        select: {
          id: true,
          family: {
            select: { id: true, brandId: true },
          },
        },
      },
    },
  });

  if (!generation) return null;

  return {
    motorcycleBrandId: generation.variant.family.brandId,
    motorcycleModelFamilyId: generation.variant.family.id,
    motorcycleVariantId: generation.variant.id,
    motorcycleGenerationId: generation.id,
  };
}

async function upsertVehicle(input: {
  userId: string;
  garageId: string;
  anchor: MotorcycleVehicleAnchor;
}): Promise<string> {
  const existing = await prisma.vehicle.findFirst({
    where: { userId: input.userId, nickname: VEHICLE_NICKNAME },
    select: { id: true },
  });

  if (existing) {
    const updated = await prisma.vehicle.update({
      where: { id: existing.id },
      data: {
        garageId: input.garageId,
        odometer: ODOMETER,
        ...input.anchor,
      },
      select: { id: true },
    });
    return updated.id;
  }

  const created = await prisma.vehicle.create({
    data: {
      userId: input.userId,
      garageId: input.garageId,
      nickname: VEHICLE_NICKNAME,
      odometer: ODOMETER,
      engineHours: null,
      vin: null,
      ...input.anchor,
    },
    select: { id: true },
  });
  return created.id;
}

async function upsertRideProfile(vehicleId: string): Promise<void> {
  await prisma.rideProfile.upsert({
    where: { vehicleId },
    update: {
      usageType: "MIXED",
      ridingStyle: "ACTIVE",
      loadType: "SOLO",
      usageIntensity: "MEDIUM",
    },
    create: {
      vehicleId,
      usageType: "MIXED",
      ridingStyle: "ACTIVE",
      loadType: "SOLO",
      usageIntensity: "MEDIUM",
    },
  });
}

async function upsertServiceEvent(input: {
  vehicleId: string;
  nodeId: string;
  eventDate: Date;
  odometer: number;
  serviceType: string;
  comment: string;
  partName?: string;
}) {
  const existing = await prisma.serviceEvent.findFirst({
    where: {
      vehicleId: input.vehicleId,
      title: input.serviceType,
      comment: { contains: "[seed:beta-test]" },
    },
    select: { id: true },
  });

  const data = {
    nodeId: input.nodeId,
    title: input.serviceType,
    mode: "BASIC" as const,
    eventDate: input.eventDate,
    odometer: input.odometer,
    engineHours: null,
    installedPartsJson: Prisma.JsonNull,
    partsCost: null,
    laborCost: null,
    totalCost: null,
    currency: null,
    comment: input.comment,
    items: {
      create: [
        {
          nodeId: input.nodeId,
          actionType: "REPLACE" as const,
          partName: input.partName ?? null,
          sku: null,
          sortOrder: 0,
        },
      ],
    },
  };

  if (existing) {
    return prisma.serviceEvent.update({
      where: { id: existing.id },
      data: {
        ...data,
        items: { deleteMany: {}, create: data.items.create },
      },
      select: { id: true },
    });
  }

  return prisma.serviceEvent.create({
    data: { vehicleId: input.vehicleId, ...data },
    select: { id: true },
  });
}

async function upsertExpense(input: {
  vehicleId: string;
  nodeId: string;
  serviceEventId?: string | null;
  title: string;
  category: "PART" | "CONSUMABLE" | "SERVICE_WORK" | "REPAIR" | "DIAGNOSTICS";
  installStatus: "BOUGHT_NOT_INSTALLED" | "INSTALLED" | "NOT_APPLICABLE";
  installationStatus: "NOT_INSTALLED" | "INSTALLED";
  expenseDate: Date;
  amount: number;
  currency: string;
  partSku?: string | null;
  partName?: string | null;
  installedAt?: Date | null;
  odometer?: number | null;
}) {
  const existing = await prisma.expenseItem.findFirst({
    where: {
      vehicleId: input.vehicleId,
      title: input.title,
      comment: { contains: "[seed:beta-test]" },
    },
    select: { id: true },
  });

  const data = {
    nodeId: input.nodeId,
    serviceEventId: input.serviceEventId ?? null,
    shoppingListItemId: null,
    category: input.category,
    installStatus: input.installStatus,
    purchaseStatus: "PURCHASED" as const,
    installationStatus: input.installationStatus,
    expenseDate: input.expenseDate,
    title: input.title,
    amount: new Prisma.Decimal(input.amount),
    currency: input.currency,
    quantity: 1,
    comment: "[seed:beta-test] Демо-данные для beta QA.",
    partSku: input.partSku ?? null,
    partName: input.partName ?? null,
    vendor: "MotoTwin demo",
    purchasedAt: input.expenseDate,
    installedAt: input.installedAt ?? null,
    odometer: input.odometer ?? null,
    engineHours: null,
  };

  if (existing) {
    await prisma.expenseItem.update({ where: { id: existing.id }, data });
    return;
  }

  await prisma.expenseItem.create({ data: { vehicleId: input.vehicleId, ...data } });
}

async function ensureTopNodeStates(vehicleId: string): Promise<number> {
  const topNodes = await prisma.node.findMany({
    where: { isTopNode: true, isActive: true },
    select: { id: true },
  });

  if (topNodes.length === 0) return 0;

  const rows = topNodes.map((node) => ({
    vehicleId,
    nodeId: node.id,
    status: "OK" as const,
    lastServiceEventId: null,
    note: null,
  }));

  const result = await prisma.topNodeState.createMany({
    data: rows,
    skipDuplicates: true,
  });

  return result.count;
}

type ExpenseSeed = {
  title: string;
  category: "PART" | "CONSUMABLE" | "SERVICE_WORK" | "REPAIR" | "DIAGNOSTICS";
  amount: number;
  currency?: string;
  partSku?: string;
  partName?: string;
};

type ServiceEventSeed = {
  nodeCode: string;
  eventDate: string;
  odometer: number;
  serviceType: string;
  comment: string;
  partName?: string;
  expenses: ExpenseSeed[];
};

const EXTRA_SERVICE_EVENTS: ServiceEventSeed[] = [
  {
    nodeCode: "INTAKE.FILTER",
    eventDate: "2024-06-15T10:00:00.000Z",
    odometer: 3_200,
    serviceType: "Замена воздушного фильтра",
    comment: "[seed:beta-test] Плановая замена воздушного фильтра.",
    partName: "Воздушный фильтр BM-1113",
    expenses: [
      { title: "Воздушный фильтр BM-1113", category: "PART", amount: 2_100, partSku: "BM-1113", partName: "Воздушный фильтр BM-1113" },
      { title: "Работа по замене воздушного фильтра", category: "SERVICE_WORK", amount: 800 },
    ],
  },
  {
    nodeCode: "COOLING.LIQUID.COOLANT",
    eventDate: "2024-08-20T10:00:00.000Z",
    odometer: 4_100,
    serviceType: "Замена охлаждающей жидкости",
    comment: "[seed:beta-test] Полная замена антифриза.",
    partName: "Охлаждающая жидкость BMW",
    expenses: [
      { title: "Охлаждающая жидкость BMW", category: "CONSUMABLE", amount: 1_600, partName: "Охлаждающая жидкость BMW" },
      { title: "Работа по замене антифриза", category: "SERVICE_WORK", amount: 2_400 },
    ],
  },
  {
    nodeCode: "SUSPENSION.FRONT.OIL",
    eventDate: "2024-10-05T10:00:00.000Z",
    odometer: 5_200,
    serviceType: "Обслуживание передней вилки",
    comment: "[seed:beta-test] Замена масла и сальников вилки.",
    partName: "Масло вилки 10W",
    expenses: [
      { title: "Масло вилки 10W", category: "CONSUMABLE", amount: 950, partName: "Масло вилки 10W" },
      { title: "Сальники передней вилки", category: "PART", amount: 2_800, partName: "Сальники передней вилки" },
      { title: "Работа по обслуживанию вилки", category: "SERVICE_WORK", amount: 5_500 },
    ],
  },
  {
    nodeCode: "DRIVETRAIN.CHAIN",
    eventDate: "2024-12-10T10:00:00.000Z",
    odometer: 6_300,
    serviceType: "Замена цепи и звёздочек",
    comment: "[seed:beta-test] Комплект цепи 525.",
    partName: "Цепь 525, 122 звена",
    expenses: [
      { title: "Цепь 525, 122 звена", category: "PART", amount: 8_900, partName: "Цепь 525, 122 звена" },
      { title: "Ведущая звезда 16T", category: "PART", amount: 2_400, partName: "Ведущая звезда 16T" },
      { title: "Ведомая звезда 44T", category: "PART", amount: 3_600, partName: "Ведомая звезда 44T" },
      { title: "Работа по замене цепи", category: "SERVICE_WORK", amount: 4_200 },
    ],
  },
  {
    nodeCode: "ELECTRICS.IGNITION.SPARK",
    eventDate: "2025-02-18T10:00:00.000Z",
    odometer: 7_200,
    serviceType: "Замена свечи зажигания",
    comment: "[seed:beta-test] Плановая замена свечи.",
    partName: "Свеча NGK LMAR8AI",
    expenses: [
      { title: "Свеча NGK LMAR8AI", category: "PART", amount: 1_450, partSku: "LMAR8AI", partName: "Свеча NGK LMAR8AI" },
      { title: "Работа по замене свечи", category: "SERVICE_WORK", amount: 600 },
    ],
  },
  {
    nodeCode: "BRAKES.REAR.PADS",
    eventDate: "2025-04-22T10:00:00.000Z",
    odometer: 8_100,
    serviceType: "Замена задних тормозных колодок",
    comment: "[seed:beta-test] Износ задних колодок.",
    partName: "Задние тормозные колодки",
    expenses: [
      { title: "Задние тормозные колодки (установлены)", category: "PART", amount: 4_500, partName: "Задние тормозные колодки" },
      { title: "Работа по замене задних колодок", category: "SERVICE_WORK", amount: 1_800 },
    ],
  },
  {
    nodeCode: "ELECTRICS.BATTERY",
    eventDate: "2025-06-30T10:00:00.000Z",
    odometer: 8_800,
    serviceType: "Замена аккумулятора",
    comment: "[seed:beta-test] Замена АКБ YTX14-BS.",
    partName: "Аккумулятор YTX14-BS",
    expenses: [
      { title: "Аккумулятор YTX14-BS", category: "PART", amount: 6_200, partName: "Аккумулятор YTX14-BS" },
      { title: "Работа по замене АКБ", category: "SERVICE_WORK", amount: 500 },
    ],
  },
  {
    nodeCode: "BRAKES.FLUID",
    eventDate: "2025-08-14T10:00:00.000Z",
    odometer: 9_400,
    serviceType: "Промывка тормозной системы",
    comment: "[seed:beta-test] Замена тормозной жидкости DOT4.",
    partName: "Тормозная жидкость DOT4",
    expenses: [
      { title: "Тормозная жидкость DOT4 (сервис)", category: "CONSUMABLE", amount: 890, partName: "Тормозная жидкость DOT4" },
      { title: "Работа по замене тормозной жидкости", category: "SERVICE_WORK", amount: 1_600 },
    ],
  },
  {
    nodeCode: "ENGINE.TOPEND.VALVES",
    eventDate: "2025-10-25T10:00:00.000Z",
    odometer: 10_100,
    serviceType: "Регулировка зазоров клапанов",
    comment: "[seed:beta-test] Плановая регулировка клапанов.",
    expenses: [
      { title: "Работа по регулировке клапанов", category: "SERVICE_WORK", amount: 7_500 },
    ],
  },
  {
    nodeCode: "ELECTRICS.CHARGING.REGULATOR",
    eventDate: "2025-12-08T10:00:00.000Z",
    odometer: 10_800,
    serviceType: "Замена регулятора напряжения",
    comment: "[seed:beta-test] Нестабильная зарядка — замена регулятора.",
    partName: "Регулятор напряжения",
    expenses: [
      { title: "Регулятор напряжения", category: "PART", amount: 5_800, partName: "Регулятор напряжения" },
      { title: "Работа по замене регулятора", category: "SERVICE_WORK", amount: 2_100 },
    ],
  },
  {
    nodeCode: "BRAKES.ABS",
    eventDate: "2026-03-03T10:00:00.000Z",
    odometer: 11_750,
    serviceType: "Предсезонная диагностика ABS",
    comment: "[seed:beta-test] Проверка ABS перед сезоном.",
    expenses: [
      { title: "Диагностика ABS", category: "DIAGNOSTICS", amount: 2_500 },
    ],
  },
  {
    nodeCode: "BRAKES.FRONT.DISC",
    eventDate: "2026-03-18T10:00:00.000Z",
    odometer: 12_100,
    serviceType: "Замена переднего тормозного диска",
    comment: "[seed:beta-test] Износ переднего диска.",
    partName: "Передний тормозной диск",
    expenses: [
      { title: "Передний тормозной диск", category: "PART", amount: 9_800, partName: "Передний тормозной диск" },
      { title: "Работа по замене переднего диска", category: "SERVICE_WORK", amount: 2_200 },
    ],
  },
  {
    nodeCode: "DRIVETRAIN.TENSIONERS",
    eventDate: "2026-03-28T10:00:00.000Z",
    odometer: 12_350,
    serviceType: "Регулировка натяжения цепи",
    comment: "[seed:beta-test] Плановая регулировка цепи.",
    expenses: [
      { title: "Работа по регулировке цепи", category: "SERVICE_WORK", amount: 1_200 },
      { title: "Смазка цепи Motul C2", category: "CONSUMABLE", amount: 650, partName: "Смазка цепи Motul C2" },
    ],
  },
];

async function loadNodeIds(codes: string[]): Promise<Map<string, string>> {
  const nodes = await prisma.node.findMany({
    where: { code: { in: codes } },
    select: { id: true, code: true },
  });
  return new Map(nodes.map((n) => [n.code, n.id]));
}

async function seedServiceEventsWithExpenses(
  vehicleId: string,
  events: ServiceEventSeed[],
  nodeIdByCode: Map<string, string>
): Promise<void> {
  for (const event of events) {
    const nodeId = nodeIdByCode.get(event.nodeCode);
    if (!nodeId) throw new Error(`Node not found: ${event.nodeCode}`);

    const eventDate = new Date(event.eventDate);
    const service = await upsertServiceEvent({
      vehicleId,
      nodeId,
      eventDate,
      odometer: event.odometer,
      serviceType: event.serviceType,
      comment: event.comment,
      partName: event.partName,
    });

    for (const expense of event.expenses) {
      const isWork = expense.category === "SERVICE_WORK" || expense.category === "DIAGNOSTICS";
      await upsertExpense({
        vehicleId,
        nodeId,
        serviceEventId: service.id,
        title: expense.title,
        category: expense.category,
        installStatus: isWork ? "NOT_APPLICABLE" : "INSTALLED",
        installationStatus: "INSTALLED",
        expenseDate: eventDate,
        amount: expense.amount,
        currency: expense.currency ?? "RUB",
        partSku: expense.partSku,
        partName: expense.partName,
        installedAt: eventDate,
        odometer: event.odometer,
      });
    }
  }
}

async function seedDemoData(vehicleId: string): Promise<void> {
  const nodeCodes = [
    "ENGINE.LUBE.OIL",
    "ENGINE.LUBE.FILTER",
    "BRAKES.FRONT.PADS",
    "BRAKES.REAR.PADS",
    "BRAKES.FLUID",
    "TIRES.FRONT",
    "TIRES.REAR",
    "ELECTRICS.CHARGING",
    ...EXTRA_SERVICE_EVENTS.map((e) => e.nodeCode),
  ];

  const nodeIdByCode = await loadNodeIds(nodeCodes);

  const requireNode = (code: string) => {
    const id = nodeIdByCode.get(code);
    if (!id) throw new Error(`Node not found: ${code}`);
    return id;
  };

  const oilNodeId = requireNode("ENGINE.LUBE.OIL");
  const filterNodeId = requireNode("ENGINE.LUBE.FILTER");
  const frontPadsNodeId = requireNode("BRAKES.FRONT.PADS");
  const rearPadsNodeId = requireNode("BRAKES.REAR.PADS");
  const frontTireNodeId = requireNode("TIRES.FRONT");
  const rearTireNodeId = requireNode("TIRES.REAR");
  const chargingNodeId = requireNode("ELECTRICS.CHARGING");

  const oilService = await upsertServiceEvent({
    vehicleId,
    nodeId: oilNodeId,
    eventDate: new Date("2026-03-10T10:00:00.000Z"),
    odometer: 11_800,
    serviceType: "Замена масла и фильтра",
    comment: "[seed:beta-test] Плановое ТО — масло и фильтр.",
    partName: "Масло двигателя 10W-40",
  });

  await upsertServiceEvent({
    vehicleId,
    nodeId: frontPadsNodeId,
    eventDate: new Date("2026-01-15T10:00:00.000Z"),
    odometer: 10_200,
    serviceType: "Замена передних тормозных колодок",
    comment: "[seed:beta-test] Износ передних колодок.",
    partName: "Передние тормозные колодки",
  });

  await upsertExpense({
    vehicleId,
    nodeId: filterNodeId,
    serviceEventId: oilService.id,
    title: "Масляный фильтр KN-160",
    category: "PART",
    installStatus: "INSTALLED",
    installationStatus: "INSTALLED",
    expenseDate: new Date("2026-03-10T10:00:00.000Z"),
    amount: 1_200,
    currency: "RUB",
    partSku: "KN-160",
    partName: "Масляный фильтр KN-160",
    installedAt: new Date("2026-03-10T10:00:00.000Z"),
    odometer: 11_800,
  });

  await upsertExpense({
    vehicleId,
    nodeId: oilNodeId,
    serviceEventId: oilService.id,
    title: "Масло двигателя 10W-40",
    category: "CONSUMABLE",
    installStatus: "INSTALLED",
    installationStatus: "INSTALLED",
    expenseDate: new Date("2026-03-10T10:00:00.000Z"),
    amount: 3_400,
    currency: "RUB",
    partName: "Масло двигателя 10W-40",
    installedAt: new Date("2026-03-10T10:00:00.000Z"),
    odometer: 11_800,
  });

  await upsertExpense({
    vehicleId,
    nodeId: oilNodeId,
    serviceEventId: oilService.id,
    title: "Работа по замене масла",
    category: "SERVICE_WORK",
    installStatus: "NOT_APPLICABLE",
    installationStatus: "INSTALLED",
    expenseDate: new Date("2026-03-10T10:00:00.000Z"),
    amount: 2_800,
    currency: "RUB",
    installedAt: new Date("2026-03-10T10:00:00.000Z"),
    odometer: 11_800,
  });

  await upsertExpense({
    vehicleId,
    nodeId: rearPadsNodeId,
    title: "Задние тормозные колодки (заказаны)",
    category: "PART",
    installStatus: "BOUGHT_NOT_INSTALLED",
    installationStatus: "NOT_INSTALLED",
    expenseDate: new Date("2026-04-20T10:00:00.000Z"),
    amount: 4_500,
    currency: "RUB",
    partName: "Задние тормозные колодки",
  });

  await upsertExpense({
    vehicleId,
    nodeId: frontTireNodeId,
    title: "Передняя шина Michelin Anakee Adventure",
    category: "PART",
    installStatus: "INSTALLED",
    installationStatus: "INSTALLED",
    expenseDate: new Date("2025-11-12T10:00:00.000Z"),
    amount: 14_500,
    currency: "RUB",
    partName: "120/70R19 Michelin Anakee Adventure",
    installedAt: new Date("2025-11-12T10:00:00.000Z"),
    odometer: 9_600,
  });

  await upsertExpense({
    vehicleId,
    nodeId: rearTireNodeId,
    title: "Задняя шина Michelin Anakee Adventure",
    category: "PART",
    installStatus: "INSTALLED",
    installationStatus: "INSTALLED",
    expenseDate: new Date("2025-11-12T10:00:00.000Z"),
    amount: 16_800,
    currency: "RUB",
    partName: "170/60R17 Michelin Anakee Adventure",
    installedAt: new Date("2025-11-12T10:00:00.000Z"),
    odometer: 9_600,
  });

  await upsertExpense({
    vehicleId,
    nodeId: chargingNodeId,
    title: "Диагностика системы зарядки",
    category: "DIAGNOSTICS",
    installStatus: "NOT_APPLICABLE",
    installationStatus: "INSTALLED",
    expenseDate: new Date("2026-01-28T10:00:00.000Z"),
    amount: 2_200,
    currency: "RUB",
    installedAt: new Date("2026-01-28T10:00:00.000Z"),
    odometer: 10_500,
  });

  await seedServiceEventsWithExpenses(vehicleId, EXTRA_SERVICE_EVENTS, nodeIdByCode);
}

async function main() {
  const email = (process.argv[2] ?? DEFAULT_EMAIL).trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      displayName: true,
      garages: {
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { id: true, title: true },
      },
    },
  });

  if (!user) {
    throw new Error(`User not found: ${email}. Run scripts/seed-beta-test-users.ts first.`);
  }

  let garage = user.garages[0];
  if (!garage) {
    garage = await prisma.garage.create({
      data: { ownerUserId: user.id, title: "Мой гараж" },
      select: { id: true, title: true },
    });
  }

  const anchor = await resolveBmwR1250GsAnchor();
  if (!anchor) {
    throw new Error("BMW R 1250 GS generation not found. Run npm run db:seed:motorcycle first.");
  }

  const vehicleId = await upsertVehicle({
    userId: user.id,
    garageId: garage.id,
    anchor,
  });

  await upsertRideProfile(vehicleId);
  await seedDemoData(vehicleId);
  const topNodeStates = await ensureTopNodeStates(vehicleId);

  const stats = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: {
      nickname: true,
      odometer: true,
      motorcycleBrand: { select: { name: true } },
      motorcycleModelFamily: { select: { name: true } },
      _count: {
        select: {
          serviceEvents: true,
          expenseItems: true,
        },
      },
    },
  });

  console.log("OK — beta test vehicle seeded");
  console.log({
    email: user.email,
    displayName: user.displayName,
    garage: garage.title,
    vehicle: stats?.nickname,
    brand: stats?.motorcycleBrand.name,
    model: stats?.motorcycleModelFamily.name,
    odometer: stats?.odometer,
    serviceEvents: stats?._count.serviceEvents,
    expenses: stats?._count.expenseItems,
    topNodeStatesCreated: topNodeStates,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
