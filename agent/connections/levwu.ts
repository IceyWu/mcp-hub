import { defineMcpClientConnection } from "eve/connections";

const WRITE_TOOLS = ["ai_submit_task"];

export default defineMcpClientConnection({
  url: process.env.LEVWU_MCP_URL ?? "http://127.0.0.1:3003/",
  description:
    "levwu 个人 API 聚合入口：统一 AI 任务服务，支持 OCR 文字识别、AI 图片编辑（gpt-image-2）和天气查询。工具名以 ai_ 前缀标识。",
  tools: {
    allow: ["ai_submit_task", "ai_get_task", "ai_query_weather"],
  },
  approval: ({ toolName }) =>
    WRITE_TOOLS.some((name) => toolName.endsWith(`__${name}`))
      ? "user-approval"
      : "not-applicable",
});
