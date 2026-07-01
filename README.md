# MCP Hub

<p align="center">
  <img src="web/public/logo.svg" alt="MCP Hub Logo" width="120" height="120">
</p>

一个域名托管多个 [MCP](https://modelcontextprotocol.io) 服务，让 AI Agent 通过 HTTP + Header 鉴权直接调用。无需本地安装，已部署服务即连即用。

目前已接入 **Tencent Docs MCP**（腾讯文档智能表/在线表格读写），更多服务持续接入中。

🌐 [mcp.iceywu.cn](https://mcp.iceywu.cn)

---

## 项目结构

仓库含三部分，共享同一套腾讯文档 API 客户端（`agent/lib/tencent-docs/`）：

| 部分 | 形态 | 用途 |
| --- | --- | --- |
| **MCP server** | MCP 服务器（HTTP + stdio） | 编码 AI 直接读写腾讯文档 → [详情](./mcp-servers/tencent-docs/README.md) |
| **eve agent** | 对话式 agent（[eve](https://eve.dev) + DeepSeek） | 聊天界面浏览、统计表格 |
| **web** | [Astro](https://astro.build) 静态站点（中英双语） | 项目主页 |

```
agent/              # eve agent 入口、工具、技能
├── agent.ts
├── instructions.md
├── tools/          # 读写表格、文档管理
├── skills/
└── lib/tencent-docs/  # 腾讯文档 API 客户端（共享核心）
mcp-servers/tencent-docs/  # MCP 服务器（独立包 tencent-docs-mcp）
web/                         # 项目主页
deploy/                      # nginx + supervisord 配置
Dockerfile                   # 单容器构建（MCP server + web）
```

## 快速开始

```bash
pnpm install
pnpm dev           # 本地 eve agent
pnpm dev:web       # 本地主页 http://localhost:4321
pnpm build:mcp     # 编译 MCP server
pnpm build:web     # 构建 web 站点
pnpm typecheck
```

## 凭证

从[腾讯文档开放平台](https://docs.qq.com/open)获取，写入 `.env.local`（已 `.gitignore`）：

```ini
TENCENT_DOCS_CLIENT_ID=...
TENCENT_DOCS_ACCESS_TOKEN=...
TENCENT_DOCS_OPEN_ID=...
DEEPSEEK_API_KEY=...          # 仅 eve agent 需要
```

具体使用方式见 [MCP Server 文档](./mcp-servers/tencent-docs/README.md)。

## 部署

- **MCP server + web**：`Dockerfile` 构建单容器镜像（nginx 反代 MCP HTTP 服务 + 托管静态站点），部署到任意容器平台即可
- **eve agent**：`eve build` 部署到 Vercel

## 发布（MCP 包）

用 [changesets](https://github.com/changesets/changesets) 管理 `tencent-docs-mcp` 版本：

```bash
pnpm changeset
pnpm changeset:version
pnpm release
```

## License

MIT