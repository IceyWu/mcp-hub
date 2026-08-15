const DEFAULT_BASE_URL = "https://wd.levwu.me";

export type ApiEnvelope<T> = {
  code?: number;
  data?: T;
  message?: string;
};

function baseUrl(): string {
  return (process.env.WD_API_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function headers(hasBody: boolean): HeadersInit {
  const result: Record<string, string> = { Accept: "application/json" };
  if (hasBody) result["Content-Type"] = "application/json";
  if (process.env.WD_API_TOKEN) {
    result.Authorization = `Bearer ${process.env.WD_API_TOKEN}`;
  }
  if (process.env.WD_API_KEY) {
    result["X-Api-Key"] = process.env.WD_API_KEY;
  }
  return result;
}

export async function apiRequest<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    query?: Record<string, unknown>;
  } = {},
): Promise<T | undefined> {
  const url = new URL(`${baseUrl()}${path}`);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: headers(options.body !== undefined),
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (response.status === 204) return undefined;

  const text = await response.text();
  let payload: ApiEnvelope<T> | T | undefined;
  try {
    payload = text ? (JSON.parse(text) as ApiEnvelope<T> | T) : undefined;
  } catch {
    throw new Error(
      `API returned invalid JSON (${response.status}): ${text.slice(0, 500)}`,
    );
  }

  if (!response.ok) {
    const message = (payload as ApiEnvelope<T> | undefined)?.message;
    throw new Error(
      `API request failed (${response.status}): ${message ?? text ?? response.statusText}`,
    );
  }

  if (payload && typeof payload === "object" && "data" in payload) {
    const envelope = payload as ApiEnvelope<T>;
    if (typeof envelope.code === "number" && envelope.code >= 400) {
      throw new Error(
        `API request failed (${envelope.code}): ${envelope.message ?? "Unknown error"}`,
      );
    }
    return envelope.data;
  }
  return payload as T | undefined;
}
