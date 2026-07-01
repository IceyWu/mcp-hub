import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  getCredentialsFromEnv,
  resolveFileId,
  resolveSheetId,
  getSmartSheetFields,
  updateSmartSheetRecords,
  encodeRecordValues,
} from "../lib/tencent-docs.js";
import { cellValue } from "../lib/schemas.js";

/**
 * 更新智能表中已存在的记录。需要每行的 recordID（可先用 read_sheet 读取获取）。
 */
export default defineTool({
  description:
    "更新腾讯文档智能表（smartsheet）中已存在的记录。" +
    "需要提供每行的 recordID 和要修改的「字段名 -> 新值」。" +
    "recordID 可以先用 read_sheet 工具读取得到（每条记录都带 recordId）。" +
    "只会更新传入的字段，未传的字段保持不变。" +
    "当用户想修改某条记录（如把某个 Bug 状态改成已解决）时使用。",
  inputSchema: z.object({
    fileId: z.string().describe("文档 fileId 或链接里的 encodedID。"),
    sheetId: z.string().optional().describe("子表 ID。不传则使用第一个子表。"),
    rows: z
      .array(
        z.object({
          recordId: z.string().describe("要更新的记录 ID。"),
          values: z
            .record(z.string(), cellValue)
            .describe("要更新的「字段名 -> 新值」。"),
        }),
      )
      .min(1)
      .describe("要更新的记录数组。"),
  }),
  async execute({ fileId, sheetId, rows }) {
    const creds = getCredentialsFromEnv();
    const realFileId = await resolveFileId(fileId, creds);
    const targetSheetId = await resolveSheetId(realFileId, creds, sheetId);

    const fields = await getSmartSheetFields(realFileId, targetSheetId, creds);
    const encoded = rows.map((r) => ({
      recordID: r.recordId,
      values: encodeRecordValues(r.values, fields),
    }));
    const updatedIds = await updateSmartSheetRecords(realFileId, targetSheetId, creds, encoded);

    return {
      fileId: realFileId,
      sheetId: targetSheetId,
      updatedCount: updatedIds.length,
      recordIds: updatedIds,
    };
  },
});
