import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole, toAdminErrorResponse } from "@/lib/admin-auth";

export async function GET() {
  try {
    // MT-SEC-024: any moderator may read the queue; SUPER_ADMIN is implicit.
    await requireAdminRole(["MODERATOR", "CATALOG_MANAGER"]);

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
    const adminErr = toAdminErrorResponse(error);
    if (adminErr) return adminErr;
    console.error("moderation fitment GET:", error);
    return NextResponse.json({ error: "Не удалось загрузить очередь." }, { status: 500 });
  }
}
