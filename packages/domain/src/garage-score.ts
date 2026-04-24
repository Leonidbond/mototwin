import type { GarageAttentionSummaryWire } from "@mototwin/types";

const GARAGE_SCORE_MAX = 100;
const GARAGE_SCORE_SOON_PENALTY = 10;
const GARAGE_SCORE_OVERDUE_PENALTY = 20;

/**
 * Derive a compact 0..100 garage score from attention counters.
 * - Missing summary => `null` (score source is unavailable)
 * - Higher penalties for overdue than soon items
 */
export function calculateGarageScore(
  summary: GarageAttentionSummaryWire | null | undefined
): number | null {
  if (!summary) {
    return null;
  }

  const rawScore =
    GARAGE_SCORE_MAX -
    summary.overdueCount * GARAGE_SCORE_OVERDUE_PENALTY -
    summary.soonCount * GARAGE_SCORE_SOON_PENALTY;

  if (rawScore < 0) {
    return 0;
  }
  if (rawScore > GARAGE_SCORE_MAX) {
    return GARAGE_SCORE_MAX;
  }
  return rawScore;
}
