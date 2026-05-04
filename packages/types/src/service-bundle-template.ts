import type { ServiceActionType } from "./service-event";

/** Строка шаблона bundle с узлом (ответ GET /api/service-bundle-templates). */
export type ServiceBundleTemplateItemWire = {
  id: string;
  templateId: string;
  nodeId: string;
  defaultActionType: ServiceActionType;
  isRequired: boolean;
  sortOrder: number;
  node?: { id: string; code: string; name: string };
};

export type ServiceBundleTemplateWire = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  isRegulationBased: boolean;
  items: ServiceBundleTemplateItemWire[];
};
