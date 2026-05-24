import { NextRequest, NextResponse } from "next/server";
import {
  buildRecommendationsForNodeWithCommunity,
  narrowVehicleFitmentContext,
} from "@/lib/build-recommendations-for-node-with-community";
import { prisma } from "@/lib/prisma";
import { getVehicleInCurrentContext } from "@/app/api/_shared/vehicle-context";
import { toCurrentUserContextErrorResponse } from "@/app/api/_shared/current-user-context";
import { parseSearchParamText } from "@/lib/http/input-validation";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    // MT-SEC-072: validate bounded length on search params before DB lookup.
    const vehicleId = parseSearchParamText(searchParams.get("vehicleId"), { max: 64 });
    const nodeId = parseSearchParamText(searchParams.get("nodeId"), { max: 64 });

    if (!vehicleId || !nodeId) {
      return NextResponse.json(
        { error: "Параметры vehicleId и nodeId обязательны." },
        { status: 400 }
      );
    }

    // MT-SEC-073: previously unauthenticated → IDOR. Now requires auth and
    // verifies the caller owns the vehicle through getVehicleInCurrentContext.
    const vehicle = await getVehicleInCurrentContext(vehicleId, {
      id: true,
      motorcycleBrandId: true,
      motorcycleModelFamilyId: true,
      motorcycleVariantId: true,
      motorcycleGenerationId: true,
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Мотоцикл не найден." }, { status: 404 });
    }

    const vctx = narrowVehicleFitmentContext(vehicle);
    if (!vctx) {
      return NextResponse.json(
        { error: "У мотоцикла не задана модель — рекомендации недоступны." },
        { status: 400 }
      );
    }

    const node = await prisma.node.findUnique({
      where: { id: nodeId },
      select: { code: true, serviceGroup: true },
    });
    if (!node) {
      return NextResponse.json({ error: "Узел не найден." }, { status: 404 });
    }

    const recommendations = await buildRecommendationsForNodeWithCommunity(
      prisma,
      vctx,
      nodeId,
      {
        code: node.code,
        serviceGroup: node.serviceGroup,
      }
    );

    return NextResponse.json({ recommendations });
  } catch (error) {
    const ctxErr = toCurrentUserContextErrorResponse(error);
    if (ctxErr) return ctxErr;
    console.error("Failed to load recommended SKUs:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить рекомендации по запчастям." },
      { status: 500 }
    );
  }
}
