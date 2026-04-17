export type ServiceEventKind = "SERVICE" | "STATE_UPDATE";

export type ServiceEventNode = {
  id: string;
  code: string;
  name: string;
  level: number;
  displayOrder: number;
};

export type ServiceEventItem = {
  id: string;
  eventKind?: ServiceEventKind;
  eventDate: string;
  nodeId: string;
  node?: ServiceEventNode;
  serviceType: string;
  odometer: number;
  engineHours: number | null;
  costAmount: number | null;
  currency: string | null;
  comment: string | null;
  createdAt: string;
};

export type CreateServiceEventInput = {
  nodeId: string;
  eventDate: string;
  odometer: number;
  engineHours?: number | null;
  serviceType: string;
  costAmount?: number | null;
  currency?: string | null;
  comment?: string | null;
  installedPartsJson?: unknown | null;
};
