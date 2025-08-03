/**
 * ユーザー企業関連のユーティリティ関数
 *
 * ユーザーIDから企業IDを取得する処理を提供
 * users → user_groups → groups → companies の順で参照
 */

import { createServerClient } from '@/lib/supabase';
import type { UUID } from '@/types/common';
import type { GetUserCompanyResult, UserCompanyInfo } from '@/schemas/user_profile';

/**
 * ユーザーIDから企業IDを取得
 *
 * @param userId ユーザーID
 * @returns 企業情報取得結果
 */
export async function getUserCompany(userId: UUID): Promise<GetUserCompanyResult> {
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
      console.error('Error fetching user company:', error);
      return {
        success: false,
        error: 'ユーザーの企業情報の取得に失敗しました',
      };
    }

    if (!data || !data.groups) {
      return {
        success: false,
        error: 'ユーザーが所属するグループが見つかりません',
      };
    }

    const group = data.groups as unknown as {
      id: string;
      name: string;
      companies: { id: string; name: string; code: string };
    };
    const company = group.companies;

    if (!company) {
      return {
        success: false,
        error: 'グループが所属する企業が見つかりません',
      };
    }

    const companyInfo: UserCompanyInfo = {
      company_id: company.id,
      company_name: company.name,
      company_code: company.code,
      group_id: group.id,
      group_name: group.name,
    };

    return {
      success: true,
      company_info: companyInfo,
    };
  } catch (error) {
    console.error('Unexpected error in getUserCompany:', error);
    return {
      success: false,
      error: '予期しないエラーが発生しました',
    };
  }
}

/**
 * ユーザーIDから企業IDのみを取得（軽量版）
 *
 * @param userId ユーザーID
 * @returns 企業ID
 */
export async function getUserCompanyId(userId: UUID): Promise<UUID | null> {
  const result = await getUserCompany(userId);
  return result.success ? result.company_info?.company_id || null : null;
}

/**
 * 複数のユーザーIDから企業IDを一括取得
 *
 * @param userIds ユーザーID配列
 * @returns ユーザーIDと企業IDのマップ
 */
export async function getUserCompanyIds(userIds: UUID[]): Promise<Map<UUID, UUID>> {
  const supabase = createServerClient();
  const result = new Map<UUID, UUID>();

  try {
    const { data, error } = await supabase
      .from('user_groups')
      .select(
        `
        user_id,
        group_id,
        groups!inner (
          company_id
        )
      `
      )
      .in('user_id', userIds)
      .is('deleted_at', null);

    if (error) {
      console.error('Error fetching user company IDs:', error);
      return result;
    }

    if (data) {
      data.forEach((item) => {
        if ((item.groups as unknown as { company_id: string })?.company_id) {
          result.set(item.user_id, (item.groups as unknown as { company_id: string }).company_id);
        }
      });
    }

    return result;
  } catch (error) {
    console.error('Unexpected error in getUserCompanyIds:', error);
    return result;
  }
}

/**
 * ユーザーが指定された企業に所属しているかチェック
 *
 * @param userId ユーザーID
 * @param companyId 企業ID
 * @returns 所属しているかどうか
 */
export async function isUserInCompany(userId: UUID, companyId: UUID): Promise<boolean> {
  const userCompanyId = await getUserCompanyId(userId);
  return userCompanyId === companyId;
}

/**
 * ユーザーが指定された企業の管理者かチェック
 *
 * @param userId ユーザーID
 * @param companyId 企業ID
 * @returns 管理者かどうか
 */
export async function isUserCompanyAdmin(userId: UUID, companyId: UUID): Promise<boolean> {
  const supabase = createServerClient();

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return false;
    }

    // system-adminは全企業の管理者
    if (data.role === 'system-admin') {
      return true;
    }

    // adminは自分の企業の管理者
    if (data.role === 'admin') {
      const userCompanyId = await getUserCompanyId(userId);
      return userCompanyId === companyId;
    }

    return false;
  } catch (error) {
    console.error('Error checking user company admin:', error);
    return false;
  }
}
