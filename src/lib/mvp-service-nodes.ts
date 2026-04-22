import type { PrismaClient } from "@prisma/client";
import type { MvpServiceNodeGroup } from "@mototwin/types";

const SERVICE_GROUP_LABELS: Record<string, string> = {
  ENGINE_SERVICE: "Двигатель и масло",
  INTAKE_FUEL: "Впуск и топливо",
  COOLING: "Охлаждение",
  BRAKES: "Тормоза",
  CHAIN_DRIVE: "Цепь и звезды",
  TIRES: "Шины",
  WHEELS: "Колеса",
  FRONT_SUSPENSION: "Передняя подвеска",
  REAR_SUSPENSION: "Задняя подвеска",
  ELECTRICS: "Электрика",
  CONTROLS: "Органы управления",
  STEERING: "Рулевое",
  EXHAUST: "Выпуск",
  BODY_PROTECTION: "Кузов и защита",
  FLUIDS: "Жидкости",
  CONSUMABLES: "Расходники",
};

export async function getMvpServiceNodes(prisma: PrismaClient): Promise<MvpServiceNodeGroup[]> {
  const nodes = await prisma.node.findMany({
    where: {
      isActive: true,
      isServiceRelevant: true,
      isMvpVisible: true,
      serviceGroup: {
        not: null,
      },
    },
    select: {
      id: true,
      code: true,
      name: true,
      level: true,
      parentId: true,
      displayOrder: true,
      serviceGroup: true,
    },
    orderBy: [{ serviceGroup: "asc" }, { displayOrder: "asc" }, { code: "asc" }],
  });

  const grouped = new Map<string, MvpServiceNodeGroup>();
  for (const node of nodes) {
    if (!node.serviceGroup) {
      continue;
    }
    const existing = grouped.get(node.serviceGroup);
    if (existing) {
      existing.nodes.push({
        id: node.id,
        code: node.code,
        name: node.name,
        level: node.level,
        parentId: node.parentId,
        displayOrder: node.displayOrder,
      });
      continue;
    }

    grouped.set(node.serviceGroup, {
      code: node.serviceGroup,
      name: SERVICE_GROUP_LABELS[node.serviceGroup] ?? node.serviceGroup,
      nodes: [
        {
          id: node.id,
          code: node.code,
          name: node.name,
          level: node.level,
          parentId: node.parentId,
          displayOrder: node.displayOrder,
        },
      ],
    });
  }

  return [...grouped.values()].sort((a, b) => a.code.localeCompare(b.code));
}
