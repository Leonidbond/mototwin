import { NextRequest, NextResponse } from "next/server";
import type {
  MotorcycleTechnicalSpecs,
  MotorcycleGeneration,
  ModelSupportLevel,
  MotoMarketRegion,
} from "@prisma/client";
import type {
  MotorcycleGenerationPickerItem,
  MotorcycleGenerationsResponse,
  MotoSupportLevel,
  VehicleTechnicalSpecsView,
} from "@mototwin/types";
import { prisma } from "@/lib/prisma";

function buildTechnicalSpecsView(
  generation: Pick<MotorcycleGeneration, "marketRegion">,
  specs: MotorcycleTechnicalSpecs | null
): VehicleTechnicalSpecsView | null {
  if (!specs) {
    return null;
  }
  return {
    marketRegion: generation.marketRegion ? String(generation.marketRegion) : null,
    engine: specs.engine,
    displacementCc: specs.displacementCc,
    powerValue: specs.powerValue,
    powerUnit: specs.powerUnit,
    powerHpNormalized: specs.powerHpNormalized,
    torqueNm: specs.torqueNm,
    gearbox: specs.gearbox,
    drive: specs.drive,
    frontWheelIn: specs.frontWheelIn,
    rearWheelIn: specs.rearWheelIn,
    frontTire: specs.frontTire,
    rearTire: specs.rearTire,
    fuelLiters: specs.fuelLiters,
    weightKg: specs.weightKg,
    weightType: specs.weightType,
    seatMm: specs.seatMm,
  };
}

export async function GET(request: NextRequest) {
  try {
    const motorcycleVariantId = request.nextUrl.searchParams
      .get("motorcycleVariantId")
      ?.trim();

    if (!motorcycleVariantId) {
      return NextResponse.json(
        { error: "motorcycleVariantId is required" },
        { status: 400 }
      );
    }

    const rows = await prisma.motorcycleGeneration.findMany({
      where: { variantId: motorcycleVariantId },
      include: { technicalSpecs: true },
      orderBy: [{ yearFrom: "asc" }, { name: "asc" }],
    });

    const generations: MotorcycleGenerationPickerItem[] = rows.map((row) => ({
      id: row.id,
      motorcycleVariantId: row.variantId,
      name: row.name,
      yearFrom: row.yearFrom,
      yearTo: row.yearTo ?? null,
      yearsLabel: row.yearsLabel,
      marketRegion: String(row.marketRegion as MotoMarketRegion),
      segment: row.segment,
      supportLevel: row.supportLevel as ModelSupportLevel as MotoSupportLevel,
      technicalSpecs: buildTechnicalSpecsView(row, row.technicalSpecs),
    }));

    const payload: MotorcycleGenerationsResponse = { generations };
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Failed to fetch motorcycle generations:", error);
    return NextResponse.json(
      { error: "Failed to fetch motorcycle generations" },
      { status: 500 }
    );
  }
}
