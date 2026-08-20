/**
 * AI 任务服务模块（ai_*）
 *
 * 后端：https://api.lpalette.cn —— 统一 AI 任务服务
 *   - OCR 文字识别（智谱 GLM-4V-Flash / 硅基流动 Qwen-VL）
 *   - 图片理解（智谱 GLM-4V-Flash，结构化 JSON）
 *   - AI 图片编辑（gpt-image-2）
 *   - 天气查询（高德地图 / 中国气象局数据）
 *
 * 任务为异步模型：`ai_submit_task` 提交后返回 task_id，
 * 用 `ai_get_task` 轮询状态直至 completed。
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readFileSync } from "node:fs";
import { basename, extname } from "node:path";
import { apiRequest, jsonResult } from "../lib/client.js";

const BASE_URL = process.env.AI_API_BASE_URL ?? "https://api.lpalette.cn";

/** 图片扩展名 -> MIME 类型。服务端按 Content-Type 校验图片格式，必须正确指定。 */
const IMAGE_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
};

function imageMime(filePath: string): string {
  return (
    IMAGE_MIME[extname(filePath).toLowerCase()] ?? "application/octet-stream"
  );
}

/** 解析 base64 data URL，如 data:image/png;base64,<数据>。 */
function parseDataUrl(dataUrl: string): { mime: string; data: string } {
  const match = dataUrl.match(/^data:([^;,]+)(;[^,]*)?,(.*)$/s);
  if (!match) {
    throw new Error(
      "image_data 必须是 base64 data URL，格式：data:<mime>;base64,<数据>",
    );
  }
  return { mime: match[1], data: match[3] };
}

type TaskType = "ocr" | "image_understanding" | "image_edit";

/** 任务类型 -> 提交端点（接口拆分后的独立路径）。 */
const TASK_ENDPOINTS: Record<TaskType, string> = {
  ocr: "/ai/api/v1/ocr",
  image_understanding: "/ai/api/v1/image-understanding",
  image_edit: "/ai/api/v1/image-edit",
};

type SubmitTaskData = {
  task_id: string;
  type: TaskType;
  status: "pending";
};

type TaskResultData = {
  task_id: string;
  type: TaskType;
  status: "pending" | "processing" | "completed" | "failed";
  created_at: number;
  completed_at?: number | null;
  elapsed_seconds?: number | null;
  /** OCR 识别结果文字（仅 type=ocr 且 completed 时有） */
  text?: string | null;
  /** 图片理解结构化 JSON（仅 type=image_understanding 且 completed 时有） */
  understanding?: {
    summary?: string;
    scene?: string;
    objects?: string[];
    text?: string;
    detail?: string;
  } | null;
  /** 编辑后图片的 base64 data URL（仅 type=image_edit 且 completed 时有） */
  image_base64?: string | null;
  /** 错误信息（仅 failed 时有） */
  error?: string | null;
};

type WeatherDaily = {
  date: string;
  temp_max: number;
  temp_min: number;
  weather: string;
  precip: number;
  wind_max: number;
};

type WeatherHourly = {
  time: string;
  temp: number;
  humidity: number;
  precip: number;
  precip_prob?: number;
  weather: string;
  wind_speed: number;
  wind_dir: number;
  wind_arrow: string;
  pressure: number;
  cloud: number;
};

type WeatherData = {
  location: { lat: number; lon: number; display_name: string };
  daily: WeatherDaily[];
  hourly: WeatherHourly[];
};

export function registerAiModule(server: McpServer): void {
  server.registerTool(
    "ai_submit_task",
    {
      title: "提交 AI 任务（OCR / 图片理解 / 图片编辑）",
      description:
        "向统一 AI 任务服务提交任务。type=ocr 识别图片文字；type=image_understanding 返回结构化图片理解（summary/scene/objects/text/detail）；type=image_edit 用提示词编辑图片（必填 prompt）。图片来源三选一：image_url / file_path / image_data（png/jpg/jpeg/gif/webp/bmp，最大 20MB）。提交后返回 task_id，再用 ai_get_task 轮询结果。这是写操作。",
      inputSchema: {
        type: z
          .enum(["ocr", "image_understanding", "image_edit"])
          .describe(
            "任务类型：ocr=文字识别，image_understanding=图片理解（结构化 JSON），image_edit=图片编辑",
          ),
        image_url: z
          .string()
          .optional()
          .describe("图片 URL（三选一，远程 HTTP 模式推荐）"),
        file_path: z
          .string()
          .optional()
          .describe("本地图片文件路径（三选一，本地 stdio 模式可用）"),
        image_data: z
          .string()
          .optional()
          .describe(
            "图片的 base64 data URL（如 data:image/png;base64,...，三选一）。聊天中直接提供图片内容时用",
          ),
        provider: z
          .enum(["zhipu", "siliconflow"])
          .optional()
          .describe(
            "OCR 识别渠道：zhipu=智谱 GLM-4V-Flash（默认，免费），siliconflow=硅基流动 Qwen-VL。仅 type=ocr 有效",
          ),
        prompt: z
          .string()
          .optional()
          .describe("提示词。OCR/图片理解可选（不填用默认），图片编辑必填"),
        size: z
          .string()
          .optional()
          .describe("输出尺寸（仅 image_edit 有效），默认 1024x1024"),
      },
    },
    async ({
      type,
      image_url,
      file_path,
      image_data,
      provider,
      prompt,
      size,
    }) => {
      const sources = [image_url, file_path, image_data].filter(Boolean).length;
      if (sources === 0) {
        throw new Error(
          "必须提供图片来源：image_url / file_path / image_data（三选一）",
        );
      }
      if (type === "image_edit" && !prompt) {
        throw new Error("图片编辑任务（image_edit）必须提供 prompt 提示词");
      }

      const form = new FormData();
      if (prompt) form.append("prompt", prompt);
      if (type === "ocr") {
        if (provider) form.append("provider", provider);
      } else if (type === "image_edit") {
        if (size) form.append("size", size);
      }
      if (file_path) {
        const buffer = readFileSync(file_path);
        form.append(
          "file",
          new Blob([buffer], { type: imageMime(file_path) }),
          basename(file_path),
        );
      } else if (image_data) {
        const { mime, data } = parseDataUrl(image_data);
        form.append(
          "file",
          new Blob([Buffer.from(data, "base64")], { type: mime }),
          "image",
        );
      } else {
        form.append("image_url", image_url!);
      }

      const data = await apiRequest<SubmitTaskData>(
        BASE_URL,
        TASK_ENDPOINTS[type],
        {
          method: "POST",
          formData: form,
          timeoutMs: 120_000,
        },
      );
      return jsonResult(data);
    },
  );

  server.registerTool(
    "ai_get_task",
    {
      title: "查询 AI 任务状态和结果",
      description:
        "按 task_id 查询任务状态。pending=排队中，processing=处理中（含 elapsed_seconds），completed=已完成（OCR 返回 text，图片理解返回 understanding 结构化 JSON，图片编辑返回 image_base64），failed=含 error。建议轮询间隔：OCR / 图片理解 1-2 秒，图片编辑 3-5 秒。只读操作。",
      inputSchema: {
        task_id: z.string().min(1).describe("提交任务后返回的 task_id"),
      },
    },
    async ({ task_id }) => {
      const data = await apiRequest<TaskResultData>(
        BASE_URL,
        `/ai/api/v1/task/${encodeURIComponent(task_id)}`,
      );
      return jsonResult(data);
    },
  );

  server.registerTool(
    "ai_query_weather",
    {
      title: "查询天气",
      description:
        "根据地点名称查询近期天气（中英文均可），返回未来 7 天每日预报 + 未来 24 小时逐时预报，包含温度、湿度、降水、风速风向、云量、气压。数据来源：高德地图（中国气象局数据）。只读操作。",
      inputSchema: {
        location: z
          .string()
          .min(1)
          .max(200)
          .describe(
            "地点名称（中英文均可），例如：成都市锦江区、Shanghai、Tokyo, Japan",
          ),
      },
    },
    async ({ location }) => {
      const data = await apiRequest<WeatherData>(
        BASE_URL,
        "/ai/api/v1/weather/query",
        {
          method: "POST",
          json: { location },
        },
      );
      return jsonResult(data);
    },
  );
}
