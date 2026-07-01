import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  getCredentialsFromEnv,
  resolveFileId,
  renameDocument,
} from "../lib/tencent-docs.js";

/**
 * 重命名一个腾讯文档（改文档标题）。
 */
export default defineTool({
  description:
    "重命名一个腾讯文档（修改文档标题）。适用于任意类型的文档（智能表、在线表格等）。" +
    "当用户想给某个文档改名时使用。标题长度不超过 36 字符。",
  inputSchema: z.object({
    fileId: z.string().describe("文档 fileId 或链接里的 encodedID。"),
    title: z.string().min(1).max(36).describe("新的文档标题（不超过 36 字符）。"),
  }),
  async execute({ fileId, title }) {
    const creds = getCredentialsFromEnv();
    const realFileId = await resolveFileId(fileId, creds);
    await renameDocument(realFileId, creds, title);
    return { fileId: realFileId, title, renamed: true };
  },
});
