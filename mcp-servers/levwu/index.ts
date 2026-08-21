#!/usr/bin/env node
/**
 * levwu —— Lev Wu 个人 API 聚合 MCP（stdio / Streamable HTTP 双模式）
 *
 * 聚合入口：以后新增的自有接口都以"模块"形式挂在 modules/ 下，
 * 工具名统一使用 `模块名_操作` 前缀，避免重名、一眼看出归属。
 *
 * 运行模式：
 *   - stdio（默认）：本地子进程
 *   - http：Streamable HTTP 服务（用于远程部署）
 *     启动方式：node index.js --http  或  MCP_TRANSPORT=http node index.js
 *     端口：PORT 环境变量，默认 3003
 *     Host 白名单：默认放行 127.0.0.1 / localhost / mcp.levwu.me；
 *       其它自定义域名用 MCP_ALLOWED_HOSTS 环境变量（逗号分隔）追加
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { hostHeaderValidation } from "@modelcontextprotocol/sdk/server/middleware/hostHeaderValidation.js";
import express from "express";
import { registerModules } from "./modules/index.js";

const SERVER_VERSION = "0.1.0";
// A 20 MiB image expands to about 26.7 MiB as base64. Leave room for the
// JSON-RPC envelope and prompt while keeping the public endpoint bounded.
const DEFAULT_BODY_LIMIT = "32mb";

/** 每个连接（stdio）或每个 HTTP 请求（无状态模式）都用独立实例，避免状态串扰。 */
function createServer(): McpServer {
  const server = new McpServer({ name: "levwu", version: SERVER_VERSION });
  registerModules(server);
  return server;
}

async function startHttp(port: number): Promise<void> {
  const allowedHosts = [
    "127.0.0.1",
    "localhost",
    "mcp.levwu.me",
    ...(process.env.MCP_ALLOWED_HOSTS ?? "").split(","),
  ]
    .map((host) => host.trim())
    .filter(Boolean);
  const app = express();
  app.use(express.json({ limit: process.env.MCP_BODY_LIMIT ?? DEFAULT_BODY_LIMIT }));
  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      if (
        typeof error === "object" &&
        error !== null &&
        "type" in error &&
        error.type === "entity.too.large"
      ) {
        res.status(413).json({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: `Request body exceeds ${process.env.MCP_BODY_LIMIT ?? DEFAULT_BODY_LIMIT} limit`,
          },
          id: null,
        });
        return;
      }
      next(error);
    },
  );
  app.use(hostHeaderValidation([...new Set(allowedHosts)]));

  app.post("/", async (req: any, res: any) => {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("MCP request failed:", error);
      if (!res.headersSent)
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
    }
  });
  app.get("/", (_req: any, res: any) => res.status(405).end());
  app.delete("/", (_req: any, res: any) => res.status(405).end());
  app.listen(port, "127.0.0.1", () =>
    console.error(`levwu MCP listening on http://127.0.0.1:${port}/`),
  );
}

async function main(): Promise<void> {
  if (process.argv.includes("--http") || process.env.MCP_TRANSPORT === "http") {
    await startHttp(Number.parseInt(process.env.PORT ?? "3003", 10));
    return;
  }
  await createServer().connect(new StdioServerTransport());
}

main().catch((error) => {
  console.error("levwu MCP failed to start:", error);
  process.exit(1);
});
