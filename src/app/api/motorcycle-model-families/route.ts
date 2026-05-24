import { NextRequest, NextResponse } from "next/server";
import type { ModelSupportLevel } from "@prisma/client";
import type {
  MotorcycleModelFamiliesResponse,
  MotorcycleModelFamilyPickerItem,
  MotoSupportLevel,
} from "@mototwin/types";
import { prisma } from "@/lib/prisma";

const SUPPORT_LEVEL_PRIORITY: Record<ModelSupportLevel, number> = {
  MVP_CORE: 5,
  MVP_CORE_LEGACY: 4,
  COMMUNITY_SUPPORT: 3,
  EARLY_BETA: 2,
  NO_FITMENT_DATA_YET: 1,
};

const DEFAULT_SUPPORT_LEVEL: MotoSupportLevel = "EARLY_BETA";

function pickBestSupportLevel(
  levels: ReadonlyArray<ModelSupportLevel | null>
): MotoSupportLevel {
  let best: ModelSupportLevel | null = null;
  for (const level of levels) {
    if (!level) continue;
    if (
      best == null ||
      SUPPORT_LEVEL_PRIORITY[level] > SUPPORT_LEVEL_PRIORITY[best]
    ) {
      best = level;
    }
  }
  return (best ?? DEFAULT_SUPPORT_LEVEL) as MotoSupportLevel;
}

export async function GET(request: NextRequest) {
  try {
    const motorcycleBrandId = request.nextUrl.searchParams
      .get("motorcycleBrandId")
      ?.trim();

    if (!motorcycleBrandId) {
      return NextResponse.json(
        { error: "motorcycleBrandId is required" },
        { status: 400 }
      );
    }

    const rows = await prisma.motorcycleModelFamily.findMany({
      where: { brandId: motorcycleBrandId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        brandId: true,
        variants: {
          select: {
            generations: { select: { supportLevel: true } },
          },
        },
      },
    });

    const families: MotorcycleModelFamilyPickerItem[] = rows.map((row) => {
      const levels: ModelSupportLevel[] = [];
      for (const variant of row.variants) {
        for (const generation of variant.generations) {
          levels.push(generation.supportLevel);
        }
      }
      return {
        id: row.id,
        motorcycleBrandId: row.brandId,
        name: row.name,
        slug: row.slug,
        supportLevel: pickBestSupportLevel(levels),
      };
    });

    const payload: MotorcycleModelFamiliesResponse = { families };
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Failed to fetch motorcycle model families:", error);
    return NextResponse.json(
      { error: "Failed to fetch motorcycle model families" },
      { status: 500 }
    );
  }
}
