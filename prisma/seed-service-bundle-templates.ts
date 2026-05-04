import type { PrismaClient } from "@prisma/client";

/**
 * Глобальные шаблоны bundle (волна 3.1). Idempotent: полная перезапись списка.
 */
export async function seedServiceBundleTemplates(
  prisma: PrismaClient,
  nodeIdByCode: Map<string, string>
): Promise<{ serviceBundleTemplates: number }> {
  const nodeId = (code: string) => {
    const id = nodeIdByCode.get(code);
    if (!id) {
      throw new Error(`[seed service bundle templates] unknown node code: ${code}`);
    }
    return id;
  };

  await prisma.serviceBundleTemplateItem.deleteMany({});
  await prisma.serviceBundleTemplate.deleteMany({});

  await prisma.serviceBundleTemplate.create({
    data: {
      title: "Замена масла и фильтра",
      description: "Двигатель: масло и масляный фильтр",
      category: "OIL",
      items: {
        create: [
          { nodeId: nodeId("ENGINE.LUBE.OIL"), defaultActionType: "REPLACE", isRequired: true, sortOrder: 0 },
          { nodeId: nodeId("ENGINE.LUBE.FILTER"), defaultActionType: "REPLACE", isRequired: true, sortOrder: 1 },
        ],
      },
    },
  });

  await prisma.serviceBundleTemplate.create({
    data: {
      title: "Воздушный фильтр",
      description: "Впуск",
      category: "INTAKE",
      items: {
        create: [
          { nodeId: nodeId("INTAKE.FILTER"), defaultActionType: "REPLACE", isRequired: true, sortOrder: 0 },
        ],
      },
    },
  });

  await prisma.serviceBundleTemplate.create({
    data: {
      title: "Тормозная жидкость",
      description: "Гидравлика тормозов",
      category: "BRAKES",
      items: {
        create: [
          { nodeId: nodeId("BRAKES.FLUID"), defaultActionType: "REPLACE", isRequired: true, sortOrder: 0 },
        ],
      },
    },
  });

  return { serviceBundleTemplates: 3 };
}
