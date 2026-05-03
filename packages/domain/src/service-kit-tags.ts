import type { ServiceKitMerchandiseTag, ServiceKitViewModel } from "@mototwin/types";

const TAG_LABELS_RU: Record<ServiceKitMerchandiseTag, string> = {
  POPULAR: "Популярный",
  BEST_VALUE: "Выгодный",
  RECOMMENDED: "Рекомендуем",
};

/**
 * Статичный лукап `kitCode → tag` (MVP-уровень merchandising без новых полей в БД).
 * Расширяется добавлением `code` в эту мапу.
 */
const KIT_TAG_BY_CODE: Record<string, ServiceKitMerchandiseTag> = {
  FRONT_BRAKE_SERVICE_KIT: "POPULAR",
  REAR_BRAKE_SERVICE_KIT: "POPULAR",
  CHAIN_SERVICE_KIT: "BEST_VALUE",
  ENGINE_OIL_CHANGE_KIT: "RECOMMENDED",
};

/** Возвращает merchandising-тег кита (`Популярный` / `Выгодный` / `Рекомендуем`) или `null`. */
export function getServiceKitTagRu(
  kit: Pick<ServiceKitViewModel, "code">
): { kind: ServiceKitMerchandiseTag; labelRu: string } | null {
  const tag = KIT_TAG_BY_CODE[kit.code];
  if (!tag) {
    return null;
  }
  return { kind: tag, labelRu: TAG_LABELS_RU[tag] };
}

export function getServiceKitTagLabelRu(tag: ServiceKitMerchandiseTag): string {
  return TAG_LABELS_RU[tag];
}
