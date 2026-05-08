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
  eventDateDisplay: string;
  onEventDateDisplayChange: (next: string) => void;
  onEventDateBlur: () => void;
  odometerInputMax?: number | null;
  onPatch: (patch: Partial<AddServiceEventFormValues>) => void;
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
  eventDateDisplay,
  onEventDateDisplayChange,
  onEventDateBlur,
  odometerInputMax,
  onPatch,
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
        eventDateDisplay={eventDateDisplay}
        onEventDateDisplayChange={onEventDateDisplayChange}
        onEventDateBlur={onEventDateBlur}
        odometerInputMax={odometerInputMax}
        onPatch={onPatch}
        commentTextareaRef={commentTextareaRef}
      />
    </div>
  );
}

export { mergeServiceBundleTemplateIntoAddFormValues };
