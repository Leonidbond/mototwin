import type { ServicePlace } from "@prisma/client";
import type { CreateServicePlaceInput, ServicePlaceItem, ServicePlaceSnapshot } from "@mototwin/types";

type JsonObject = Record<string, unknown>;

function asJsonObject(value: unknown): JsonObject | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as JsonObject;
}

export function servicePlaceRowToDto(row: ServicePlace): ServicePlaceItem {
  const metadata = row.metadata as unknown;
  const contact = asJsonObject(metadata)?.contact;
  const contactObj = asJsonObject(contact);
  return {
    id: row.id,
    provider: row.provider,
    providerPlaceId: row.providerPlaceId,
    type: row.type,
    title: row.title,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    category: row.category,
    contact: {
      phone: row.contactPhone ?? (typeof contactObj?.phone === "string" ? contactObj.phone : null),
      url: row.contactUrl ?? (typeof contactObj?.url === "string" ? contactObj.url : null),
    },
    metadata: row.metadata,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function buildServicePlaceSnapshot(input: CreateServicePlaceInput | ServicePlaceItem): ServicePlaceSnapshot {
  return {
    id: "id" in input ? input.id : null,
    provider: input.provider,
    providerPlaceId: input.providerPlaceId ?? null,
    type: input.type,
    title: input.title,
    address: input.address,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    category: input.category ?? null,
    contact: input.contact ?? null,
    metadata: input.metadata ?? null,
  };
}
