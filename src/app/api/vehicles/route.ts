import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const createVehicleSchema = z.object({
  brandId: z.string().min(1),
  modelId: z.string().min(1),
  modelVariantId: z.string().min(1),
  nickname: z.string().trim().nullable().optional(),
  vin: z.string().trim().nullable().optional(),
  odometer: z.number().int().min(0),
  engineHours: z.number().int().min(0).nullable(),
  rideProfile: z.object({
    usageType: z.enum(["CITY", "HIGHWAY", "MIXED", "OFFROAD"]),
    ridingStyle: z.enum(["CALM", "ACTIVE", "AGGRESSIVE"]),
    loadType: z.enum(["SOLO", "PASSENGER", "LUGGAGE", "PASSENGER_LUGGAGE"]),
    usageIntensity: z.enum(["LOW", "MEDIUM", "HIGH"]),
  }),
});

const DEMO_USER_EMAIL = "demo@mototwin.local";

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const data = createVehicleSchema.parse(json);

    const user = await prisma.user.findUnique({
      where: { email: DEMO_USER_EMAIL },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Demo user not found" },
        { status: 500 }
      );
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        userId: user.id,
        brandId: data.brandId,
        modelId: data.modelId,
        modelVariantId: data.modelVariantId,
        nickname: data.nickname || null,
        vin: data.vin || null,
        odometer: data.odometer,
        engineHours: data.engineHours,
        rideProfile: {
          create: {
            usageType: data.rideProfile.usageType,
            ridingStyle: data.rideProfile.ridingStyle,
            loadType: data.rideProfile.loadType,
            usageIntensity: data.rideProfile.usageIntensity,
          },
        },
      },
      include: {
        brand: true,
        model: true,
        modelVariant: true,
        rideProfile: true,
      },
    });

    return NextResponse.json({ vehicle }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.issues },
        { status: 400 }
      );
    }

    console.error("Failed to create vehicle:", error);
    return NextResponse.json(
      { error: "Failed to create vehicle" },
      { status: 500 }
    );
  }
}