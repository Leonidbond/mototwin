import type { PrismaClient } from "@prisma/client";

export type TopServiceNodeItem = {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  level: number;
  displayOrder: number;
  serviceGroup: string | null;
  topNodeOrder: number | null;
};

const TOP_SERVICE_NODE_CODES = [
  "ENGINE.LUBE.OIL",
  "ENGINE.LUBE.FILTER",
  "INTAKE.FILTER",
  "ELECTRICS.IGNITION.SPARK",
  "COOLING.LIQUID.COOLANT",
  "BRAKES.FRONT.PADS",
  "BRAKES.REAR.PADS",
  "BRAKES.FLUID",
  "TIRES.FRONT",
  "TIRES.REAR",
  "DRIVETRAIN.CHAIN",
  "DRIVETRAIN.FRONT_SPROCKET",
  "DRIVETRAIN.REAR_SPROCKET",
  "SUSPENSION.FRONT.SEALS",
  "SUSPENSION.FRONT.OIL",
] as const;

const orderByCode = new Map<string, number>(TOP_SERVICE_NODE_CODES.map((code, index) => [code, (index + 1) * 10]));

export async function getTopServiceNodes(prisma: PrismaClient): Promise<TopServiceNodeItem[]> {
  const nodes = await prisma.node.findMany({
    where: {
      isActive: true,
      isServiceRelevant: true,
      code: {
        in: [...TOP_SERVICE_NODE_CODES],
      },
    },
    select: {
      id: true,
      code: true,
      name: true,
      parentId: true,
      level: true,
      displayOrder: true,
      serviceGroup: true,
      topNodeOrder: true,
    },
    orderBy: [{ code: "asc" }],
  });

  return nodes
    .map((node) => ({
      ...node,
      topNodeOrder: orderByCode.get(node.code) ?? node.topNodeOrder ?? null,
    }))
    .sort((a, b) => {
      const left = a.topNodeOrder ?? Number.MAX_SAFE_INTEGER;
      const right = b.topNodeOrder ?? Number.MAX_SAFE_INTEGER;
      if (left !== right) {
        return left - right;
      }
      return a.code.localeCompare(b.code);
    });
}
