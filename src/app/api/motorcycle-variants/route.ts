import { NextRequest, NextResponse } from "next/server";
import type { ModelSupportLevel } from "@prisma/client";
import type {
  MotorcycleVariantPickerItem,
  MotorcycleVariantsResponse,
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
    const motorcycleModelFamilyId = request.nextUrl.searchParams
      .get("motorcycleModelFamilyId")
      ?.trim();

    if (!motorcycleModelFamilyId) {
      return NextResponse.json(
        { error: "motorcycleModelFamilyId is required" },
        { status: 400 }
      );
    }

    const rows = await prisma.motorcycleVariant.findMany({
      where: { familyId: motorcycleModelFamilyId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        familyId: true,
        generations: { select: { supportLevel: true } },
      },
    });

    const variants: MotorcycleVariantPickerItem[] = rows.map((row) => {
      const levels: ModelSupportLevel[] = row.generations.map(
        (g) => g.supportLevel
      );
      return {
        id: row.id,
        motorcycleModelFamilyId: row.familyId,
        name: row.name,
        slug: row.slug,
        supportLevel: pickBestSupportLevel(levels),
      };
    });

    const payload: MotorcycleVariantsResponse = { variants };
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Failed to fetch motorcycle variants:", error);
    return NextResponse.json(
      { error: "Failed to fetch motorcycle variants" },
      { status: 500 }
    );
  }
}
