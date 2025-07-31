import { z } from 'zod';

import type { DateString, Timestamp } from '@/types/common';

// ================================
// ファイル関連API型スキーマ
// ================================

/**
 * ファイルアップロードリクエスト（既存互換）スキーマ
 */
export const FileUploadRequestLegacySchema = z.object({
  file: z.instanceof(File),
  category: z.enum(['profile', 'attachment', 'document']),
  description: z.string().optional(),
});

/**
 * ファイルアップロードレスポンス（既存互換）スキーマ
 */
export const FileUploadResponseLegacySchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      id: z.string().uuid(),
      filename: z.string(),
      original_name: z.string(),
      mime_type: z.string(),
      size: z.number(),
      url: z.string(),
      category: z.string(),
      uploaded_at: z.string(),
    })
    .optional(),
  error: z
    .object({
      message: z.string(),
      code: z.string().optional(),
    })
    .optional(),
});

// ================================
// バッチ処理関連API型スキーマ
// ================================

/**
 * バッチ操作リクエストスキーマ
 */
export const BatchOperationRequestSchema = z.object({
  operation: z.enum(['create', 'update', 'delete']),
  items: z.array(z.record(z.unknown())),
});

/**
 * バッチ操作レスポンススキーマ
 */
export const BatchOperationResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      total: z.number(),
      successful: z.number(),
      failed: z.number(),
      errors: z.array(
        z.object({
          index: z.number(),
          error: z.string(),
        })
      ),
    })
    .optional(),
  error: z
    .object({
      message: z.string(),
      code: z.string().optional(),
    })
    .optional(),
});

// ================================
// エクスポート・インポート関連API型スキーマ
// ================================

/**
 * エクスポートリクエストスキーマ
 */
export const ExportRequestSchema = z.object({
  type: z.enum(['attendance', 'requests', 'users']),
  format: z.enum(['csv', 'xlsx', 'pdf']),
  filters: z.record(z.unknown()).optional(),
  date_range: z
    .object({
      start_date: z.string(),
      end_date: z.string(),
    })
    .optional(),
});

/**
 * エクスポートレスポンススキーマ
 */
export const ExportResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      download_url: z.string(),
      filename: z.string(),
      expires_at: z.string(),
    })
    .optional(),
  error: z
    .object({
      message: z.string(),
      code: z.string().optional(),
    })
    .optional(),
});

/**
 * インポートリクエストスキーマ
 */
export const ImportRequestSchema = z.object({
  type: z.enum(['attendance', 'users']),
  file: z.instanceof(File),
  options: z.record(z.unknown()).optional(),
});

/**
 * インポートレスポンススキーマ
 */
export const ImportResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      total_rows: z.number(),
      imported_rows: z.number(),
      failed_rows: z.number(),
      errors: z.array(
        z.object({
          row: z.number(),
          error: z.string(),
        })
      ),
    })
    .optional(),
  error: z
    .object({
      message: z.string(),
      code: z.string().optional(),
    })
    .optional(),
});

// ファイル関連API型
export type FileUploadRequestLegacy = z.infer<typeof FileUploadRequestLegacySchema>;
export type FileUploadResponseLegacy = z.infer<typeof FileUploadResponseLegacySchema>;

// バッチ処理関連API型
export type BatchOperationRequest<T = Record<string, unknown>> = z.infer<
  typeof BatchOperationRequestSchema
> & {
  items: T[];
};
export type BatchOperationResponse = z.infer<typeof BatchOperationResponseSchema>;

// エクスポート・インポート関連API型
export type ExportRequest = z.infer<typeof ExportRequestSchema>;
export type ExportResponse = z.infer<typeof ExportResponseSchema>;
export type ImportRequest = z.infer<typeof ImportRequestSchema>;
export type ImportResponse = z.infer<typeof ImportResponseSchema>;
