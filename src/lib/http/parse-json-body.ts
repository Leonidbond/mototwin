/**
 * Hardened JSON body parser for API routes.
 *
 * Next.js does not enforce a global request body size limit on the App Router
 * (`api.bodyParser.sizeLimit` is a Pages-only setting), so each route is
 * responsible for guarding itself. Without a guard a single client could send
 * gigabytes of JSON and exhaust process memory — MT-SEC-014 in
 * docs/security/findings.md.
 *
 * The helper:
 *   1. Rejects requests larger than `maxBytes` (default 100 KB) via
 *      Content-Length or by streaming the body and counting bytes.
 *   2. Parses JSON only after the size check succeeds.
 *
 * Throws a `BodyParseError` with an explicit `status` code so callers can map
 * it straight to a `NextResponse.json({ error }, { status })`.
 */

const DEFAULT_MAX_BYTES = 100 * 1024;

export class BodyParseError extends Error {
  readonly status: number;
  readonly code: "BODY_TOO_LARGE" | "INVALID_JSON" | "EMPTY_BODY";
  constructor(code: "BODY_TOO_LARGE" | "INVALID_JSON" | "EMPTY_BODY", status: number, message: string) {
    super(message);
    this.name = "BodyParseError";
    this.code = code;
    this.status = status;
  }
}

export type ParseJsonBodyOptions = {
  /** Hard byte limit. Defaults to 100 KB which is generous for JSON payloads. */
  maxBytes?: number;
  /** Allow an empty body and return `null` instead of throwing. */
  allowEmpty?: boolean;
};

export async function parseJsonBody<T = unknown>(
  request: Request,
  options: ParseJsonBodyOptions = {}
): Promise<T> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const allowEmpty = options.allowEmpty ?? false;

  const declaredLength = parseDeclaredContentLength(request.headers.get("content-length"));
  if (declaredLength != null && declaredLength > maxBytes) {
    throw new BodyParseError(
      "BODY_TOO_LARGE",
      413,
      `Request body exceeds the ${maxBytes}-byte limit.`
    );
  }

  let raw: string;
  try {
    raw = await readBodyAsString(request, maxBytes);
  } catch (error) {
    if (error instanceof BodyParseError) throw error;
    throw new BodyParseError(
      "INVALID_JSON",
      400,
      error instanceof Error ? error.message : "Failed to read body."
    );
  }

  if (!raw.trim()) {
    if (allowEmpty) return null as T;
    throw new BodyParseError("EMPTY_BODY", 400, "Empty request body.");
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new BodyParseError("INVALID_JSON", 400, "Invalid JSON body.");
  }
}

function parseDeclaredContentLength(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

async function readBodyAsString(request: Request, maxBytes: number): Promise<string> {
  const body = request.body;
  if (!body) {
    return "";
  }
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8");
  let total = 0;
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      buffer += decoder.decode();
      return buffer;
    }
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      try {
        await reader.cancel();
      } catch {
        // Already cancelled — ignore.
      }
      throw new BodyParseError(
        "BODY_TOO_LARGE",
        413,
        `Request body exceeds the ${maxBytes}-byte limit.`
      );
    }
    buffer += decoder.decode(value, { stream: true });
  }
}
