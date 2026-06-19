import fs from "node:fs";
import path from "node:path";

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      fields.push(current);
      current = "";
      continue;
    }
    current += ch;
  }

  fields.push(current);
  return fields;
}

function needsQuoting(value: string): boolean {
  return /[",\r\n]/.test(value);
}

function escapeCsvField(value: string): string {
  if (!needsQuoting(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

export function readCsvFile(filePath: string): Record<string, string>[] {
  const content = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const lines = content.split(/\r?\n/).filter((line, index, all) => {
    if (line.trim()) return true;
    return index === all.length - 1 ? false : true;
  });
  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]!).map((header) => header.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]!);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    rows.push(row);
  }

  return rows;
}

export function writeCsvFile(
  filePath: string,
  rows: Record<string, string>[],
  columns: readonly string[]
): void {
  const headerLine = columns.map((column) => escapeCsvField(column)).join(",");
  const dataLines = rows.map((row) =>
    columns.map((column) => escapeCsvField(row[column] ?? "")).join(",")
  );
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${[headerLine, ...dataLines].join("\n")}\n`, "utf8");
}
