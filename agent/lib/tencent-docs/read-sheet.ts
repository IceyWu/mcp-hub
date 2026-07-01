/**
 * 统一入口：自动识别文档类型并读取为「记录数组」。
 * - smartsheet：用 smartbook 记录接口
 * - sheet：用 spreadsheet 范围接口，第一行作为表头
 */
import { type TencentDocsCredentials } from "./client.js";
import { resolveFileId, getFileMetadata } from "./drive.js";
import { getSmartSheets } from "./smartsheet-sheets.js";
import {
  getAllSmartSheetRecords,
  flattenRecordValues,
} from "./smartsheet-records.js";
import {
  getSpreadsheetSheets,
  getSpreadsheetRange,
  columnIndexToLetter,
} from "./spreadsheet.js";

/** 统一的表格记录：字段名 -> 文本值 */
export type SheetRecord = Record<string, string>;

export interface ReadSheetResult {
  /** 文档类型: smartsheet | sheet */
  docType: string;
  fileId: string;
  sheetId: string;
  sheetTitle?: string;
  /** 表头字段名（在线表格取第一行；智能表为各记录字段并集） */
  headers: string[];
  records: SheetRecord[];
  totalInSheet: number;
  returnedCount: number;
}

/**
 * 自动识别文档类型并读取表格记录。
 * @param sheetId  可选，指定子表；不传则取第一个子表
 * @param maxRecords 最多返回的记录数
 */
export async function readSheetRecords(
  rawIdOrEncoded: string,
  creds: TencentDocsCredentials,
  options: { sheetId?: string; maxRecords?: number } = {},
): Promise<ReadSheetResult> {
  const { sheetId, maxRecords = 500 } = options;
  const fileId = await resolveFileId(rawIdOrEncoded, creds);
  const meta = await getFileMetadata(fileId, creds);

  if (meta.type === "smartsheet") {
    return readSmartsheetRecords(fileId, creds, sheetId, maxRecords);
  }
  if (meta.type === "sheet") {
    return readSpreadsheetRecords(fileId, creds, sheetId, maxRecords);
  }

  throw new Error(
    `文档「${meta.title}」的类型是 "${meta.type}"，不是可读取的表格（仅支持 smartsheet 智能表和 sheet 在线表格）。`,
  );
}

async function readSmartsheetRecords(
  fileId: string,
  creds: TencentDocsCredentials,
  sheetId: string | undefined,
  maxRecords: number,
): Promise<ReadSheetResult> {
  let targetSheetId = sheetId;
  let sheetTitle: string | undefined;
  if (!targetSheetId) {
    const sheets = await getSmartSheets(fileId, creds);
    if (sheets.length === 0) throw new Error("该智能表文档中没有任何子表。");
    const first = sheets.find((s) => s.isVisible) ?? sheets[0];
    targetSheetId = first.sheetID;
    sheetTitle = first.title;
  }

  const { records, total } = await getAllSmartSheetRecords(
    fileId,
    targetSheetId,
    creds,
    maxRecords,
  );

  const flat = records.map((r) => ({
    recordId: r.recordID,
    ...flattenRecordValues(r.values),
  }));

  const headerSet = new Set<string>();
  for (const rec of flat) {
    for (const k of Object.keys(rec)) headerSet.add(k);
  }

  return {
    docType: "smartsheet",
    fileId,
    sheetId: targetSheetId,
    sheetTitle,
    headers: [...headerSet],
    records: flat,
    totalInSheet: total,
    returnedCount: flat.length,
  };
}

async function readSpreadsheetRecords(
  fileId: string,
  creds: TencentDocsCredentials,
  sheetId: string | undefined,
  maxRecords: number,
): Promise<ReadSheetResult> {
  const sheets = await getSpreadsheetSheets(fileId, creds);
  if (sheets.length === 0) throw new Error("该在线表格文档中没有任何子表。");

  const target = sheetId ? sheets.find((s) => s.sheetId === sheetId) : sheets[0];
  if (!target) throw new Error(`未找到子表 sheetId=${sheetId}。`);

  const colCount = Math.min(target.columnCount || 26, 200);
  const maxRowsByCell = Math.floor(10000 / Math.max(colCount, 1));
  const rowCount = Math.min(
    target.rowCount || 1000,
    1000,
    maxRowsByCell,
    maxRecords + 1,
  );
  const endCol = columnIndexToLetter(colCount);
  const range = `A1:${endCol}${rowCount}`;

  const matrix = await getSpreadsheetRange(fileId, target.sheetId, range, creds);

  if (matrix.length === 0) {
    return {
      docType: "sheet",
      fileId,
      sheetId: target.sheetId,
      sheetTitle: target.title,
      headers: [],
      records: [],
      totalInSheet: 0,
      returnedCount: 0,
    };
  }

  const headers = matrix[0].map((h, i) => h || `列${i + 1}`);
  const records = matrix.slice(1).map((row) => {
    const rec: SheetRecord = {};
    headers.forEach((h, i) => {
      rec[h] = row[i] ?? "";
    });
    return rec;
  });

  return {
    docType: "sheet",
    fileId,
    sheetId: target.sheetId,
    sheetTitle: target.title,
    headers,
    records,
    totalInSheet: target.rowCount > 0 ? target.rowCount - 1 : records.length,
    returnedCount: records.length,
  };
}
