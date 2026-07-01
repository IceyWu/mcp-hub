/**
 * 文件管理（drive）—— 路径前缀 /openapi/drive/v2/
 *
 * 覆盖：encodedID 转换、列表、元信息、新建/重命名/删除文档、文件夹增删。
 * 文档: https://docs.qq.com/open/document/app/openapi/v2/file/
 */
import {
  callApi,
  type TencentDocsCredentials,
} from "./client.js";

/**
 * 把文档链接里的 encodedID 转换成 API 用的 fileID。
 * 已经是 "300000000$xxx" 形式则直接返回。
 * GET /openapi/drive/v2/util/converter?type=2&value={encodedID}
 */
export async function resolveFileId(
  idOrEncodedId: string,
  creds: TencentDocsCredentials,
): Promise<string> {
  if (idOrEncodedId.includes("$")) return idOrEncodedId;
  const data = await callApi<{ fileID?: string }>(
    creds,
    "GET",
    `/openapi/drive/v2/util/converter?type=2&value=${encodeURIComponent(idOrEncodedId)}`,
    { action: "encodedID 转换" },
  );
  if (!data?.fileID) {
    throw new Error(`encodedID 转换未返回 fileID（value=${idOrEncodedId}）。`);
  }
  return data.fileID;
}

/** 文档/文件夹列表项 */
export interface DriveItem {
  ID: string;
  title: string;
  /** 类型: folder | doc | sheet | smartsheet | slide | pdf 等 */
  type: string;
  url: string;
  status: string;
  ownerName?: string;
  isOwner?: boolean;
  isCollaborated?: boolean;
  fileSource?: string;
  lastModifyTime?: number;
  lastBrowseTime?: number;
}

export interface ListDocumentsResult {
  items: DriveItem[];
  next: number;
}

/**
 * 列表过滤接口：按列表类型/拥有者等条件拉取文档列表。
 * GET /openapi/drive/v2/filter
 *
 * listType: "recent"（我参与的，含他人创建我协作的）| "all"/"folder" | "pin" | "star"
 * isOwner: 1=所有文件, 2=只返回我拥有的
 */
export async function filterDocuments(
  creds: TencentDocsCredentials,
  options: {
    listType?: "recent" | "all" | "folder" | "pin" | "star";
    folderId?: string;
    start?: number;
    limit?: number;
    asc?: 0 | 1;
    isOwner?: 1 | 2;
    fileType?: string;
    sortType?: string;
  } = {},
): Promise<ListDocumentsResult> {
  const {
    listType = "recent",
    folderId,
    start = 0,
    limit = 20,
    asc = 0,
    isOwner,
    fileType,
    sortType,
  } = options;

  const params = new URLSearchParams();
  params.set("listType", listType);
  params.set("start", String(start));
  params.set("limit", String(Math.min(limit, 20)));
  params.set("asc", String(asc));
  if (folderId) params.set("folderID", folderId);
  if (isOwner) params.set("isOwner", String(isOwner));
  if (fileType) params.set("fileType", fileType);
  if (sortType) params.set("sortType", sortType);

  const data = await callApi<{ list?: DriveItem[]; next?: number }>(
    creds,
    "GET",
    `/openapi/drive/v2/filter?${params.toString()}`,
    { action: "列表过滤" },
  );
  return { items: data?.list ?? [], next: data?.next ?? 0 };
}

/**
 * 获取某个文件夹下的文档与子文件夹列表。
 * GET /openapi/drive/v2/folders/{folderID}
 * folderId 不传则默认返回「我的文档」根目录。
 */
export async function listDocuments(
  creds: TencentDocsCredentials,
  options: {
    folderId?: string;
    start?: number;
    limit?: number;
    asc?: 0 | 1;
    sortType?: string;
  } = {},
): Promise<ListDocumentsResult> {
  const { folderId = "", start = 0, limit = 20, asc = 0, sortType } = options;

  const params = new URLSearchParams();
  params.set("start", String(start));
  params.set("limit", String(limit));
  params.set("asc", String(asc));
  if (sortType) params.set("sortType", sortType);

  const data = await callApi<{ list?: DriveItem[]; next?: number }>(
    creds,
    "GET",
    `/openapi/drive/v2/folders/${encodeURIComponent(folderId)}?${params.toString()}`,
    { action: "获取文档列表" },
  );
  return { items: data?.list ?? [], next: data?.next ?? 0 };
}

/** 文档元信息 */
export interface FileMetadata {
  ID: string;
  title: string;
  /** 文档类型: doc | sheet | smartsheet | slide | pdf | markdown 等 */
  type: string;
  url: string;
  status: string;
}

/**
 * 查询文档元信息，主要用于判断文档类型（sheet / smartsheet 等）。
 * GET /openapi/drive/v2/files/{fileID}/metadata
 */
export async function getFileMetadata(
  fileId: string,
  creds: TencentDocsCredentials,
): Promise<FileMetadata> {
  const data = await callApi<FileMetadata>(
    creds,
    "GET",
    `/openapi/drive/v2/files/${encodeURIComponent(fileId)}/metadata`,
    { action: "查询文档元信息" },
  );
  if (!data) throw new Error("文档元信息为空。");
  return data;
}

/** 新建文档后的返回信息 */
export interface CreatedFile {
  ID: string;
  title: string;
  type: string;
  url: string;
}

/**
 * 新建在线文档。
 * POST /openapi/drive/v2/files  (application/x-www-form-urlencoded)
 *
 * @param type doc | sheet | smartsheet | form | slide | mind | flowchart
 * @param folderId 可选，目标文件夹；不传则放在根目录
 */
export async function createDocument(
  creds: TencentDocsCredentials,
  options: { title: string; type: string; folderId?: string },
): Promise<CreatedFile> {
  const data = await callApi<CreatedFile>(creds, "POST", "/openapi/drive/v2/files", {
    form: { type: options.type, title: options.title, folderID: options.folderId },
    action: "新建文档",
  });
  if (!data?.ID) throw new Error("新建文档未返回 ID。");
  return data;
}

/**
 * 重命名文档。
 * PATCH /openapi/drive/v2/files/{fileID}  (form: title)
 */
export async function renameDocument(
  fileId: string,
  creds: TencentDocsCredentials,
  title: string,
): Promise<void> {
  await callApi(creds, "PATCH", `/openapi/drive/v2/files/${encodeURIComponent(fileId)}`, {
    form: { title },
    action: "重命名文档",
  });
}

/**
 * 删除文档。
 * DELETE /openapi/drive/v2/files/{fileID}?recoverable=1
 * @param recoverable true=移入回收站（默认）, false=彻底删除
 */
export async function deleteDocument(
  fileId: string,
  creds: TencentDocsCredentials,
  recoverable = true,
): Promise<void> {
  await callApi(
    creds,
    "DELETE",
    `/openapi/drive/v2/files/${encodeURIComponent(fileId)}?recoverable=${recoverable ? 1 : 0}`,
    { action: "删除文档" },
  );
}

/**
 * 新建文件夹。
 * POST /openapi/drive/v2/folders  (form: title, folderID?)
 * @param parentFolderId 可选，父文件夹；不传则建在根目录
 * @returns 新文件夹 ID（encodedID 形式，可直接作为 folderID 使用）
 */
export async function createFolder(
  creds: TencentDocsCredentials,
  options: { title: string; parentFolderId?: string },
): Promise<{ folderId: string; title: string }> {
  const data = await callApi<{ ID?: string }>(creds, "POST", "/openapi/drive/v2/folders", {
    form: { title: options.title, folderID: options.parentFolderId },
    action: "新建文件夹",
  });
  if (!data?.ID) throw new Error("新建文件夹未返回 ID。");
  return { folderId: data.ID, title: options.title };
}

/**
 * 删除文件夹。
 * DELETE /openapi/drive/v2/folders/{folderID}
 */
export async function deleteFolder(
  folderId: string,
  creds: TencentDocsCredentials,
): Promise<void> {
  await callApi(creds, "DELETE", `/openapi/drive/v2/folders/${encodeURIComponent(folderId)}`, {
    action: "删除文件夹",
  });
}
