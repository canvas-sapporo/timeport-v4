'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { logAudit, logSystem } from '@/lib/utils/log-system';
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
 * 企業情報を更新
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
    // 現在のユーザーの企業IDを取得して検証
    if (currentUserId) {
      const userCompanyId = await getUserCompanyId(currentUserId);
      if (userCompanyId !== companyId) {
        // システムログ: 権限エラー
        await logSystem('warn', '企業情報更新時の権限エラー', {
          feature_name: 'company_management',
          action_type: 'update_company_info',
          user_id: currentUserId,
          company_id: companyId,
          user_company_id: userCompanyId,
          error_message: '権限エラー: 自分の企業の情報のみ更新できます',
        });

        return {
          success: false,
          message: '自分の企業の情報のみ更新できます',
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

    // 企業情報を更新
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
      // システムログ: データベースエラー
      await logSystem('error', '企業情報更新エラー', {
        feature_name: 'company_management',
        action_type: 'update_company_info',
        user_id: currentUserId,
        company_id: companyId,
        error_message: error.message,
      });

      console.error('Error updating company info:', error);
      return {
        success: false,
        message: '企業情報の更新に失敗しました',
        error: '企業情報の更新に失敗しました',
      };
    }

    // システムログ: 成功
    await logSystem('info', '企業情報更新成功', {
      feature_name: 'company_management',
      action_type: 'update_company_info',
      user_id: currentUserId,
      company_id: companyId,
      metadata: {
        updated_fields: Object.keys(companyData),
      },
    });

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
        // システムログ: 監査ログ記録エラー
        await logSystem('error', '監査ログ記録エラー', {
          feature_name: 'company_management',
          action_type: 'update_company_info',
          user_id: currentUserId,
          company_id: companyId,
          error_message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } else {
      console.log('現在のユーザーIDが提供されていないため、監査ログを記録しません');
    }

    revalidatePath('/admin/settings');
    return { success: true, message: '企業情報が正常に更新されました' };
  } catch (error) {
    // システムログ: 予期しないエラー
    await logSystem('error', '企業情報更新時の予期しないエラー', {
      feature_name: 'company_management',
      action_type: 'update_company_info',
      user_id: currentUserId,
      company_id: companyId,
      error_message: error instanceof Error ? error.message : 'Unknown error',
      error_stack: error instanceof Error ? error.stack : undefined,
    });

    console.error('Error in updateCompanyInfo:', error);
    return {
      success: false,
      message: '企業情報の更新に失敗しました',
      error: '企業情報の更新に失敗しました',
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
    // 更新前のデータを取得（監査ログ用）
    const { data: beforeData } = await supabase
      .from('user_profiles')
      .select('chat_send_key_shift_enter')
      .eq('id', userId)
      .single();

    const { error } = await supabase
      .from('user_profiles')
      .update({
        chat_send_key_shift_enter: useShiftEnter,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      // システムログ: データベースエラー
      await logSystem('error', 'チャット設定更新エラー', {
        feature_name: 'user_settings',
        action_type: 'update_chat_send_key_setting',
        user_id: userId,
        error_message: error.message,
      });

      console.error('Error updating chat send key setting:', error);
      return {
        success: false,
        message: '設定の更新に失敗しました',
        error: '設定の更新に失敗しました',
      };
    }

    // システムログ: 成功
    await logSystem('info', 'チャット設定更新成功', {
      feature_name: 'user_settings',
      action_type: 'update_chat_send_key_setting',
      user_id: userId,
      metadata: {
        new_setting: useShiftEnter,
      },
    });

    // 監査ログ: 設定変更
    await logAudit('chat_setting_updated', {
      user_id: userId,
      target_type: 'user_profiles',
      target_id: userId,
      before_data: { chat_send_key_shift_enter: beforeData?.chat_send_key_shift_enter },
      after_data: { chat_send_key_shift_enter: useShiftEnter },
      details: {
        setting_name: 'chat_send_key_shift_enter',
        new_value: useShiftEnter,
      },
    });

    revalidatePath('/member/profile');
    return { success: true, message: '設定が正常に更新されました' };
  } catch (error) {
    // システムログ: 予期しないエラー
    await logSystem('error', 'チャット設定更新時の予期しないエラー', {
      feature_name: 'user_settings',
      action_type: 'update_chat_send_key_setting',
      user_id: userId,
      error_message: error instanceof Error ? error.message : 'Unknown error',
      error_stack: error instanceof Error ? error.stack : undefined,
    });

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
