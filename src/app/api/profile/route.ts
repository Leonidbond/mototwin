import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserContext } from "../_shared/current-user-context";

export async function GET() {
  try {
    const currentUser = await getCurrentUserContext();
    const [user, garage] = await Promise.all([
      prisma.user.findUnique({
        where: { id: currentUser.userId },
        select: {
          email: true,
          displayName: true,
          createdAt: true,
        },
      }),
      prisma.garage.findUnique({
        where: { id: currentUser.garageId },
        select: { title: true },
      }),
    ]);

    if (!user || !garage) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({
      profile: {
        displayName: user.displayName ?? "Владелец",
        email: user.email ?? "demo@mototwin.local",
        createdAt: user.createdAt?.toISOString() ?? null,
        garageTitle: garage.title,
      },
    });
  } catch (error) {
    console.error("Failed to load profile:", error);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}
