import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEMO_USER_EMAIL = "demo@mototwin.local";

export async function GET() {
  try {
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

    const vehicles = await prisma.vehicle.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        brand: true,
        model: true,
        modelVariant: true,
        rideProfile: true,
      },
    });

    return NextResponse.json({ vehicles });
  } catch (error) {
    console.error("Failed to fetch garage:", error);
    return NextResponse.json(
      { error: "Failed to fetch garage" },
      { status: 500 }
    );
  }
}