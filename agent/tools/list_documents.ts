import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  filterDocuments,
  getCredentialsFromEnv,
  listDocuments,
} from "../lib/tencent-docs.js";

/**
 * 列出用户腾讯文档里的文档。
 *
 * scope 决定范围:
 *  - "participated"（默认）: 我参与/最近访问的文档，包含他人创建、我协作的（listType=recent）
 *  - "owned": 「我的文档」目录里我自己创建的文件
 *  - "pinned": 置顶的文档
 */
export default defineTool({
  description:
    "列出用户腾讯文档中的文档，用来发现可读的表格、或找到某个表格的 fileId。" +
    "默认列出「我参与的」文档（含他人创建、我协作的，按最近访问排序），" +
    "这通常是用户真正想找的项目/协作表所在。" +
    "返回每项的 fileId、标题、类型（sheet/smartsheet/doc 等）、是否本人拥有、是否协作、链接。",
  inputSchema: z.object({
    scope: z
      .enum(["participated", "owned", "pinned"])
      .optional()
      .describe(
        "范围：participated=我参与的(默认,含他人文档)；owned=我自己的文档；pinned=置顶。",
      ),
    keyword: z
      .string()
      .optional()
      .describe("可选：按标题关键字过滤返回结果（本地过滤，不区分大小写）。"),
    start: z.number().int().min(0).optional().describe("分页起始，默认 0。"),
    limit: z
      .number()
      .int()
      .positive()
      .max(20)
      .optional()
      .describe("每页条目数，上限 20，默认 20。"),
  }),
  async execute({ scope = "participated", keyword, start, limit }) {
    const creds = getCredentialsFromEnv();

    let items;
    let next;

    if (scope === "owned") {
      const r = await listDocuments(creds, { start, limit });
      items = r.items;
      next = r.next;
    } else {
      const r = await filterDocuments(creds, {
        listType: scope === "pinned" ? "pin" : "recent",
        start,
        limit,
      });
      items = r.items;
      next = r.next;
    }

    let mapped = items.map((it) => ({
      fileId: it.ID,
      title: it.title,
      type: it.type,
      isOwner: it.isOwner,
      isCollaborated: it.isCollaborated,
      url: it.url,
    }));

    if (keyword) {
      const kw = keyword.toLowerCase();
      mapped = mapped.filter((it) => it.title.toLowerCase().includes(kw));
    }

    return {
      scope,
      count: mapped.length,
      next,
      hasMore: next > 0 && next > (start ?? 0),
      items: mapped,
    };
  },
});
