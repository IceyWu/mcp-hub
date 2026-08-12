export type ServiceSlug = "tencent-docs" | "wordsessence";

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
}

const zh: Record<ServiceSlug, ServiceDetail> = {
  "tencent-docs": {
    slug: "tencent-docs",
    name: "Tencent Docs MCP",
    kicker: "文档与表格自动化",
    lead: "让 AI Agent 直接浏览、读取和更新腾讯文档智能表与在线表格，并处理记录附件。",
    endpoint: "https://mcp.iceywu.cn/tencent-docs/",
    auth: "需要腾讯文档开放平台凭证，通过请求 Header 传入。",
    config: `{
  "mcpServers": {
    "tencent-docs": {
      "url": "https://mcp.iceywu.cn/tencent-docs/",
      "headers": {
        "x-tencent-client-id": "<your-id>",
        "x-tencent-access-token": "<your-token>",
        "x-tencent-open-id": "<your-open-id>"
      }
    }
  }
}`,
    tools: [
      { name: "list_documents", description: "列出可访问的腾讯文档并查找 fileId" },
      { name: "read_records", description: "读取智能表或在线表格记录" },
      { name: "add_records", description: "向智能表新增一条或多条记录" },
      { name: "update_records", description: "按 recordId 更新记录字段" },
      { name: "create_bug_sheet", description: "创建带标准字段的 Bug 智能表" },
      { name: "read_attachment", description: "读取记录中的图片与附件" },
    ],
    note: "访问令牌会过期，请在腾讯文档开放平台刷新。不要把凭证提交到代码仓库。",
    steps: ["准备腾讯文档 Client ID、Access Token 和 Open ID", "复制配置并填入凭证", "在 MCP 客户端中连接并先调用 list_documents"],
    projectUrl: "https://docs.qq.com/open",
    projectLabel: "腾讯文档开放平台",
  },
  wordsessence: {
    slug: "wordsessence",
    name: "WordsEssence MCP",
    kicker: "书摘与文字片段管理",
    lead: "为 WordsEssence 提供自然语言入口，让 AI Agent 查询、新增、更新和软删除书摘。",
    endpoint: "https://mcp.iceywu.cn/wordsessence/",
    auth: "当前可直接连接；新增、更新和删除属于写操作，应在执行前确认。",
    config: `{
  "mcpServers": {
    "wordsessence": {
      "url": "https://mcp.iceywu.cn/wordsessence/"
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
    note: "这是具备写入能力的 MCP。公开部署前建议为 MCP 和上游 API 增加鉴权，并在客户端对写操作启用人工确认。",
    steps: ["复制下方 MCP 配置", "在支持 Streamable HTTP 的客户端中连接", "先用 list_excerpts 验证读取，再按需执行写操作"],
    projectUrl: "https://github.com/IceyWu/WordsEssence",
    projectLabel: "查看 WordsEssence 项目",
  },
};

const en: Record<ServiceSlug, ServiceDetail> = {
  "tencent-docs": {
    ...zh["tencent-docs"],
    kicker: "Document and spreadsheet automation",
    lead: "Let AI agents browse, read, and update Tencent Docs smart sheets and spreadsheets, including record attachments.",
    auth: "Requires Tencent Docs Open Platform credentials supplied through request headers.",
    tools: [
      { name: "list_documents", description: "List accessible documents and discover file IDs" },
      { name: "read_records", description: "Read smart-sheet or spreadsheet records" },
      { name: "add_records", description: "Add one or more smart-sheet records" },
      { name: "update_records", description: "Update fields by record ID" },
      { name: "create_bug_sheet", description: "Create a bug sheet with standard fields" },
      { name: "read_attachment", description: "Read images and attachments from records" },
    ],
    note: "Access tokens expire and must be refreshed through Tencent Docs Open Platform. Never commit credentials to source control.",
    steps: ["Prepare a Client ID, Access Token, and Open ID", "Copy the config and insert your credentials", "Connect your MCP client and start with list_documents"],
    projectLabel: "Tencent Docs Open Platform",
  },
  wordsessence: {
    ...zh.wordsessence,
    kicker: "Excerpt and quote management",
    lead: "Give AI agents a natural-language interface to list, create, update, and soft-delete excerpts in WordsEssence.",
    auth: "Currently connects directly. Create, update, and delete operations should be confirmed before execution.",
    tools: [
      { name: "list_excerpts", description: "List excerpts with pagination and sorting" },
      { name: "get_excerpt", description: "Get a single excerpt by ID" },
      { name: "create_excerpt", description: "Create content with author, book, and title" },
      { name: "update_excerpt", description: "Update selected fields by ID" },
      { name: "delete_excerpt", description: "Soft-delete an excerpt by ID" },
    ],
    note: "This MCP can write data. Before public deployment, protect both the MCP and upstream API with authentication and require confirmation for writes.",
    steps: ["Copy the MCP configuration below", "Connect from a Streamable HTTP client", "Verify reads with list_excerpts before using write tools"],
    projectLabel: "View the WordsEssence project",
  },
};

export const serviceCatalog = { "zh-CN": zh, en };
