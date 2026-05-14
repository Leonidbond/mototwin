import { prisma } from "@/lib/prisma";
import { CommunityPartPageClient } from "./CommunityPartPageClient";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nodeId?: string; partMasterId?: string }>;
};

export default async function Page({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const initialNodeId = sp.nodeId?.trim() || "";
  const partMasterId = sp.partMasterId?.trim() || "";

  let initialPartFromQuery: {
    id: string;
    brandName: string;
    sku: string;
    title: string;
    suggestedCategory: string;
  } | null = null;

  if (partMasterId) {
    const pm = await prisma.partMaster.findUnique({
      where: { id: partMasterId },
      select: { id: true, brandName: true, sku: true, title: true },
    });
    if (pm) {
      let suggestedCategory = "";
      if (initialNodeId) {
        const skuForNode = await prisma.partSku.findFirst({
          where: {
            partMasterId: pm.id,
            isActive: true,
            OR: [{ primaryNodeId: initialNodeId }, { nodeLinks: { some: { nodeId: initialNodeId } } }],
          },
          select: { partType: true },
        });
        suggestedCategory = skuForNode?.partType?.trim() ?? "";
      }
      if (!suggestedCategory) {
        const skuAny = await prisma.partSku.findFirst({
          where: { partMasterId: pm.id, isActive: true },
          select: { partType: true },
        });
        suggestedCategory = skuAny?.partType?.trim() ?? "";
      }
      initialPartFromQuery = {
        id: pm.id,
        brandName: pm.brandName,
        sku: pm.sku,
        title: pm.title,
        suggestedCategory,
      };
    }
  }

  return (
    <CommunityPartPageClient
      vehicleId={id}
      initialNodeId={initialNodeId}
      initialPartFromQuery={initialPartFromQuery}
    />
  );
}
