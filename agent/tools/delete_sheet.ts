import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  getCredentialsFromEnv,
  resolveFileId,
  deleteSmartSheet,
} from "../lib/tencent-docs.js";

/**
 * 删除智能表文档中的某个子表。不可逆，调用前应与用户确认。
 */
export default defineTool({
  description:
    "删除腾讯文档智能表（smartsheet）文档中的某个子表（标签页）。" +
    "这是不可逆操作，会连同该子表的全部字段和记录一起删除，调用前应先与用户确认。",
  inputSchema: z.object({
    fileId: z.string().describe("文档 fileId 或链接里的 encodedID。"),
    sheetId: z.string().describe("要删除的子表 ID。"),
  }),
  async execute({ fileId, sheetId }) {
    const creds = getCredentialsFromEnv();
    const realFileId = await resolveFileId(fileId, creds);
    await deleteSmartSheet(realFileId, sheetId, creds);
    return { fileId: realFileId, sheetId, deleted: true };
  },
});
