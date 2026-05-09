"use client";

import { mergeServiceBundleTemplateIntoAddFormValues } from "@mototwin/domain";
import type { AddServiceEventFormValues, ServiceBundleTemplateWire } from "@mototwin/types";
import type { RefObject } from "react";
import { SECTION_CARD_STYLE, sectionTitleStyle } from "../styles";
import { BasicInfoPrimaryFields } from "./basic-info-primary-fields";

export type BasicInfoCardProps = {
  sectionNumber: number;
  form: AddServiceEventFormValues;
  isEditing: boolean;
  bundleTemplates: ServiceBundleTemplateWire[];
  bundleTemplatesLoadError: string;
  selectedBundleTemplateId: string;
  onSelectBundleTemplate: (id: string) => void;
  onOpenTemplateContents: () => void;
  eventDateMaxYmd?: string;
  odometerInputMax?: number | null;
  onPatch: (patch: Partial<AddServiceEventFormValues>) => void;
  currentVehicleOdometer: number | null;
  currentVehicleEngineHours: number | null;
  vehicleStateSaving: boolean;
  vehicleStateError: string;
  vehicleStateSuccess: string;
  onOdometerBlur: () => void;
  onEngineHoursBlur: () => void;
  /** Apply template merge result to form. */
  onApplyTemplate: (templateId: string) => void;
  /** Bound to comment textarea for auto-height. */
  commentTextareaRef: RefObject<HTMLTextAreaElement | null>;
};

export function BasicInfoCard({
  sectionNumber,
  form,
  isEditing,
  bundleTemplates,
  bundleTemplatesLoadError,
  selectedBundleTemplateId,
  onSelectBundleTemplate,
  onOpenTemplateContents,
  eventDateMaxYmd,
  odometerInputMax,
  onPatch,
  currentVehicleOdometer,
  currentVehicleEngineHours,
  vehicleStateSaving,
  vehicleStateError,
  vehicleStateSuccess,
  onOdometerBlur,
  onEngineHoursBlur,
  onApplyTemplate,
  commentTextareaRef,
}: BasicInfoCardProps) {
  const showTemplate = !isEditing;

  return (
    <div style={SECTION_CARD_STYLE}>
      <div className="flex items-center justify-between gap-3">
        <h3 style={sectionTitleStyle()}>
          {`${sectionNumber}. Основная информация`}
        </h3>
      </div>
      <BasicInfoPrimaryFields
        showTemplate={showTemplate}
        form={form}
        bundleTemplates={bundleTemplates}
        bundleTemplatesLoadError={bundleTemplatesLoadError}
        selectedBundleTemplateId={selectedBundleTemplateId}
        onSelectBundleTemplate={onSelectBundleTemplate}
        onOpenTemplateContents={onOpenTemplateContents}
        onApplyTemplate={onApplyTemplate}
        eventDateMaxYmd={eventDateMaxYmd}
        odometerInputMax={odometerInputMax}
        onPatch={onPatch}
        currentVehicleOdometer={currentVehicleOdometer}
        currentVehicleEngineHours={currentVehicleEngineHours}
        vehicleStateSaving={vehicleStateSaving}
        vehicleStateError={vehicleStateError}
        vehicleStateSuccess={vehicleStateSuccess}
        onOdometerBlur={onOdometerBlur}
        onEngineHoursBlur={onEngineHoursBlur}
        commentTextareaRef={commentTextareaRef}
      />
    </div>
  );
}

export { mergeServiceBundleTemplateIntoAddFormValues };
