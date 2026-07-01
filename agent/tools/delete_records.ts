import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  getCredentialsFromEnv,
  resolveFileId,
  getSmartSheets,
  deleteSmartSheetRecords,
} from "../lib/tencent-docs.js";

/**
 * 删除智能表中的一行或多行记录。需要 recordID（可先用 read_sheet 获取）。
 */
export default defineTool({
  description:
    "删除腾讯文档智能表（smartsheet）中的一行或多行记录。" +
    "需要提供 recordID 列表（可先用 read_sheet 工具读取得到）。" +
    "这是不可逆的删除操作，调用前应先与用户确认要删除哪些记录。",
  inputSchema: z.object({
    fileId: z.string().describe("文档 fileId 或链接里的 encodedID。"),
    sheetId: z.string().optional().describe("子表 ID。不传则使用第一个子表。"),
    recordIds: z.array(z.string()).min(1).describe("要删除的记录 ID 列表。"),
  }),
  async execute({ fileId, sheetId, recordIds }) {
    const creds = getCredentialsFromEnv();
    const realFileId = await resolveFileId(fileId, creds);

    let targetSheetId = sheetId;
    if (!targetSheetId) {
      const sheets = await getSmartSheets(realFileId, creds);
      if (sheets.length === 0) throw new Error("该文档没有可用子表。");
      targetSheetId = (sheets.find((s) => s.isVisible) ?? sheets[0]).sheetID;
    }

    await deleteSmartSheetRecords(realFileId, targetSheetId, creds, recordIds);

    return {
      fileId: realFileId,
      sheetId: targetSheetId,
      deletedCount: recordIds.length,
      recordIds,
    };
  },
});
