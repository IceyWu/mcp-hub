/**
 * 智能表 —— 记录（record）接口
 * 路径前缀 /openapi/smartbook/v2/
 * 文档: https://docs.qq.com/open/document/app/openapi/v2/smartsheet/record/
 *
 * 记录值编码（实测结论）：
 *  - 文本:        [{ type: "text", text }]   （纯字符串也可；[{text}] 会报 22015）
 *  - 单选/多选:   [{ text }]
 *  - 数字:        原始 number
 *  - 日期:        时间戳毫秒(number)         （字符串 "2024-01-15" 会报 22034）
 *  - 不能写入: 创建时间/最后编辑时间/创建人/最后编辑人 四种字段
 */
import { callApi, type TencentDocsCredentials } from "./client.js";
import { SmartSheetFieldType, type FieldInfo } from "./smartsheet-fields.js";

const sheetPath = (fileId: string, sheetId: string) =>
  `/openapi/smartbook/v2/files/${encodeURIComponent(fileId)}/sheets/${encodeURIComponent(sheetId)}`;

/** 智能表一条记录 */
export interface SmartSheetRecord {
  recordID: string;
  createTime?: string;
  updateTime?: string;
  /** 字段名 -> 字段值（原始结构，值通常是数组） */
  values: Record<string, unknown>;
}

export interface GetRecordsResult {
  records: SmartSheetRecord[];
  total: number;
  hasMore: boolean;
  next: number;
}

/**
 * 查询智能表某个子表下的记录。
 * POST {sheetPath}  Body: { getRecords: { offset, limit } }
 */
export async function getSmartSheetRecords(
  fileId: string,
  sheetId: string,
  creds: TencentDocsCredentials,
  offset = 0,
  limit = 100,
): Promise<GetRecordsResult> {
  const data = await callApi<{
    getRecords?: {
      records?: SmartSheetRecord[];
      total?: number;
      hasMore?: boolean;
      next?: number;
    };
  }>(creds, "POST", sheetPath(fileId, sheetId), {
    json: { getRecords: { offset, limit } },
    action: "查询记录",
  });
  const gr = data?.getRecords;
  return {
    records: gr?.records ?? [],
    total: gr?.total ?? 0,
    hasMore: gr?.hasMore ?? false,
    next: gr?.next ?? 0,
  };
}

/**
 * 拉取一个子表的全部记录（自动翻页，maxRecords 上限保护）。
 */
export async function getAllSmartSheetRecords(
  fileId: string,
  sheetId: string,
  creds: TencentDocsCredentials,
  maxRecords = 500,
): Promise<{ records: SmartSheetRecord[]; total: number }> {
  const all: SmartSheetRecord[] = [];
  let offset = 0;
  const pageSize = 100;
  let total = 0;

  while (all.length < maxRecords) {
    const page = await getSmartSheetRecords(fileId, sheetId, creds, offset, pageSize);
    total = page.total;
    all.push(...page.records);
    if (!page.hasMore || page.records.length === 0) break;
    offset = page.next || offset + page.records.length;
  }
  return { records: all.slice(0, maxRecords), total };
}

/** 一行待写入记录：字段名 -> 已编码的值 */
export type RecordValues = Record<string, unknown>;

/**
 * 把「字段名 -> 简单值」按字段类型编码成 API 需要的结构。
 * 简单值规则：
 *  - 字符串/数字 -> 按字段类型自动包装
 *  - 单选/多选可传 string 或 string[]
 *  - 日期可传 number(ms) 或 Date
 * 传入 fields（来自 getSmartSheetFields）以便按类型编码；未知字段按文本处理。
 */
export function encodeRecordValues(
  plain: Record<string, string | number | boolean | Date | string[] | null | undefined>,
  fields: FieldInfo[],
): RecordValues {
  const typeByTitle = new Map(fields.map((f) => [f.fieldTitle, f.fieldType]));
  const out: RecordValues = {};

  for (const [title, value] of Object.entries(plain)) {
    if (value == null) continue;
    const type = typeByTitle.get(title);

    // 系统自动维护、不可写入的字段一律跳过（创建时间/编辑时间/创建人/编辑人）。
    if (
      type === SmartSheetFieldType.createdTime ||
      type === SmartSheetFieldType.modifiedTime ||
      type === SmartSheetFieldType.createdUser ||
      type === SmartSheetFieldType.modifiedUser
    ) {
      continue;
    }

    switch (type) {
      case SmartSheetFieldType.number:
      case SmartSheetFieldType.progress:
        out[title] = typeof value === "number" ? value : Number(value);
        break;
      case SmartSheetFieldType.dateTime:
        out[title] =
          value instanceof Date
            ? value.getTime()
            : typeof value === "number"
              ? value
              : Date.parse(String(value));
        break;
      case SmartSheetFieldType.select:
      case SmartSheetFieldType.singleSelect: {
        const arr = Array.isArray(value) ? value : [String(value)];
        out[title] = arr.map((t) => ({ text: t }));
        break;
      }
      case SmartSheetFieldType.checkbox:
        out[title] = Boolean(value);
        break;
      default:
        // 文本及其它：用文本结构
        out[title] = [{ type: "text", text: String(value) }];
    }
  }
  return out;
}

/**
 * 添加一行或多行记录。
 * POST {sheetPath}  Body: { addRecords: { records: [{ values }] } }
 * @param rows 每行是「字段名 -> 已编码值」。可配合 encodeRecordValues 使用。
 * @returns 新记录的 recordID 列表
 */
export async function addSmartSheetRecords(
  fileId: string,
  sheetId: string,
  creds: TencentDocsCredentials,
  rows: RecordValues[],
): Promise<string[]> {
  const data = await callApi<{ addRecords?: { records?: { recordID: string }[] } }>(
    creds,
    "POST",
    sheetPath(fileId, sheetId),
    {
      json: { addRecords: { records: rows.map((values) => ({ values })) } },
      action: "添加记录",
    },
  );
  return (data?.addRecords?.records ?? []).map((r) => r.recordID);
}

/**
 * 更新一行或多行记录。
 * POST {sheetPath}  Body: { updateRecords: { records: [{ recordID, values }] } }
 */
export async function updateSmartSheetRecords(
  fileId: string,
  sheetId: string,
  creds: TencentDocsCredentials,
  rows: { recordID: string; values: RecordValues }[],
): Promise<string[]> {
  const data = await callApi<{ updateRecords?: { records?: { recordID: string }[] } }>(
    creds,
    "POST",
    sheetPath(fileId, sheetId),
    { json: { updateRecords: { records: rows } }, action: "更新记录" },
  );
  return (data?.updateRecords?.records ?? []).map((r) => r.recordID);
}

/**
 * 删除一行或多行记录。
 * POST {sheetPath}  Body: { deleteRecords: { recordIDs: [...] } }
 */
export async function deleteSmartSheetRecords(
  fileId: string,
  sheetId: string,
  creds: TencentDocsCredentials,
  recordIds: string[],
): Promise<void> {
  await callApi(creds, "POST", sheetPath(fileId, sheetId), {
    json: { deleteRecords: { recordIDs: recordIds } },
    action: "删除记录",
  });
}

/**
 * 下载腾讯文档附件/图片。
 *
 * 注意：附件字段里的 imageUrl（docimg*.docs.qq.com）做了**防盗链**校验，
 * 直接请求会 403。实测必须带上 `Referer: https://docs.qq.com/`（再带个常规
 * User-Agent 更稳），不需要 Access-Token 等鉴权头。
 *
 * @returns 图片的字节、base64 与 MIME 类型
 */
export async function fetchAttachment(
  url: string,
): Promise<{ bytes: Uint8Array; base64: string; mimeType: string }> {
  const res = await fetch(url, {
    headers: {
      Referer: "https://docs.qq.com/",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    },
  });
  if (!res.ok) {
    throw new Error(`下载附件失败 (HTTP ${res.status}): ${url}`);
  }
  const mimeType = res.headers.get("content-type") ?? "application/octet-stream";
  const bytes = new Uint8Array(await res.arrayBuffer());
  const base64 = Buffer.from(bytes).toString("base64");
  return { bytes, base64, mimeType };
}

/**
 * 从一条记录的某个附件字段里提取附件列表（id/url/标题/尺寸）。
 * 兼容 imageUrl（图片）和 url（普通附件）两种形态。
 */
export function extractAttachments(
  values: Record<string, unknown>,
  fieldTitle: string,
): { id?: string; url: string; title: string; width?: number; height?: number }[] {
  const raw = values[fieldTitle];
  if (!Array.isArray(raw)) return [];
  const out: { id?: string; url: string; title: string; width?: number; height?: number }[] = [];
  for (const item of raw) {
    if (item == null || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    const url =
      typeof obj.imageUrl === "string"
        ? obj.imageUrl
        : typeof obj.url === "string"
          ? obj.url
          : undefined;
    if (!url) continue;
    out.push({
      id: typeof obj.id === "string" ? obj.id : undefined,
      url,
      title: typeof obj.title === "string" ? obj.title : "附件",
      width: typeof obj.width === "number" ? obj.width : undefined,
      height: typeof obj.height === "number" ? obj.height : undefined,
    });
  }
  return out;
}

/**
 * 把智能表记录的 values 扁平化成「字段名 -> 纯文本」，方便模型阅读。
 */
export function flattenRecordValues(
  values: Record<string, unknown>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(values)) {
    out[key] = stringifyCellValue(raw);
  }
  return out;
}

function stringifyCellValue(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw === "number" || typeof raw === "boolean") return String(raw);

  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (item == null) return "";
        if (typeof item === "string") return item;
        if (typeof item === "object") {
          const obj = item as Record<string, unknown>;
          if (typeof obj.text === "string") return obj.text;
          if (typeof obj.link === "string") {
            const t = typeof obj.text === "string" ? obj.text : obj.link;
            return `${t} (${obj.link})`;
          }
          if (typeof obj.imageUrl === "string") {
            const t = typeof obj.title === "string" ? obj.title : "图片";
            return `[${t}](${obj.imageUrl})`;
          }
          if (typeof obj.url === "string") {
            const t = typeof obj.title === "string" ? obj.title : obj.url;
            return `[${t}](${obj.url})`;
          }
          return JSON.stringify(obj);
        }
        return String(item);
      })
      .filter((s) => s.length > 0)
      .join(", ");
  }

  if (typeof raw === "object") return JSON.stringify(raw);
  return String(raw);
}
