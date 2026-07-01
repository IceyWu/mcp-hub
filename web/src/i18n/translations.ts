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
  title: "为你的 AI Agent\n部署 MCP 服务",
  desc: "一个域名，托管多个 MCP 服务器。通过 HTTP + Header 鉴权连接，让你的编码智能体直接调用各种工具。",
  usage:
    "已有服务：Tencent Docs MCP — 读写智能表、在线表格、附件图片。更多服务持续接入中。",
  services: "已接入服务",
  service1Name: "Tencent Docs MCP",
  service1Desc: "读写腾讯文档的 MCP 服务",
  service1Detail:
    "支持列出文档、读写记录、读取附件图片、新建 Bug 表等 6 个工具",
  howTitle: "连接方式",
  howDesc:
    "所有服务通过统一域名访问，路径区分不同 MCP。凭证通过 HTTP Header 传入，无需本地安装。",
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
  title: "Deploy MCP Services\nfor Your AI Agent",
  desc: "One domain, multiple MCP servers. Connect via HTTP with header-based auth — let your coding agent call any tool you deploy.",
  usage:
    "Live: Tencent Docs MCP — read/write smart sheets, spreadsheets, and attachments. More services coming.",
  services: "Available Services",
  service1Name: "Tencent Docs MCP",
  service1Desc: "MCP service for Tencent Docs",
  service1Detail:
    "6 tools: list documents, read/write records, read attachments, create bug sheets",
  howTitle: "How to Connect",
  howDesc:
    "All services share one domain, routed by path. Credentials via HTTP headers — no local install required.",
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
