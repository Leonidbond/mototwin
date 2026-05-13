import type { FitmentConfidenceStatus } from "@mototwin/types";

export type PublishedReportStats = {
  reportCount: number;
  doesNotFitCount: number;
  modificationCount: number;
};

export type VoteStats = {
  confirm: number;
  reject: number;
};

/**
 * MVP aggregation rules aligned with spec §27–28 (simplified numeric blend).
 */
export function computeFitmentConfidenceState(input: {
  publishedReports: PublishedReportStats;
  votes: VoteStats;
}): {
  status: FitmentConfidenceStatus;
  confidenceScore: number;
  reportCount: number;
  confirmationCount: number;
  rejectionCount: number;
  modificationCount: number;
} {
  const { publishedReports, votes } = input;
  const reportCount = publishedReports.reportCount;
  const confirmationCount = votes.confirm;
  const rejectionCount = votes.reject;
  const modificationCount = publishedReports.modificationCount;

  let score =
    reportCount * 10 +
    confirmationCount * 6 -
    rejectionCount * 12 -
    publishedReports.doesNotFitCount * 25;
  score = Math.max(0, Math.min(100, score));

  let status: FitmentConfidenceStatus = "LOW_CONFIDENCE";
  if (publishedReports.doesNotFitCount >= 2 || (rejectionCount >= 3 && confirmationCount === 0)) {
    status = "REJECTED_LIKELY_INCOMPATIBLE";
  } else if (rejectionCount >= 2 && confirmationCount >= 2) {
    status = "MIXED_REPORTS";
  } else if (modificationCount > 0 && publishedReports.doesNotFitCount === 0) {
    status = "FITS_WITH_MODIFICATION";
  } else if (confirmationCount >= 2 && rejectionCount <= 1) {
    status = "COMMUNITY_CONFIRMED";
  } else if (reportCount >= 1) {
    status = "LOW_CONFIDENCE";
  }

  return {
    status,
    confidenceScore: score,
    reportCount,
    confirmationCount,
    rejectionCount,
    modificationCount,
  };
}
