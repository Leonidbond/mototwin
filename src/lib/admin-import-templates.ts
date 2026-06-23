import fs from "node:fs";
import path from "node:path";
import type { AdminImportBatchTypeWire } from "@mototwin/types";
import { PARTS_STAGING_COLUMNS } from "@mototwin/types";

export type ImportTemplateSpec = {
  fileName: string;
  content: string;
};

const REPO_ROOT = process.cwd();

function csvLine(values: string[]): string {
  return values
    .map((value) => {
      if (/[",\n\r]/.test(value)) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    })
    .join(",");
}

function templateFromColumns(
  fileName: string,
  columns: readonly string[],
  exampleRow?: Record<string, string>
): ImportTemplateSpec {
  const header = csvLine([...columns]);
  if (!exampleRow) {
    return { fileName, content: `${header}\n` };
  }
  const row = csvLine(columns.map((column) => exampleRow[column] ?? ""));
  return { fileName, content: `${header}\n${row}\n` };
}

function loadRepoTemplate(relativePath: string, fileName: string): ImportTemplateSpec {
  const absolutePath = path.join(REPO_ROOT, relativePath);
  const content = fs.readFileSync(absolutePath, "utf8").replace(/\r\n/g, "\n");
  if (!content.endsWith("\n")) {
    return { fileName, content: `${content}\n` };
  }
  return { fileName, content };
}

const SUPPORTED_TEMPLATE_TYPES = [
  "PARTS",
  "PARTS_STAGING",
  "PART_ALIASES",
  "SERVICE_RULES",
] as const satisfies readonly AdminImportBatchTypeWire[];

export type SupportedImportTemplateType = (typeof SUPPORTED_TEMPLATE_TYPES)[number];

export function isSupportedImportTemplateType(
  type: string
): type is SupportedImportTemplateType {
  return (SUPPORTED_TEMPLATE_TYPES as readonly string[]).includes(type);
}

export function buildImportTemplate(type: SupportedImportTemplateType): ImportTemplateSpec {
  switch (type) {
    case "PARTS_STAGING":
      return loadRepoTemplate(
        "data/catalog/templates/parts-staging.csv",
        "parts-staging-template.csv"
      );
    case "PARTS":
      return templateFromColumns(
        "parts-master-template.csv",
        ["brand", "sku", "title", "subcategory", "description", "imageUrl"],
        {
          brand: "BMW",
          sku: "11427105320",
          title: "Oil Filter",
          subcategory: "filter",
          description: "OEM oil filter cartridge",
          imageUrl: "",
        }
      );
    case "PART_ALIASES":
      return templateFromColumns(
        "part-aliases-template.csv",
        ["brand", "sku", "alias"],
        {
          brand: "BMW",
          sku: "11427105320",
          alias: "11 42 7 105 320",
        }
      );
    case "SERVICE_RULES":
      return templateFromColumns(
        "service-rules-template.csv",
        [
          "nodeCode",
          "intervalKm",
          "intervalDays",
          "intervalHours",
          "warningKm",
          "warningHours",
          "warningDays",
          "triggerMode",
          "isActive",
        ],
        {
          nodeCode: "ENGINE.LUBE.OIL",
          intervalKm: "15000",
          intervalDays: "365",
          intervalHours: "",
          warningKm: "1000",
          warningHours: "",
          warningDays: "30",
          triggerMode: "WHICHEVER_COMES_FIRST",
          isActive: "true",
        }
      );
    default: {
      const exhaustive: never = type;
      throw new Error(`Unsupported import template type: ${exhaustive}`);
    }
  }
}

/** Header-only CSV for quick column reference (PARTS_STAGING uses full contract list). */
export function buildImportTemplateHeadersOnly(type: SupportedImportTemplateType): ImportTemplateSpec {
  if (type === "PARTS_STAGING") {
    return templateFromColumns("parts-staging-columns.csv", PARTS_STAGING_COLUMNS);
  }
  const full = buildImportTemplate(type);
  const headerLine = full.content.split("\n")[0] ?? "";
  return {
    fileName: full.fileName.replace(/\.csv$/, "-columns.csv"),
    content: `${headerLine}\n`,
  };
}
