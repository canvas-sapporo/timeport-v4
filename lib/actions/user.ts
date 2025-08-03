'use server';

/**
 * ユーザー関連のサーバーアクション
 *
 * ユーザーIDから企業IDを取得する処理を提供
 * users → user_groups → groups → companies の順で参照
 */

import { createServerClient } from '@/lib/supabase';
import { logSystem, logAudit } from '@/lib/utils/log-system';
import type { UUID } from '@/types/common';
import type {
  UserCompanyInfo,
  GetUserCompanyResult,
  GetCompanyInfoResult,
  UserProfile,
} from '@/schemas/user_profile';

/**
 * メンバー用のユーザー一覧を取得
 * 現在のユーザーが所属する企業のユーザーのみを取得
 */
export async function getUsers(): Promise<{
  success: boolean;
  data?: UserProfile[];
  error?: string;
}> {
  const supabase = createServerClient();

  try {
    // 現在のユーザーを取得
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      // システムログ: 認証エラー
      await logSystem('error', 'ユーザー一覧取得時の認証エラー', {
        feature_name: 'user_management',
        action_type: 'get_users',
        user_id: user?.id,
        error_message: userError?.message,
      });

      return {
        success: false,
        error: '認証エラー',
      };
    }

    // ユーザーの企業IDを取得
    const userCompanyId = await getUserCompanyId(user.id);
    if (!userCompanyId) {
      // システムログ: 企業情報取得エラー
      await logSystem('error', 'ユーザーの企業情報が見つかりません', {
        feature_name: 'user_management',
        action_type: 'get_users',
        user_id: user.id,
        error_message: '企業情報が見つかりません',
      });

      return {
        success: false,
        error: 'ユーザーの企業情報が見つかりません',
      };
    }

    // 企業内のユーザーを取得
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select('*')
      .is('deleted_at', null)
      .order('code', { ascending: true });

    if (error) {
      // システムログ: データベースエラー
      await logSystem('error', 'ユーザー取得エラー', {
        feature_name: 'user_management',
        action_type: 'get_users',
        user_id: user.id,
        company_id: userCompanyId,
        error_message: error.message,
      });

      console.error('ユーザー取得エラー:', error);
      return {
        success: false,
        error: 'ユーザーの取得に失敗しました',
      };
    }

    // 企業内のユーザーのみをフィルタリング
    const companyUsers = await Promise.all(
      (users || []).map(async (userProfile) => {
        const isInCompany = await isUserInCompany(userProfile.id, userCompanyId);
        return isInCompany ? userProfile : null;
      })
    );

    const filteredUsers = companyUsers.filter(Boolean) as UserProfile[];

    // システムログ: 成功
    await logSystem('info', 'ユーザー一覧取得成功', {
      feature_name: 'user_management',
      action_type: 'get_users',
      user_id: user.id,
      company_id: userCompanyId,
      metadata: {
        total_users: filteredUsers.length,
        company_users: users?.length || 0,
      },
    });

    // 監査ログ: ユーザー一覧閲覧
    await logAudit('user_list_viewed', {
      user_id: user.id,
      company_id: userCompanyId,
      target_type: 'user_profiles',
      details: {
        total_users: filteredUsers.length,
        action: 'view_user_list',
      },
    });

    return {
      success: true,
      data: filteredUsers,
    };
  } catch (error) {
    // システムログ: 予期しないエラー
    await logSystem('error', 'getUsers 予期しないエラー', {
      feature_name: 'user_management',
      action_type: 'get_users',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      error_stack: error instanceof Error ? error.stack : undefined,
    });

    console.error('getUsers エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * ユーザーIDから企業IDを取得（サーバーアクション）
 *
 * @param userId ユーザーID
 * @returns 企業ID
 */
export async function getUserCompanyId(userId: UUID): Promise<UUID | null> {
  const supabase = createServerClient();

  try {
    // users → user_groups → groups → companies の順で参照
    const { data, error } = await supabase
      .from('user_groups')
      .select(
        `
        group_id,
        groups!inner (
          company_id
        )
      `
      )
      .eq('user_id', userId)
      .is('deleted_at', null)
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching user company ID:', error);
      return null;
    }

    if (!data || !data.groups) {
      return null;
    }

    return (data.groups as unknown as { company_id: string }).company_id;
  } catch (error) {
    console.error('Unexpected error in getUserCompanyId:', error);
    return null;
  }
}

/**
 * ユーザーIDから企業情報を取得（サーバーアクション）
 *
 * @param userId ユーザーID
 * @returns 企業情報
 */
export async function getUserCompanyInfo(userId: UUID): Promise<UserCompanyInfo | null> {
  const supabase = createServerClient();

  try {
    // users → user_groups → groups → companies の順で参照
    const { data, error } = await supabase
      .from('user_groups')
      .select(
        `
        group_id,
        groups!inner (
          id,
          company_id,
          name,
          companies!inner (
            id,
            name,
            code
          )
        )
      `
      )
      .eq('user_id', userId)
      .is('deleted_at', null)
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching user company info:', error);
      return null;
    }

    if (!data || !data.groups) {
      return null;
    }

    const group = data.groups as unknown as {
      id: string;
      company_id: string;
      name: string;
      companies: { id: string; name: string; code: string };
    };
    const company = group.companies;

    if (!company) {
      return null;
    }

    return {
      company_id: company.id,
      company_name: company.name,
      company_code: company.code,
      group_id: group.id,
      group_name: group.name,
    };
  } catch (error) {
    console.error('Unexpected error in getUserCompanyInfo:', error);
    return null;
  }
}

/**
 * ユーザーが指定された企業に所属しているかチェック（サーバーアクション）
 *
 * @param userId ユーザーID
 * @param companyId 企業ID
 * @returns 所属しているかどうか
 */
export async function isUserInCompany(userId: UUID, companyId: UUID): Promise<boolean> {
  const userCompanyId = await getUserCompanyId(userId);
  return userCompanyId === companyId;
}
