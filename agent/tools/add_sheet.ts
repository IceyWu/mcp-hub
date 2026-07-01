import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  getCredentialsFromEnv,
  resolveFileId,
  addSmartSheet,
} from "../lib/tencent-docs.js";

/**
 * 在已有智能表文档中新增一个子表（标签页）。新子表为空，无字段/记录。
 */
export default defineTool({
  description:
    "在已有的腾讯文档智能表（smartsheet）文档中新增一个子表（标签页）。" +
    "新子表初始为空，可随后用字段/记录工具填充。" +
    "当用户想在同一个文档里再加一张表时使用。",
  inputSchema: z.object({
    fileId: z.string().describe("文档 fileId 或链接里的 encodedID。"),
    title: z.string().min(1).describe("新子表的名称。"),
    index: z.number().int().min(0).optional().describe("可选：插入位置（从 0 开始）。"),
  }),
  async execute({ fileId, title, index }) {
    const creds = getCredentialsFromEnv();
    const realFileId = await resolveFileId(fileId, creds);
    const sheet = await addSmartSheet(realFileId, creds, { title, index });
    return { fileId: realFileId, ...sheet };
  },
});
