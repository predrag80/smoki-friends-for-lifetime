import { getApiBaseUrl } from "./api-base-url";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string
  ) {
    super(code);
  }
}

type ApiOptions = { method?: "GET" | "POST" | "DELETE"; body?: unknown };

/** Browser calls to the API. The session cookie is sent with every request. */
export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      method: options.method ?? "GET",
      credentials: "include",
      headers: options.body === undefined ? undefined : { "content-type": "application/json" },
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
  } catch {
    throw new ApiError(0, "NETWORK");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const code =
      response.status === 429
        ? "RATE_LIMITED"
        : typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
          ? data.error
          : "UNKNOWN";
    throw new ApiError(response.status, code);
  }

  return data as T;
}

export function errorCode(error: unknown): string {
  return error instanceof ApiError ? error.code : "UNKNOWN";
}
