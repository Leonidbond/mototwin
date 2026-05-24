import type { PrismaClient } from "@prisma/client";
import { computeFitmentConfidenceState } from "@mototwin/domain";

export type FitmentConfidenceKey = {
  partMasterId: string;
  motorcycleGenerationId: string;
  nodeId: string;
};

export async function recalculateFitmentConfidenceForKey(
  prisma: PrismaClient,
  key: FitmentConfidenceKey
): Promise<void> {
  const existing = await prisma.fitmentConfidence.findUnique({
    where: {
      partMasterId_motorcycleGenerationId_nodeId: {
        partMasterId: key.partMasterId,
        motorcycleGenerationId: key.motorcycleGenerationId,
        nodeId: key.nodeId,
      },
    },
    select: { id: true, isStaffVerified: true, status: true },
  });

  const publishedReports = await prisma.fitmentReport.findMany({
    where: {
      partMasterId: key.partMasterId,
      motorcycleGenerationId: key.motorcycleGenerationId,
      nodeId: key.nodeId,
      moderationStatus: "PUBLISHED",
    },
    select: {
      id: true,
      fitmentResult: true,
      modificationRequired: true,
    },
  });

  const reportIds = publishedReports.map((r) => r.id);
  const votes =
    reportIds.length === 0
      ? []
      : await prisma.fitmentVote.findMany({
          where: { reportId: { in: reportIds } },
          select: { voteType: true },
        });

  let confirm = 0;
  let reject = 0;
  for (const v of votes) {
    if (v.voteType === "CONFIRM" || v.voteType === "SAME_EXPERIENCE") {
      confirm += 1;
    }
    if (v.voteType === "REJECT" || v.voteType === "DIFFERENT_EXPERIENCE") {
      reject += 1;
    }
  }

  let doesNotFitCount = 0;
  let modificationCount = 0;
  for (const r of publishedReports) {
    if (r.fitmentResult === "DOES_NOT_FIT") {
      doesNotFitCount += 1;
    }
    if (r.fitmentResult === "FIT_WITH_MODIFICATION" || r.modificationRequired) {
      modificationCount += 1;
    }
  }

  const computed = computeFitmentConfidenceState({
    publishedReports: {
      reportCount: publishedReports.length,
      doesNotFitCount,
      modificationCount,
    },
    votes: { confirm, reject },
  });

  if (existing?.isStaffVerified && existing.status === "VERIFIED_BY_MOTOTWIN") {
    await prisma.fitmentConfidence.update({
      where: { id: existing.id },
      data: {
        reportCount: computed.reportCount,
        confirmationCount: computed.confirmationCount,
        rejectionCount: computed.rejectionCount,
        modificationCount: computed.modificationCount,
        lastRecalculatedAt: new Date(),
      },
    });
    return;
  }

  await prisma.fitmentConfidence.upsert({
    where: {
      partMasterId_motorcycleGenerationId_nodeId: {
        partMasterId: key.partMasterId,
        motorcycleGenerationId: key.motorcycleGenerationId,
        nodeId: key.nodeId,
      },
    },
    create: {
      partMasterId: key.partMasterId,
      motorcycleGenerationId: key.motorcycleGenerationId,
      nodeId: key.nodeId,
      confidenceScore: computed.confidenceScore,
      reportCount: computed.reportCount,
      confirmationCount: computed.confirmationCount,
      rejectionCount: computed.rejectionCount,
      modificationCount: computed.modificationCount,
      status: computed.status,
      lastRecalculatedAt: new Date(),
    },
    update: {
      confidenceScore: computed.confidenceScore,
      reportCount: computed.reportCount,
      confirmationCount: computed.confirmationCount,
      rejectionCount: computed.rejectionCount,
      modificationCount: computed.modificationCount,
      status: computed.status,
      lastRecalculatedAt: new Date(),
    },
  });
}
