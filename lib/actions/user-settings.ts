'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { logAudit } from '@/lib/utils/log-system';
import { createServerClient, createAdminClient } from '@/lib/supabase';
import { getUserCompanyId } from '@/lib/actions/user';
import type {
  UserProfile,
  CompanyInfo,
  ChatSendKeySetting,
  UserSettings,
  GetUserProfileResult,
  GetUserGroupsResult,
  GetCompanyInfoResult,
  GetChatSendKeySettingResult,
  UpdateChatSendKeySettingResult,
  GetUserSettingsResult2,
} from '@/schemas/user_profile';
import type { Group } from '@/schemas/group';

/**
 * クライアント情報を取得
 */
async function getClientInfo() {
  try {
    const headersList = await headers();
    const forwarded = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const userAgent = headersList.get('user-agent');

    // IPアドレスの取得（優先順位: x-forwarded-for > x-real-ip）
    let ipAddress = forwarded || realIp;
    if (ipAddress && ipAddress.includes(',')) {
      // 複数のIPが含まれている場合は最初のものを使用
      ipAddress = ipAddress.split(',')[0].trim();
    }

    return {
      ip_address: ipAddress || undefined,
      user_agent: userAgent || undefined,
      session_id: undefined, // セッションIDは別途取得が必要
    };
  } catch (error) {
    console.error('クライアント情報取得エラー:', error);
    return {
      ip_address: undefined,
      user_agent: undefined,
      session_id: undefined,
    };
  }
}

// ================================
// ユーザープロフィール関連
// ================================

/**
 * ユーザープロフィールを取得
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = createServerClient();

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select(
        `
        id,
        code,
        family_name,
        first_name,
        family_name_kana,
        first_name_kana,
        email,
        phone,
        role,
        employment_type_id,
        current_work_type_id,
        is_active,
        chat_send_key_shift_enter,
        created_at,
        updated_at
      `
      )
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    return null;
  }
}

/**
 * ユーザーが所属するグループ一覧を取得
 */
export async function getUserGroups(userId: string): Promise<Group[]> {
  const supabase = createServerClient();

  try {
    console.log('getUserGroups 開始:', { userId });

    // まず、user_groupsテーブルの全データを確認
    const { data: allUserGroups, error: allUserGroupsError } = await supabase
      .from('user_groups')
      .select('*');

    console.log('user_groupsテーブルの全データ:', allUserGroups);
    console.log('user_groupsテーブルの全データエラー:', allUserGroupsError);

    // ユーザーが所属するグループを取得
    const { data, error } = await supabase
      .from('user_groups')
      .select(
        `
        group_id,
        groups (
          id,
          code,
          name,
          description,
          is_active,
          created_at,
          updated_at
        )
      `
      )
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    console.log('user_groups クエリ結果:', { data, error });

    if (error) {
      console.error('Error fetching user groups:', error);
      return [];
    }

    // グループ情報のみを抽出して返す
    const groups = data?.map((item) => item.groups).filter(Boolean) || [];
    console.log('抽出されたグループ情報:', groups);

    return groups as unknown as Array<{
      id: string;
      is_active: boolean;
      created_at: string;
      updated_at: string;
      name: string;
      company_id: string;
      code?: string | undefined;
      deleted_at?: string | undefined;
      parent_group_id?: string | undefined;
      description?: string | undefined;
    }>;
  } catch (error) {
    console.error('Error in getUserGroups:', error);
    return [];
  }
}

// ================================
// 企業情報関連
// ================================

/**
 * 企業情報を取得
 */
export async function getCompanyInfo(companyId: string): Promise<CompanyInfo | null> {
  const supabase = createServerClient();

  try {
    const { data, error } = await supabase
      .from('companies')
      .select(
        `
        id,
        name,
        code,
        address,
        phone,
        is_active,
        created_at,
        updated_at
      `
      )
      .eq('id', companyId)
      .single();

    if (error) {
      console.error('Error fetching company info:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getCompanyInfo:', error);
    return null;
  }
}

/**
 * 会社情報を更新
 */
export async function updateCompanyInfo(
  companyId: string,
  companyData: {
    name?: string;
    code?: string;
    address?: string;
    phone?: string;
  },
  currentUserId?: string
): Promise<{ success: boolean; message: string; error?: string }> {
  const supabaseAdmin = createAdminClient();

  try {
    // 現在のユーザーの会社IDを取得して検証
    if (currentUserId) {
      const userCompanyId = await getUserCompanyId(currentUserId);
      if (userCompanyId !== companyId) {
        return {
          success: false,
          message: '自分の会社の情報のみ更新できます',
          error: '権限エラー',
        };
      }
    }

    // 更新前のデータを取得（監査ログ用）
    const { data: beforeData } = await supabaseAdmin
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    // 会社情報を更新
    const { data, error } = await supabaseAdmin
      .from('companies')
      .update({
        ...companyData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', companyId)
      .select()
      .single();

    if (error) {
      console.error('Error updating company info:', error);
      return {
        success: false,
        message: '会社情報の更新に失敗しました',
        error: '会社情報の更新に失敗しました',
      };
    }

    // 監査ログを記録
    if (currentUserId) {
      const clientInfo = await getClientInfo();
      try {
        await logAudit('company_info_updated', {
          user_id: currentUserId,
          company_id: companyId,
          target_type: 'companies',
          target_id: companyId,
          before_data: beforeData,
          after_data: data,
          details: {
            updated_fields: Object.keys(companyData),
          },
          ip_address: clientInfo.ip_address,
          user_agent: clientInfo.user_agent,
          session_id: clientInfo.session_id,
        });
        console.log('監査ログ記録完了: company_info_updated');
      } catch (error) {
        console.error('監査ログ記録エラー:', error);
      }
    } else {
      console.log('現在のユーザーIDが提供されていないため、監査ログを記録しません');
    }

    revalidatePath('/admin/settings');
    return { success: true, message: '会社情報が正常に更新されました' };
  } catch (error) {
    console.error('Error in updateCompanyInfo:', error);
    return {
      success: false,
      message: '会社情報の更新に失敗しました',
      error: '会社情報の更新に失敗しました',
    };
  }
}

// ================================
// チャット設定関連
// ================================

/**
 * チャット送信キー設定を取得
 */
export async function getChatSendKeySetting(userId: string): Promise<boolean> {
  const supabase = createServerClient();

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('chat_send_key_shift_enter')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching chat send key setting:', error);
      return true; // デフォルト値
    }

    return data?.chat_send_key_shift_enter ?? true;
  } catch (error) {
    console.error('Error in getChatSendKeySetting:', error);
    return true; // デフォルト値
  }
}

/**
 * チャット送信キー設定を更新
 */
export async function updateChatSendKeySetting(
  userId: string,
  useShiftEnter: boolean
): Promise<UpdateChatSendKeySettingResult> {
  const supabase = createServerClient();

  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        chat_send_key_shift_enter: useShiftEnter,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('Error updating chat send key setting:', error);
      return {
        success: false,
        message: '設定の更新に失敗しました',
        error: '設定の更新に失敗しました',
      };
    }

    revalidatePath('/member/profile');
    return { success: true, message: '設定が正常に更新されました' };
  } catch (error) {
    console.error('Error in updateChatSendKeySetting:', error);
    return {
      success: false,
      message: '設定の更新に失敗しました',
      error: '設定の更新に失敗しました',
    };
  }
}

// ================================
// ユーザー設定関連（将来的な拡張用）
// ================================

/**
 * ユーザーの全設定を取得
 */
export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  const supabase = createServerClient();

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select(
        `
        id,
        chat_send_key_shift_enter
      `
      )
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user settings:', error);
      return null;
    }

    return {
      chat_send_key_shift_enter: data?.chat_send_key_shift_enter ?? true,
      // 将来的に他の設定を追加
    };
  } catch (error) {
    console.error('Error in getUserSettings:', error);
    return null;
  }
}
