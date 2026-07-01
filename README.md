# MCP Hub

以腾讯文档（智能表 / 在线表格）为数据后端的 MCP 工具集。仓库含三部分，共享同一套腾讯文档 API 客户端：

| 部分 | 形态 | 用途 |
| --- | --- | --- |
| **MCP server** | [MCP](https://modelcontextprotocol.io) 服务器（HTTP + stdio 双模式） | 让编辑器里的编码 AI 直接读写腾讯文档 |
| **eve agent** | 部署到 Vercel 的对话式 agent（[eve](https://eve.dev)） | 聊天界面里浏览、读取表格，做统计与分析 |
| **web** | [Astro](https://astro.build) 静态站点 | 项目主页，展示 MCP 配置与工具清单 |

核心逻辑集中在 `agent/lib/tencent-docs/`（腾讯文档开放平台 API 客户端），三部分复用，只维护一处。

## 目录结构

```text
agent/
├── agent.ts            # agent 入口（DeepSeek V4 Pro）
├── instructions.md     # 系统提示词
├── channels/           # 接入渠道（eve）
├── tools/              # agent 工具（读写表格、文档管理）
├── skills/             # 技能（bug-analysis）
└── lib/
    ├── schemas.ts      # 共享 zod schema
    └── tencent-docs/   # 腾讯文档 API 客户端（共享核心）
mcp-servers/
└── tencent-docs/       # MCP 服务器（独立包 tencent-docs-mcp）
web/                    # Astro 主页（中英双语）
docs/                   # 部署文档
```

## 快速开始

```bash
pnpm install       # 安装依赖（pnpm workspace）
pnpm dev           # 本地启动 eve agent
pnpm dev:web       # 本地启动 web 主页（http://localhost:4322）
pnpm build         # 构建 eve agent
pnpm build:mcp     # 编译 MCP server
pnpm build:web     # 构建 web 站点
pnpm typecheck     # 类型检查
```

## 凭证

从 [docs.qq.com/open](https://docs.qq.com/open) 开发者后台获取，写入项目根 `.env.local`：

```ini
TENCENT_DOCS_CLIENT_ID=...
TENCENT_DOCS_ACCESS_TOKEN=...
TENCENT_DOCS_OPEN_ID=...
DEEPSEEK_API_KEY=...        # 仅 eve agent 需要
```

`.env.local` 已在 `.gitignore` 中，切勿提交凭证。

## MCP Server

### 连接方式

推荐通过 HTTP + Header 鉴权连接已部署的远程服务，无需本地安装。在 MCP 客户端配置中添加：

```json
{
  "mcpServers": {
    "tencent-docs": {
      "url": "https://mcp.iceywu.cn/tencent-docs/",
      "headers": {
        "x-tencent-client-id": "<your-client-id>",
        "x-tencent-access-token": "<your-access-token>",
        "x-tencent-open-id": "<your-open-id>"
      }
    }
  }
}
```

### 工具清单

| 工具 | 说明 |
| --- | --- |
| `list_documents` | 列出腾讯文档，查找表格 fileId |
| `read_records` | 读取记录，返回结构化数据（自动识别智能表/在线表格） |
| `read_attachment` | 读取记录附件中的图片（自动处理防盗链） |
| `add_records` | 向智能表新增记录 |
| `update_records` | 按 recordId 更新已有记录 |
| `create_bug_sheet` | 新建带标准 Bug 字段的在线智能表 |

### 本地运行

编译后以 stdio 模式本地运行（凭证走环境变量）：

```bash
pnpm build:mcp
node mcp-servers/tencent-docs/dist/mcp-servers/tencent-docs/index.js
```

远程服务部署详见 [`docs/cloudflare-tunnel-setup.md`](./docs/cloudflare-tunnel-setup.md)。

## Web 主页

基于 Astro 的静态站点，默认中文，支持英文 `/en/`。开发：

```bash
pnpm dev:web
```

## 发布

用 [changesets](https://github.com/changesets/changesets) 管理 MCP 包版本：

```bash
pnpm changeset          # 记录变更
pnpm changeset:version  # bump 版本 + 更新 CHANGELOG
pnpm release            # 编译 + 发布到 npm
```

## License

MIT
