import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  getCredentialsFromEnv,
  resolveFileId,
  deleteDocument,
} from "../lib/tencent-docs.js";

/**
 * 删除一个腾讯文档。默认移入回收站（可恢复），可选彻底删除。
 */
export default defineTool({
  description:
    "删除一个腾讯文档（整篇文档）。默认移入回收站（可在腾讯文档回收站恢复）。" +
    "这是高影响操作，调用前必须先与用户确认要删除哪个文档。" +
    "只有用户明确要求时才设置 permanent=true 进行彻底删除。",
  inputSchema: z.object({
    fileId: z.string().describe("文档 fileId 或链接里的 encodedID。"),
    permanent: z
      .boolean()
      .optional()
      .describe("是否彻底删除（true）。默认 false，即移入回收站可恢复。"),
  }),
  async execute({ fileId, permanent }) {
    const creds = getCredentialsFromEnv();
    const realFileId = await resolveFileId(fileId, creds);
    await deleteDocument(realFileId, creds, !permanent);
    return {
      fileId: realFileId,
      deleted: true,
      recoverable: !permanent,
    };
  },
});
