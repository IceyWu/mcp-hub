# levwu MCP

Lev Wu 个人 API 聚合 MCP —— 一个入口承载所有自有接口，未来新增接口都以**模块**形式挂在这里，不再为每个服务单独写 MCP。

当前已接入模块：

- **AI 任务服务**（`ai_*`）：基于 `https://api.lpalette.cn` 的统一 AI 任务服务，OCR 文字识别 + 图片理解 + AI 图片编辑（gpt-image-2）+ 天气查询。

## 工具

### AI 模块

| 工具 | 说明 | 操作 |
| --- | --- | --- |
| `ai_submit_task` | 提交 OCR / 图片理解 / 图片编辑任务，返回 `task_id` | 写 |
| `ai_get_task` | 按 `task_id` 查询任务状态和结果 | 读 |
| `ai_query_weather` | 查询地点未来 7 天 + 24 小时逐时天气 | 读 |

`ai_submit_task` 支持三种图片来源（三选一）：

- `image_url`：远程图片 URL（远程 HTTP 部署推荐）
- `file_path`：本地图片文件路径（本地 stdio 模式）
- `image_data`：图片的 base64 data URL（如 `data:image/png;base64,...`，聊天中直接提供图片内容时用）

支持格式 png/jpg/jpeg/gif/webp/bmp，最大 20MB。

`type` 支持三种：

- `ocr`：OCR 文字识别，`provider` 可选（`zhipu` 默认免费 / `siliconflow`）
- `image_understanding`：图片理解，返回结构化 JSON（summary/scene/objects/text/detail）
- `image_edit`：AI 图片编辑（必填 `prompt`，`size` 可选）

提交是异步的：先用 `ai_submit_task` 拿到 `task_id`，再用 `ai_get_task` 轮询。完成时按类型返回：OCR → `text`，图片理解 → `understanding`，图片编辑 → `image_base64`。建议间隔：OCR / 图片理解 1-2 秒，图片编辑 3-5 秒。提交任务属于写操作，Agent 应在调用前向用户确认。

## 配置

| 环境变量 | 默认值/作用 |
| --- | --- |
| `AI_API_BASE_URL` | AI 任务服务地址，默认 `https://api.lpalette.cn` |
| `MCP_TRANSPORT` | 设为 `http` 启用 Streamable HTTP；否则使用 stdio |
| `PORT` | HTTP 端口，默认 `3003` |
| `MCP_ALLOWED_HOSTS` | HTTP 模式额外允许的 Host，逗号分隔 |

## 本地使用

```json
{
  "mcpServers": {
    "levwu": {
      "command": "node",
      "args": ["D:/dev/agents/mcp-hub/mcp-servers/levwu/dist/index.js"]
    }
  }
}
```

## 连接已部署服务

```json
{
  "mcpServers": {
    "levwu": {
      "type": "http",
      "url": "https://mcp.levwu.me/levwu/"
    }
  }
}
```

构建：

```bash
pnpm --filter levwu-mcp build
```

本地以 HTTP 模式启动（自动构建并加载仓库根 `.env.local`）：

```powershell
pnpm dev:levwu
```

默认监听 `http://127.0.0.1:3003/`。

## 接入本仓库的 eve 界面

`agent/connections/levwu.ts` 本地默认连接 `http://127.0.0.1:3003/`。部署 eve 时设置：

```ini
LEVWU_MCP_URL=https://mcp.levwu.me/levwu/
```

eve 会自动放行查询工具；`ai_submit_task`（OCR / 图片编辑）会要求用户确认。

## 新增模块（核心工作流）

`levwu` 是一个**聚合 MCP**：新增接口不需要动框架和部署，只需三步：

1. 在 `modules/` 下新建一个模块文件（参考 `modules/ai.ts`），导出 `registerXxxModule(server)`，用 `apiRequest`/`jsonResult`（来自 `lib/client.ts`）注册工具；
2. 在 `modules/index.ts` 的 `registerModules` 中 import 并调用一行；
3. （可选）在 `lib/client.ts` 中补充通用能力，或在 `README.md` 补工具清单。

工具名统一使用 `模块名_操作` 前缀（如 `ai_submit_task`、`gh_list_repos`），避免重名、一眼看出归属。每个模块可读取各自的 base URL 环境变量（如 `AI_API_BASE_URL`）。
