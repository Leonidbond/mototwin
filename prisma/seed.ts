import "dotenv/config";
import { createHash } from "node:crypto";
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

/** QA catalog JSON: fitments use human-readable brand/model/variant (see parts-skus.qa.json). */
type PartSkuQaFitmentSeed = {
  brandName?: string | null;
  modelName?: string | null;
  modelVariantName?: string | null;
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
};

type PartSkuQaSeedRow = Omit<PartSkuSeedRow, "fitments" | "seedKey"> & {
  seedKey?: string;
  fitments?: PartSkuQaFitmentSeed[];
};

function normalizeQaPartNumber(raw: string): string {
  return raw.trim().toUpperCase().replace(/[\s-]+/g, "");
}

function skuCatalogDedupKey(row: { brandName: string; canonicalName: string; partType: string }): string {
  return `${row.brandName.trim()}|${row.canonicalName.trim()}|${row.partType.trim()}`;
}

function parseQaVariantLabel(raw?: string | null): { year?: number; versionName?: string } {
  if (!raw?.trim()) {
    return {};
  }
  const parts = raw
    .split("|")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (parts.length >= 2) {
    const y = Number.parseInt(parts[0] ?? "", 10);
    return {
      year: Number.isFinite(y) ? y : undefined,
      versionName: parts.slice(1).join(" | "),
    };
  }
  return { versionName: raw.trim() };
}

function qaOfferExternalId(
  skuDedupKey: string,
  offer: { sourceName: string; title: string; externalOfferId?: string | null }
): string {
  const ext = offer.externalOfferId?.trim();
  if (ext) {
    return ext;
  }
  return `qa-seed:${createHash("sha256")
    .update(`${skuDedupKey}\n${offer.sourceName}\n${offer.title}`)
    .digest("hex")
    .slice(0, 32)}`;
}

type FitmentPayload = {
  brandId: string | null;
  modelId: string | null;
  modelVariantId: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  market: string | null;
  engineCode: string | null;
  vinFrom: string | null;
  vinTo: string | null;
  fitmentType: string | null;
  confidence: number;
  note: string | null;
};

function fitmentPayloadKey(p: FitmentPayload): string {
  return [
    p.brandId ?? "",
    p.modelId ?? "",
    p.modelVariantId ?? "",
    p.yearFrom ?? "",
    p.yearTo ?? "",
    p.market ?? "",
    p.engineCode ?? "",
    p.vinFrom ?? "",
    p.vinTo ?? "",
    p.fitmentType ?? "",
    p.note ?? "",
  ].join("\t");
}

function fitmentRowKey(row: {
  brandId: string | null;
  modelId: string | null;
  modelVariantId: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  market: string | null;
  engineCode: string | null;
  vinFrom: string | null;
  vinTo: string | null;
  fitmentType: string | null;
  note: string | null;
}): string {
  return fitmentPayloadKey({
    brandId: row.brandId,
    modelId: row.modelId,
    modelVariantId: row.modelVariantId,
    yearFrom: row.yearFrom,
    yearTo: row.yearTo,
    market: row.market,
    engineCode: row.engineCode,
    vinFrom: row.vinFrom,
    vinTo: row.vinTo,
    fitmentType: row.fitmentType,
    note: row.note,
    confidence: 0,
  });
}

function resolveQaFitmentPayload(
  f: PartSkuQaFitmentSeed,
  brandIdByName: Map<string, string>,
  modelIdByBrandAndName: Map<string, string>,
  variantIdByKey: Map<string, string>,
  stats: { fitmentsSkipped: number; fitmentWarnings: number }
): FitmentPayload | null {
  if (f.brandId != null || f.modelId != null || f.modelVariantId != null) {
    return {
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
    };
  }

  const hasBrand = Boolean(f.brandName?.trim());
  const hasModel = Boolean(f.modelName?.trim());

  if (!hasBrand && !hasModel) {
    return {
      brandId: null,
      modelId: null,
      modelVariantId: null,
      yearFrom: f.yearFrom ?? null,
      yearTo: f.yearTo ?? null,
      market: f.market ?? null,
      engineCode: f.engineCode ?? null,
      vinFrom: f.vinFrom ?? null,
      vinTo: f.vinTo ?? null,
      fitmentType: f.fitmentType ?? null,
      confidence: f.confidence ?? 80,
      note: f.note ?? null,
    };
  }

  if (hasModel && !hasBrand) {
    console.warn(
      `[seed] QA PartFitment skip: modelName without brandName (${f.modelName ?? ""})`
    );
    stats.fitmentsSkipped += 1;
    return null;
  }

  const brandId = hasBrand ? brandIdByName.get(f.brandName!.trim()) ?? null : null;
  if (hasBrand && !brandId) {
    console.warn(
      `[seed] QA PartFitment skip: brand not in DB (${f.brandName})`
    );
    stats.fitmentsSkipped += 1;
    return null;
  }

  let modelId: string | null = null;
  if (hasModel && brandId) {
    const mk = `${brandId}\t${f.modelName!.trim()}`;
    modelId = modelIdByBrandAndName.get(mk) ?? null;
    if (!modelId) {
      console.warn(
        `[seed] QA PartFitment: model not found (${f.brandName} / ${f.modelName}) — using brand-only row`
      );
      stats.fitmentWarnings += 1;
    }
  }

  let modelVariantId: string | null = null;
  const parsed = parseQaVariantLabel(f.modelVariantName);
  const year = f.yearFrom ?? parsed.year ?? null;
  const versionName = parsed.versionName ?? null;

  if (modelId && year != null && versionName) {
    const vk = `${modelId}|${year}|${versionName}`;
    modelVariantId = variantIdByKey.get(vk) ?? null;
    if (!modelVariantId) {
      console.warn(
        `[seed] QA PartFitment: variant not found (${f.modelName} / ${year} / ${versionName}) — dropping modelVariantId`
      );
      stats.fitmentWarnings += 1;
    }
  }

  return {
    brandId,
    modelId,
    modelVariantId,
    yearFrom: f.yearFrom ?? null,
    yearTo: f.yearTo ?? null,
    market: f.market ?? null,
    engineCode: f.engineCode ?? null,
    vinFrom: f.vinFrom ?? null,
    vinTo: f.vinTo ?? null,
    fitmentType: f.fitmentType ?? null,
    confidence: f.confidence ?? 80,
    note: f.note ?? null,
  };
}

async function seedPartCatalogQaFromJson(nodeIdByCode: Map<string, string>): Promise<{
  qaCatalogSkusUpserted: number;
  qaCatalogSkusSkippedPrimaryNode: number;
  qaCatalogNodeLinksSkippedUnknownNode: number;
  qaCatalogFitmentsSynced: number;
  qaCatalogFitmentsSkipped: number;
  qaCatalogFitmentWarnings: number;
  qaCatalogOffersUpserted: number;
}> {
  const filePath = path.join(process.cwd(), "prisma", "seed-data", "parts-skus.qa.json");
  const raw = await readFile(filePath, "utf8");
  const rows = JSON.parse(raw) as PartSkuQaSeedRow[];

  const brands = await prisma.brand.findMany({ select: { id: true, name: true } });
  const brandIdByName = new Map(brands.map((b) => [b.name, b.id]));

  const models = await prisma.model.findMany({ select: { id: true, name: true, brandId: true } });
  const modelIdByBrandAndName = new Map(models.map((m) => [`${m.brandId}\t${m.name}`, m.id]));

  const variants = await prisma.modelVariant.findMany({
    select: { id: true, modelId: true, year: true, versionName: true },
  });
  const variantIdByKey = new Map(
    variants.map((v) => [`${v.modelId}|${v.year}|${v.versionName}`, v.id])
  );

  let qaCatalogSkusUpserted = 0;
  let qaCatalogSkusSkippedPrimaryNode = 0;
  let qaCatalogNodeLinksSkippedUnknownNode = 0;
  let qaCatalogFitmentsSynced = 0;
  let qaCatalogFitmentsSkipped = 0;
  let qaCatalogFitmentWarnings = 0;
  let qaCatalogOffersUpserted = 0;

  for (const row of rows) {
    const fitmentStats = { fitmentsSkipped: 0, fitmentWarnings: 0 };
    const primaryNodeId = nodeIdByCode.get(row.primaryNodeCode) ?? null;
    if (!primaryNodeId) {
      console.warn(
        `[seed] QA PartSku skip (unknown primaryNodeCode): ${row.primaryNodeCode} (${row.brandName} — ${row.canonicalName})`
      );
      qaCatalogSkusSkippedPrimaryNode += 1;
      continue;
    }

    const priceAmount =
      row.priceAmount != null && Number.isFinite(row.priceAmount)
        ? new Prisma.Decimal(row.priceAmount)
        : null;

    const dedupKey = skuCatalogDedupKey(row);

    const existingSku = await prisma.partSku.findFirst({
      where: {
        brandName: row.brandName.trim(),
        canonicalName: row.canonicalName.trim(),
        partType: row.partType.trim(),
      },
      select: { id: true },
    });

    const sku = existingSku
      ? await prisma.partSku.update({
          where: { id: existingSku.id },
          data: {
            seedKey: row.seedKey?.trim() || null,
            primaryNodeId,
            brandName: row.brandName.trim(),
            canonicalName: row.canonicalName.trim(),
            partType: row.partType.trim(),
            description: row.description ?? null,
            category: row.category ?? null,
            priceAmount,
            currency: row.currency?.trim() || null,
            sourceUrl: row.sourceUrl ?? null,
            isOem: row.isOem ?? false,
            isActive: true,
          },
        })
      : await prisma.partSku.create({
          data: {
            seedKey: row.seedKey?.trim() || null,
            primaryNodeId,
            brandName: row.brandName.trim(),
            canonicalName: row.canonicalName.trim(),
            partType: row.partType.trim(),
            description: row.description ?? null,
            category: row.category ?? null,
            priceAmount,
            currency: row.currency?.trim() || null,
            sourceUrl: row.sourceUrl ?? null,
            isOem: row.isOem ?? false,
            isActive: true,
          },
        });

    const nums = row.partNumbers ?? [];
    const desiredNumberKeys = new Set<string>();
    for (const p of nums) {
      const norm = normalizeQaPartNumber(p.number);
      const numberType = p.numberType;
      desiredNumberKeys.add(`${norm}|${numberType}`);
      await prisma.partNumber.upsert({
        where: {
          skuId_normalizedNumber_numberType: {
            skuId: sku.id,
            normalizedNumber: norm,
            numberType,
          },
        },
        create: {
          skuId: sku.id,
          number: p.number.trim(),
          normalizedNumber: norm,
          numberType,
          brandName: p.brandName?.trim() || null,
        },
        update: {
          number: p.number.trim(),
          brandName: p.brandName?.trim() || null,
        },
      });
    }
    const existingNumbers = await prisma.partNumber.findMany({
      where: { skuId: sku.id },
      select: { id: true, normalizedNumber: true, numberType: true },
    });
    for (const en of existingNumbers) {
      const k = `${en.normalizedNumber}|${en.numberType}`;
      if (!desiredNumberKeys.has(k)) {
        await prisma.partNumber.delete({ where: { id: en.id } });
      }
    }

    const links = row.nodeLinks ?? [];
    const desiredLinkKeys = new Set<string>();
    for (const link of links) {
      const nid = nodeIdByCode.get(link.nodeCode);
      if (!nid) {
        qaCatalogNodeLinksSkippedUnknownNode += 1;
        console.warn(
          `[seed] QA PartSkuNodeLink skip (unknown nodeCode): ${link.nodeCode} for ${dedupKey}`
        );
        continue;
      }
      desiredLinkKeys.add(`${nid}|${link.relationType}`);
      await prisma.partSkuNodeLink.upsert({
        where: {
          skuId_nodeId_relationType: {
            skuId: sku.id,
            nodeId: nid,
            relationType: link.relationType,
          },
        },
        create: {
          skuId: sku.id,
          nodeId: nid,
          relationType: link.relationType,
          confidence: link.confidence ?? 80,
        },
        update: {
          confidence: link.confidence ?? 80,
        },
      });
    }
    const existingLinks = await prisma.partSkuNodeLink.findMany({
      where: { skuId: sku.id },
      select: { id: true, nodeId: true, relationType: true },
    });
    for (const el of existingLinks) {
      const k = `${el.nodeId}|${el.relationType}`;
      if (!desiredLinkKeys.has(k)) {
        await prisma.partSkuNodeLink.delete({ where: { id: el.id } });
      }
    }

    const fits = row.fitments ?? [];
    const resolvedFitments: FitmentPayload[] = [];
    for (const f of fits) {
      const payload = resolveQaFitmentPayload(
        f,
        brandIdByName,
        modelIdByBrandAndName,
        variantIdByKey,
        fitmentStats
      );
      if (payload) {
        resolvedFitments.push(payload);
      }
    }
    qaCatalogFitmentsSkipped += fitmentStats.fitmentsSkipped;
    qaCatalogFitmentWarnings += fitmentStats.fitmentWarnings;

    const desiredFitmentKeys = new Set(resolvedFitments.map((p) => fitmentPayloadKey(p)));
    const existingFitments = await prisma.partFitment.findMany({
      where: { skuId: sku.id },
      select: {
        id: true,
        brandId: true,
        modelId: true,
        modelVariantId: true,
        yearFrom: true,
        yearTo: true,
        market: true,
        engineCode: true,
        vinFrom: true,
        vinTo: true,
        fitmentType: true,
        note: true,
      },
    });
    for (const ef of existingFitments) {
      if (!desiredFitmentKeys.has(fitmentRowKey(ef))) {
        await prisma.partFitment.delete({ where: { id: ef.id } });
      }
    }

    for (const payload of resolvedFitments) {
      const existing = await prisma.partFitment.findFirst({
        where: {
          skuId: sku.id,
          brandId: payload.brandId,
          modelId: payload.modelId,
          modelVariantId: payload.modelVariantId,
          yearFrom: payload.yearFrom,
          yearTo: payload.yearTo,
          market: payload.market,
          engineCode: payload.engineCode,
          vinFrom: payload.vinFrom,
          vinTo: payload.vinTo,
          fitmentType: payload.fitmentType,
          note: payload.note,
        },
        select: { id: true },
      });
      if (existing) {
        await prisma.partFitment.update({
          where: { id: existing.id },
          data: { confidence: payload.confidence },
        });
      } else {
        await prisma.partFitment.create({
          data: {
            skuId: sku.id,
            brandId: payload.brandId,
            modelId: payload.modelId,
            modelVariantId: payload.modelVariantId,
            yearFrom: payload.yearFrom,
            yearTo: payload.yearTo,
            market: payload.market,
            engineCode: payload.engineCode,
            vinFrom: payload.vinFrom,
            vinTo: payload.vinTo,
            fitmentType: payload.fitmentType,
            confidence: payload.confidence,
            note: payload.note,
          },
        });
      }
      qaCatalogFitmentsSynced += 1;
    }

    const offs = row.offers ?? [];
    for (const o of offs) {
      const extId = qaOfferExternalId(dedupKey, o);
      const oPrice =
        o.priceAmount != null && Number.isFinite(o.priceAmount)
          ? new Prisma.Decimal(o.priceAmount)
          : null;
      const existingOffer = await prisma.partOffer.findFirst({
        where: {
          skuId: sku.id,
          sourceName: o.sourceName,
          externalOfferId: extId,
        },
        select: { id: true },
      });
      if (existingOffer) {
        await prisma.partOffer.update({
          where: { id: existingOffer.id },
          data: {
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
      } else {
        await prisma.partOffer.create({
          data: {
            skuId: sku.id,
            sourceName: o.sourceName,
            externalOfferId: extId,
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
      qaCatalogOffersUpserted += 1;
    }

    qaCatalogSkusUpserted += 1;
  }

  console.log(
    `[seed] QA catalog: ${qaCatalogSkusUpserted} SKU(s) upserted from parts-skus.qa.json; primary node skips: ${qaCatalogSkusSkippedPrimaryNode}; node link skips (unknown node): ${qaCatalogNodeLinksSkippedUnknownNode}; fitment rows synced: ${qaCatalogFitmentsSynced}; fitments skipped: ${qaCatalogFitmentsSkipped}; fitment warnings: ${qaCatalogFitmentWarnings}; offers upserted: ${qaCatalogOffersUpserted}`
  );

  return {
    qaCatalogSkusUpserted,
    qaCatalogSkusSkippedPrimaryNode,
    qaCatalogNodeLinksSkippedUnknownNode,
    qaCatalogFitmentsSynced,
    qaCatalogFitmentsSkipped,
    qaCatalogFitmentWarnings,
    qaCatalogOffersUpserted,
  };
}

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

/** Стабильные QA-мотоциклы для проверки рекомендаций каталога (паритет fitment с parts-skus.qa.json). */
async function upsertDemoCatalogVehicle(input: {
  userId: string;
  garageId: string;
  nickname: string;
  brandId: string;
  modelId: string;
  modelVariantId: string;
}): Promise<void> {
  const existing = await prisma.vehicle.findFirst({
    where: { userId: input.userId, nickname: input.nickname },
    select: { id: true },
  });

  const vehicleId =
    existing != null
      ? (
          await prisma.vehicle.update({
            where: { id: existing.id },
            data: {
              garageId: input.garageId,
              brandId: input.brandId,
              modelId: input.modelId,
              modelVariantId: input.modelVariantId,
            },
            select: { id: true },
          })
        ).id
      : (
          await prisma.vehicle.create({
            data: {
              userId: input.userId,
              garageId: input.garageId,
              brandId: input.brandId,
              modelId: input.modelId,
              modelVariantId: input.modelVariantId,
              nickname: input.nickname,
              odometer: 8500,
              engineHours: null,
              vin: null,
            },
            select: { id: true },
          })
        ).id;

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

async function upsertOwnedVehicle(input: {
  userId: string;
  garageId: string;
  nickname: string;
  brandId: string;
  modelId: string;
  modelVariantId: string;
  odometer: number;
}) {
  const existing = await prisma.vehicle.findFirst({
    where: {
      userId: input.userId,
      nickname: input.nickname,
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.vehicle.update({
      where: { id: existing.id },
      data: {
        garageId: input.garageId,
        brandId: input.brandId,
        modelId: input.modelId,
        modelVariantId: input.modelVariantId,
        odometer: input.odometer,
      },
    });
    return;
  }

  await prisma.vehicle.create({
    data: {
      userId: input.userId,
      garageId: input.garageId,
      brandId: input.brandId,
      modelId: input.modelId,
      modelVariantId: input.modelVariantId,
      nickname: input.nickname,
      odometer: input.odometer,
      engineHours: null,
      vin: null,
    },
  });
}

async function main() {
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@mototwin.local" },
    update: {
      displayName: "Demo User",
      passwordHash: null,
    },
    create: {
      email: "demo@mototwin.local",
      displayName: "Demo User",
      passwordHash: null,
    },
  });

  const demoGarage = await prisma.garage.upsert({
    where: {
      ownerUserId_title: {
        ownerUserId: demoUser.id,
        title: "Мой гараж",
      },
    },
    update: {},
    create: {
      ownerUserId: demoUser.id,
      title: "Мой гараж",
    },
  });

  const userA = await prisma.user.upsert({
    where: { email: "user-a@mototwin.local" },
    update: {
      displayName: "Test User A",
      passwordHash: null,
    },
    create: {
      email: "user-a@mototwin.local",
      displayName: "Test User A",
      passwordHash: null,
    },
  });
  const garageA = await prisma.garage.upsert({
    where: {
      ownerUserId_title: {
        ownerUserId: userA.id,
        title: "Гараж A",
      },
    },
    update: {},
    create: {
      ownerUserId: userA.id,
      title: "Гараж A",
    },
  });

  const userB = await prisma.user.upsert({
    where: { email: "user-b@mototwin.local" },
    update: {
      displayName: "Test User B",
      passwordHash: null,
    },
    create: {
      email: "user-b@mototwin.local",
      displayName: "Test User B",
      passwordHash: null,
    },
  });
  const garageB = await prisma.garage.upsert({
    where: {
      ownerUserId_title: {
        ownerUserId: userB.id,
        title: "Гараж B",
      },
    },
    update: {},
    create: {
      ownerUserId: userB.id,
      title: "Гараж B",
    },
  });

  await prisma.vehicle.updateMany({
    where: {
      garageId: null,
    },
    data: {
      userId: demoUser.id,
      garageId: demoGarage.id,
    },
  });

  await prisma.subscription.upsert({
    where: { userId: demoUser.id },
    update: {
      planType: "FREE",
      status: "ACTIVE",
    },
    create: {
      userId: demoUser.id,
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

  const variantR12502023 = await prisma.modelVariant.findFirst({
    where: {
      modelId: r1250gs.id,
      year: 2023,
      versionName: "R 1250 GS Standard",
    },
    select: { id: true },
  });
  const variant6902022 = await prisma.modelVariant.findFirst({
    where: {
      modelId: enduro690.id,
      year: 2022,
      versionName: "690 Enduro R Standard",
    },
    select: { id: true },
  });

  let qaDemoCatalogVehicles = 0;
  if (variantR12502023) {
    await upsertDemoCatalogVehicle({
      userId: demoUser.id,
      garageId: demoGarage.id,
      nickname: "QA — BMW R 1250 GS 2023",
      brandId: bmw.id,
      modelId: r1250gs.id,
      modelVariantId: variantR12502023.id,
    });
    qaDemoCatalogVehicles += 1;
  } else {
    console.warn("[seed] QA demo vehicle skipped: R 1250 GS 2023 variant not found");
  }
  if (variant6902022) {
    await upsertDemoCatalogVehicle({
      userId: demoUser.id,
      garageId: demoGarage.id,
      nickname: "QA — KTM 690 Enduro R 2022",
      brandId: ktm.id,
      modelId: enduro690.id,
      modelVariantId: variant6902022.id,
    });
    qaDemoCatalogVehicles += 1;
  } else {
    console.warn("[seed] QA demo vehicle skipped: 690 Enduro R 2022 variant not found");
  }

  if (variantR12502023) {
    await upsertOwnedVehicle({
      userId: userA.id,
      garageId: garageA.id,
      nickname: "Test A — BMW R 1250 GS 2023",
      brandId: bmw.id,
      modelId: r1250gs.id,
      modelVariantId: variantR12502023.id,
      odometer: 4100,
    });
  }

  if (variant6902022) {
    await upsertOwnedVehicle({
      userId: userB.id,
      garageId: garageB.id,
      nickname: "Test B — KTM 690 Enduro R 2022",
      brandId: ktm.id,
      modelId: enduro690.id,
      modelVariantId: variant6902022.id,
      odometer: 5200,
    });
  }

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
  const partCatalogQaStats = await seedPartCatalogQaFromJson(nodeIdByCode);

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
    demoUserEmail: demoUser.email,
    userAEmail: userA.email,
    userBEmail: userB.email,
    demoGarageId: demoGarage.id,
    garageAId: garageA.id,
    garageBId: garageB.id,
    seededNodes: seededNodes.length,
    topLevelNodes: topLevelNodes.length,
    topNodeStates: topNodeStateRows.length,
    maintenanceRulesUpserted,
    maintenanceRulesSkipped,
    legacyNodesFound: legacyNodes.length,
    legacyNodesDeleted: removableLegacyNodes.length,
    ...partCatalogStats,
    ...partCatalogQaStats,
    qaDemoCatalogVehicles,
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