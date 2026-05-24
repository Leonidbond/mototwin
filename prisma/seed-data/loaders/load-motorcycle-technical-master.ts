/**
 * Loader for the unified MotoTwin model technical-master CSVs.
 *
 * Reads `prisma/seed-data/{brand}-model-technical-master.csv`, validates each
 * row against the canonical {@link MotoModelTechnicalMasterRow} shape, and
 * upserts the four-level hierarchy + 1:1 technical specs row.
 *
 * The same loader handles every brand (BMW, KTM, …) — see
 * `docs/models/mototwin_model_technical_master_standard_cursor.md` for rules.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import Papa from "papaparse";
import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import { normalizePowerToHp } from "@mototwin/domain";
import type { MotoModelTechnicalMasterRow } from "@mototwin/types";

/* ------------------------------------------------------------------ */
/* Zod schema for one CSV row                                          */
/* ------------------------------------------------------------------ */

const NULLABLE_STRINGS = new Set(["", "n/a", "н/д", "null"]);

const trimmedString = z
  .string()
  .transform((value) => value.trim())
  .transform((value) => (NULLABLE_STRINGS.has(value.toLowerCase()) ? null : value));

const optionalString = trimmedString.nullable().or(z.literal(null));

const requiredString = z
  .string()
  .transform((value) => value.trim())
  .refine((value) => value.length > 0, "expected non-empty string");

const numericLike = z.preprocess((raw) => {
  if (raw == null) return null;
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : null;
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed || NULLABLE_STRINGS.has(trimmed.toLowerCase())) {
      return null;
    }
    const parsed = Number(trimmed.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}, z.number().nullable());

const intLike = z.preprocess((raw) => {
  if (raw == null) return null;
  if (typeof raw === "number") {
    return Number.isInteger(raw) ? raw : Math.trunc(raw);
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed || NULLABLE_STRINGS.has(trimmed.toLowerCase())) {
      return null;
    }
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}, z.number().int().nullable());

const requiredInt = z.preprocess((raw) => {
  if (raw == null) return raw;
  if (typeof raw === "number") return Number.isInteger(raw) ? raw : Math.trunc(raw);
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}, z.number().int());

const boolLike = z.preprocess((raw) => {
  if (typeof raw === "boolean") return raw;
  if (raw == null) return false;
  if (typeof raw === "string") {
    const trimmed = raw.trim().toLowerCase();
    if (trimmed === "true") return true;
    if (trimmed === "false") return false;
    if (trimmed === "1") return true;
    if (trimmed === "0" || trimmed === "") return false;
  }
  return false;
}, z.boolean());

const driveType = z.enum(["CHAIN", "SHAFT", "BELT", "UNKNOWN"]);
const powerUnit = z
  .union([z.literal("hp"), z.literal("PS"), z.literal("kW"), z.literal(""), z.null()])
  .transform((value) => (value === "" || value == null ? null : value));
const marketRegion = z.enum(["GLOBAL", "EU", "US", "RU", "OTHER"]);
const weightType = z
  .union([
    z.literal("dry"),
    z.literal("wet"),
    z.literal("curb"),
    z.literal("fully_fueled"),
    z.literal("without_fuel"),
    z.literal("unknown"),
    z.literal(""),
    z.null(),
  ])
  .transform((value) => (value === "" || value == null ? null : value));
const supportLevel = z.enum([
  "MVP_CORE",
  "MVP_CORE_LEGACY",
  "COMMUNITY_SUPPORT",
  "EARLY_BETA",
  "NO_FITMENT_DATA_YET",
]);

const csvRowSchema = z.object({
  brand: requiredString,
  model_family: requiredString,
  variant: requiredString,
  generation: requiredString,
  year_from: requiredInt,
  year_to: intLike,
  years_label: requiredString,
  market_region: marketRegion,
  segment: requiredString,
  engine: requiredString,
  displacement_cc: numericLike,
  displacement_is_approx: boolLike,
  power_value: numericLike,
  power_unit: powerUnit,
  power_hp_normalized: numericLike,
  power_is_approx: boolLike,
  torque_nm: numericLike,
  torque_is_approx: boolLike,
  gearbox: optionalString,
  drive: driveType,
  front_wheel_in: numericLike,
  rear_wheel_in: numericLike,
  front_tire: optionalString,
  rear_tire: optionalString,
  fuel_l: numericLike,
  fuel_is_approx: boolLike,
  weight_kg: numericLike,
  weight_type: weightType,
  seat_mm: optionalString,
  support_level: supportLevel,
  data_status: requiredString,
  mototwin_comment: optionalString,
  source_url: optionalString,
});

/* ------------------------------------------------------------------ */
/* Slug helper                                                         */
/* ------------------------------------------------------------------ */

function slugifyValue(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

/* ------------------------------------------------------------------ */
/* Loader                                                              */
/* ------------------------------------------------------------------ */

export type MotoTechnicalMasterSeedStats = {
  files: number;
  rowsTotal: number;
  rowsImported: number;
  brandsUpserted: number;
  familiesUpserted: number;
  variantsUpserted: number;
  generationsUpserted: number;
  techSpecsUpserted: number;
};

const DEFAULT_FILES = [
  "bmw-model-technical-master.csv",
  "ktm-model-technical-master.csv",
];

export async function loadMotorcycleTechnicalMaster(
  prisma: PrismaClient,
  options: { fileNames?: string[]; baseDir?: string } = {}
): Promise<MotoTechnicalMasterSeedStats> {
  const fileNames = options.fileNames ?? DEFAULT_FILES;
  const baseDir =
    options.baseDir ?? path.join(process.cwd(), "prisma", "seed-data");

  const stats: MotoTechnicalMasterSeedStats = {
    files: 0,
    rowsTotal: 0,
    rowsImported: 0,
    brandsUpserted: 0,
    familiesUpserted: 0,
    variantsUpserted: 0,
    generationsUpserted: 0,
    techSpecsUpserted: 0,
  };

  const seenBrandIds = new Set<string>();
  const seenFamilyIds = new Set<string>();
  const seenVariantIds = new Set<string>();
  const seenGenerationIds = new Set<string>();

  for (const fileName of fileNames) {
    const filePath = path.join(baseDir, fileName);
    let raw: string;
    try {
      raw = await readFile(filePath, "utf8");
    } catch (error) {
      console.warn(`[seed] Motorcycle master CSV skipped: ${filePath}`, error);
      continue;
    }
    stats.files += 1;

    const parsed = Papa.parse<Record<string, string>>(raw, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (header) => header.trim(),
    });

    if (parsed.errors.length > 0) {
      console.warn(`[seed] Motorcycle master CSV parse warnings (${fileName})`, parsed.errors);
    }

    for (const rawRow of parsed.data) {
      stats.rowsTotal += 1;
      const validation = csvRowSchema.safeParse(rawRow);
      if (!validation.success) {
        console.warn(
          `[seed] Motorcycle master CSV row invalid (${fileName})`,
          validation.error.flatten()
        );
        continue;
      }
      const row = validation.data as MotoModelTechnicalMasterRow;
      const result = await upsertMotorcycleRow(prisma, row);
      stats.rowsImported += 1;
      if (!seenBrandIds.has(result.brandId)) {
        seenBrandIds.add(result.brandId);
        stats.brandsUpserted += 1;
      }
      if (!seenFamilyIds.has(result.familyId)) {
        seenFamilyIds.add(result.familyId);
        stats.familiesUpserted += 1;
      }
      if (!seenVariantIds.has(result.variantId)) {
        seenVariantIds.add(result.variantId);
        stats.variantsUpserted += 1;
      }
      if (!seenGenerationIds.has(result.generationId)) {
        seenGenerationIds.add(result.generationId);
        stats.generationsUpserted += 1;
      }
      stats.techSpecsUpserted += 1;
    }
  }

  return stats;
}

async function upsertMotorcycleRow(
  prisma: PrismaClient,
  row: MotoModelTechnicalMasterRow
): Promise<{
  brandId: string;
  familyId: string;
  variantId: string;
  generationId: string;
}> {
  const brandSlug = slugifyValue(row.brand);
  const familySlug = slugifyValue(row.model_family);
  const variantSlug = slugifyValue(row.variant);

  const brand = await prisma.motorcycleBrand.upsert({
    where: { name: row.brand },
    update: { slug: brandSlug },
    create: { name: row.brand, slug: brandSlug },
  });

  const family = await prisma.motorcycleModelFamily.upsert({
    where: { brandId_slug: { brandId: brand.id, slug: familySlug } },
    update: { name: row.model_family },
    create: {
      brandId: brand.id,
      name: row.model_family,
      slug: familySlug,
    },
  });

  const variant = await prisma.motorcycleVariant.upsert({
    where: { familyId_slug: { familyId: family.id, slug: variantSlug } },
    update: { name: row.variant },
    create: {
      familyId: family.id,
      name: row.variant,
      slug: variantSlug,
    },
  });

  // generation upsert: the unique key is (variantId, name, yearFrom, yearTo).
  // yearTo is nullable; PG treats NULLs as distinct in unique indexes, so we
  // emulate upsert via findFirst + update/create.
  const existingGeneration = await prisma.motorcycleGeneration.findFirst({
    where: {
      variantId: variant.id,
      name: row.generation,
      yearFrom: row.year_from,
      yearTo: row.year_to,
    },
    select: { id: true },
  });

  const generationData = {
    name: row.generation,
    yearFrom: row.year_from,
    yearTo: row.year_to,
    yearsLabel: row.years_label,
    marketRegion: row.market_region,
    segment: row.segment,
    supportLevel: row.support_level,
    dataStatus: row.data_status,
    comment: row.mototwin_comment,
    sourceUrl: row.source_url,
  };

  const generation = existingGeneration
    ? await prisma.motorcycleGeneration.update({
        where: { id: existingGeneration.id },
        data: generationData,
      })
    : await prisma.motorcycleGeneration.create({
        data: { variantId: variant.id, ...generationData },
      });

  const powerHpNormalized =
    row.power_hp_normalized != null
      ? row.power_hp_normalized
      : normalizePowerToHp(row.power_value, row.power_unit);

  const techSpecData = {
    engine: row.engine,
    displacementCc: row.displacement_cc,
    displacementIsApprox: row.displacement_is_approx,
    powerValue: row.power_value,
    powerUnit: row.power_unit,
    powerHpNormalized: powerHpNormalized,
    powerIsApprox: row.power_is_approx,
    torqueNm: row.torque_nm,
    torqueIsApprox: row.torque_is_approx,
    gearbox: row.gearbox,
    drive: row.drive,
    frontWheelIn: row.front_wheel_in,
    rearWheelIn: row.rear_wheel_in,
    frontTire: row.front_tire,
    rearTire: row.rear_tire,
    fuelLiters: row.fuel_l,
    fuelIsApprox: row.fuel_is_approx,
    weightKg: row.weight_kg,
    weightType: row.weight_type,
    seatMm: row.seat_mm,
  };

  await prisma.motorcycleTechnicalSpecs.upsert({
    where: { generationId: generation.id },
    update: techSpecData,
    create: { generationId: generation.id, ...techSpecData },
  });

  return {
    brandId: brand.id,
    familyId: family.id,
    variantId: variant.id,
    generationId: generation.id,
  };
}
