#!/usr/bin/env node
/**
 * 腾讯文档表格 —— MCP 服务器（stdio / Streamable HTTP 双模式）
 *
 * 把 agent/lib/tencent-docs 里的纯逻辑包成 MCP 工具，供编辑器里的
 * 编码 AI（Kiro / Claude / Cursor 等）直接读写腾讯文档表格（智能表 /
 * 在线表格）。Bug 跟踪只是典型场景之一，同样适用于任务清单、名单、
 * 库存等任意表格。与 eve agent 共用同一套 lib，逻辑零重复。
 *
 * 运行模式：
 *   - stdio（默认）：本地子进程，凭证从环境变量读取
 *   - http：Streamable HTTP 服务，凭证从请求头读取（用于远程部署）
 *     启动方式：node index.js --http  或  MCP_TRANSPORT=http node index.js
 *     端口：PORT 环境变量，默认 3001
 *     Host 白名单：默认放行 127.0.0.1 / localhost / mcp.iceywu.cn；
 *       其它自定义域名用 MCP_ALLOWED_HOSTS 环境变量（逗号分隔）追加
 *
 * 凭证来源（优先级从高到低）：
 *   1. HTTP 请求头：x-tencent-access-token / x-tencent-client-id / x-tencent-open-id
 *   2. 环境变量：TENCENT_DOCS_ACCESS_TOKEN / TENCENT_DOCS_CLIENT_ID / TENCENT_DOCS_OPEN_ID
 *   3. 项目根 .env.local
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { z } from "zod";

// 自动加载项目根的 .env.local，让凭证只维护在一处。
// 编译后本文件位于 mcp-servers/tencent-docs/dist/mcp-servers/tencent-docs/index.js，根目录是上四级。
function loadEnvLocal(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  for (const candidate of [
    resolve(here, "../../../../../../.env.local"), // dist/mcp-servers/tencent-docs -> 项目根
    resolve(here, "../../../../.env.local"),
    resolve(here, "../../../../.env.local"),
    resolve(process.cwd(), ".env.local"),
  ]) {
    try {
      for (const line of readFileSync(candidate, "utf8").split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
        if (m && process.env[m[1]] === undefined)
          process.env[m[1]] = m[2].trim();
      }
      return; // 命中一个就够了
    } catch {
      // 文件不存在则尝试下一个候选
    }
  }
}
loadEnvLocal();

/**
 * 读取本包 package.json 的 version，避免和 server 版本硬编码两处维护。
 * 编译后本文件位于 mcp-server/dist/mcp-server/index.js，package.json 在上两级。
 * 读取失败时回退到 "0.0.0"（不影响协议通信）。
 */
function readPackageVersion(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  for (const candidate of [
    resolve(here, "../../package.json"), // dist/mcp-server -> 包根
    resolve(here, "../package.json"),
    resolve(process.cwd(), "package.json"),
  ]) {
    try {
      const pkg = JSON.parse(readFileSync(candidate, "utf8")) as {
        name?: string;
        version?: string;
      };
      if (pkg.name === "tencent-docs-mcp" && pkg.version) return pkg.version;
    } catch {
      // 文件不存在或解析失败则尝试下一个候选
    }
  }
  return "0.0.0";
}

const SERVER_VERSION = readPackageVersion();

import {
  getCredentialsFromEnv,
  requestCredentials,
  resolveFileId,
  resolveSheetId,
  listDocuments,
  filterDocuments,
  getSmartSheetFields,
  getAllSmartSheetRecords,
  readSheetRecords,
  addSmartSheetRecords,
  updateSmartSheetRecords,
  encodeRecordValues,
  extractAttachments,
  fetchAttachment,
  createBugSmartSheet,
} from "../../agent/lib/tencent-docs.js";
import { cellValue } from "../../agent/lib/schemas.js";

/** 把任意结果包成 MCP 文本内容（JSON 字符串）。 */
function jsonResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

/**
 * 创建并注册全部工具的 MCP server 实例。
 * 每个连接（stdio）或每个 HTTP 请求（无状态模式）都用独立实例，
 * 避免共享同一个 transport 时的会话状态串扰。
 */
function createServer(): McpServer {
  const server = new McpServer({
    name: "tencent-docs",
    version: SERVER_VERSION,
  });

  // ── 工具 1：列出文档（找 fileId）──────────────────────────────
  server.registerTool(
    "list_documents",
    {
      title: "列出腾讯文档",
      description:
        "列出用户腾讯文档中的文档，用来发现可读的表格或找到某个表格的 fileId。" +
        "默认列出「我参与的」文档（含他人创建、我协作的，按最近访问排序）。" +
        "返回每项的 fileId、标题、类型、是否本人拥有、链接。",
      inputSchema: {
        scope: z
          .enum(["participated", "owned", "pinned"])
          .optional()
          .describe(
            "范围：participated=我参与的(默认)；owned=我自己的；pinned=置顶。",
          ),
        keyword: z
          .string()
          .optional()
          .describe("按标题关键字过滤（本地过滤，不区分大小写）。"),
        limit: z
          .number()
          .int()
          .positive()
          .max(20)
          .optional()
          .describe("每页条数，上限 20。"),
      },
    },
    async ({ scope = "participated", keyword, limit }) => {
      const creds = getCredentialsFromEnv();
      const { items, next } =
        scope === "owned"
          ? await listDocuments(creds, { limit })
          : await filterDocuments(creds, {
              listType: scope === "pinned" ? "pin" : "recent",
              limit,
            });

      let mapped = items.map((it) => ({
        fileId: it.ID,
        title: it.title,
        type: it.type,
        isOwner: it.isOwner,
        url: it.url,
      }));
      if (keyword) {
        const kw = keyword.toLowerCase();
        mapped = mapped.filter((it) => it.title.toLowerCase().includes(kw));
      }
      return jsonResult({ scope, count: mapped.length, next, items: mapped });
    },
  );

  // ── 工具 2：读取表格记录（read_records）─────────────────────────
  server.registerTool(
    "read_records",
    {
      title: "读取表格记录",
      description:
        "实时读取腾讯文档表格中的记录，返回结构化数据。自动识别文档类型" +
        "（智能表 smartsheet 或 在线表格 sheet）。每条记录带 recordId，" +
        "更新时需要用到。适用于读取 Bug 列表、任务清单等任意表格。",
      inputSchema: {
        fileId: z.string().describe("文档 fileId 或链接里的 encodedID。"),
        sheetId: z
          .string()
          .optional()
          .describe("子表 ID。不传则用第一个子表。"),
        maxRecords: z
          .number()
          .int()
          .positive()
          .max(1000)
          .optional()
          .describe("最多读取条数，默认 500。"),
      },
    },
    async ({ fileId, sheetId, maxRecords }) => {
      const creds = getCredentialsFromEnv();
      const result = await readSheetRecords(fileId, creds, {
        sheetId,
        maxRecords: maxRecords ?? 500,
      });
      return jsonResult({
        docType: result.docType,
        fileId: result.fileId,
        sheetId: result.sheetId,
        sheetTitle: result.sheetTitle,
        headers: result.headers,
        totalInSheet: result.totalInSheet,
        returnedCount: result.returnedCount,
        records: result.records,
      });
    },
  );

  // ── 工具 3：更新表格记录（update_records）────────────────────────────
  server.registerTool(
    "update_records",
    {
      title: "更新表格记录",
      description:
        "更新腾讯文档智能表中已存在的记录。需提供每行的 recordId（先用 read_records 读取得到）" +
        "和要修改的「字段名 -> 新值」。只更新传入的字段，其余不变。" +
        "例如改完代码后把对应 Bug 标记为已解决，或更新任务状态等。",
      inputSchema: {
        fileId: z.string().describe("文档 fileId 或链接里的 encodedID。"),
        sheetId: z
          .string()
          .optional()
          .describe("子表 ID。不传则用第一个子表。"),
        rows: z
          .array(
            z.object({
              recordId: z.string().describe("要更新的记录 ID。"),
              values: z
                .record(z.string(), cellValue)
                .describe("要更新的「字段名 -> 新值」。"),
            }),
          )
          .min(1)
          .describe("要更新的记录数组。"),
      },
    },
    async ({ fileId, sheetId, rows }) => {
      const creds = getCredentialsFromEnv();
      const realFileId = await resolveFileId(fileId, creds);
      const targetSheetId = await resolveSheetId(realFileId, creds, sheetId);

      const fields = await getSmartSheetFields(
        realFileId,
        targetSheetId,
        creds,
      );
      const encoded = rows.map((r) => ({
        recordID: r.recordId,
        values: encodeRecordValues(r.values, fields),
      }));
      const updatedIds = await updateSmartSheetRecords(
        realFileId,
        targetSheetId,
        creds,
        encoded,
      );
      return jsonResult({
        fileId: realFileId,
        sheetId: targetSheetId,
        updatedCount: updatedIds.length,
        recordIds: updatedIds,
      });
    },
  );

  // ── 工具 4：新增表格记录（add_records）──────────────────────────────
  server.registerTool(
    "add_records",
    {
      title: "新增表格记录",
      description:
        "向腾讯文档智能表新增一行或多行记录。每行用「字段名 -> 值」表示，" +
        '例如 {"Bug标题":"登录崩溃","状态":"待处理","优先级":"P0"}。' +
        "工具会自动按字段类型编码。单选/多选传选项文本；日期传时间戳或可解析字符串。",
      inputSchema: {
        fileId: z.string().describe("文档 fileId 或链接里的 encodedID。"),
        sheetId: z
          .string()
          .optional()
          .describe("子表 ID。不传则用第一个子表。"),
        rows: z
          .array(z.record(z.string(), cellValue))
          .min(1)
          .describe("要新增的记录数组，每个元素是「字段名 -> 值」对象。"),
      },
    },
    async ({ fileId, sheetId, rows }) => {
      const creds = getCredentialsFromEnv();
      const realFileId = await resolveFileId(fileId, creds);
      const targetSheetId = await resolveSheetId(realFileId, creds, sheetId);

      const fields = await getSmartSheetFields(
        realFileId,
        targetSheetId,
        creds,
      );
      const encodedRows = rows.map((r) => encodeRecordValues(r, fields));
      const recordIds = await addSmartSheetRecords(
        realFileId,
        targetSheetId,
        creds,
        encodedRows,
      );
      return jsonResult({
        fileId: realFileId,
        sheetId: targetSheetId,
        addedCount: recordIds.length,
        recordIds,
      });
    },
  );

  // ── 工具 5：新建 Bug 表（create_bug_sheet）──────────────────
  server.registerTool(
    "create_bug_sheet",
    {
      title: "新建 Bug 智能表",
      description:
        "新建一个在线智能表作为 Bug 表，自动写入基础 Bug 字段" +
        "（模块、Bug标题、状态、优先级、严重程度、负责人、附件资料、详细描述、创建时间）。" +
        "返回新表的 fileId、链接、sheetId。这是写操作。",
      inputSchema: {
        title: z.string().describe("新建 Bug 表的标题。"),
        folderId: z.string().optional().describe("可选，目标文件夹 ID。"),
      },
    },
    async ({ title, folderId }) => {
      const creds = getCredentialsFromEnv();
      const result = await createBugSmartSheet(creds, { title, folderId });
      return jsonResult({
        fileId: result.fileId,
        title: result.title,
        url: result.url,
        sheetId: result.sheetId,
        fields: result.fields.map((f) => ({
          fieldTitle: f.fieldTitle,
          fieldType: f.fieldType,
        })),
      });
    },
  );

  // ── 工具 6：读取附件/图片（read_attachment）────────────────
  server.registerTool(
    "read_attachment",
    {
      title: "读取记录附件/图片",
      description:
        "读取某条记录某个附件字段里的图片/附件，并以图片内容返回（供 AI 直接查看）。" +
        "腾讯文档附件 URL 有防盗链，无法直接访问；此工具会带正确的 Referer 下载。" +
        "先用 read_records 拿到 recordId，再用本工具查看该记录的附件资料里的图片。",
      inputSchema: {
        fileId: z.string().describe("文档 fileId 或链接里的 encodedID。"),
        recordId: z.string().describe("记录 ID（来自 read_records）。"),
        fieldTitle: z
          .string()
          .optional()
          .describe("附件字段名，默认「附件资料」。"),
        sheetId: z
          .string()
          .optional()
          .describe("子表 ID。不传则用第一个子表。"),
      },
    },
    async ({ fileId, recordId, fieldTitle = "附件资料", sheetId }) => {
      const creds = getCredentialsFromEnv();
      const realFileId = await resolveFileId(fileId, creds);
      const targetSheetId = await resolveSheetId(realFileId, creds, sheetId);

      const { records } = await getAllSmartSheetRecords(
        realFileId,
        targetSheetId,
        creds,
      );
      const rec = records.find((r) => r.recordID === recordId);
      if (!rec) throw new Error(`未找到记录 ${recordId}。`);

      const attachments = extractAttachments(rec.values, fieldTitle);
      if (attachments.length === 0) {
        return jsonResult({
          recordId,
          fieldTitle,
          message: "该字段没有附件。",
        });
      }

      const content: (
        | { type: "text"; text: string }
        | { type: "image"; data: string; mimeType: string }
      )[] = [
        {
          type: "text",
          text: `记录 ${recordId} 的「${fieldTitle}」共有 ${attachments.length} 个附件：`,
        },
      ];
      for (const att of attachments) {
        try {
          const { base64, mimeType } = await fetchAttachment(att.url);
          if (mimeType.startsWith("image/")) {
            content.push({
              type: "text",
              text: `${att.title}（${att.width ?? "?"}x${att.height ?? "?"}）:`,
            });
            content.push({ type: "image", data: base64, mimeType });
          } else {
            content.push({
              type: "text",
              text: `${att.title}（非图片，${mimeType}）: ${att.url}`,
            });
          }
        } catch (e) {
          content.push({
            type: "text",
            text: `${att.title} 下载失败: ${(e as Error).message}`,
          });
        }
      }
      return { content };
    },
  );

  return server;
}

// ── 启动逻辑 ────────────────────────────────────────────────

/** 从 HTTP 请求头提取凭证（若存在） */
function extractCredentialsFromHeaders(req: any): {
  accessToken?: string;
  clientId?: string;
  openId?: string;
} {
  return {
    accessToken: (req.headers["x-tencent-access-token"] as string) || undefined,
    clientId: (req.headers["x-tencent-client-id"] as string) || undefined,
    openId: (req.headers["x-tencent-open-id"] as string) || undefined,
  };
}

/**
 * 组装 Streamable HTTP 允许的 Host 白名单。
 * 默认放行 127.0.0.1 / localhost 及内置部署域名 mcp.iceywu.cn；
 * 额外域名通过环境变量 MCP_ALLOWED_HOSTS 配置（逗号分隔），便于反代/自定义域名部署。
 */
function resolveAllowedHosts(): string[] {
  const base = ["127.0.0.1", "localhost", "mcp.iceywu.cn"];
  const extra = (process.env.MCP_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  return [...new Set([...base, ...extra])];
}

/** Streamable HTTP 模式：无状态——每个请求独立创建 server + transport */
async function startHttp(port: number) {
  const app = createMcpExpressApp({
    host: "127.0.0.1",
    allowedHosts: resolveAllowedHosts(),
  });

  // 处理单个 MCP 请求：每次都新建无状态 transport 和 server，用完即关。
  // 无状态模式（sessionIdGenerator: undefined）避免「全局单 transport
  // 被首个客户端初始化后，后续 initialize 被拒 Server already initialized」的问题，
  // 也天然兼容 nginx / cloudflare 代理与多实例部署。
  async function handleMcpRequest(req: any, res: any) {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // 无状态
    });
    // 请求结束后清理，避免泄漏
    res.on("close", () => {
      transport.close().catch(() => {});
      server.close().catch(() => {});
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, (req as any).body);
  }

  app.post("/", async (req: any, res: any) => {
    try {
      const creds = extractCredentialsFromHeaders(req);
      if (creds.accessToken || creds.clientId || creds.openId) {
        await requestCredentials.run(
          {
            accessToken: creds.accessToken ?? "",
            clientId: creds.clientId ?? "",
            openId: creds.openId ?? "",
          },
          () => handleMcpRequest(req, res),
        );
      } else {
        await handleMcpRequest(req, res);
      }
    } catch (err) {
      console.error("HTTP request error:", err);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  // 无状态模式下不支持 SSE 长连接（GET）与会话终止（DELETE）。
  const methodNotAllowed = (_req: any, res: any) => {
    res.status(405).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed (stateless mode)." },
      id: null,
    });
  };
  app.get("/", methodNotAllowed);
  app.delete("/", methodNotAllowed);

  app.listen(port, "127.0.0.1", () => {
    console.error(`tencent-docs MCP server 已启动: http://127.0.0.1:${port}/`);
  });
}

/** stdio 模式：本地子进程 */
async function startStdio() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("tencent-docs MCP server 已启动（stdio）。");
}

async function main() {
  const isHttp =
    process.argv.includes("--http") || process.env.MCP_TRANSPORT === "http";

  if (isHttp) {
    const port = parseInt(process.env.PORT ?? "3001", 10);
    await startHttp(port);
  } else {
    await startStdio();
  }
}

main().catch((err) => {
  console.error("MCP server 启动失败:", err);
  process.exit(1);
});
