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
    const parsed = JSON.parse(trimmed) as { error?: unknown };
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.error === "string" &&
      parsed.error.length > 0
    ) {
      return parsed.error;
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
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });

    if (!response.ok) {
      const errorMessage = await readHttpErrorMessage(response);
      throw new Error(errorMessage);
    }

    return (await response.json()) as TResponse;
  }
}

export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}
