export type ApiClientConfig = {
  baseUrl: string;
};

export class ApiClient {
  private readonly baseUrl: string;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
  }

  async request<TResponse>(
    path: string,
    init?: RequestInit
  ): Promise<TResponse> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;

      try {
        const errorBody = await response.json();
        if (
          typeof errorBody === "object" &&
          errorBody !== null &&
          "error" in errorBody &&
          typeof errorBody.error === "string"
        ) {
          errorMessage = errorBody.error;
        }
      } catch {
        // Keep default message when response body is not JSON.
      }

      throw new Error(errorMessage);
    }

    return (await response.json()) as TResponse;
  }
}

export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}
