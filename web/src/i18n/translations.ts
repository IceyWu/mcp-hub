export type Locale = "zh-CN" | "en";

export interface Translations {
  role: string;
  title: string;
  desc: string;
  usage: string;
  services: string;
  service1Name: string;
  service1Desc: string;
  service1Detail: string;
  service2Name: string;
  service2Desc: string;
  service2Detail: string;
  howTitle: string;
  howDesc: string;
  moreTitle: string;
  moreDesc: string;
  link1Name: string;
  link1Desc: string;
  link2Name: string;
  link2Desc: string;
  link3Name: string;
  link3Desc: string;
  viewOnGitHub: string;
  footerText: string;
}

const zh: Translations = {
  role: "AI Agent 的 MCP 服务中心",
  title: "为你的 AI Agent\n接入 MCP 工具",
  desc: "一个域名，连接多个 MCP 服务。复制配置，即可让 AI Agent 调用腾讯文档与 WordsEssence 工具。",
  usage:
    "已有服务：Tencent Docs MCP 与 WordsEssence MCP，覆盖腾讯文档读写和书摘管理。",
  services: "已接入服务",
  service1Name: "Tencent Docs MCP",
  service1Desc: "读写腾讯文档的 MCP 服务",
  service1Detail:
    "支持列出文档、读写记录、读取附件图片、新建 Bug 表等 6 个工具",
  service2Name: "WordsEssence MCP",
  service2Desc: "记录与管理美好文字片段",
  service2Detail:
    "支持查询、新增、更新和软删除书摘，共 5 个工具；写入前请确认目标内容",
  howTitle: "连接方式",
  howDesc:
    "所有服务通过统一域名访问，并按路径区分。Tencent Docs 使用 Header 凭证；WordsEssence 当前可直接连接，无需本地安装。",
  moreTitle: "接入你的 MCP",
  moreDesc:
    "有好的 MCP 服务想部署？MCP Hub 支持 Dockerfile 一键部署，提交 PR 即可接入。让你的工具被更多 AI Agent 使用。",
  link1Name: "Model Context Protocol",
  link1Desc: "连接 AI Agent 与外部工具数据的开放协议",
  link2Name: "Eve 框架",
  link2Desc: "驱动对话式 AI 助手的 Agent 框架",
  link3Name: "腾讯文档开放平台",
  link3Desc: "获取 Tencent Docs API 凭证",
  viewOnGitHub: "在 GitHub 查看",
  footerText: "基于 Eve 与 Astro 构建",
};

const en: Translations = {
  role: "MCP Service Hub for AI Agents",
  title: "Connect MCP Tools\nto Your AI Agent",
  desc: "One domain for multiple MCP services. Copy the config to connect your AI agent to Tencent Docs and WordsEssence tools.",
  usage:
    "Live: Tencent Docs MCP and WordsEssence MCP, covering document automation and excerpt management.",
  services: "Available Services",
  service1Name: "Tencent Docs MCP",
  service1Desc: "MCP service for Tencent Docs",
  service1Detail:
    "6 tools: list documents, read/write records, read attachments, create bug sheets",
  service2Name: "WordsEssence MCP",
  service2Desc: "Capture and manage memorable excerpts",
  service2Detail:
    "5 tools to list, create, update, and soft-delete excerpts; confirm content before write operations",
  howTitle: "How to Connect",
  howDesc:
    "All services share one domain and are routed by path. Tencent Docs uses header credentials; WordsEssence currently connects directly. No local install required.",
  moreTitle: "Add Your MCP",
  moreDesc:
    "Have an MCP service to deploy? MCP Hub supports one-click Dockerfile deployment. Submit a PR to get your tool in front of more AI agents.",
  link1Name: "Model Context Protocol",
  link1Desc: "The open protocol connecting AI agents to external tools",
  link2Name: "Eve Framework",
  link2Desc: "The agent framework powering conversational AI",
  link3Name: "Tencent Docs Open Platform",
  link3Desc: "Get your Tencent Docs API credentials",
  viewOnGitHub: "View on GitHub",
  footerText: "Built with Eve & Astro",
};

export const translations: Record<Locale, Translations> = { "zh-CN": zh, en };

export function t(locale: Locale): Translations {
  return translations[locale] ?? zh;
}
