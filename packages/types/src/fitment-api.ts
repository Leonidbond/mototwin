import type { FitmentReportResultWire, PartMasterStatusWire } from "./fitment-community";
import type { PartCompatibilityReportWire } from "./part-compatibility-report";
import type { VehicleRideProfile } from "./vehicle";

export type PartMasterCandidateWire = {
  id: string;
  brandName: string;
  sku: string;
  title: string;
  status: PartMasterStatusWire;
  source: string;
};

export type PartMasterDuplicatesResponse = {
  normalizedSku: string;
  brandNormalized: string;
  candidates: PartMasterCandidateWire[];
};

export type CreatePartMasterInput = {
  brandName: string;
  sku: string;
  title: string;
  category: string;
  description?: string | null;
  vehicleId: string;
  nodeId: string;
  attachSkuToNode?: boolean;
};

export type CreatePartMasterResponse = {
  partMaster: { id: string; brandName: string; sku: string; title: string };
  skuId: string | null;
  partMasterId?: string;
};

export type EnsurePartMasterSkuInput = {
  partMasterId: string;
  nodeId: string;
  vehicleId: string;
  partType: string;
};

export type EnsurePartMasterSkuResponse = {
  skuId: string;
};

export type CreateFitmentReportInput = {
  partMasterId: string;
  nodeId: string;
  fitmentResult: FitmentReportResultWire;
  installationStatus: "INSTALLED" | "PURCHASED_NOT_INSTALLED" | "TESTED_NOT_INSTALLED";
  modificationRequired?: boolean;
  modificationDetails?: string | null;
  comment?: string | null;
  rideProfile?: VehicleRideProfile | null;
};

export type CreateFitmentReportResponse = {
  report: { id: string };
};

export type CreateFitmentEvidenceInput = {
  reportId: string;
  type: "PACKAGING_PHOTO" | "INSTALLED_PHOTO" | "RECEIPT";
  fileUrl: string;
};

export type CreateFitmentEvidenceResponse = {
  evidence: { id: string };
};

export type PartCompatibilityReportResponse = PartCompatibilityReportWire;

export type PartMasterPrefillResponse = {
  partMaster: { id: string; brandName: string; sku: string; title: string };
  suggestedCategory: string;
};
