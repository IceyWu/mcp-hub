import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  getCredentialsFromEnv,
  resolveFileId,
  resolveSheetId,
  getSmartSheetFields,
  addSmartSheetRecords,
  encodeRecordValues,
} from "../lib/tencent-docs.js";
import { cellValue } from "../lib/schemas.js";

/**
 * 向智能表子表新增一行或多行记录。
 * 调用方只需传「字段名 -> 简单值」，工具会先查字段类型再按类型编码
 * （文本/数字/单选/日期等），免去手工构造复杂结构。
 */
export default defineTool({
  description:
    "向腾讯文档智能表（smartsheet）中新增一行或多行记录。" +
    "每行用「字段名 -> 值」表示，例如 {\"Bug标题\":\"登录崩溃\",\"状态\":\"待处理\",\"优先级\":\"P0\"}。" +
    "工具会自动按字段类型编码（文本、数字、单选/多选、日期等）。" +
    "单选/多选传选项文本即可；日期可传时间戳毫秒或可被 Date 解析的字符串。" +
    "当用户想录入/登记数据（如新增一个 Bug、一条任务）时使用。",
  inputSchema: z.object({
    fileId: z.string().describe("文档 fileId 或链接里的 encodedID。"),
    sheetId: z.string().optional().describe("子表 ID。不传则使用第一个子表。"),
    rows: z
      .array(z.record(z.string(), cellValue))
      .min(1)
      .describe("要新增的记录数组，每个元素是「字段名 -> 值」对象。"),
  }),
  async execute({ fileId, sheetId, rows }) {
    const creds = getCredentialsFromEnv();
    const realFileId = await resolveFileId(fileId, creds);
    const targetSheetId = await resolveSheetId(realFileId, creds, sheetId);

    const fields = await getSmartSheetFields(realFileId, targetSheetId, creds);
    const encodedRows = rows.map((r) => encodeRecordValues(r, fields));
    const recordIds = await addSmartSheetRecords(realFileId, targetSheetId, creds, encodedRows);

    return {
      fileId: realFileId,
      sheetId: targetSheetId,
      addedCount: recordIds.length,
      recordIds,
    };
  },
});
