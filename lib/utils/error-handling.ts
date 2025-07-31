/**
 * 統一されたエラーハンドリングユーティリティ
 */

import type { ErrorResponse, ValidationError } from '@/types/common';

// ================================
// エラー型定義
// ================================

/**
 * アプリケーションエラー
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly validationErrors?: ValidationError[];

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    statusCode: number = 500,
    details?: Record<string, unknown>,
    validationErrors?: ValidationError[]
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.validationErrors = validationErrors;
  }

  /**
   * SupabaseエラーからAppErrorを作成
   */
  static fromSupabaseError(error: unknown, context?: string): AppError {
    const errorObj = error as { message?: string; code?: string };
    const message = errorObj.message || 'データベース操作に失敗しました';
    const code = errorObj.code || 'DATABASE_ERROR';
    const details = { context, originalError: error };

    return new AppError(message, code, 500, details);
  }

  /**
   * バリデーションエラーからAppErrorを作成
   */
  static fromValidationErrors(errors: ValidationError[], context?: string): AppError {
    const message = '入力データの検証に失敗しました';
    const details = { context };

    return new AppError(message, 'VALIDATION_ERROR', 400, details, errors);
  }

  /**
   * 権限エラーを作成
   */
  static unauthorized(message: string = 'アクセス権限がありません'): AppError {
    return new AppError(message, 'UNAUTHORIZED', 401);
  }

  /**
   * リソース未発見エラーを作成
   */
  static notFound(resource: string, id?: string): AppError {
    const message = id
      ? `${resource} (ID: ${id}) が見つかりません`
      : `${resource} が見つかりません`;
    return new AppError(message, 'NOT_FOUND', 404);
  }

  /**
   * 重複エラーを作成
   */
  static duplicate(field: string, value: string): AppError {
    const message = `${field} "${value}" は既に使用されています`;
    return new AppError(message, 'DUPLICATE_ERROR', 409);
  }
}

// ================================
// エラーレスポンス生成
// ================================

/**
 * エラーレスポンスを生成
 */
export function createErrorResponse(error: AppError): ErrorResponse {
  return {
    code: error.code,
    message: error.message,
    details: error.details,
    validation_errors: error.validationErrors,
    timestamp: new Date().toISOString(),
  };
}

// ================================
// 操作結果生成
// ================================

/**
 * 成功レスポンスを生成
 */
export function createSuccessResponse<T>(data: T, message?: string) {
  return {
    success: true,
    data,
    message,
  };
}

/**
 * 失敗レスポンスを生成
 */
export function createFailureResponse(error: AppError) {
  return {
    success: false,
    error: error.message,
    code: error.code,
    details: error.details,
    validation_errors: error.validationErrors,
  };
}

// ================================
// エラーハンドリング
// ================================

export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<{ success: true; data: T } | { success: false; error: AppError }> {
  try {
    const result = await operation();
    return { success: true, data: result };
  } catch (error) {
    console.error(`Error in ${context || 'operation'}:`, error);
    if (error instanceof AppError) {
      return { success: false, error };
    }
    // 予期しないエラーをAppErrorに変換
    const appError = AppError.fromSupabaseError(error, context);
    return { success: false, error: appError };
  }
}

export function validateRequired(value: unknown, fieldName: string): ValidationError | null {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return {
      field: fieldName,
      message: `${fieldName}は必須です`,
      code: 'REQUIRED_FIELD',
      value,
    };
  }
  return null;
}

export function validateEmail(email: string, fieldName: string = 'email'): ValidationError | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      field: fieldName,
      message: '有効なメールアドレスを入力してください',
      code: 'INVALID_EMAIL',
      value: email,
    };
  }
  return null;
}

export function validatePassword(
  password: string,
  fieldName: string = 'password'
): ValidationError | null {
  if (password.length < 8) {
    return {
      field: fieldName,
      message: 'パスワードは8文字以上で入力してください',
      code: 'PASSWORD_TOO_SHORT',
      value: password,
    };
  }
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    return {
      field: fieldName,
      message: 'パスワードは英数字混在で入力してください',
      code: 'PASSWORD_INVALID_FORMAT',
      value: password,
    };
  }
  return null;
}
