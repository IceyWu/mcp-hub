# tencent-docs-mcp

腾讯文档表格的 [MCP](https://modelcontextprotocol.io) 服务器，让编辑器里的编码 AI（Kiro / Claude / Cursor）直接读写腾讯文档的智能表与在线表格。Bug 跟踪只是典型场景，同样适用于任务清单、名单、库存等任意表格。

支持 **stdio**（本地子进程）与 **Streamable HTTP**（远程部署）两种传输。

## 工具

| 工具 | 说明 |
| --- | --- |
| `list_documents` | 列出腾讯文档，查找表格的 `fileId` |
| `read_records` | 读取记录，返回结构化数据（每条带 `recordId`，自动识别文档类型） |
| `read_attachment` | 读取记录附件里的图片（自动处理防盗链），以图片内容返回供 AI 查看 |
| `add_records` | 向智能表新增一行或多行记录 |
| `update_records` | 按 `recordId` 更新已有记录字段 |
| `create_bug_sheet` | 新建带标准 Bug 字段的在线智能表 |

## 使用

### 方式一：远程 HTTP（推荐，无需本地安装）

连接已部署的服务，凭证通过请求头传入。在 MCP 客户端配置中添加：

```json
{
  "mcpServers": {
    "tencent-docs": {
      "url": "https://mcp.iceywu.cn/tencent-docs/",
      "headers": {
        "x-tencent-client-id": "你的_client_id",
        "x-tencent-access-token": "你的_access_token",
        "x-tencent-open-id": "你的_open_id"
      },
      "autoApprove": ["list_documents", "read_records", "read_attachment", "update_records"]
    }
  }
}
```

服务端部署见[传输模式](#传输模式)与 [`../docs/cloudflare-tunnel-setup.md`](../docs/cloudflare-tunnel-setup.md)。

### 方式二：本地 stdio（npm 包）

发布到 npm 后可用 `pnpm dlx`（或 `npx`）即装即用，凭证走环境变量：

```json
{
  "mcpServers": {
    "tencent-docs": {
      "command": "pnpm",
      "args": ["dlx", "tencent-docs-mcp"],
      "env": {
        "TENCENT_DOCS_CLIENT_ID": "你的_client_id",
        "TENCENT_DOCS_ACCESS_TOKEN": "你的_access_token",
        "TENCENT_DOCS_OPEN_ID": "你的_open_id"
      },
      "autoApprove": ["list_documents", "read_records", "read_attachment", "update_records"]
    }
  }
}
```

用 npm：`command` 换成 `npx`，`args` 换成 `["-y", "tencent-docs-mcp"]`。未发布时先 `pnpm build:mcp`，把 `command` 改为 `node`、`args` 指向本地 `dist/mcp-server/index.js` 绝对路径。

> Kiro 配置文件位于 `.kiro/settings/mcp.json`（工作区）或 `~/.kiro/settings/mcp.json`（全局）；其他客户端见各自文档。

## 凭证

三个环境变量，从[腾讯文档开放平台](https://docs.qq.com/open)开发者后台获取：

| 变量 | 说明 |
| --- | --- |
| `TENCENT_DOCS_CLIENT_ID` | 应用 Client ID |
| `TENCENT_DOCS_ACCESS_TOKEN` | 访问令牌（JWT，会过期，到期需刷新） |
| `TENCENT_DOCS_OPEN_ID` | 用户 Open ID |

可放在 MCP 配置的 `env` 块，或项目根 `.env.local`（`env` 块优先级更高）。**切勿提交凭证到版本库。**

## 传输模式

- **stdio**（默认）：凭证从环境变量读取；日志走 stderr，stdout 仅用于协议通信。
- **Streamable HTTP**：`node index.js --http`（或 `MCP_TRANSPORT=http`）。端口由 `PORT` 指定（默认 3001），凭证从请求头 `x-tencent-*` 读取。Host 白名单默认放行 `127.0.0.1` / `localhost` / `mcp.iceywu.cn`，其它域名用 `MCP_ALLOWED_HOSTS`（逗号分隔）追加。远程部署见 [`../docs/cloudflare-tunnel-setup.md`](../docs/cloudflare-tunnel-setup.md)。

## 典型流程（Bug 跟踪）

1. `list_documents` 找到目标表 `fileId`
2. `read_records` 读出记录，拿到 `recordId`
3. `read_attachment` 查看截图（如有）
4. 编辑器里改代码修复
5. `update_records` 把状态改为「已解决」

## 本地开发

```bash
pnpm install      # 仓库根目录
pnpm build:mcp    # 编译到 mcp-server/dist
```

## License

MIT
