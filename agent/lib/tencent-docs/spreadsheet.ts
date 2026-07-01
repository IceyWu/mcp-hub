/**
 * 在线表格 (spreadsheet) —— 路径前缀 /openapi/spreadsheet/v3/
 *
 * 与智能表不同：spreadsheet 按单元格/范围读取（A1 表示法），
 * 且返回信封是 { code, message }，所以这里直接用 fetch 而非 callApi。
 */
import {
  BASE_URL,
  authHeaders,
  type TencentDocsCredentials,
} from "./client.js";

/** 在线表格的子表元数据 */
export interface SpreadsheetMeta {
  sheetId: string;
  title: string;
  rowCount: number;
  columnCount: number;
}

/**
 * 查询在线表格的所有子表。
 * GET /openapi/spreadsheet/v3/files/{fileId}?concise=0
 */
export async function getSpreadsheetSheets(
  fileId: string,
  creds: TencentDocsCredentials,
): Promise<SpreadsheetMeta[]> {
  const url = `${BASE_URL}/openapi/spreadsheet/v3/files/${encodeURIComponent(fileId)}?concise=0`;
  const res = await fetch(url, { headers: authHeaders(creds) });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`查询在线表格子表失败 (HTTP ${res.status}): ${body}`);
  }
  const json = (await res.json()) as {
    code?: number;
    message?: string;
    properties?: SpreadsheetMeta[];
  };
  if (json.code && json.code !== 0) {
    throw new Error(`查询在线表格子表返回错误 code=${json.code}: ${json.message}`);
  }
  return json.properties ?? [];
}

/**
 * 读取在线表格某个范围的单元格内容（A1 表示法）。
 * GET /openapi/spreadsheet/v3/files/{fileId}/{sheetId}/{range}
 * 限制: 行<=1000, 列<=200, 总单元格<=10000
 */
export async function getSpreadsheetRange(
  fileId: string,
  sheetId: string,
  range: string,
  creds: TencentDocsCredentials,
): Promise<string[][]> {
  const url = `${BASE_URL}/openapi/spreadsheet/v3/files/${encodeURIComponent(
    fileId,
  )}/${encodeURIComponent(sheetId)}/${encodeURIComponent(range)}`;
  const res = await fetch(url, { headers: authHeaders(creds) });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`读取在线表格范围失败 (HTTP ${res.status}): ${body}`);
  }
  const json = (await res.json()) as {
    ret?: number;
    msg?: string;
    gridData?: { rows?: Array<{ values?: Array<{ cellValue?: { text?: string } }> }> };
    data?: {
      gridData?: { rows?: Array<{ values?: Array<{ cellValue?: { text?: string } }> }> };
    };
  };
  if (json.ret && json.ret !== 0) {
    throw new Error(`读取在线表格范围返回错误 ret=${json.ret}: ${json.msg}`);
  }
  const grid = json.gridData ?? json.data?.gridData;
  const rows = grid?.rows ?? [];
  return rows.map((row) => (row.values ?? []).map((cell) => cell.cellValue?.text ?? ""));
}

/** 列号(1-based)转 A1 字母，如 1->A, 26->Z, 27->AA */
export function columnIndexToLetter(col: number): string {
  let s = "";
  let n = col;
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s || "A";
}
