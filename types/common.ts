/**
 * TimePort 共通型定義
 *
 * 全エンティティで共通して使用される基本型とユーティリティ型を定義
 */

// ================================
// 基本型定義
// ================================

/** UUID型 */
export type UUID = string;

/** ISO 8601形式のタイムスタンプ文字列 */
export type Timestamp = string;

/** YYYY-MM-DD形式の日付文字列 */
export type DateString = string;

/** HH:MM形式の時刻文字列 */
export type TimeString = string;

// ================================
// 共通エンティティ基底型
// ================================

/**
 * 全テーブル共通の基底エンティティ型
 *
 * @example
 * ```typescript
 * interface User extends BaseEntity {
 *   name: string;
 *   email: string;
 * }
 * ```
 */
export interface BaseEntity {
  /** プライマリキー */
  id: UUID;
  /** 作成日時 */
  created_at: Timestamp;
  /** 更新日時 */
  updated_at: Timestamp;
  /** 削除日時（ソフトデリート） */
  deleted_at?: Timestamp;
}

// ================================
// ユーティリティ型
// ================================

/**
 * エンティティ作成用の入力型
 * id, created_at, updated_atを除外
 *
 * @example
 * ```typescript
 * type CreateUserInput = CreateInput<User>;
 * // { name: string; email: string; deleted_at?: Timestamp }
 * ```
 */
export type CreateInput<T extends BaseEntity> = Omit<T, 'id' | 'created_at' | 'updated_at'>;

/**
 * エンティティ更新用の入力型
 * id, created_at, updated_atを除外し、全フィールドをOptional
 *
 * @example
 * ```typescript
 * type UpdateUserInput = UpdateInput<User>;
 * // { name?: string; email?: string; deleted_at?: Timestamp }
 * ```
 */
export type UpdateInput<T extends BaseEntity> = Partial<
  Omit<T, 'id' | 'created_at' | 'updated_at'>
>;

/**
 * リレーションを含む型の生成
 *
 * @example
 * ```typescript
 * type UserWithGroup = WithRelations<User, {
 *   group: Group;
 * }>;
 * ```
 */
export type WithRelations<T, R extends Record<string, any>> = T & R;

/**
 * ページネーション情報
 */
export interface PaginationInfo {
  /** 現在のページ番号 */
  page: number;
  /** 1ページあたりの件数 */
  limit: number;
  /** 総件数 */
  total: number;
  /** 総ページ数 */
  totalPages: number;
  /** 次のページが存在するか */
  hasMore: boolean;
  /** 前のページが存在するか */
  hasPrevious: boolean;
}

/**
 * ページネーション付きレスポンス
 */
export interface PaginatedResult<T> {
  /** データ配列 */
  data: T[];
  /** ページネーション情報 */
  pagination: PaginationInfo;
}

/**
 * クエリオプション
 */
export interface QueryOptions {
  /** 取得件数制限 */
  limit?: number;
  /** オフセット */
  offset?: number;
  /** ソートフィールド */
  orderBy?: string;
  /** 昇順/降順 */
  ascending?: boolean;
  /** フィルター条件 */
  filters?: Record<string, any>;
  /** 含めるリレーション */
  include?: string[];
  /** 除外するフィールド */
  exclude?: string[];
}

// ================================
// 汎用型
// ================================

/**
 * 選択肢型（セレクトボックス等で使用）
 */
export interface SelectOption<T = string | number> {
  /** 値 */
  value: T;
  /** 表示ラベル */
  label: string;
  /** 無効化フラグ */
  disabled?: boolean;
  /** 説明文 */
  description?: string;
  /** グループ名 */
  group?: string;
}

/**
 * キーバリューペア
 */
export interface KeyValuePair<T = any> {
  key: string;
  value: T;
}

/**
 * 設定値型（JSONB設定フィールド用）
 */
export type Settings = Record<string, any>;

/**
 * メタデータ型（JSONB詳細フィールド用）
 */
export type Metadata = Record<string, any>;

// ================================
// エラー型
// ================================

/**
 * バリデーションエラー
 */
export interface ValidationError {
  /** フィールド名 */
  field: string;
  /** エラーメッセージ */
  message: string;
  /** エラーコード */
  code?: string;
  /** エラー値 */
  value?: any;
}

/**
 * API エラーレスポンス
 */
export interface ErrorResponse {
  /** エラーコード */
  code: string;
  /** エラーメッセージ */
  message: string;
  /** 詳細情報 */
  details?: Record<string, any>;
  /** バリデーションエラー一覧 */
  validation_errors?: ValidationError[];
  /** タイムスタンプ */
  timestamp: Timestamp;
}

// ================================
// 操作結果型
// ================================

/**
 * 操作結果
 */
export interface OperationResult<T = any> {
  /** 成功フラグ */
  success: boolean;
  /** 結果データ */
  data?: T;
  /** エラー情報 */
  error?: string;
  /** メッセージ */
  message?: string;
}

/**
 * バッチ操作結果
 */
export interface BatchOperationResult<T = any> {
  /** 総件数 */
  total: number;
  /** 成功件数 */
  successful: number;
  /** 失敗件数 */
  failed: number;
  /** 成功データ */
  successData: T[];
  /** エラー一覧 */
  errors: Array<{
    index: number;
    error: string;
    data?: any;
  }>;
}
