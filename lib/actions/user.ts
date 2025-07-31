'use server';

/**
 * ユーザー関連のサーバーアクション
 *
 * ユーザーIDから会社IDを取得する処理を提供
 * users → user_groups → groups → companies の順で参照
 */

import { createServerClient } from '@/lib/supabase';
import type { UUID } from '@/types/common';
import type {
  UserCompanyInfo,
  GetUserCompanyResult,
  GetCompanyInfoResult,
} from '@/schemas/user_profile';

/**
 * ユーザーIDから会社IDを取得（サーバーアクション）
 *
 * @param userId ユーザーID
 * @returns 会社ID
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
 * ユーザーIDから会社情報を取得（サーバーアクション）
 *
 * @param userId ユーザーID
 * @returns 会社情報
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
 * ユーザーが指定された会社に所属しているかチェック（サーバーアクション）
 *
 * @param userId ユーザーID
 * @param companyId 会社ID
 * @returns 所属しているかどうか
 */
export async function isUserInCompany(userId: UUID, companyId: UUID): Promise<boolean> {
  const userCompanyId = await getUserCompanyId(userId);
  return userCompanyId === companyId;
}
