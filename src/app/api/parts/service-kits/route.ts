import { NextRequest, NextResponse } from "next/server";
import {
  addServiceEventFormValuesFromUserTemplateJson,
  advancedFormToSyntheticServiceKitDefinition,
  buildServiceKitViewModel,
  filterUserTemplateKitsByContextNode,
  getServiceKitsForNode,
} from "@mototwin/domain";
import type { ServiceKitDefinition, ServiceKitViewModel } from "@mototwin/types";
import { prisma } from "@/lib/prisma";
import {
  buildRecommendationsForNodeWithCommunity,
  narrowVehicleFitmentContext,
  type VehicleFitmentContext,
} from "@/lib/build-recommendations-for-node-with-community";
import {
  getCurrentUserContext,
  toCurrentUserContextErrorResponse,
} from "@/app/api/_shared/current-user-context";

async function loadUserTemplateKitDefinitionsForPicker(args: {
  vehicle: VehicleFitmentContext;
  contextNodeCode: string | null;
}): Promise<ServiceKitDefinition[]> {
  let userId: string;
  try {
    userId = (await getCurrentUserContext()).userId;
  } catch (error) {
    const ctxErr = toCurrentUserContextErrorResponse(error);
    if (ctxErr) {
      return [];
    }
    throw error;
  }

  let rows: Array<{ id: string; formJson: unknown; includeInPartPicker?: boolean }>;
  try {
    rows = await prisma.userServiceEventFormTemplate.findMany({
      where: { userId, mode: "ADVANCED" },
      select: { id: true, formJson: true, includeInPartPicker: true },
      orderBy: { updatedAt: "desc" },
    });
  } catch (error) {
    /** Prisma client / schema mismatch (до `prisma generate` + рестарта). */
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("includeInPartPicker")) {
      rows = await prisma.userServiceEventFormTemplate.findMany({
        where: { userId, mode: "ADVANCED" },
        select: { id: true, formJson: true },
        orderBy: { updatedAt: "desc" },
      });
    } else {
      throw error;
    }
  }

  rows = rows.filter((r) => r.includeInPartPicker !== false);

  const parsed: { id: string; form: NonNullable<ReturnType<typeof addServiceEventFormValuesFromUserTemplateJson>> }[] =
    [];
  for (const row of rows) {
    const form = addServiceEventFormValuesFromUserTemplateJson(row.formJson);
    if (form?.mode === "ADVANCED" && form.items.length > 0) {
      parsed.push({ id: row.id, form });
    }
  }
  if (parsed.length === 0) {
    return [];
  }

  const nodeIds = new Set<string>();
  for (const p of parsed) {
    for (const it of p.form.items) {
      const id = it.nodeId.trim();
      if (id) nodeIds.add(id);
    }
  }
  const nodes = await prisma.node.findMany({
    where: { id: { in: [...nodeIds] } },
    select: { id: true, code: true, name: true, serviceGroup: true },
  });
  const nodesById = new Map(nodes.map((n) => [n.id, { code: n.code, name: n.name }]));

  const recommendationsByNodeCode = new Map<
    string,
    Awaited<ReturnType<typeof buildRecommendationsForNodeWithCommunity>>
  >();
  for (const node of nodes) {
    const recs = await buildRecommendationsForNodeWithCommunity(prisma, args.vehicle, node.id, {
      code: node.code,
      serviceGroup: node.serviceGroup,
    });
    recommendationsByNodeCode.set(node.code, recs);
  }

  const defs: ServiceKitDefinition[] = [];
  for (const p of parsed) {
    const def = advancedFormToSyntheticServiceKitDefinition({
      templateId: p.id,
      form: p.form,
      nodesById,
      recommendationsByNodeCode,
    });
    if (!def) {
      continue;
    }
    const filtered = filterUserTemplateKitsByContextNode([def], args.contextNodeCode);
    if (filtered.length > 0) {
      defs.push(filtered[0]!);
    }
  }
  return defs;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get("nodeId")?.trim() || null;
    const vehicleId = searchParams.get("vehicleId")?.trim() || null;

    let contextNodeCode: string | null = null;
    if (nodeId) {
      const node = await prisma.node.findUnique({
        where: { id: nodeId },
        select: { id: true, code: true },
      });
      if (!node) {
        return NextResponse.json({ error: "Узел не найден." }, { status: 404 });
      }
      contextNodeCode = node.code;
    }

    const staticDefs = getServiceKitsForNode(contextNodeCode);
    if (!vehicleId) {
      const staticKits: ServiceKitViewModel[] = staticDefs.map((kit) => ({
        ...buildServiceKitViewModel(kit),
        isUserTemplate: false,
      }));
      return NextResponse.json({ kits: staticKits });
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: {
        id: true,
        modelId: true,
        modelVariantId: true,
        modelVariant: { select: { year: true } },
      },
    });
    if (!vehicle) {
      return NextResponse.json({ error: "Мотоцикл не найден." }, { status: 404 });
    }

    const vctx = narrowVehicleFitmentContext(vehicle);
    if (!vctx) {
      return NextResponse.json(
        { error: "У мотоцикла не задана модель — подбор комплектов недоступен." },
        { status: 400 }
      );
    }

    const userDefs = await loadUserTemplateKitDefinitionsForPicker({
      vehicle: vctx,
      contextNodeCode,
    });

    const nodeCodes = new Set<string>();
    for (const kit of staticDefs) {
      for (const item of kit.items) {
        nodeCodes.add(item.nodeCode);
      }
    }
    for (const kit of userDefs) {
      for (const item of kit.items) {
        nodeCodes.add(item.nodeCode);
      }
    }

    const nodes = await prisma.node.findMany({
      where: { code: { in: [...nodeCodes] } },
      select: { id: true, code: true, serviceGroup: true },
    });

    const recommendationsByNodeCode = new Map<
      string,
      Awaited<ReturnType<typeof buildRecommendationsForNodeWithCommunity>>
    >();
    for (const node of nodes) {
      const recs = await buildRecommendationsForNodeWithCommunity(prisma, vctx, node.id, {
        code: node.code,
        serviceGroup: node.serviceGroup,
      });
      recommendationsByNodeCode.set(node.code, recs);
    }

    const userKits: ServiceKitViewModel[] = userDefs.map((def) => ({
      ...buildServiceKitViewModel(def, recommendationsByNodeCode),
      isUserTemplate: true,
    }));

    const staticKits: ServiceKitViewModel[] = staticDefs.map((kit) => ({
      ...buildServiceKitViewModel(kit, recommendationsByNodeCode),
      isUserTemplate: false,
    }));

    return NextResponse.json({
      kits: [...userKits, ...staticKits],
    });
  } catch (error) {
    console.error("Failed to fetch service kits:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить комплекты обслуживания." },
      { status: 500 }
    );
  }
}
