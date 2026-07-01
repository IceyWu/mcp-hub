import { defineTool } from "eve/tools";
import { z } from "zod";
import { getCredentialsFromEnv, createFolder } from "../lib/tencent-docs.js";

/**
 * 新建一个文件夹，可用于归类存放文档。返回的 folderId 可传给建表/建文档工具。
 */
export default defineTool({
  description:
    "在腾讯文档中新建一个文件夹，用于归类存放文档。" +
    "返回的 folderId 可以传给 create_bug_sheet 等建表工具，把新表创建到该文件夹下。" +
    "当用户想新建文件夹、或想把一批表格放到一个专门目录时使用。",
  inputSchema: z.object({
    title: z.string().min(1).describe("文件夹名称。"),
    parentFolderId: z
      .string()
      .optional()
      .describe("可选：父文件夹 ID。不传则建在根目录「我的文档」下。"),
  }),
  async execute({ title, parentFolderId }) {
    const creds = getCredentialsFromEnv();
    const result = await createFolder(creds, { title, parentFolderId });
    return result;
  },
});
