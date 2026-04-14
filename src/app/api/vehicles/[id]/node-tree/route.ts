import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type FlatNode = {
  id: string;
  code: string;
  name: string;
  level: number;
  displayOrder: number;
  parentId: string | null;
};

type TreeNode = {
  id: string;
  code: string;
  name: string;
  level: number;
  displayOrder: number;
  children: TreeNode[];
};

type TopNodeStateView = {
  status: string;
  note: string | null;
  updatedAt: Date;
};

const TOP_LEVEL_NODE_CODES = new Set([
  "ENGINE",
  "FUEL",
  "COOLING",
  "EXHAUST",
  "ELECTRICS",
  "CHASSIS",
  "STEERING",
  "SUSPENSION",
  "WHEELS",
  "BRAKES",
  "DRIVETRAIN",
  "CONTROLS",
]);

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const [nodes, topNodeStates] = await Promise.all([
      prisma.node.findMany({
        orderBy: [{ level: "asc" }, { displayOrder: "asc" }, { code: "asc" }],
        select: {
          id: true,
          code: true,
          name: true,
          level: true,
          displayOrder: true,
          parentId: true,
        },
      }),
      prisma.topNodeState.findMany({
        where: { vehicleId: id },
        select: {
          nodeId: true,
          status: true,
          note: true,
          updatedAt: true,
        },
      }),
    ]);

    const topNodeStateByNodeId = new Map<string, TopNodeStateView>(
      topNodeStates.map((state) => [
        state.nodeId,
        {
          status: state.status,
          note: state.note,
          updatedAt: state.updatedAt,
        },
      ])
    );

    const childrenByParentId = new Map<string, FlatNode[]>();

    for (const node of nodes) {
      if (!node.parentId) {
        continue;
      }
      const siblings = childrenByParentId.get(node.parentId) ?? [];
      siblings.push(node);
      childrenByParentId.set(node.parentId, siblings);
    }

    for (const children of childrenByParentId.values()) {
      children.sort((a, b) => a.displayOrder - b.displayOrder);
    }

    const buildChildren = (parentId: string): TreeNode[] => {
      const children = childrenByParentId.get(parentId) ?? [];
      return children.map((child) => ({
        id: child.id,
        code: child.code,
        name: child.name,
        level: child.level,
        displayOrder: child.displayOrder,
        children: buildChildren(child.id),
      }));
    };

    const topNodeIdsForVehicle = new Set(topNodeStates.map((state) => state.nodeId));

    const topLevelNodes = nodes
      .filter(
        (node) =>
          node.level === 1 &&
          node.parentId === null &&
          topNodeIdsForVehicle.has(node.id) &&
          TOP_LEVEL_NODE_CODES.has(node.code)
      )
      .sort((a, b) => a.displayOrder - b.displayOrder);

    const nodeTree = topLevelNodes.map((node) => {
      const topNodeState = topNodeStateByNodeId.get(node.id);

      return {
        id: node.id,
        code: node.code,
        name: node.name,
        level: node.level,
        displayOrder: node.displayOrder,
        status: topNodeState?.status ?? null,
        note: topNodeState?.note ?? null,
        updatedAt: topNodeState?.updatedAt ?? null,
        children: buildChildren(node.id),
      };
    });

    return NextResponse.json({ nodeTree });
  } catch (error) {
    console.error("Failed to fetch node tree:", error);
    return NextResponse.json(
      { error: "Failed to fetch node tree" },
      { status: 500 }
    );
  }
}
