import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  createBugSmartSheet,
  defaultBugFields,
  getCredentialsFromEnv,
  SmartSheetFieldType,
  type FieldDefinitionInput,
} from "../lib/tencent-docs.js";

/**
 * 创建一个新的在线智能表（smartsheet）作为 Bug 表，并写入基础 Bug 字段。
 * 默认字段：Bug标题、状态、优先级、严重程度、负责人、模块、创建日期、详细描述。
 *
 * 注意：这是一个写操作（会在用户的腾讯文档中真实创建文档）。当前模型（DeepSeek）
 * 的接口要求 tool_call 后必须紧跟 tool 结果，因此不使用 eve 的 approval 暂停机制，
 * 改为由 instructions 约定：执行前先在对话里向用户确认。
 */
export default defineTool({
  description:
    "创建一个新的在线智能表（腾讯文档 smartsheet）作为 Bug 表，并自动写入基础 Bug 字段" +
    "（Bug标题、状态、优先级、严重程度、负责人、模块、创建日期、详细描述）。" +
    "当用户想新建一张 Bug 表/问题跟踪表时使用，例如「帮我建一个登录模块Bug表」。" +
    "可选传入 extraFields 追加自定义文本列。返回新文档的链接、fileId 和已创建的字段列表。",
  inputSchema: z.object({
    title: z
      .string()
      .min(1)
      .max(36)
      .describe("新建 Bug 表的标题，如「登录模块Bug表」。长度不超过 36 字符。"),
    folderId: z
      .string()
      .optional()
      .describe("可选：目标文件夹 ID。不传则创建在根目录「我的文档」下。"),
    extraFields: z
      .array(z.string().min(1))
      .optional()
      .describe("可选：除基础字段外，额外追加的文本列名称列表。"),
  }),
  async execute({ title, folderId, extraFields }) {
    const creds = getCredentialsFromEnv();

    const fields: FieldDefinitionInput[] = [...defaultBugFields()];
    if (extraFields?.length) {
      for (const name of extraFields) {
        fields.push({ fieldTitle: name, fieldType: SmartSheetFieldType.text });
      }
    }

    const result = await createBugSmartSheet(creds, { title, fields, folderId });

    return {
      fileId: result.fileId,
      title: result.title,
      url: result.url,
      sheetId: result.sheetId,
      sheetTitle: result.sheetTitle,
      fieldCount: result.fields.length,
      fields: result.fields.map((f) => ({
        fieldId: f.fieldID,
        title: f.fieldTitle,
        type: f.fieldType,
      })),
    };
  },
});
