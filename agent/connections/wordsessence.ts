import { defineMcpClientConnection } from "eve/connections";

const WRITE_TOOLS = ["create_excerpt", "update_excerpt", "delete_excerpt"];

export default defineMcpClientConnection({
  url:
    process.env.WORDSESSENCE_MCP_URL ??
    "http://127.0.0.1:3002/",
  description:
    "WordsEssence 书摘服务：查询、读取、新增、更新和软删除书摘。适用于管理书摘、作者、书名、标题和文字片段。",
  tools: {
    allow: [
      "list_excerpts",
      "get_excerpt",
      "create_excerpt",
      "update_excerpt",
      "delete_excerpt",
    ],
  },
  approval: ({ toolName }) =>
    WRITE_TOOLS.some((name) => toolName.endsWith(`__${name}`))
      ? "user-approval"
      : "not-applicable",
});
