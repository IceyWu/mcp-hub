export type ServiceSlug = "tencent-docs" | "wordsessence" | "levwu";

export interface ServiceDetail {
  slug: ServiceSlug;
  name: string;
  kicker: string;
  lead: string;
  endpoint: string;
  auth: string;
  config: string;
  tools: Array<{ name: string; description: string }>;
  note: string;
  steps: string[];
  projectUrl: string;
  projectLabel: string;
  sourceUrl?: string;
  sourceLabel?: string;
}

const zh: Record<ServiceSlug, ServiceDetail> = {
  "tencent-docs": {
    slug: "tencent-docs",
    name: "Tencent Docs MCP",
    kicker: "文档与表格自动化",
    lead: "让 AI Agent 直接浏览、读取和更新腾讯文档智能表与在线表格，并处理记录附件。",
    endpoint: "https://mcp.levwu.me/tencent-docs/",
    auth: "需要腾讯文档开放平台凭证，通过请求 Header 传入。",
    config: `{
  "mcpServers": {
    "tencent-docs": {
      "type": "http",
      "url": "https://mcp.levwu.me/tencent-docs/",
      "headers": {
        "x-tencent-client-id": "<your-id>",
        "x-tencent-access-token": "<your-token>",
        "x-tencent-open-id": "<your-open-id>"
      }
    }
  }
}`,
    tools: [
      {
        name: "list_documents",
        description: "列出可访问的腾讯文档并查找 fileId",
      },
      { name: "read_records", description: "读取智能表或在线表格记录" },
      { name: "add_records", description: "向智能表新增一条或多条记录" },
      { name: "update_records", description: "按 recordId 更新记录字段" },
      { name: "create_bug_sheet", description: "创建带标准字段的 Bug 智能表" },
      { name: "read_attachment", description: "读取记录中的图片与附件" },
    ],
    note: "访问令牌会过期，请在腾讯文档开放平台刷新。不要把凭证提交到代码仓库。",
    steps: [
      "准备腾讯文档 Client ID、Access Token 和 Open ID",
      "复制配置并填入凭证",
      "在 MCP 客户端中连接并先调用 list_documents",
    ],
    projectUrl: "https://docs.qq.com/open",
    projectLabel: "腾讯文档开放平台",
  },
  wordsessence: {
    slug: "wordsessence",
    name: "WordsEssence MCP",
    kicker: "书摘与文字片段管理",
    lead: "为 WordsEssence 提供自然语言入口，让 AI Agent 查询、新增、更新和软删除书摘。",
    endpoint: "https://mcp.levwu.me/wordsessence/",
    auth: "当前可直接连接；新增、更新和删除属于写操作，应在执行前确认。",
    config: `{
  "mcpServers": {
    "wordsessence": {
      "type": "http",
      "url": "https://mcp.levwu.me/wordsessence/"
    }
  }
}`,
    tools: [
      { name: "list_excerpts", description: "分页查询书摘并指定排序" },
      { name: "get_excerpt", description: "按 ID 查询单条书摘" },
      { name: "create_excerpt", description: "新增正文、作者、书名与标题" },
      { name: "update_excerpt", description: "按 ID 更新指定书摘字段" },
      { name: "delete_excerpt", description: "按 ID 软删除书摘" },
    ],
    note: "这是公开且具备写入能力的 MCP。请只在可信客户端中使用，并对写操作启用人工确认；后续建议为 MCP 和上游 API 增加鉴权。",
    steps: [
      "复制连接配置",
      "在支持 Streamable HTTP 的客户端中连接",
      "先用 list_excerpts 验证读取，再按需执行写操作",
    ],
    projectUrl: "https://wd.levwu.me/",
    projectLabel: "访问 WordsEssence 官网",
    sourceUrl: "https://github.com/IceyWu/WordsEssence",
    sourceLabel: "查看源代码",
  },
  levwu: {
    slug: "levwu",
    name: "levwu MCP",
    kicker: "个人 API 聚合入口",
    lead: "Lev Wu 个人 API 聚合 MCP：一个入口承载所有自有接口，未来新接口都以模块形式加入这里。当前接入统一 AI 任务服务，支持 OCR 文字识别、图片理解、AI 图片编辑与天气查询。",
    endpoint: "https://mcp.levwu.me/levwu/",
    auth: "当前无需认证。OCR / 图片理解 / 图片编辑任务属于写操作，应在执行前确认。",
    config: `{
  "mcpServers": {
    "levwu": {
      "type": "http",
      "url": "https://mcp.levwu.me/levwu/"
    }
  }
}`,
    tools: [
      {
        name: "ai_submit_task",
        description:
          "提交 OCR / 图片理解 / 图片编辑任务，返回 task_id 用于轮询",
      },
      {
        name: "ai_get_task",
        description: "按 task_id 查询任务状态和结果",
      },
      {
        name: "ai_query_weather",
        description: "查询地点未来 7 天 + 24 小时逐时天气",
      },
    ],
    note: "levwu 是聚合入口，后续新接口都会以模块形式加入这里，工具名统一使用 模块名_操作 前缀（当前为 ai_）。",
    steps: [
      "复制连接配置",
      "在支持 Streamable HTTP 的客户端中连接",
      "先用 ai_query_weather 或 ai_get_task 验证读取，再按需调用 ai_submit_task",
    ],
    projectUrl: "https://api.lpalette.cn/ai/docs",
    projectLabel: "查看 AI API 文档",
    sourceUrl: "https://github.com/IceyWu/mcp-hub/tree/main/mcp-servers/levwu",
    sourceLabel: "查看源代码",
  },
};

const en: Record<ServiceSlug, ServiceDetail> = {
  "tencent-docs": {
    ...zh["tencent-docs"],
    kicker: "Document and spreadsheet automation",
    lead: "Let AI agents browse, read, and update Tencent Docs smart sheets and spreadsheets, including record attachments.",
    auth: "Requires Tencent Docs Open Platform credentials supplied through request headers.",
    tools: [
      {
        name: "list_documents",
        description: "List accessible documents and discover file IDs",
      },
      {
        name: "read_records",
        description: "Read smart-sheet or spreadsheet records",
      },
      {
        name: "add_records",
        description: "Add one or more smart-sheet records",
      },
      { name: "update_records", description: "Update fields by record ID" },
      {
        name: "create_bug_sheet",
        description: "Create a bug sheet with standard fields",
      },
      {
        name: "read_attachment",
        description: "Read images and attachments from records",
      },
    ],
    note: "Access tokens expire and must be refreshed through Tencent Docs Open Platform. Never commit credentials to source control.",
    steps: [
      "Prepare a Client ID, Access Token, and Open ID",
      "Copy the config and insert your credentials",
      "Connect your MCP client and start with list_documents",
    ],
    projectLabel: "Tencent Docs Open Platform",
  },
  wordsessence: {
    ...zh.wordsessence,
    kicker: "Excerpt and quote management",
    lead: "Give AI agents a natural-language interface to list, create, update, and soft-delete excerpts in WordsEssence.",
    auth: "Currently connects directly. Create, update, and delete operations should be confirmed before execution.",
    tools: [
      {
        name: "list_excerpts",
        description: "List excerpts with pagination and sorting",
      },
      { name: "get_excerpt", description: "Get a single excerpt by ID" },
      {
        name: "create_excerpt",
        description: "Create content with author, book, and title",
      },
      { name: "update_excerpt", description: "Update selected fields by ID" },
      { name: "delete_excerpt", description: "Soft-delete an excerpt by ID" },
    ],
    note: "This public MCP can write data. Use it only from trusted clients, require confirmation for writes, and add authentication to both the MCP and upstream API.",
    steps: [
      "Copy the connection config",
      "Connect from a Streamable HTTP client",
      "Verify reads with list_excerpts before using write tools",
    ],
    projectLabel: "Visit WordsEssence",
    sourceLabel: "View source",
  },
  levwu: {
    ...zh.levwu,
    kicker: "Personal API hub",
    lead: "Lev Wu's personal API aggregation MCP: one entry for all owned services, extended with modules as new interfaces are added. Currently integrates the unified AI task service — OCR text recognition, image understanding, AI image editing, and weather.",
    auth: "No authentication required. OCR / image understanding / image editing are write operations; confirm before execution.",
    tools: [
      {
        name: "ai_submit_task",
        description:
          "Submit an OCR / image-understanding / image-edit task, returns a task_id to poll",
      },
      {
        name: "ai_get_task",
        description: "Query task status and result by task_id",
      },
      {
        name: "ai_query_weather",
        description: "Query 7-day and 24-hour weather for a location",
      },
    ],
    note: "levwu is an aggregation hub: future interfaces are added here as modules, with tools namespaced as module_action (currently ai_).",
    steps: [
      "Copy the connection config",
      "Connect from a Streamable HTTP client",
      "Verify reads with ai_query_weather or ai_get_task before calling ai_submit_task",
    ],
    projectLabel: "View AI API docs",
    sourceLabel: "View source",
  },
};

export const serviceCatalog = { "zh-CN": zh, en };
