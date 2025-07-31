import { z } from 'zod';

// ================================
// ファイル・アップロード型スキーマ
// ================================

/**
 * ファイル情報スキーマ
 */
export const FileInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number(),
  type: z.string(),
  url: z.string(),
  uploaded_at: z.string(),
  uploaded_by: z.string(),
});

/**
 * ファイルアップロードリクエストスキーマ
 */
export const FileUploadRequestSchema = z.object({
  file: z.instanceof(File),
  folder: z.string().optional(),
  allowed_types: z.array(z.string()).optional(),
  max_size: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * ファイルアップロードレスポンススキーマ
 */
export const FileUploadResponseSchema = z.object({
  success: z.boolean(),
  file: FileInfoSchema.optional(),
  error: z.string().optional(),
});

/**
 * ファイル削除レスポンススキーマ
 */
export const FileDeleteResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional(),
});

// ファイル・アップロード型
export type FileInfo = z.infer<typeof FileInfoSchema>;
export type FileUploadRequest = z.infer<typeof FileUploadRequestSchema>;
export type FileUploadResponse = z.infer<typeof FileUploadResponseSchema>;
export type FileDeleteResponse = z.infer<typeof FileDeleteResponseSchema>;
