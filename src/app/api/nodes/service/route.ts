import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUserContext,
  toCurrentUserContextErrorResponse,
} from "../../_shared/current-user-context";

export type ServiceNodeItem = {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  level: number;
  displayOrder: number;
};

export async function GET() {
  try {
    await getCurrentUserContext();
    const nodes = await prisma.node.findMany({
      where: { isActive: true, isServiceRelevant: true },
      select: {
        id: true,
        code: true,
        name: true,
        parentId: true,
        level: true,
        displayOrder: true,
      },
      orderBy: [{ level: "asc" }, { displayOrder: "asc" }, { code: "asc" }],
    });
    return NextResponse.json({ nodes });
  } catch (error) {
    const currentUserContextError = toCurrentUserContextErrorResponse(error);
    if (currentUserContextError) {
      return currentUserContextError;
    }
    console.error("Failed to fetch service nodes:", error);
    return NextResponse.json({ error: "Failed to fetch service nodes" }, { status: 500 });
  }
}
