export type FitmentConfidenceStatus =
  | "VERIFIED_BY_MOTOTWIN"
  | "COMMUNITY_CONFIRMED"
  | "FITS_WITH_MODIFICATION"
  | "MIXED_REPORTS"
  | "LOW_CONFIDENCE"
  | "REJECTED_LIKELY_INCOMPATIBLE";

export type FitmentReportResultWire =
  | "DIRECT_FIT"
  | "FIT_WITH_MODIFICATION"
  | "PARTIAL_FIT"
  | "DOES_NOT_FIT"
  | "OEM_REPLACEMENT";

export type FitmentReportModerationStatusWire =
  | "PENDING"
  | "PUBLISHED"
  | "NEEDS_REVIEW"
  | "HIDDEN"
  | "REJECTED";

export type FitmentVoteTypeWire =
  | "CONFIRM"
  | "REJECT"
  | "SAME_EXPERIENCE"
  | "DIFFERENT_EXPERIENCE"
  | "HELPFUL";

export type PartWishlistItemSourceWire = "RECOMMENDATION" | "USER_ADDED";

export type PartMasterStatusWire =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "ACTIVE"
  | "MERGED"
  | "REJECTED";

export type TrustBadgeWire = "VERIFIED_BY_MOTOTWIN" | "COMMUNITY_CONFIRMED" | "COMMUNITY_SIGNAL" | null;
