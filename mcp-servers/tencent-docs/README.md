# tencent-docs-mcp

腾讯文档表格的 [MCP](https://modelcontextprotocol.io) 服务。编码 AI（Kiro / Claude / Cursor）通过它直接读写智能表与在线表格——Bug 跟踪、任务清单、名单、库存等任意表格场景均适用。

支持 **stdio**（本地子进程）与 **Streamable HTTP**（远程部署）两种传输模式。

## 工具

| 工具 | 说明 |
| --- | --- |
| `list_documents` | 列出腾讯文档，查找表格 `fileId` |
| `read_records` | 读取记录，自动识别文档类型，每条带 `recordId` |
| `add_records` | 新增一行或多行记录 |
| `update_records` | 按 `recordId` 更新字段 |
| `create_bug_sheet` | 新建带标准 Bug 字段的智能表 |
| `read_attachment` | 读取记录附件图片（自动处理防盗链），以图片返回供 AI 查看 |

## 使用方式

### 远程 HTTP（推荐）

连接已部署服务，凭证通过请求头传入：

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

> Kiro 配置：`.kiro/settings/mcp.json`（工作区）或 `~/.kiro/settings/mcp.json`（全局）

### 本地 stdio（npm 包）

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

用 npm 则 `command` 改为 `npx`，`args` 改为 `["-y", "tencent-docs-mcp"]`。未发布时先 `pnpm build:mcp`，`command` 改为 `node`，`args` 指向本地 `dist/mcp-server/index.js` 绝对路径。

## 凭证

从[腾讯文档开放平台](https://docs.qq.com/open)获取：

| 变量 | 说明 |
| --- | --- |
| `TENCENT_DOCS_CLIENT_ID` | 应用 Client ID |
| `TENCENT_DOCS_ACCESS_TOKEN` | JWT 访问令牌（会过期，需刷新） |
| `TENCENT_DOCS_OPEN_ID` | 用户 Open ID |

放在 MCP 配置的 `env` 块，或项目根 `.env.local`（`env` 块优先级更高）。**切勿提交到版本库。**

## 传输模式

- **stdio**（默认）：凭证从环境变量读取；stdout 仅用于协议通信，日志走 stderr
- **Streamable HTTP**：`node index.js --http` 或 `MCP_TRANSPORT=http`。端口 `PORT`（默认 3001），凭证从请求头 `x-tencent-*` 读取。Host 白名单默认放行 `127.0.0.1` / `localhost` / `mcp.iceywu.cn`，其它域名用 `MCP_ALLOWED_HOSTS`（逗号分隔）追加

## 典型流程：Bug 跟踪

```
list_documents  →  找到目标表 fileId
read_records    →  读出记录，拿到 recordId
read_attachment →  查看截图（如有）
[改代码修复]
update_records  →  状态改为「已解决」
```

## 本地开发

```bash
pnpm install      # 仓库根目录
pnpm build:mcp    # 编译到 mcp-server/dist
```

## License

MIT