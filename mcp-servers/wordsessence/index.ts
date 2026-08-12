#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { z } from "zod";
import { apiRequest } from "./client.js";

type PageResult<T> = {
  list: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

type Essay = {
  id: number;
  author?: string;
  book_name?: string;
  content: string;
  title?: string;
  created_at?: string;
  updated_at?: string;
};

const paginationSchema = {
  page: z.number().int().positive().optional().describe("页码，默认 1"),
  page_size: z.number().int().positive().max(100).optional().describe("每页数量，最大 100"),
  sort: z.string().optional().describe("排序字段和方向，例如 id,desc"),
};

const essayCreateSchema = {
  content: z.string().min(1).describe("书摘正文，必填"),
  author: z.string().max(100).optional().describe("作者"),
  book_name: z.string().max(200).optional().describe("书名"),
  title: z.string().max(200).optional().describe("标题"),
};

const essayUpdateSchema = {
  content: z.string().min(1).optional(),
  author: z.string().min(1).max(100).optional(),
  book_name: z.string().max(200).optional(),
  title: z.string().min(1).max(200).optional(),
};

function result(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function createServer(): McpServer {
  const server = new McpServer({ name: "wordsessence", version: "0.1.0" });

  server.registerTool("list_excerpts", {
    title: "查询书摘列表",
    description: "分页查询 WordsEssence 中的书摘，可指定排序。只读操作。",
    inputSchema: paginationSchema,
  }, async (input) => result(await apiRequest<PageResult<Essay>>("/api/v1/essays", { query: input })));

  server.registerTool("get_excerpt", {
    title: "查询单条书摘",
    description: "按 ID 查询一条 WordsEssence 书摘。只读操作。",
    inputSchema: { id: z.number().int().positive() },
  }, async ({ id }) => result(await apiRequest<Essay>(`/api/v1/essays/${id}`)));

  server.registerTool("create_excerpt", {
    title: "新增书摘",
    description: "向 WordsEssence 新增一条书摘。这是写操作，调用前应确认正文及可选的作者、书名和标题。",
    inputSchema: essayCreateSchema,
  }, async (input) => result(await apiRequest<Essay>("/api/v1/essays", { method: "POST", body: input })));

  server.registerTool("update_excerpt", {
    title: "更新书摘",
    description: "按 ID 更新书摘的指定字段。这是写操作，未提供的字段保持不变。",
    inputSchema: { id: z.number().int().positive(), ...essayUpdateSchema },
  }, async ({ id, ...body }) => {
    if (Object.keys(body).length === 0) throw new Error("至少提供一个要更新的书摘字段");
    return result(await apiRequest<Essay>(`/api/v1/essays/${id}`, { method: "PUT", body }));
  });

  server.registerTool("delete_excerpt", {
    title: "删除书摘",
    description: "按 ID 软删除书摘。这是删除操作，调用前必须向用户确认目标 ID。",
    inputSchema: { id: z.number().int().positive() },
  }, async ({ id }) => {
    await apiRequest(`/api/v1/essays/${id}`, { method: "DELETE" });
    return result({ deleted: true, id });
  });

  return server;
}

async function startHttp(port: number): Promise<void> {
  const allowedHosts = ["127.0.0.1", "localhost", "mcp.iceywu.cn", ...(process.env.MCP_ALLOWED_HOSTS ?? "").split(",")]
    .map((host) => host.trim()).filter(Boolean);
  const app = createMcpExpressApp({ host: "127.0.0.1", allowedHosts: [...new Set(allowedHosts)] });

  app.post("/", async (req: any, res: any) => {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("MCP request failed:", error);
      if (!res.headersSent) res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
    }
  });
  app.get("/", (_req: any, res: any) => res.status(405).end());
  app.delete("/", (_req: any, res: any) => res.status(405).end());
  app.listen(port, "127.0.0.1", () => console.error(`WordsEssence MCP listening on http://127.0.0.1:${port}/`));
}

async function main(): Promise<void> {
  if (process.argv.includes("--http") || process.env.MCP_TRANSPORT === "http") {
    await startHttp(Number.parseInt(process.env.PORT ?? "3002", 10));
    return;
  }
  await createServer().connect(new StdioServerTransport());
}

main().catch((error) => {
  console.error("WordsEssence MCP failed to start:", error);
  process.exit(1);
});
