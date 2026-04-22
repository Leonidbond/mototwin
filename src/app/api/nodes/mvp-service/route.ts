import { NextResponse } from "next/server";
import { getMvpServiceNodes } from "@/lib/mvp-service-nodes";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const groups = await getMvpServiceNodes(prisma);
    return NextResponse.json({ groups });
  } catch (error) {
    console.error("Failed to fetch MVP service nodes:", error);
    return NextResponse.json({ error: "Failed to fetch MVP service nodes" }, { status: 500 });
  }
}
