import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const modelId = request.nextUrl.searchParams.get("modelId");

    if (!modelId) {
      return NextResponse.json(
        { error: "modelId is required" },
        { status: 400 }
      );
    }

    const variants = await prisma.modelVariant.findMany({
      where: {
        modelId,
      },
      orderBy: [
        { year: "desc" },
        { versionName: "asc" },
      ],
      select: {
        id: true,
        modelId: true,
        year: true,
        generation: true,
        versionName: true,
        market: true,
        engineType: true,
        coolingType: true,
        wheelSizes: true,
        brakeSystem: true,
        chainPitch: true,
        stockSprockets: true,
      },
    });

    return NextResponse.json({ variants });
  } catch (error) {
    console.error("Failed to fetch model variants:", error);
    return NextResponse.json(
      { error: "Failed to fetch model variants" },
      { status: 500 }
    );
  }
}