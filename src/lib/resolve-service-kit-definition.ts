import { NextResponse } from "next/server";
import {
  addServiceEventFormValuesFromUserTemplateJson,
  advancedFormToSyntheticServiceKitDefinition,
  getServiceKitsForNode,
  parseUserServiceKitTemplateId,
} from "@mototwin/domain";
import type { ServiceKitDefinition } from "@mototwin/types";
import type { PrismaClient } from "@prisma/client";
import {
  getCurrentUserContext,
  toCurrentUserContextErrorResponse,
} from "@/app/api/_shared/current-user-context";
import {
  buildRecommendationsForNodeWithCommunity,
  type VehicleFitmentContext,
} from "@/lib/build-recommendations-for-node-with-community";

/**
 * Resolves a built-in kit code or `user_template:<id>` to a {@link ServiceKitDefinition}.
 */
export async function resolveServiceKitDefinitionForVehicle(args: {
  prisma: PrismaClient;
  kitCode: string;
  contextNodeCode: string | null;
  vehicle: VehicleFitmentContext;
}): Promise<ServiceKitDefinition | NextResponse> {
  const templateId = parseUserServiceKitTemplateId(args.kitCode);
  if (templateId) {
    try {
      const currentUser = await getCurrentUserContext();
      const row = await args.prisma.userServiceEventFormTemplate.findFirst({
        where: { id: templateId, userId: currentUser.userId },
        select: { id: true, formJson: true },
      });
      if (!row) {
        return NextResponse.json({ error: "Комплект не найден." }, { status: 404 });
      }
      const form = addServiceEventFormValuesFromUserTemplateJson(row.formJson);
      if (!form || form.mode !== "ADVANCED") {
        return NextResponse.json(
          { error: "Пользовательский комплект доступен только для подробного режима шаблона." },
          { status: 400 }
        );
      }
      const nodeIds = [...new Set(form.items.map((it) => it.nodeId.trim()).filter(Boolean))];
      if (nodeIds.length === 0) {
        return NextResponse.json({ error: "В шаблоне комплекта нет узлов." }, { status: 400 });
      }
      const nodes = await args.prisma.node.findMany({
        where: { id: { in: nodeIds } },
        select: { id: true, code: true, name: true, serviceGroup: true },
      });
      const nodesById = new Map(nodes.map((n) => [n.id, { code: n.code, name: n.name }]));
      const recommendationsByNodeCode = new Map<
        string,
        Awaited<ReturnType<typeof buildRecommendationsForNodeWithCommunity>>
      >();
      for (const node of nodes) {
        const recs = await buildRecommendationsForNodeWithCommunity(
          args.prisma,
          args.vehicle,
          node.id,
          { code: node.code, serviceGroup: node.serviceGroup }
        );
        recommendationsByNodeCode.set(node.code, recs);
      }
      const def = advancedFormToSyntheticServiceKitDefinition({
        templateId: row.id,
        form,
        nodesById,
        recommendationsByNodeCode,
      });
      if (!def) {
        return NextResponse.json({ error: "Не удалось собрать комплект из шаблона." }, { status: 400 });
      }
      return def;
    } catch (error) {
      const ctxErr = toCurrentUserContextErrorResponse(error);
      if (ctxErr) {
        return ctxErr;
      }
      throw error;
    }
  }

  const kit = getServiceKitsForNode(args.contextNodeCode).find((k) => k.code === args.kitCode);
  if (!kit) {
    return NextResponse.json({ error: "Комплект обслуживания не найден." }, { status: 404 });
  }
  return kit;
}
