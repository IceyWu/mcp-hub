/**
 * agent 工具与 MCP server 共享的 zod schema 片段。
 *
 * 单独成文件（不放进 tencent-docs/ 纯 API 客户端），避免给 API 客户端引入 zod 依赖，
 * 保持「客户端只做 HTTP、schema 归工具层」的职责边界。
 */
import { z } from "zod";

/**
 * 单元格简单值：字段名 -> 值。
 * 文本 / 数字 / 布尔（复选框）/ 字符串数组（多选）。
 * add_records、update_records、MCP 对应工具共用同一定义。
 */
export const cellValue = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
]);
