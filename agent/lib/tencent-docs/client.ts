/**
 * 腾讯文档开放平台 —— 底层 HTTP 客户端与鉴权
 *
 * 文档: https://docs.qq.com/open/document/app/openapi/v2/
 *
 * 鉴权需要三个请求头:
 *  - Access-Token: 访问令牌
 *  - Client-Id:    应用 ID
 *  - Open-Id:      开放平台用户 ID
 *
 * 大部分 drive / smartbook 接口返回统一信封 { ret, msg, data }，
 * 由 `callApi` 统一校验 ret 并抛出可读错误。
 * spreadsheet v3 接口用的是 { code, message } 信封，需单独处理。
 */

import { AsyncLocalStorage } from "node:async_hooks";

export const BASE_URL = "https://docs.qq.com";

export interface TencentDocsCredentials {
  accessToken: string;
  clientId: string;
  openId: string;
}

/**
 * 请求级凭证存储。
 * 在 HTTP（Streamable HTTP）模式下，每个请求的 HTTP 头中可能携带
 * `x-tencent-access-token` / `x-tencent-client-id` / `x-tencent-open-id`，
 * 这些值通过 AsyncLocalStorage 注入，避免并发请求间的凭证串扰。
 * stdio 模式下不使用此存储，回退到 process.env。
 */
export const requestCredentials =
  new AsyncLocalStorage<TencentDocsCredentials>();

/** 从环境变量读取凭证，缺失时抛出明确错误 */
export function getCredentialsFromEnv(): TencentDocsCredentials {
  // 优先取请求级凭证（HTTP 模式）
  const reqCreds = requestCredentials.getStore();
  const accessToken =
    reqCreds?.accessToken ?? process.env.TENCENT_DOCS_ACCESS_TOKEN;
  const clientId = reqCreds?.clientId ?? process.env.TENCENT_DOCS_CLIENT_ID;
  const openId = reqCreds?.openId ?? process.env.TENCENT_DOCS_OPEN_ID;

  const missing: string[] = [];
  if (!accessToken) missing.push("TENCENT_DOCS_ACCESS_TOKEN");
  if (!clientId) missing.push("TENCENT_DOCS_CLIENT_ID");
  if (!openId) missing.push("TENCENT_DOCS_OPEN_ID");

  if (missing.length > 0) {
    throw new Error(
      `腾讯文档凭证缺失: ${missing.join(", ")}。请在 .env.local 中配置或通过 HTTP 头传入。`,
    );
  }

  return { accessToken: accessToken!, clientId: clientId!, openId: openId! };
}

export function authHeaders(
  creds: TencentDocsCredentials,
): Record<string, string> {
  return {
    "Access-Token": creds.accessToken,
    "Client-Id": creds.clientId,
    "Open-Id": creds.openId,
    Accept: "application/json",
  };
}

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface CallApiOptions {
  /** JSON 请求体（自动设置 application/json） */
  json?: unknown;
  /** 表单请求体（自动设置 application/x-www-form-urlencoded） */
  form?: Record<string, string | number | undefined>;
  /** 出错信息里展示的操作名，如 "新建文档" */
  action?: string;
}

/**
 * 统一调用腾讯文档接口（{ ret, msg, data } 信封）。
 * 负责拼 header、序列化 body、校验 HTTP 状态与业务 ret，返回 data 部分。
 *
 * @returns data 字段（泛型 T）
 */
export async function callApi<T = unknown>(
  creds: TencentDocsCredentials,
  method: HttpMethod,
  path: string,
  options: CallApiOptions = {},
): Promise<T> {
  const { json, form, action = "请求" } = options;
  const headers = authHeaders(creds);
  let body: string | undefined;

  if (json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  } else if (form !== undefined) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(form)) {
      if (v !== undefined) params.set(k, String(v));
    }
    body = params.toString();
  }

  const res = await fetch(`${BASE_URL}${path}`, { method, headers, body });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${action}失败 (HTTP ${res.status}): ${text}`);
  }

  let parsed: { ret?: number; msg?: string; data?: T };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`${action}返回非 JSON: ${text}`);
  }

  if (parsed.ret && parsed.ret !== 0) {
    throw new Error(`${action}返回错误 ret=${parsed.ret}: ${parsed.msg ?? ""}`);
  }
  return parsed.data as T;
}
