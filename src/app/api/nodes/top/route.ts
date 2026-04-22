import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTopServiceNodes } from "@/lib/top-service-nodes";

export async function GET() {
  try {
    const nodes = await getTopServiceNodes(prisma);
    return NextResponse.json({ nodes });
  } catch (error) {
    console.error("Failed to fetch top nodes:", error);
    return NextResponse.json({ error: "Failed to fetch top nodes" }, { status: 500 });
  }
}
