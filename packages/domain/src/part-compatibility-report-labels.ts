import type { FitmentConfidenceStatus, PartCompatibilityReportWire, TrustBadgeWire } from "@mototwin/types";
import { deriveDominantFitmentResult } from "./part-compatibility-report-logic";

type SourceKind = PartCompatibilityReportWire["sourcePriority"]["kind"];

export function ownerCountLabelRu(n: number): string {
  if (n <= 0) return "0 владельцев";
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${n} владельцев`;
  if (mod10 === 1) return `${n} владелец`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} владельца`;
  return `${n} владельцев`;
}

export function installationStatusLabelRu(s: string): string {
  switch (s) {
    case "INSTALLED":
      return "Установлено";
    case "PURCHASED_NOT_INSTALLED":
      return "Куплено, не установлено";
    case "TESTED_NOT_INSTALLED":
      return "Пробовали без установки";
    default:
      return s;
  }
}

export function sourcePriorityVariantLabelRu(kind: SourceKind): string {
  switch (kind) {
    case "structured_only":
      return "Проверено по правилам совместимости MotoTwin";
    case "community_only":
      return "Подтверждено отчётами владельцев";
    case "hybrid":
      return "Совпадает с правилами MotoTwin и подтверждено владельцами";
    case "conflict":
      return "Есть расхождение между правилами и отчётами владельцев";
    case "insufficient_data":
      return "Недостаточно данных для однозначного источника";
    default:
      return kind;
  }
}

export function trustBadgeShortRu(b: TrustBadgeWire): string | null {
  switch (b) {
    case "VERIFIED_BY_MOTOTWIN":
      return "Проверено MotoTwin";
    case "COMMUNITY_CONFIRMED":
      return "Подтверждено сообществом";
    case "COMMUNITY_SIGNAL":
      return "Сигнал сообщества";
    default:
      return null;
  }
}

export function evidenceTypeShortRu(t: string): string {
  switch (t) {
    case "PACKAGING_PHOTO":
      return "Упаковка / SKU";
    case "INSTALLED_PHOTO":
      return "Установка";
    case "RECEIPT":
      return "Чек / заказ";
    default:
      return t;
  }
}

export function verdictSupportParagraphsRu(d: PartCompatibilityReportWire): string[] {
  if (d.smallSample) {
    return [
      "Отчётов недостаточно для уверенного вывода.",
      "Добавьте свой опыт, если вы уже устанавливали эту деталь.",
    ];
  }
  const dom = deriveDominantFitmentResult(d.breakdown);
  const st: FitmentConfidenceStatus | null = d.confidence?.status ?? null;
  if (!st) {
    if (d.breakdown.totalReports === 0) {
      return [
        "Пользовательских отчётов по этой модификации и узлу пока нет. Ориентируйтесь на данные каталога и сервисную документацию.",
      ];
    }
    return [
      "Сводка построена по отчётам владельцев; отдельный агрегат уверенности для этой связки может появиться позже.",
    ];
  }
  switch (st) {
    case "VERIFIED_BY_MOTOTWIN":
      return [
        "Совместимость подтверждена проверенными правилами MotoTwin для этой модификации и узла.",
        "Отчёты владельцев дополняют картину, но не заменяют сервисную проверку на мотоцикле.",
      ];
    case "COMMUNITY_CONFIRMED":
      return dom === "DIRECT_FIT" || dom === "OEM_REPLACEMENT"
        ? [
            "Деталь успешно установлена владельцами этой модели.",
            "Большинство отчётов указывает на установку без существенных доработок.",
          ]
        : ["Большинство отчётов владельцев позитивны по совместимости для этой модификации и узла."];
    case "FITS_WITH_MODIFICATION":
      return [
        "Часть владельцев сообщает об успешной установке с доработками — изучите типичные доработки ниже.",
      ];
    case "MIXED_REPORTS":
      return [
        "Часть владельцев установила деталь без проблем, но есть отчёты о несовместимости или доработках.",
        "Проверьте конфигурацию мотоцикла перед покупкой.",
      ];
    case "LOW_CONFIDENCE":
      return ["Данных по отчётам пока мало или они неоднородны — вывод по совместимости осторожный."];
    case "REJECTED_LIKELY_INCOMPATIBLE":
      return [
        "По отчётам владельцев и сигналам совместимости деталь с высокой вероятностью не подходит к этой конфигурации.",
      ];
    default:
      return [];
  }
}

export function isBrakesSafetyContext(nodeCode: string, serviceGroup: string | null): boolean {
  const c = nodeCode.toUpperCase();
  const g = (serviceGroup ?? "").toUpperCase();
  return g === "BRAKES" || c.startsWith("BRAKES.");
}

export function fitmentReportResultLabelRu(r: string): string {
  switch (r) {
    case "DIRECT_FIT":
      return "Подходит без доработок";
    case "FIT_WITH_MODIFICATION":
      return "С доработкой";
    case "PARTIAL_FIT":
      return "Частично";
    case "DOES_NOT_FIT":
      return "Не подошла";
    case "OEM_REPLACEMENT":
      return "OEM-замена";
    default:
      return r;
  }
}
