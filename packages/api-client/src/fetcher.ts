import {
  DEV_USER_HEADER_NAME,
  DEV_USER_STORAGE_KEY,
  DEV_USER_SWITCHER_ENV_FLAG,
  MOBILE_CLIENT_EXPO,
  MOBILE_CLIENT_HEADER,
} from "@mototwin/types";

export type ApiRequestExecutor = <T>(
  path: string,
  fn: (abortSignal?: AbortSignal) => Promise<T>
) => Promise<T>;

export type ApiClientConfig = {
  baseUrl: string;
  /** Send cookies (web same-origin). Default: include when baseUrl is empty. */
  credentials?: RequestCredentials;
  /** Bearer access token (Expo). */
  getAccessToken?: () => string | null | Promise<string | null>;
  /** Called on HTTP 401 in browser environments. */
  onUnauthorized?: () => void;
  /** Abort the request after this many ms (mobile / flaky networks). */
  requestTimeoutMs?: number;
  /** Override retry attempts for idempotent requests. */
  requestMaxAttempts?: number;
  /** Optional queue / throttle (Expo). */
  requestExecutor?: ApiRequestExecutor;
};

function responseBodyLooksLikeHtml(body: string): boolean {
  const head = body.trimStart().slice(0, 64).toLowerCase();
  return head.startsWith("<!doctype") || head.startsWith("<html");
}

type ZodIssueLike = { path?: unknown; message?: unknown };

function formatZodIssuePath(path: unknown): string {
  if (!Array.isArray(path) || path.length === 0) {
    return "";
  }
  let out = "";
  for (const segment of path) {
    if (typeof segment === "number") {
      out += `[${segment}]`;
    } else {
      const s = String(segment);
      out += out === "" ? s : `.${s}`;
    }
  }
  return out;
}

function formatValidationIssuesAppendix(issues: unknown, maxIssues: number): string {
  if (!Array.isArray(issues) || issues.length === 0) {
    return "";
  }
  const lines: string[] = [];
  const slice = issues.slice(0, maxIssues);
  for (const raw of slice) {
    if (!raw || typeof raw !== "object") {
      continue;
    }
    const issue = raw as ZodIssueLike;
    const path = formatZodIssuePath(issue.path);
    const message = typeof issue.message === "string" ? issue.message.trim() : "";
    if (!message) {
      continue;
    }
    lines.push(path ? `${path}: ${message}` : message);
  }
  if (lines.length === 0) {
    return "";
  }
  const more = issues.length > maxIssues ? `\n…ещё ${issues.length - maxIssues}` : "";
  return `\n${lines.join("\n")}${more}`;
}

/**
 * Best-effort message from a non-OK response: prefers `{ error: string }`, else short plain text.
 * HTML bodies (Next error pages, proxies) are not surfaced verbatim to the UI.
 */
export async function readHttpErrorMessage(response: Response): Promise<string> {
  const status = response.status;
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("text/html")) {
    return `Ошибка HTTP ${status}: сервер вернул HTML вместо JSON.`;
  }

  const text = await response.text();
  const trimmed = text.trim();

  if (!trimmed) {
    return `Ошибка HTTP ${status}.`;
  }

  if (responseBodyLooksLikeHtml(trimmed)) {
    return `Ошибка HTTP ${status}: сервер вернул HTML вместо JSON.`;
  }

  try {
    const parsed = JSON.parse(trimmed) as {
      error?: unknown;
      hint?: unknown;
      devMessage?: unknown;
      issues?: unknown;
    };
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.error === "string" &&
      parsed.error.length > 0
    ) {
      const hint = typeof parsed.hint === "string" && parsed.hint.length > 0 ? `\n${parsed.hint}` : "";
      const dev =
        typeof parsed.devMessage === "string" && parsed.devMessage.length > 0
          ? `\n(${parsed.devMessage})`
          : "";
      const issuesAppendix =
        parsed.error === "Validation failed"
          ? formatValidationIssuesAppendix(parsed.issues, 12)
          : "";
      return `${parsed.error}${issuesAppendix}${hint}${dev}`;
    }
  } catch {
    // Body is not JSON.
  }

  const maxPlain = 280;
  return trimmed.length > maxPlain ? `${trimmed.slice(0, maxPlain)}…` : trimmed;
}

function linkAbortSignals(...signals: Array<AbortSignal | undefined | null>): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (!signal) {
      continue;
    }
    if (signal.aborted) {
      controller.abort();
      return controller.signal;
    }
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return controller.signal;
}

function defaultCredentials(baseUrl: string): RequestCredentials {
  const trimmed = baseUrl.replace(/\/+$/, "");
  if (trimmed === "" || trimmed.startsWith("/")) {
    return "include";
  }
  return "same-origin";
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly credentials: RequestCredentials;
  private readonly getAccessToken?: ApiClientConfig["getAccessToken"];
  private readonly onUnauthorized?: ApiClientConfig["onUnauthorized"];
  private readonly requestTimeoutMs?: number;
  private readonly requestMaxAttempts?: number;
  private readonly requestExecutor?: ApiRequestExecutor;
  private readonly isMobileClient: boolean;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.credentials = config.credentials ?? defaultCredentials(config.baseUrl);
    this.getAccessToken = config.getAccessToken;
    this.onUnauthorized = config.onUnauthorized;
    this.requestTimeoutMs = config.requestTimeoutMs;
    this.requestMaxAttempts = config.requestMaxAttempts;
    this.requestExecutor = config.requestExecutor;
    this.isMobileClient = Boolean(config.getAccessToken);
  }

  async request<TResponse>(path: string, init?: RequestInit): Promise<TResponse> {
    const execute = (abortSignal?: AbortSignal): Promise<TResponse> =>
      this.requestInternal(path, init, abortSignal);
    if (this.requestExecutor) {
      return this.requestExecutor(path, execute);
    }
    return execute();
  }

  private async requestInternal<TResponse>(
    path: string,
    init?: RequestInit,
    schedulerSignal?: AbortSignal
  ): Promise<TResponse> {
    const devUserHeader = this.getDevUserHeaderValue();
    const accessToken = this.getAccessToken ? await this.getAccessToken() : null;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(devUserHeader ? { [DEV_USER_HEADER_NAME]: devUserHeader } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(this.isMobileClient ? { [MOBILE_CLIENT_HEADER]: MOBILE_CLIENT_EXPO } : {}),
    };

    const timeoutMs = this.requestTimeoutMs;
    const ownsTimeout = timeoutMs != null && timeoutMs > 0 && init?.signal == null;
    const fullUrl = `${this.baseUrl}${path}`;
    const method = (init?.method ?? "GET").toUpperCase();
    // Idempotent reads can safely re-attempt with a fresh connection when the
    // first attempt stalls before reaching the server (stuck TCP/TLS connect).
    // Several short attempts recover from an intermittent handshake stall far
    // faster than one long timeout.
    const maxAttempts =
      ownsTimeout && (method === "GET" || method === "HEAD")
        ? (this.requestMaxAttempts ?? 5)
        : 1;
    let response: Response | null = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const attemptStartedAt = Date.now();
      const timeoutController = ownsTimeout ? new AbortController() : null;
      const timeoutId =
        timeoutController != null
          ? setTimeout(() => {
              timeoutController.abort();
            }, timeoutMs)
          : null;
      const requestSignal = linkAbortSignals(
        schedulerSignal,
        init?.signal,
        timeoutController?.signal
      );
      try {
        response = await fetch(fullUrl, {
          ...init,
          credentials: init?.credentials ?? this.credentials,
          signal: requestSignal,
          headers: {
            ...headers,
            ...(init?.headers as Record<string, string> | undefined),
          },
        });
        break;
      } catch (error) {
        const schedulerAborted = Boolean(schedulerSignal?.aborted);
        const timeoutAborted = Boolean(timeoutController?.signal.aborted);
        if (schedulerAborted) {
          throw new Error("Запрос отменён.");
        }
        const canRetry = attempt < maxAttempts;
        if (canRetry) {
          // After a TLS/connect timeout, space retries out so we do not hammer
          // the server during a sustained packet-loss window; later attempts
          // often succeed once the path clears (proven in logcat).
          const retryBackoffMs = timeoutAborted
            ? Math.min(8000, 1500 * 2 ** (attempt - 1))
            : 400;
          await new Promise((resolve) => setTimeout(resolve, retryBackoffMs));
          continue;
        }
        if (timeoutAborted) {
          throw new Error(`Превышено время ожидания ответа сервера (${Math.round((timeoutMs ?? 0) / 1000)} с).`);
        }
        throw error;
      } finally {
        if (timeoutId != null) {
          clearTimeout(timeoutId);
        }
      }
    }

    if (response == null) {
      throw new Error(`Превышено время ожидания ответа сервера (${Math.round((timeoutMs ?? 0) / 1000)} с).`);
    }

    if (response.status === 401 && this.onUnauthorized) {
      this.onUnauthorized();
    }

    if (!response.ok) {
      const errorMessage = await readHttpErrorMessage(response);
      throw new Error(errorMessage);
    }

    return (await response.json()) as TResponse;
  }

  private getDevUserHeaderValue(): string | null {
    if (!isDevUserOverrideEnabled()) {
      return null;
    }

    const fromGlobal =
      typeof globalThis === "object" &&
      globalThis != null &&
      "__MOTOTWIN_DEV_USER_EMAIL__" in globalThis
        ? Reflect.get(globalThis, "__MOTOTWIN_DEV_USER_EMAIL__")
        : null;

    if (typeof fromGlobal === "string" && fromGlobal.trim().length > 0) {
      return fromGlobal.trim().toLowerCase();
    }

    if (typeof localStorage === "undefined") {
      return null;
    }

    try {
      const raw = localStorage.getItem(DEV_USER_STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const trimmed = raw.trim().toLowerCase();
      return trimmed.length > 0 ? trimmed : null;
    } catch {
      return null;
    }
  }
}

function isDevUserOverrideEnabled(): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  return process.env[DEV_USER_SWITCHER_ENV_FLAG] === "true";
}

export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}
