import {
  DEV_USER_HEADER_NAME,
  DEV_USER_STORAGE_KEY,
  DEV_USER_SWITCHER_ENV_FLAG,
} from "@mototwin/types";

export type ApiClientConfig = {
  baseUrl: string;
};

function responseBodyLooksLikeHtml(body: string): boolean {
  const head = body.trimStart().slice(0, 64).toLowerCase();
  return head.startsWith("<!doctype") || head.startsWith("<html");
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
      return `${parsed.error}${hint}${dev}`;
    }
  } catch {
    // Body is not JSON.
  }

  const maxPlain = 280;
  return trimmed.length > maxPlain ? `${trimmed.slice(0, maxPlain)}…` : trimmed;
}

export class ApiClient {
  private readonly baseUrl: string;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
  }

  async request<TResponse>(path: string, init?: RequestInit): Promise<TResponse> {
    const devUserHeader = this.getDevUserHeaderValue();
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(devUserHeader ? { [DEV_USER_HEADER_NAME]: devUserHeader } : {}),
        ...(init?.headers || {}),
      },
    });

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
