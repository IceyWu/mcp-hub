/**
 * 通用 HTTP 客户端 —— 供 levwu 各模块复用。
 *
 * 处理统一响应信封 `{ code, message, data }`（与 wordsessence 一致），
 * 支持 JSON 与 multipart/form-data 两种请求体、查询参数与超时。
 */
export type ApiEnvelope<T> = {
  code?: number;
  data?: T | null;
  message?: string;
};

export type ApiRequestOptions = {
  method?: string;
  query?: Record<string, unknown>;
  /** JSON 请求体（自动设置 Content-Type: application/json） */
  json?: unknown;
  /** multipart/form-data 请求体（边界由 fetch 自动生成） */
  formData?: FormData;
  headers?: Record<string, string>;
  timeoutMs?: number;
};

/** 把任意结果包成 MCP 文本内容（JSON 字符串）。 */
export function jsonResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function buildHeaders(options: ApiRequestOptions): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers ?? {}),
  };
  if (options.json !== undefined && !options.formData) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

export async function apiRequest<T>(
  baseUrl: string,
  path: string,
  options: ApiRequestOptions = {},
): Promise<T | undefined> {
  const url = new URL(`${baseUrl.replace(/\/+$/, "")}${path}`);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? 60_000,
  );
  try {
    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers: buildHeaders(options),
      body:
        options.json !== undefined
          ? JSON.stringify(options.json)
          : (options.formData ?? undefined),
      signal: controller.signal,
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
      return envelope.data ?? undefined;
    }
    return payload as T | undefined;
  } finally {
    clearTimeout(timer);
  }
}
