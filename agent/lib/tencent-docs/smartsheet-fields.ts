/**
 * 智能表 —— 字段（field）接口
 * 路径前缀 /openapi/smartbook/v2/
 * 文档: https://docs.qq.com/open/document/app/openapi/v2/smartsheet/field/
 */
import { callApi, type TencentDocsCredentials } from "./client.js";

/**
 * 智能表字段类型枚举（FieldType）。
 * 取值来源于腾讯文档「字段类型」文档及「查询字段」接口实测。
 */
export const SmartSheetFieldType = {
  text: 1, // 文本
  number: 2, // 数字
  checkbox: 3, // 复选框
  dateTime: 4, // 日期
  image: 5, // 图片
  attachment: 6, // 附件（图片/视频/文档等）
  url: 8, // 超链接
  select: 9, // 多选（单选用 17，但 9 + isMultiple:false 实测也能表示单选）
  createdUser: 10, // 创建人
  modifiedUser: 11, // 最后编辑人
  createdTime: 12, // 创建时间（系统自动记录，不可写入）
  modifiedTime: 13, // 最后编辑时间
  progress: 14, // 进度
  phoneNumber: 15, // 电话
  email: 16, // 邮件
  singleSelect: 17, // 单选
} as const;

/** 单选/多选字段的一个选项 */
export interface SelectOptionInput {
  text: string;
  /** 选项配色 style（预设色板序号），不传则由服务端分配 */
  style?: number;
}

/** 添加字段的输入定义 */
export interface FieldDefinitionInput {
  fieldTitle: string;
  fieldType: number;
  /** select 类型（fieldType=9/17）的属性 */
  select?: { isMultiple?: boolean; isQuickAdd?: boolean; options: SelectOptionInput[] };
  /**
   * dateTime 类型（fieldType=4）的属性。
   * 注意：format 必须命中合法枚举（小写占位符）。
   * 实测可用："yyyy-mm-dd" / "yyyy/m/d" / "m/d/yyyy" / 'yyyy"年"m"月"d"日"'；
   * 而 "yyyy/mm/dd"、"yyyy/MM/dd"、未加引号的 "yyyy年m月d日" 都会报 22018。
   */
  dateTime?: { autoFill?: boolean; format?: string };
  /**
   * createdTime 类型（fieldType=12）的属性，系统自动记录创建时间，不可写入。
   * format 同 dateTime，可用 "yyyy-mm-dd" / "yyyy-mm-dd hh:mm" 等。
   */
  createdTime?: { format?: string };
  /** number 类型（fieldType=2）的属性 */
  number?: { decimalPlaces?: number; useSeparate?: boolean };
}

/** 字段信息（查询/新增返回） */
export interface FieldInfo {
  fieldID: string;
  fieldTitle: string;
  fieldType: number;
  [key: string]: unknown;
}

/** 把输入定义转换成 API 需要的字段对象 */
function toApiField(f: FieldDefinitionInput): Record<string, unknown> {
  const field: Record<string, unknown> = {
    fieldTitle: f.fieldTitle,
    fieldType: f.fieldType,
  };
  const isSelect =
    f.fieldType === SmartSheetFieldType.select ||
    f.fieldType === SmartSheetFieldType.singleSelect;

  if (isSelect && f.select) {
    const property = {
      isMultiple: f.select.isMultiple ?? false,
      isQuickAdd: f.select.isQuickAdd ?? true,
      options: f.select.options.map((o) => ({
        text: o.text,
        ...(o.style != null ? { style: o.style } : {}),
      })),
    };
    // type 17 用 propertySingleSelect，type 9 用 propertySelect。
    if (f.fieldType === SmartSheetFieldType.singleSelect) {
      field.propertySingleSelect = property;
    } else {
      field.propertySelect = property;
    }
  } else if (f.fieldType === SmartSheetFieldType.dateTime && f.dateTime) {
    field.propertyDateTime = {
      autoFill: f.dateTime.autoFill ?? false,
      format: f.dateTime.format ?? "yyyy-mm-dd",
    };
  } else if (f.fieldType === SmartSheetFieldType.createdTime) {
    field.propertyCreatedTime = {
      format: f.createdTime?.format ?? "yyyy-mm-dd hh:mm",
    };
  } else if (f.fieldType === SmartSheetFieldType.number && f.number) {
    field.propertyNumber = {
      decimalPlaces: f.number.decimalPlaces ?? 0,
      useSeparate: f.number.useSeparate ?? false,
    };
  } else if (f.fieldType === SmartSheetFieldType.image) {
    field.propertyImage = {};
  } else if (f.fieldType === SmartSheetFieldType.attachment) {
    field.propertyAttachment = {};
  } else if (f.fieldType === SmartSheetFieldType.text) {
    field.propertyText = {};
  }
  return field;
}

/**
 * 给智能表子表添加一列或多列字段。
 * POST /openapi/smartbook/v2/files/{fileID}/sheets/{sheetID}
 * Body: { addFields: { fields: [...] } }
 *
 * 注意：服务端会把每个新字段插到最前面，导致最终列序是提交顺序的倒序。
 * 为了让调用方按「期望的从左到右顺序」传入即可，这里内部反转提交，
 * 再把返回结果反转回来，使对外行为符合直觉。
 */
export async function addSmartSheetFields(
  fileId: string,
  sheetId: string,
  creds: TencentDocsCredentials,
  fields: FieldDefinitionInput[],
): Promise<FieldInfo[]> {
  const reversed = [...fields].reverse();
  const data = await callApi<{ addFields?: { fields?: FieldInfo[] } }>(
    creds,
    "POST",
    `/openapi/smartbook/v2/files/${encodeURIComponent(fileId)}/sheets/${encodeURIComponent(sheetId)}`,
    { json: { addFields: { fields: reversed.map(toApiField) } }, action: "添加字段" },
  );
  const added = data?.addFields?.fields ?? [];
  // 返回按入参顺序排列：reversed 提交后再反转一次即可恢复。
  return added.reverse();
}

/**
 * 删除智能表子表的一列或多列字段。
 * POST /openapi/smartbook/v2/files/{fileID}/sheets/{sheetID}
 * Body: { deleteFields: { fieldIDs: [...] } }
 */
export async function deleteSmartSheetFields(
  fileId: string,
  sheetId: string,
  creds: TencentDocsCredentials,
  fieldIds: string[],
): Promise<void> {
  if (fieldIds.length === 0) return;
  await callApi(
    creds,
    "POST",
    `/openapi/smartbook/v2/files/${encodeURIComponent(fileId)}/sheets/${encodeURIComponent(sheetId)}`,
    { json: { deleteFields: { fieldIDs: fieldIds } }, action: "删除字段" },
  );
}

/**
 * 查询智能表子表的字段列表。
 * POST /openapi/smartbook/v2/files/{fileID}/sheets/{sheetID}
 * Body: { getFields: { offset, limit } }
 */
export async function getSmartSheetFields(
  fileId: string,
  sheetId: string,
  creds: TencentDocsCredentials,
  options: { offset?: number; limit?: number } = {},
): Promise<FieldInfo[]> {
  const { offset = 0, limit = 200 } = options;
  const data = await callApi<{ getFields?: { fields?: FieldInfo[] } }>(
    creds,
    "POST",
    `/openapi/smartbook/v2/files/${encodeURIComponent(fileId)}/sheets/${encodeURIComponent(sheetId)}`,
    { json: { getFields: { offset, limit } }, action: "查询字段" },
  );
  return data?.getFields?.fields ?? [];
}
