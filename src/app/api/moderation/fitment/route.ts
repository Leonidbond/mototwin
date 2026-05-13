import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserContext, toCurrentUserContextErrorResponse } from "@/app/api/_shared/current-user-context";

export async function GET() {
  try {
    const userCtx = await getCurrentUserContext();
    if (!userCtx.isModerator) {
      return NextResponse.json({ error: "Недостаточно прав." }, { status: 403 });
    }

    const [pendingMasters, pendingReports, safetyPending] = await Promise.all([
      prisma.partMaster.findMany({
        where: { status: "PENDING_REVIEW" },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          brandName: true,
          sku: true,
          title: true,
          source: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.fitmentReport.findMany({
        where: { moderationStatus: "PENDING" },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          fitmentResult: true,
          moderationStatus: true,
          createdAt: true,
          partMaster: { select: { brandName: true, sku: true, title: true } },
          node: { select: { code: true, name: true, serviceGroup: true } },
        },
      }),
      prisma.fitmentReport.findMany({
        where: {
          moderationStatus: "PENDING",
          node: {
            serviceGroup: { in: ["BRAKES", "FRONT_SUSPENSION", "REAR_SUSPENSION"] },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          fitmentResult: true,
          createdAt: true,
          partMaster: { select: { brandName: true, sku: true, title: true } },
          node: { select: { code: true, name: true } },
        },
      }),
    ]);

    return NextResponse.json({
      pendingMasters,
      pendingReports,
      safetyCriticalPending: safetyPending,
    });
  } catch (error) {
    const ctxErr = toCurrentUserContextErrorResponse(error);
    if (ctxErr) return ctxErr;
    console.error("moderation fitment GET:", error);
    return NextResponse.json({ error: "Не удалось загрузить очередь." }, { status: 500 });
  }
}
