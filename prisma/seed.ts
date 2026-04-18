import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { normalizePartNumber } from "@mototwin/domain";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const nodeTaxonomy = [
  ["ENGINE", "Двигатель"],
  ["ENGINE.TOPEND", "Верх двигателя"],
  ["ENGINE.TOPEND.CYLINDER", "Цилиндр"],
  ["ENGINE.TOPEND.PISTON", "Поршень"],
  ["ENGINE.TOPEND.RINGS", "Кольца"],
  ["ENGINE.TOPEND.HEAD", "ГБЦ"],
  ["ENGINE.TOPEND.VALVES", "Клапаны/сальники/пружины"],
  ["ENGINE.TOPEND.CAM", "Распредвал/рокеры"],
  ["ENGINE.TIMING", "ГРМ"],
  ["ENGINE.TIMING.CHAIN", "Цепь ГРМ"],
  ["ENGINE.TIMING.TENSIONER", "Натяжитель/успокоители"],
  ["ENGINE.BOTTOMEND", "Низ двигателя"],
  ["ENGINE.BOTTOMEND.CRANK", "Коленвал/шатун"],
  ["ENGINE.BOTTOMEND.BEARINGS", "Подшипники/сальники"],
  ["ENGINE.LUBE", "Смазка"],
  ["ENGINE.LUBE.PUMP", "Маслонасос"],
  ["ENGINE.LUBE.OIL", "Масло двигателя"],
  ["ENGINE.LUBE.FILTER", "Маслофильтр/сетка"],
  ["ENGINE.LUBE.GASKETS", "Прокладки/сальники (двигатель)"],
  ["ENGINE.CLUTCH", "Сцепление"],
  ["ENGINE.CLUTCH.PLATES", "Диски сцепления"],
  ["ENGINE.CLUTCH.BASKET", "Корзина/ступица"],
  ["ENGINE.CLUTCH.ACTUATION", "Привод сцепления (трос/гидро)"],
  ["ENGINE.GEARBOX", "КПП"],
  ["ENGINE.GEARBOX.GEARS", "Шестерни/валы"],
  ["ENGINE.GEARBOX.SHIFT", "Барабан/вилки/механизм переключения"],
  ["ENGINE.START", "Запуск двигателя"],
  ["ENGINE.START.STARTER", "Стартер/реле/бендикс (если есть)"],
  ["ENGINE.START.KICK", "Кикстартер (если есть)"],
  ["ENGINE.MOUNTS", "Крепления двигателя/опоры"],
  ["FUEL", "Топливная система"],
  ["FUEL.TANK", "Бак/крышка/клапаны"],
  ["FUEL.LINES", "Топливные шланги/фильтр/кран"],
  ["FUEL.PUMP", "Насос (если EFI)"],
  ["FUEL.CARB", "Карбюратор"],
  ["FUEL.CARB.REPAIR", "Ремкомплект/жиклёры/игла/поплавок"],
  ["FUEL.EFI", "Инжектор (если EFI)"],
  ["FUEL.EFI.INJECTOR", "Форсунка"],
  ["FUEL.EFI.THROTTLE", "Дроссель"],
  ["FUEL.EFI.SENSORS", "Датчики (TPS/MAP/…)"],
  ["INTAKE", "Впуск воздуха"],
  ["INTAKE.AIRBOX", "Airbox/патрубки"],
  ["INTAKE.FILTER", "Воздушный фильтр"],
  ["COOLING", "Охлаждение"],
  ["COOLING.AIR", "Воздушное (если есть элементы)"],
  ["COOLING.LIQUID", "Жидкостное"],
  ["COOLING.LIQUID.RADIATOR", "Радиаторы/крышка"],
  ["COOLING.LIQUID.PUMP", "Помпа/крыльчатка/сальники"],
  ["COOLING.LIQUID.HOSES", "Патрубки/хомуты"],
  ["COOLING.LIQUID.THERMOSTAT", "Термостат (если есть)"],
  ["COOLING.LIQUID.EXPANSION", "Расширительный бачок"],
  ["EXHAUST", "Выпуск"],
  ["EXHAUST.HEADER", "Коллектор/прокладки"],
  ["EXHAUST.MUFFLER", "Глушитель/банка"],
  ["EXHAUST.MOUNTS", "Крепёж/теплоэкраны"],
  ["EXHAUST.SENSOR", "Лямбда/датчики (если есть)"],
  ["EXHAUST.DBKILLER", "DB-killer/вставки (если есть)"],
  ["ELECTRICS", "Электрика"],
  ["ELECTRICS.BATTERY", "АКБ/клеммы"],
  ["ELECTRICS.FUSES", "Предохранители/реле"],
  ["ELECTRICS.CHARGING", "Зарядка"],
  ["ELECTRICS.CHARGING.STATOR", "Статор/ротор"],
  ["ELECTRICS.CHARGING.REGULATOR", "Регулятор напряжения"],
  ["ELECTRICS.IGNITION", "Зажигание"],
  ["ELECTRICS.IGNITION.CDI_ECU", "CDI/ECU"],
  ["ELECTRICS.IGNITION.COIL", "Катушка"],
  ["ELECTRICS.IGNITION.SPARK", "Свеча/колпачок"],
  ["ELECTRICS.WIRING", "Проводка/жгуты/разъёмы"],
  ["ELECTRICS.LIGHTS", "Свет"],
  ["ELECTRICS.LIGHTS.HEAD", "Фара"],
  ["ELECTRICS.LIGHTS.TAIL", "Задний фонарь"],
  ["ELECTRICS.LIGHTS.TURN", "Поворотники (если есть)"],
  ["ELECTRICS.HORN", "Сигнал"],
  ["ELECTRICS.DASH", "Приборка/датчики"],
  ["ELECTRICS.DASH.SPEED", "Датчик скорости"],
  ["ELECTRICS.DASH.NEUTRAL", "Датчик нейтрали"],
  ["CHASSIS", "Рама и кузов"],
  ["CHASSIS.FRAME", "Рама"],
  ["CHASSIS.SUBFRAME", "Подрамник"],
  ["CHASSIS.MOUNTS", "Крепёж/оси/втулки (общие)"],
  ["CHASSIS.SEAT", "Сиденье/чехол"],
  ["CHASSIS.PLASTICS", "Пластик"],
  ["CHASSIS.PLASTICS.FENDERS", "Крылья"],
  ["CHASSIS.PLASTICS.SIDE", "Боковины/панели"],
  ["CHASSIS.PLASTICS.FORK_GUARDS", "Защита вилки"],
  ["CHASSIS.PLASTICS.HANDGUARDS", "Защита рук (если есть)"],
  ["CHASSIS.PROTECTION", "Защита"],
  ["CHASSIS.PROTECTION.SKID", "Защита картера"],
  ["CHASSIS.PROTECTION.RADIATOR", "Защита радиаторов (если есть)"],
  ["CHASSIS.PROTECTION.FRAME", "Защита рамы/маятника"],
  ["STEERING", "Рулевое"],
  ["STEERING.HANDLEBAR", "Руль/крепления/проставки"],
  ["STEERING.GRIPS", "Грипсы"],
  ["STEERING.CONTROLS", "Пульты/кнопки"],
  ["STEERING.DAMPER", "Демпфер руля (если есть)"],
  ["STEERING.HEADSET", "Рулевая колонка"],
  ["STEERING.HEADSET.BEARINGS", "Подшипники рулевой"],
  ["STEERING.TRIPLES", "Траверсы"],
  ["SUSPENSION", "Подвеска"],
  ["SUSPENSION.FRONT", "Передняя"],
  ["SUSPENSION.FRONT.FORK", "Вилка"],
  ["SUSPENSION.FRONT.SEALS", "Сальники/пыльники"],
  ["SUSPENSION.FRONT.BUSHINGS", "Втулки скольжения"],
  ["SUSPENSION.FRONT.OIL", "Масло/обслуживание"],
  ["SUSPENSION.FRONT.SPRINGS", "Пружины (если отдельно)"],
  ["SUSPENSION.REAR", "Задняя"],
  ["SUSPENSION.REAR.SHOCK", "Амортизатор"],
  ["SUSPENSION.REAR.LINKAGE", "Линк/прогрессия"],
  ["SUSPENSION.REAR.SWINGARM", "Маятник"],
  ["SUSPENSION.REAR.BEARINGS", "Подшипники/сальники/втулки маятника/линка"],
  ["WHEELS", "Колёса/шины"],
  ["WHEELS.FRONT", "Переднее колесо"],
  ["WHEELS.FRONT.RIM", "Обод"],
  ["WHEELS.FRONT.SPOKES", "Спицы/ниппели"],
  ["WHEELS.FRONT.HUB", "Ступица"],
  ["WHEELS.FRONT.BEARINGS", "Подшипники/ось/проставки"],
  ["WHEELS.REAR", "Заднее колесо"],
  ["WHEELS.REAR.RIM", "Обод"],
  ["WHEELS.REAR.SPOKES", "Спицы/ниппели"],
  ["WHEELS.REAR.HUB", "Ступица"],
  ["WHEELS.REAR.BEARINGS", "Подшипники/ось/проставки"],
  ["TIRES", "Резина/камеры"],
  ["TIRES.FRONT", "Передняя шина/камера"],
  ["TIRES.REAR", "Задняя шина/камера"],
  ["TIRES.RIMLOCK", "Буксаторы/ободная лента"],
  ["BRAKES", "Тормоза"],
  ["BRAKES.FRONT", "Передний тормоз"],
  ["BRAKES.FRONT.MASTER", "Главный цилиндр/рычаг"],
  ["BRAKES.FRONT.CALIPER", "Суппорт (перед)"],
  ["BRAKES.FRONT.PADS", "Колодки (перед)"],
  ["BRAKES.FRONT.DISC", "Диск (перед)"],
  ["BRAKES.FRONT.LINE", "Шланг/фитинги (перед)"],
  ["BRAKES.REAR", "Задний тормоз"],
  ["BRAKES.REAR.MASTER", "Главный цилиндр/педаль"],
  ["BRAKES.REAR.CALIPER", "Суппорт (зад)"],
  ["BRAKES.REAR.PADS", "Колодки (зад)"],
  ["BRAKES.REAR.DISC", "Диск (зад)"],
  ["BRAKES.REAR.LINE", "Шланг/фитинги (зад)"],
  ["BRAKES.FLUID", "Тормозная жидкость/прокачка"],
  ["DRIVETRAIN", "Привод"],
  ["DRIVETRAIN.CHAIN", "Цепь"],
  ["DRIVETRAIN.FRONT_SPROCKET", "Ведущая звезда"],
  ["DRIVETRAIN.REAR_SPROCKET", "Ведомая звезда"],
  ["DRIVETRAIN.CHAIN_GUIDE", "Ролики/направляющая"],
  ["DRIVETRAIN.SWINGARM_SLIDER", "Слайдер/ползун цепи"],
  ["DRIVETRAIN.TENSIONERS", "Натяжители/регулировка"],
  ["DRIVETRAIN.GUARD", "Защита цепи (если есть)"],
  ["CONTROLS", "Органы управления"],
  ["CONTROLS.THROTTLE", "Ручка газа/трос"],
  ["CONTROLS.CLUTCH", "Рычаг/трос/гидро (как орган управления)"],
  ["CONTROLS.FRONT_BRAKE", "Рычаг переднего тормоза"],
  ["CONTROLS.REAR_BRAKE", "Педаль заднего тормоза"],
  ["CONTROLS.SHIFTER", "Лапка КПП"],
  ["CONTROLS.FOOTPEG", "Подножки"],
  ["CONTROLS.CABLES", "Тросы/рубашки (общие)"],
] as const;

const topLevelNodeCodes = [
  "ENGINE",
  "FUEL",
  "COOLING",
  "EXHAUST",
  "ELECTRICS",
  "CHASSIS",
  "STEERING",
  "SUSPENSION",
  "WHEELS",
  "BRAKES",
  "DRIVETRAIN",
  "CONTROLS",
] as const;

const maintenanceRuleSeed = [
  {
    code: "ENGINE.LUBE.OIL",
    intervalKm: 5000,
    intervalHours: 120,
    intervalDays: 180,
    warningKm: 500,
    warningHours: 15,
    warningDays: 30,
  },
  {
    code: "ENGINE.LUBE.FILTER",
    intervalKm: 5000,
    intervalHours: 120,
    intervalDays: 180,
    warningKm: 500,
    warningHours: 15,
    warningDays: 30,
  },
  {
    code: "INTAKE.FILTER",
    intervalKm: 8000,
    intervalHours: 180,
    intervalDays: 365,
    warningKm: 1000,
    warningHours: 20,
    warningDays: 45,
  },
  {
    code: "BRAKES.FRONT.PADS",
    intervalKm: 12000,
    intervalHours: null,
    intervalDays: 365,
    warningKm: 1500,
    warningHours: null,
    warningDays: 45,
  },
  {
    code: "BRAKES.REAR.PADS",
    intervalKm: 15000,
    intervalHours: null,
    intervalDays: 365,
    warningKm: 1500,
    warningHours: null,
    warningDays: 45,
  },
  {
    code: "DRIVETRAIN.CHAIN",
    intervalKm: 18000,
    intervalHours: null,
    intervalDays: 365,
    warningKm: 2000,
    warningHours: null,
    warningDays: 45,
  },
  {
    code: "TIRES.FRONT",
    intervalKm: 15000,
    intervalHours: null,
    intervalDays: 540,
    warningKm: 2000,
    warningHours: null,
    warningDays: 60,
  },
  {
    code: "TIRES.REAR",
    intervalKm: 10000,
    intervalHours: null,
    intervalDays: 365,
    warningKm: 1500,
    warningHours: null,
    warningDays: 45,
  },
] as const;

type PartSkuSeedRow = {
  seedKey: string;
  canonicalName: string;
  brandName: string;
  partType: string;
  primaryNodeCode: string;
  isOem?: boolean;
  description?: string | null;
  category?: string | null;
  priceAmount?: number | null;
  currency?: string | null;
  sourceUrl?: string | null;
  partNumbers?: Array<{ number: string; numberType: string; brandName?: string | null }>;
  nodeLinks?: Array<{ nodeCode: string; relationType: string; confidence?: number }>;
  fitments?: Array<{
    brandId?: string | null;
    modelId?: string | null;
    modelVariantId?: string | null;
    yearFrom?: number | null;
    yearTo?: number | null;
    market?: string | null;
    engineCode?: string | null;
    vinFrom?: string | null;
    vinTo?: string | null;
    fitmentType?: string | null;
    confidence?: number;
    note?: string | null;
  }>;
  offers?: Array<{
    sourceName: string;
    externalOfferId?: string | null;
    title: string;
    url?: string | null;
    priceAmount?: number | null;
    currency?: string | null;
    availability?: string | null;
    sellerName?: string | null;
    rawBrand?: string | null;
    rawArticle?: string | null;
  }>;
};

async function seedPartCatalogFromJson(nodeIdByCode: Map<string, string>): Promise<{
  partCatalogSkusUpserted: number;
  partCatalogSkusSkipped: number;
}> {
  const filePath = path.join(process.cwd(), "prisma", "seed-data", "parts-skus.json");
  const raw = await readFile(filePath, "utf8");
  const rows = JSON.parse(raw) as PartSkuSeedRow[];
  let partCatalogSkusUpserted = 0;
  let partCatalogSkusSkipped = 0;

  for (const row of rows) {
    const primaryNodeId = nodeIdByCode.get(row.primaryNodeCode) ?? null;
    if (!primaryNodeId) {
      console.warn(
        `[seed] PartSku skipped (unknown primaryNodeCode): ${row.primaryNodeCode} (${row.seedKey})`
      );
      partCatalogSkusSkipped += 1;
      continue;
    }

    const priceAmount =
      row.priceAmount != null && Number.isFinite(row.priceAmount)
        ? new Prisma.Decimal(row.priceAmount)
        : null;

    const sku = await prisma.partSku.upsert({
      where: { seedKey: row.seedKey },
      create: {
        seedKey: row.seedKey,
        primaryNodeId,
        brandName: row.brandName,
        canonicalName: row.canonicalName,
        partType: row.partType,
        description: row.description ?? null,
        category: row.category ?? null,
        priceAmount,
        currency: row.currency?.trim() || null,
        sourceUrl: row.sourceUrl ?? null,
        isOem: row.isOem ?? false,
        isActive: true,
      },
      update: {
        primaryNodeId,
        brandName: row.brandName,
        canonicalName: row.canonicalName,
        partType: row.partType,
        description: row.description ?? null,
        category: row.category ?? null,
        priceAmount,
        currency: row.currency?.trim() || null,
        sourceUrl: row.sourceUrl ?? null,
        isOem: row.isOem ?? false,
        isActive: true,
      },
    });

    await prisma.partNumber.deleteMany({ where: { skuId: sku.id } });
    await prisma.partSkuNodeLink.deleteMany({ where: { skuId: sku.id } });
    await prisma.partFitment.deleteMany({ where: { skuId: sku.id } });
    await prisma.partOffer.deleteMany({ where: { skuId: sku.id } });

    const nums = row.partNumbers ?? [];
    if (nums.length > 0) {
      await prisma.partNumber.createMany({
        data: nums.map((p) => ({
          skuId: sku.id,
          number: p.number.trim(),
          normalizedNumber: normalizePartNumber(p.number),
          numberType: p.numberType,
          brandName: p.brandName?.trim() || null,
        })),
      });
    }

    const links = row.nodeLinks ?? [];
    const linkCreates: Array<{
      skuId: string;
      nodeId: string;
      relationType: string;
      confidence: number;
    }> = [];
    for (const link of links) {
      const nid = nodeIdByCode.get(link.nodeCode);
      if (!nid) {
        console.warn(
          `[seed] PartSkuNodeLink skip (unknown nodeCode): ${link.nodeCode} for ${row.seedKey}`
        );
        continue;
      }
      linkCreates.push({
        skuId: sku.id,
        nodeId: nid,
        relationType: link.relationType,
        confidence: link.confidence ?? 80,
      });
    }
    if (linkCreates.length > 0) {
      await prisma.partSkuNodeLink.createMany({ data: linkCreates });
    }

    const fits = row.fitments ?? [];
    if (fits.length > 0) {
      await prisma.partFitment.createMany({
        data: fits.map((f) => ({
          skuId: sku.id,
          brandId: f.brandId ?? null,
          modelId: f.modelId ?? null,
          modelVariantId: f.modelVariantId ?? null,
          yearFrom: f.yearFrom ?? null,
          yearTo: f.yearTo ?? null,
          market: f.market ?? null,
          engineCode: f.engineCode ?? null,
          vinFrom: f.vinFrom ?? null,
          vinTo: f.vinTo ?? null,
          fitmentType: f.fitmentType ?? null,
          confidence: f.confidence ?? 80,
          note: f.note ?? null,
        })),
      });
    }

    const offs = row.offers ?? [];
    for (const o of offs) {
      const oPrice =
        o.priceAmount != null && Number.isFinite(o.priceAmount)
          ? new Prisma.Decimal(o.priceAmount)
          : null;
      await prisma.partOffer.create({
        data: {
          skuId: sku.id,
          sourceName: o.sourceName,
          externalOfferId: o.externalOfferId ?? null,
          title: o.title,
          url: o.url ?? null,
          priceAmount: oPrice,
          currency: o.currency?.trim() || null,
          availability: o.availability ?? null,
          sellerName: o.sellerName ?? null,
          rawBrand: o.rawBrand ?? null,
          rawArticle: o.rawArticle ?? null,
        },
      });
    }

    partCatalogSkusUpserted += 1;
  }

  return { partCatalogSkusUpserted, partCatalogSkusSkipped };
}

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

  const nodesForSeed = nodeTaxonomy.map(([code, name], index) => {
    const segments = code.split(".");
    const parentCode =
      segments.length > 1 ? segments.slice(0, segments.length - 1).join(".") : null;

    return {
      code,
      name,
      parentCode,
      level: segments.length,
      displayOrder: index + 1,
    };
  });

  await Promise.all(
    nodesForSeed.map((node) =>
      prisma.node.upsert({
        where: { code: node.code },
        update: {
          name: node.name,
          parentId: null,
          level: node.level,
          displayOrder: node.displayOrder,
          isActive: true,
        },
        create: {
          code: node.code,
          name: node.name,
          parentId: null,
          level: node.level,
          displayOrder: node.displayOrder,
          isActive: true,
        },
      })
    )
  );

  const seededNodes = await prisma.node.findMany({
    where: {
      code: {
        in: nodesForSeed.map((node) => node.code),
      },
    },
    select: {
      id: true,
      code: true,
    },
  });

  const nodeIdByCode = new Map(seededNodes.map((node) => [node.code, node.id]));

  await Promise.all(
    nodesForSeed.map((node) =>
      prisma.node.update({
        where: { code: node.code },
        data: {
          name: node.name,
          parentId: node.parentCode ? nodeIdByCode.get(node.parentCode) ?? null : null,
          level: node.level,
          displayOrder: node.displayOrder,
          isActive: true,
        },
      })
    )
  );

  const partCatalogStats = await seedPartCatalogFromJson(nodeIdByCode);

  const validNodeCodes = new Set(nodesForSeed.map((node) => node.code));
  const legacyNodes = await prisma.node.findMany({
    where: {
      code: {
        notIn: [...validNodeCodes],
      },
    },
    select: {
      id: true,
      code: true,
    },
  });

  const legacyNodeIds = legacyNodes.map((node) => node.id);

  if (legacyNodeIds.length > 0) {
    await prisma.topNodeState.deleteMany({
      where: {
        nodeId: {
          in: legacyNodeIds,
        },
      },
    });
  }

  const removableLegacyNodes = legacyNodes.length
    ? await prisma.node.findMany({
        where: {
          id: {
            in: legacyNodeIds,
          },
          serviceEvents: {
            none: {},
          },
          topNodeStates: {
            none: {},
          },
          children: {
            none: {},
          },
        },
        select: {
          id: true,
        },
      })
    : [];

  if (removableLegacyNodes.length > 0) {
    await prisma.node.deleteMany({
      where: {
        id: {
          in: removableLegacyNodes.map((node) => node.id),
        },
      },
    });
  }

  const refreshedTopLevelNodes = await prisma.node.findMany({
    where: {
      code: {
        in: [...topLevelNodeCodes],
      },
      level: 1,
      parentId: null,
    },
    select: {
      id: true,
      code: true,
    },
  });

  const validTopLevelNodeIds = refreshedTopLevelNodes.map((node) => node.id);

  await prisma.topNodeState.deleteMany({
    where: {
      nodeId: {
        notIn: validTopLevelNodeIds,
      },
    },
  });

  const topLevelNodes = refreshedTopLevelNodes;

  const vehicles = await prisma.vehicle.findMany({
    select: { id: true },
  });

  const topNodeStateRows = vehicles.flatMap((vehicle) =>
    topLevelNodes.map((node) => ({
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

  let maintenanceRulesUpserted = 0;
  let maintenanceRulesSkipped = 0;

  for (const rule of maintenanceRuleSeed) {
    const nodeId = nodeIdByCode.get(rule.code);

    if (!nodeId) {
      maintenanceRulesSkipped += 1;
      console.warn(
        `[seed] NodeMaintenanceRule skipped: node code not found (${rule.code})`
      );
      continue;
    }

    await prisma.nodeMaintenanceRule.upsert({
      where: {
        nodeId,
      },
      update: {
        intervalKm: rule.intervalKm,
        intervalHours: rule.intervalHours,
        intervalDays: rule.intervalDays,
        triggerMode: "WHICHEVER_COMES_FIRST",
        warningKm: rule.warningKm,
        warningHours: rule.warningHours,
        warningDays: rule.warningDays,
        isActive: true,
      },
      create: {
        nodeId,
        intervalKm: rule.intervalKm,
        intervalHours: rule.intervalHours,
        intervalDays: rule.intervalDays,
        triggerMode: "WHICHEVER_COMES_FIRST",
        warningKm: rule.warningKm,
        warningHours: rule.warningHours,
        warningDays: rule.warningDays,
        isActive: true,
      },
    });

    maintenanceRulesUpserted += 1;
  }

  console.log("Seed completed");
  console.log({
    brands: ["BMW", "KTM"],
    testUserEmail: testUser.email,
    seededNodes: seededNodes.length,
    topLevelNodes: topLevelNodes.length,
    topNodeStates: topNodeStateRows.length,
    maintenanceRulesUpserted,
    maintenanceRulesSkipped,
    legacyNodesFound: legacyNodes.length,
    legacyNodesDeleted: removableLegacyNodes.length,
    ...partCatalogStats,
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