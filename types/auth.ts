/**
 * TimePort 認証関連型定義
 *
 * ユーザー認証、プロフィール、権限管理に関する型を定義
 */

import type { BaseEntity, UUID, DateString, Timestamp, Settings } from './common';

// ================================
// ユーザーロール型
// ================================

/**
 * ユーザーロール
 * - system-admin: システム管理者（全権限）
 * - admin: 管理者（組織内管理権限）
 * - member: 一般ユーザー（個人データのみ）
 */
export type UserRole = 'system-admin' | 'admin' | 'member';

// ================================
// ユーザープロフィール型
// ================================

/**
 * ユーザープロフィール
 * Supabase auth.usersテーブルと連携
 */
export interface UserProfile extends BaseEntity {
  /** 社員番号 */
  code?: string;
  /** 名前（名） */
  first_name: string;
  /** 名前（姓） */
  family_name: string;
  /** メールアドレス */
  email: string;
  /** ユーザーロール */
  role: UserRole;
  /** 主所属グループID */
  primary_group_id?: UUID;
  /** 雇用形態ID */
  employment_type_id?: UUID;
  /** 勤務開始日 */
  work_start_date?: DateString;
  /** 勤務終了日 */
  work_end_date?: DateString;
  /** 有効フラグ */
  is_active: boolean;
}

/**
 * ユーザープロフィール作成用入力型
 */
export interface CreateUserProfileInput {
  /** Supabase auth.users.id */
  id: UUID;
  /** 社員番号 */
  code?: string;
  /** 名前（名） */
  first_name: string;
  /** 名前（姓） */
  family_name: string;
  /** メールアドレス */
  email: string;
  /** ユーザーロール */
  role?: UserRole;
  /** 主所属グループID */
  primary_group_id?: UUID;
  /** 雇用形態ID */
  employment_type_id?: UUID;
  /** 勤務開始日 */
  work_start_date?: DateString;
  /** 勤務終了日 */
  work_end_date?: DateString;
  /** 有効フラグ */
  is_active?: boolean;
}

/**
 * ユーザープロフィール更新用入力型
 */
export interface UpdateUserProfileInput {
  /** 社員番号 */
  code?: string;
  /** 名前（名） */
  first_name?: string;
  /** 名前（姓） */
  family_name?: string;
  /** メールアドレス */
  email?: string;
  /** ユーザーロール */
  role?: UserRole;
  /** 主所属グループID */
  primary_group_id?: UUID;
  /** 雇用形態ID */
  employment_type_id?: UUID;
  /** 勤務開始日 */
  work_start_date?: DateString;
  /** 勤務終了日 */
  work_end_date?: DateString;
  /** 有効フラグ */
  is_active?: boolean;
}

// ================================
// 認証関連型
// ================================

/**
 * 認証ユーザー情報（セッション用）
 */
export interface AuthUser {
  /** ユーザーID */
  id: UUID;
  /** 社員番号 */
  employee_id?: string;
  /** フルネーム */
  full_name: string;
  /** メールアドレス */
  email: string;
  /** ユーザーロール */
  role: UserRole;
  /** 主所属グループID */
  primary_group_id?: UUID;
}

/**
 * ログイン認証情報
 */
export interface LoginCredentials {
  /** メールアドレス */
  email: string;
  /** パスワード */
  password: string;
  /** ログイン状態を保持するか */
  remember_me?: boolean;
}

/**
 * ログインレスポンス
 */
export interface LoginResponse {
  /** 認証ユーザー情報 */
  user: AuthUser;
  /** アクセストークン */
  access_token: string;
  /** リフレッシュトークン */
  refresh_token: string;
  /** トークン有効期限（秒） */
  expires_in: number;
}

/**
 * パスワードリセット要求
 */
export interface PasswordResetRequest {
  /** メールアドレス */
  email: string;
}

/**
 * パスワード変更要求
 */
export interface PasswordChangeRequest {
  /** 現在のパスワード */
  current_password: string;
  /** 新しいパスワード */
  new_password: string;
  /** 新しいパスワード（確認） */
  confirm_password: string;
}

// ================================
// 権限関連型
// ================================

/**
 * 権限チェック結果
 */
export interface PermissionCheck {
  /** 権限があるか */
  allowed: boolean;
  /** 理由（権限がない場合） */
  reason?: string;
  /** 必要な権限レベル */
  required_role?: UserRole;
}

/**
 * リソースアクセス権限
 */
export interface ResourcePermission {
  /** リソースタイプ */
  resource_type: string;
  /** リソースID */
  resource_id?: UUID;
  /** アクション */
  action: 'create' | 'read' | 'update' | 'delete';
  /** 権限があるか */
  allowed: boolean;
}

// ================================
// セッション関連型
// ================================

/**
 * ユーザーセッション情報
 */
export interface UserSession {
  /** セッションID */
  session_id: string;
  /** ユーザーID */
  user_id: UUID;
  /** 認証ユーザー情報 */
  user: AuthUser;
  /** セッション開始時刻 */
  started_at: Timestamp;
  /** 最終アクセス時刻 */
  last_accessed_at: Timestamp;
  /** セッション有効期限 */
  expires_at: Timestamp;
  /** IPアドレス */
  ip_address?: string;
  /** ユーザーエージェント */
  user_agent?: string;
}

// ================================
// プロフィール拡張型
// ================================

/**
 * フルネーム生成ヘルパー
 */
export interface FullNameHelper {
  /** 西洋式フルネーム（First Last） */
  western_style: string;
  /** 日本式フルネーム（姓 名） */
  japanese_style: string;
  /** 表示用フルネーム */
  display_name: string;
}

/**
 * ユーザープロフィール詳細（リレーション含む）
 */
export interface UserProfileDetail extends UserProfile {
  /** フルネーム情報 */
  full_name: FullNameHelper;
  /** 主所属グループ情報 */
  primary_group?: {
    id: UUID;
    name: string;
    path: string;
  };
  /** 雇用形態情報 */
  employment_type?: {
    id: UUID;
    name: string;
    code?: string;
  };
  /** 所属グループ一覧 */
  groups?: Array<{
    id: UUID;
    name: string;
    role?: string;
  }>;
}

// ================================
// 認証設定型
// ================================

/**
 * 認証設定
 */
export interface AuthSettings {
  /** セッションタイムアウト（分） */
  session_timeout_minutes: number;
  /** パスワード最小長 */
  password_min_length: number;
  /** パスワード複雑性要求 */
  password_require_complexity: boolean;
  /** 多要素認証有効 */
  mfa_enabled: boolean;
  /** ログイン試行回数制限 */
  max_login_attempts: number;
  /** アカウントロック時間（分） */
  account_lockout_minutes: number;
}
