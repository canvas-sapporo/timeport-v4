'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createServerClient } from '@/lib/supabase';
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
