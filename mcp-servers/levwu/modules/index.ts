/**
 * 模块注册表 —— levwu 聚合 MCP 的模块入口。
 *
 * 每接入一个新的后端接口，只需：
 *   1. 在 modules/ 下新建一个模块文件，导出 `registerXxxModule(server)`；
 *   2. 在这里 import 并调用一行。
 * 框架代码（index.ts / lib/）无需改动。
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAiModule } from "./ai.js";

export function registerModules(server: McpServer): void {
  registerAiModule(server);
}
