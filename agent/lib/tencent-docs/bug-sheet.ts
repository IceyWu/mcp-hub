/**
 * Bug 表场景的高层封装：基础字段模板 + 一站式创建。
 * 复用 drive / smartsheet 各模块的底层能力。
 */
import { type TencentDocsCredentials } from "./client.js";
import { createDocument } from "./drive.js";
import { getSmartSheets } from "./smartsheet-sheets.js";
import {
  getAllSmartSheetRecords,
  deleteSmartSheetRecords,
} from "./smartsheet-records.js";
import {
  addSmartSheetFields,
  getSmartSheetFields,
  deleteSmartSheetFields,
  SmartSheetFieldType,
  type FieldDefinitionInput,
  type FieldInfo,
} from "./smartsheet-fields.js";

/**
 * 基础 Bug 表字段模板（从左到右的列顺序）：
 * 模块(下拉) → Bug标题 → 状态 → 优先级 → 严重程度 → 负责人(多选下拉)
 * → 附件资料(附件) → 详细描述 → 创建时间(系统自动)
 */
export function defaultBugFields(): FieldDefinitionInput[] {
  return [
    {
      fieldTitle: "模块",
      fieldType: SmartSheetFieldType.singleSelect,
      select: {
        isMultiple: false,
        isQuickAdd: true,
        // 不预置模块名，由用户在表内随时新增。
        options: [],
      },
    },
    { fieldTitle: "Bug标题", fieldType: SmartSheetFieldType.text },
    {
      fieldTitle: "状态",
      fieldType: SmartSheetFieldType.singleSelect,
      select: {
        isMultiple: false,
        options: [
          { text: "待处理", style: 1 },
          { text: "处理中", style: 2 },
          { text: "已解决", style: 3 },
          { text: "已关闭", style: 4 },
          { text: "重新打开", style: 5 },
        ],
      },
    },
    {
      fieldTitle: "优先级",
      fieldType: SmartSheetFieldType.singleSelect,
      select: {
        isMultiple: false,
        options: [
          { text: "P0", style: 1 },
          { text: "P1", style: 2 },
          { text: "P2", style: 3 },
          { text: "P3", style: 4 },
        ],
      },
    },
    {
      fieldTitle: "严重程度",
      fieldType: SmartSheetFieldType.singleSelect,
      select: {
        isMultiple: false,
        options: [
          { text: "阻塞", style: 1 },
          { text: "严重", style: 2 },
          { text: "一般", style: 3 },
          { text: "轻微", style: 4 },
        ],
      },
    },
    {
      fieldTitle: "负责人",
      fieldType: SmartSheetFieldType.select,
      select: {
        // 多选下拉，允许一个 Bug 指派多个负责人；用户可随时新增人名。
        isMultiple: true,
        isQuickAdd: true,
        options: [],
      },
    },
    { fieldTitle: "附件资料", fieldType: SmartSheetFieldType.attachment },
    { fieldTitle: "详细描述", fieldType: SmartSheetFieldType.text },
    {
      fieldTitle: "创建时间",
      // 系统自动记录创建时间，无需也不能手动写入。
      fieldType: SmartSheetFieldType.createdTime,
      createdTime: { format: "yyyy-mm-dd hh:mm" },
    },
  ];
}

/** 创建 Bug 智能表的结果 */
export interface CreateBugSheetResult {
  fileId: string;
  title: string;
  url: string;
  sheetId: string;
  sheetTitle: string;
  fields: FieldInfo[];
}

/**
 * 一站式创建一个「在线智能表」并写入 Bug 字段。
 * 步骤：新建 smartsheet 文档 → 取首个子表 → 添加 Bug 字段。
 *
 * @param fields 自定义字段；不传则使用 defaultBugFields()
 * @param folderId 可选，目标文件夹
 */
export async function createBugSmartSheet(
  creds: TencentDocsCredentials,
  options: { title: string; fields?: FieldDefinitionInput[]; folderId?: string },
): Promise<CreateBugSheetResult> {
  const { title, fields = defaultBugFields(), folderId } = options;

  const file = await createDocument(creds, { title, type: "smartsheet", folderId });

  const sheets = await getSmartSheets(file.ID, creds);
  if (sheets.length === 0) {
    throw new Error("新建的智能表没有可用子表，无法添加字段。");
  }
  const target = sheets.find((s) => s.isVisible) ?? sheets[0];

  // 新建的智能表会自带几个默认列（文本/数字/单选/日期/图片等）。
  // 先记录这些默认字段，添加完 Bug 字段后再把它们删掉，避免表里混入无用列。
  const defaultFields = await getSmartSheetFields(file.ID, target.sheetID, creds);
  const defaultFieldIds = defaultFields.map((f) => f.fieldID);

  const added = await addSmartSheetFields(file.ID, target.sheetID, creds, fields);

  // 删除默认列。删字段接口要求子表至少保留一列，此时我们已新增了若干 Bug 字段，
  // 删掉全部默认列是安全的。
  if (defaultFieldIds.length > 0) {
    await deleteSmartSheetFields(file.ID, target.sheetID, creds, defaultFieldIds);
  }

  // 新建的智能表还会自带几行空记录（通常 5 行），清掉它们，让表从空白开始。
  const { records } = await getAllSmartSheetRecords(file.ID, target.sheetID, creds);
  const emptyRecordIds = records.map((r) => r.recordID);
  if (emptyRecordIds.length > 0) {
    await deleteSmartSheetRecords(file.ID, target.sheetID, creds, emptyRecordIds);
  }

  return {
    fileId: file.ID,
    title: file.title,
    url: file.url,
    sheetId: target.sheetID,
    sheetTitle: target.title,
    fields: added,
  };
}
