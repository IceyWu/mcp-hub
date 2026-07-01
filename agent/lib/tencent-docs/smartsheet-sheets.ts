/**
 * 智能表 —— 子表（sheet）接口
 * 路径前缀 /openapi/smartbook/v2/
 * 文档: https://docs.qq.com/open/document/app/openapi/v2/smartsheet/sheet/
 */
import { callApi, type TencentDocsCredentials } from "./client.js";

/** 智能表子表元数据 */
export interface SmartSheetMeta {
  sheetID: string;
  title: string;
  type: string;
  isVisible: boolean;
}

/**
 * 查询智能表的所有子表。
 * GET /openapi/smartbook/v2/files/{fileID}/sheets
 */
export async function getSmartSheets(
  fileId: string,
  creds: TencentDocsCredentials,
): Promise<SmartSheetMeta[]> {
  const data = await callApi<{ getSheet?: SmartSheetMeta[] }>(
    creds,
    "GET",
    `/openapi/smartbook/v2/files/${encodeURIComponent(fileId)}/sheets`,
    { action: "查询智能表子表" },
  );
  return data?.getSheet ?? [];
}

/**
 * 解析目标子表 ID：传入 sheetId 则直接返回（不发请求）；
 * 否则查询子表列表并选取第一个可见子表（无可见则取第一个）。
 * 供读写记录/字段等需要「默认子表」的场景复用。
 */
export async function resolveSheetId(
  fileId: string,
  creds: TencentDocsCredentials,
  sheetId?: string,
): Promise<string> {
  if (sheetId) return sheetId;
  const sheets = await getSmartSheets(fileId, creds);
  if (sheets.length === 0) throw new Error("该文档没有可用子表。");
  return (sheets.find((s) => s.isVisible) ?? sheets[0]).sheetID;
}

/**
 * 在智能表文档里添加一个子表。
 * POST /openapi/smartbook/v2/files/{fileID}/sheets
 * Body: { addSheet: { properties: { title, index? } } }
 */
export async function addSmartSheet(
  fileId: string,
  creds: TencentDocsCredentials,
  options: { title: string; index?: number },
): Promise<{ sheetID: string; title: string; index?: number }> {
  const properties: Record<string, unknown> = { title: options.title };
  if (options.index != null) properties.index = options.index;

  const data = await callApi<{
    addSheet?: { properties?: { sheetID?: string; title?: string; index?: number } };
  }>(creds, "POST", `/openapi/smartbook/v2/files/${encodeURIComponent(fileId)}/sheets`, {
    json: { addSheet: { properties } },
    action: "添加子表",
  });

  const props = data?.addSheet?.properties;
  if (!props?.sheetID) throw new Error("添加子表未返回 sheetID。");
  return { sheetID: props.sheetID, title: props.title ?? options.title, index: props.index };
}

/**
 * 删除智能表中的某个子表。
 * POST /openapi/smartbook/v2/files/{fileID}/sheets
 * Body: { deleteSheet: { sheetID } }
 */
export async function deleteSmartSheet(
  fileId: string,
  sheetId: string,
  creds: TencentDocsCredentials,
): Promise<void> {
  await callApi(creds, "POST", `/openapi/smartbook/v2/files/${encodeURIComponent(fileId)}/sheets`, {
    json: { deleteSheet: { sheetID: sheetId } },
    action: "删除子表",
  });
}
