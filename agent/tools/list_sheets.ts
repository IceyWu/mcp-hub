import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  getCredentialsFromEnv,
  getFileMetadata,
  getSmartSheets,
  getSpreadsheetSheets,
  resolveFileId,
} from "../lib/tencent-docs.js";

/**
 * 列出一个表格文档里的所有子表，自动适配类型：
 *  - 智能表 (smartsheet)
 *  - 在线表格 (sheet)
 */
export default defineTool({
  description:
    "列出指定腾讯表格文档中的所有子表，返回每个子表的 sheetId 和标题。" +
    "自动识别文档类型（智能表或在线表格）。" +
    "当用户没有指定具体子表，或需要先了解文档结构时使用。",
  inputSchema: z.object({
    fileId: z
      .string()
      .describe("文档 fileId 或链接里的 encodedID。"),
  }),
  async execute({ fileId }) {
    const creds = getCredentialsFromEnv();

    const resolvedFileId = await resolveFileId(fileId, creds);
    const meta = await getFileMetadata(resolvedFileId, creds);

    if (meta.type === "smartsheet") {
      const sheets = await getSmartSheets(resolvedFileId, creds);
      return {
        docType: "smartsheet",
        fileId: resolvedFileId,
        title: meta.title,
        sheetCount: sheets.length,
        sheets: sheets.map((s) => ({
          sheetId: s.sheetID,
          title: s.title,
          isVisible: s.isVisible,
        })),
      };
    }

    if (meta.type === "sheet") {
      const sheets = await getSpreadsheetSheets(resolvedFileId, creds);
      return {
        docType: "sheet",
        fileId: resolvedFileId,
        title: meta.title,
        sheetCount: sheets.length,
        sheets: sheets.map((s) => ({
          sheetId: s.sheetId,
          title: s.title,
          rowCount: s.rowCount,
          columnCount: s.columnCount,
        })),
      };
    }

    throw new Error(
      `文档「${meta.title}」的类型是 "${meta.type}"，不是表格（仅支持 smartsheet 和 sheet）。`,
    );
  },
});
