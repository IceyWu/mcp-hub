# MCP Hub

<p align="center">
  <img src="web/public/logo.svg" alt="MCP Hub Logo" width="120" height="120">
</p>

一个域名，多个可直接连接的 MCP 服务。无需本地安装，复制配置即可让 AI Agent 调用腾讯文档和 WordsEssence 工具。

🌐 [服务主页](https://mcp.levwu.me) · [WordsEssence 官网](https://wd.levwu.me/) · [MCP 协议](https://modelcontextprotocol.io)

## 已接入服务

| 服务 | 地址 | 能力 | 鉴权 |
| --- | --- | --- | --- |
| [Tencent Docs MCP](./mcp-servers/tencent-docs/README.md) | `https://mcp.levwu.me/tencent-docs/` | 腾讯文档列表、记录读写、附件读取和 Bug 表创建 | Header 凭证 |
| [WordsEssence MCP](./mcp-servers/wordsessence/README.md) | `https://mcp.levwu.me/wordsessence/` | 书摘查询、新增、更新和软删除 | 当前可直接连接 |

## 远程连接

在支持 Streamable HTTP 的 MCP 客户端中添加：

```json
{
  "mcpServers": {
    "tencent-docs": {
      "type": "http",
      "url": "https://mcp.levwu.me/tencent-docs/",
      "headers": {
        "x-tencent-client-id": "<your-id>",
        "x-tencent-access-token": "<your-token>",
        "x-tencent-open-id": "<your-open-id>"
      }
    },
    "wordsessence": {
      "type": "http",
      "url": "https://mcp.levwu.me/wordsessence/"
    }
  }
}
```

Tencent Docs 的凭证从[腾讯文档开放平台](https://docs.qq.com/open)获取。WordsEssence 包含写入工具，建议在客户端为新增、更新和删除操作启用人工确认。

## 本地开发

环境要求：Node.js 24、pnpm。

```bash
pnpm install
```

各部分需要分别启动：

| 命令 | 启动内容 |
| --- | --- |
| `pnpm dev` | eve Agent 界面 |
| `pnpm dev:wordsessence` | WordsEssence MCP，默认监听 `http://127.0.0.1:3002/` |
| `pnpm dev:web` | Astro 文档站，默认监听 `http://localhost:4321/` |
| `pnpm build:mcp` | 构建全部 MCP 服务 |
| `pnpm build:web` | 构建静态文档站 |
| `pnpm typecheck` | TypeScript 类型检查 |

本地环境变量写入 `.env.local`，该文件已被 Git 忽略：

```ini
DEEPSEEK_API_KEY=...                 # 仅 eve Agent 需要
WORDSESSENCE_MCP_URL=http://127.0.0.1:3002/
WD_API_BASE_URL=http://127.0.0.1:6002/service
```

本地同时体验 eve 和 WordsEssence 时，先运行 `pnpm dev:wordsessence`，再打开另一个终端运行 `pnpm dev`。

## 项目结构

```text
agent/                       # eve Agent 入口、工具和 MCP 连接
├── connections/
├── lib/tencent-docs/        # 与 Tencent Docs MCP 共享的 API 客户端
├── skills/
└── tools/
mcp-servers/
├── tencent-docs/            # Tencent Docs MCP（HTTP + stdio）
└── wordsessence/            # WordsEssence MCP（HTTP + stdio）
web/                         # Astro 中英文静态站点
deploy/                      # nginx 与 supervisord 配置
Dockerfile                   # MCP 服务与静态站点的单容器构建
```

## 部署

根目录 `Dockerfile` 会完成以下工作：

1. 安装锁定依赖并构建两个 MCP 服务和静态站点。
2. 由 Supervisor 运行 Tencent Docs MCP、WordsEssence MCP 和 nginx。
3. 通过 nginx 将 `/tencent-docs/`、`/wordsessence/` 和静态页面统一暴露在 80 端口。

因此可以直接部署到 Coolify 等支持 Dockerfile 的容器平台。

## 发布 MCP 包

项目使用 [changesets](https://github.com/changesets/changesets) 管理包版本：

```bash
pnpm changeset
pnpm changeset:version
pnpm release
```

## License

MIT
