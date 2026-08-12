# WordsEssence MCP

为 [WordsEssence](https://github.com/IceyWu/WordsEssence) 提供的 MCP 服务，通过 `https://wd.iceywu.cn/service` 管理书摘。

## 工具

- `list_excerpts`：分页查询书摘
- `get_excerpt`：按 ID 查询书摘
- `create_excerpt`：新增书摘
- `update_excerpt`：更新书摘
- `delete_excerpt`：软删除书摘

删除接口是软删除。调用新增、更新、删除工具前，客户端或 Agent 应向用户确认目标数据。

## 配置

| 环境变量 | 默认值/作用 |
| --- | --- |
| `WD_API_BASE_URL` | `https://wd.iceywu.cn/service` |
| `WD_API_TOKEN` | 可选，作为 Bearer Token 发送 |
| `WD_API_KEY` | 可选，作为 `X-Api-Key` 发送 |
| `MCP_TRANSPORT` | 设为 `http` 启用 Streamable HTTP；否则使用 stdio |
| `PORT` | HTTP 端口，默认 `3002` |
| `MCP_ALLOWED_HOSTS` | HTTP 模式额外允许的 Host，逗号分隔 |

## 本地使用

```json
{
  "mcpServers": {
    "wordsessence": {
      "command": "node",
      "args": ["D:/dev/agents/mcp-hub/mcp-servers/wordsessence/dist/index.js"]
    }
  }
}
```

构建：

```bash
pnpm --filter wordsessence-mcp build
```

## 接入本仓库的 eve 界面

在仓库根目录启动 WordsEssence MCP 的 HTTP 模式：

```powershell
pnpm dev:wordsessence
```

该命令会自动构建、加载仓库根目录的 `.env.local`，并默认监听 `http://127.0.0.1:3002/`。

再打开另一个终端启动 eve：

```powershell
pnpm dev
```

`agent/connections/wordsessence.ts` 本地默认连接 `http://127.0.0.1:3002/`。部署 eve 时设置：

```ini
WORDSESSENCE_MCP_URL=https://mcp.iceywu.cn/wordsessence/
```

eve 会自动放行查询工具；新增、更新和删除书摘会要求用户确认。
