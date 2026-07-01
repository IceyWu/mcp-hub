import { defineTool } from "eve/tools";
import { z } from "zod";
import { getCredentialsFromEnv, readSheetRecords } from "../lib/tencent-docs.js";

/**
 * 实时读取腾讯文档表格中的记录，自动适配文档类型：
 *  - 智能表 (smartsheet): 走 smartbook 记录接口
 *  - 在线表格 (sheet): 走 spreadsheet 范围接口，第一行作为表头
 */
export default defineTool({
  description:
    "实时读取腾讯文档表格中的记录，返回结构化数据。" +
    "自动识别文档类型（智能表 smartsheet 或 在线表格 sheet）并用对应接口读取，" +
    "两种表格都支持。当用户想查看、统计、分析或筛选表格内容时使用，" +
    "适用于任意表格场景（如 Bug 列表、任务清单、名单、库存等）。" +
    "每条记录包含其字段（列名 -> 值）。",
  inputSchema: z.object({
    fileId: z
      .string()
      .describe("文档 fileId 或链接里的 encodedID。"),
    sheetId: z
      .string()
      .optional()
      .describe("子表 ID。不传则自动使用第一个子表。"),
    maxRecords: z
      .number()
      .int()
      .positive()
      .max(1000)
      .optional()
      .describe("最多读取的记录数，默认 500。"),
  }),
  async execute({ fileId, sheetId, maxRecords }) {
    const creds = getCredentialsFromEnv();

    const result = await readSheetRecords(fileId, creds, {
      sheetId,
      maxRecords: maxRecords ?? 500,
    });

    return {
      docType: result.docType,
      fileId: result.fileId,
      sheetId: result.sheetId,
      sheetTitle: result.sheetTitle,
      headers: result.headers,
      totalInSheet: result.totalInSheet,
      returnedCount: result.returnedCount,
      records: result.records,
    };
  },
});
